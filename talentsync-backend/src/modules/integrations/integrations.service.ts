import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ProviderFactory } from './provider.factory';
import { parseState } from './utils/oauth.util';
import { mergeMappings, validateMapping } from './utils/mapping.util';
import { MappingConfig } from './types/mapping.interface';
import { AuditService } from '../audit/audit.service';
import { UpdateMappingDto } from './dto/mapping.dto';
import { ZohoApiService } from './providers/zoho/zoho.api';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  // Rate limiting for sync operations
  private syncRateLimiter = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private prisma: PrismaService,
    private providerFactory: ProviderFactory,
    private auditService: AuditService,
    private zohoApi: ZohoApiService,
    @InjectQueue('integration-sync') private syncQueue: Queue,
  ) {}

  /**
   * List all integrations for a tenant
   */
  async listIntegrations(tenantId: string) {
    const integrations = await this.prisma.integration.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        status: true,
        settings: true,
        lastSyncedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Transform settings.config to top-level config for frontend
    return integrations.map((i) => ({
      ...i,
      config: (i.settings as any)?.config || undefined,
      settings: undefined, // Don't expose raw settings to frontend
    }));
  }

  /**
   * Get a specific integration
   */
  async getIntegration(tenantId: string, provider: string) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      select: {
        id: true,
        provider: true,
        status: true,
        settings: true,
        lastSyncedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${provider} not found`);
    }

    return integration;
  }

  /**
   * Initiate OAuth connection flow
   */
  async connect(tenantId: string, provider: string, userId: string) {
    if (!this.providerFactory.isSupported(provider)) {
      throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    const providerInstance = this.providerFactory.getProvider(provider);
    const authUrl = await providerInstance.getAuthUrl(tenantId);

    // Create audit log
    await this.auditService.log({
      tenantId,
      userId,
      action: 'integration.connect.initiated',
      metadata: { provider },
    });

    return { authUrl, provider };
  }

  /**
   * Handle OAuth callback
   */
  async callback(
    provider: string,
    code: string,
    state: string,
    userId: string,
  ) {
    if (!this.providerFactory.isSupported(provider)) {
      throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    // Parse and validate state - Salesforce uses raw tenantId, others use encoded state
    let tenantId: string;
    let companyDomain: string | undefined;

    if (provider === 'salesforce') {
      // Salesforce: state is raw tenantId
      tenantId = state;
    } else {
      // Others: state is base64-encoded JSON
      const parsed = parseState(state);
      tenantId = parsed.tenantId;
      // BambooHR includes companyDomain in state
      companyDomain = parsed.companyDomain;
    }

    const providerInstance = this.providerFactory.getProvider(provider);

    // BambooHR needs companyDomain for token exchange
    if (provider === 'bamboohr' && companyDomain) {
      await providerInstance.exchangeCode(tenantId, code, companyDomain);
    } else {
      await providerInstance.exchangeCode(tenantId, code);
    }

    // Create audit log
    await this.auditService.log({
      tenantId,
      userId,
      action: 'integration.connect.completed',
      metadata: { provider },
    });

    return { success: true, provider };
  }

  /**
   * Update field mapping configuration
   */
  async updateMapping(
    tenantId: string,
    provider: string,
    mappingDto: UpdateMappingDto,
    userId: string,
  ) {
    const newMapping: MappingConfig = {
      mappings: mappingDto.mappings,
      direction: mappingDto.direction,
    };

    if (!validateMapping(newMapping)) {
      throw new BadRequestException('Invalid mapping configuration');
    }

    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${provider} not found`);
    }

    // Merge with existing mapping
    const existingSettings = (integration.settings as any) || {};
    const existingMapping = existingSettings.mapping || {
      mappings: [],
      direction: 'bidirectional',
    };
    const mergedMapping = mergeMappings(existingMapping, newMapping);

    // Update settings
    const updatedSettings = {
      ...existingSettings,
      mapping: mergedMapping,
    };

    await this.prisma.integration.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      data: {
        settings: updatedSettings,
      },
    });

    // Create audit log
    await this.auditService.log({
      tenantId,
      userId,
      action: 'integration.mapping.updated',
      metadata: { provider, mappingCount: mergedMapping.mappings.length },
    });

    return { success: true, mapping: mergedMapping };
  }

  /**
   * Update integration configuration (sync settings, zohoModule, etc.)
   */
  async updateConfig(tenantId: string, provider: string, config: any) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${provider} not found`);
    }

    // Merge with existing settings
    const existingSettings = (integration.settings as any) || {};
    const updatedSettings = {
      ...existingSettings,
      config: {
        ...(existingSettings.config || {}),
        ...config,
      },
    };

    await this.prisma.integration.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      data: {
        settings: updatedSettings,
      },
    });

    return { success: true, config: updatedSettings.config };
  }

  /**
   * Trigger manual sync
   * @param module - For Zoho: 'leads', 'contacts', or 'both'
   */
  async syncNow(
    tenantId: string,
    provider: string,
    userId: string,
    since?: Date,
    module?: string,
  ) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${provider} not found`);
    }

    // Check for auth_required status - admin must reconnect
    if (integration.status === 'auth_required') {
      throw new BadRequestException(
        `Cannot sync: Zoho authentication expired. Please reconnect the integration to resume syncing.`,
      );
    }

    if (integration.status !== 'connected') {
      throw new BadRequestException(`Integration ${provider} is not connected`);
    }

    // Rate limiting: max 5 syncs per hour per integration
    const key = `${tenantId}:${provider}`;
    const now = Date.now();
    const limit = this.syncRateLimiter.get(key);
    if (limit && limit.resetAt > now) {
      if (limit.count >= 5) {
        throw new BadRequestException(
          'Rate limit exceeded: max 5 syncs per hour',
        );
      }
      limit.count++;
    } else {
      this.syncRateLimiter.set(key, { count: 1, resetAt: now + 3600000 });
    }

    // Determine module from passed parameter, config, or provider default
    let syncModule = module;
    if (!syncModule) {
      const settings = integration.settings as any;
      if (provider === 'salesforce') {
        syncModule = settings?.config?.salesforceModule || 'all';
      } else if (provider === 'zoho') {
        syncModule = settings?.config?.zohoModule || 'leads';
      } else {
        syncModule = 'all';
      }
    }

    // Enqueue sync job
    await this.syncQueue.add(
      'sync',
      {
        tenantId,
        provider,
        since: since?.toISOString(),
        module: syncModule,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    // Create audit log
    await this.auditService.log({
      tenantId,
      userId,
      action: 'integration.sync.triggered',
      metadata: { provider, since: since?.toISOString() },
    });

    return { success: true, message: 'Sync job enqueued' };
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(provider: string, payload: any) {
    if (!this.providerFactory.isSupported(provider)) {
      throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    // Extract tenant identifier from payload
    // This varies by provider - implement provider-specific logic
    const tenantId = await this.extractTenantFromWebhook(provider, payload);

    if (!tenantId) {
      throw new BadRequestException('Could not identify tenant from webhook');
    }

    const providerInstance = this.providerFactory.getProvider(provider);

    if (providerInstance.handleWebhook) {
      await providerInstance.handleWebhook(tenantId, payload);
    }

    // Optionally enqueue a sync job
    await this.syncQueue.add('sync', {
      tenantId,
      provider,
      triggeredBy: 'webhook',
    });

    return { success: true };
  }

  /**
   * Disconnect an integration
   */
  async disconnect(tenantId: string, provider: string, userId: string) {
    await this.prisma.integration.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      data: {
        status: 'pending',
        tokens: null as any, // Prisma Json field accepts null
      },
    });

    // Create audit log
    await this.auditService.log({
      tenantId,
      userId,
      action: 'integration.disconnected',
      metadata: { provider },
    });

    return { success: true };
  }

  /**
   * Extract tenant ID from webhook payload
   * Looks up integration metadata to find tenant
   */
  private async extractTenantFromWebhook(
    provider: string,
    payload: any,
  ): Promise<string | null> {
    // Try to extract external ID from payload based on provider
    let externalId: string | null = null;

    if (provider === 'zoho' && payload.organization_id) {
      externalId = payload.organization_id;
    } else if (provider === 'google_calendar' && payload.channelId) {
      externalId = payload.channelId;
    } else if (provider === 'outlook_calendar' && payload.subscriptionId) {
      externalId = payload.subscriptionId;
    }

    if (!externalId) {
      this.logger.warn(
        `Could not extract external ID from ${provider} webhook payload`,
      );
      return null;
    }

    // Look up integration by external ID stored in settings
    const integration = await this.prisma.integration.findFirst({
      where: {
        provider,
        settings: {
          path: ['externalId'],
          equals: externalId,
        },
      },
      select: { tenantId: true },
    });

    if (!integration) {
      this.logger.warn(
        `No integration found for ${provider} with external ID: ${externalId}`,
      );
      return null;
    }

    return integration.tenantId;
  }

  /**
   * Get webhook events for an integration
   */
  async getWebhookEvents(
    tenantId: string,
    provider: string,
    limit: number = 50,
  ) {
    const safeLimit = Math.min(limit || 50, 200);
    // Return mock webhook events for now - in production would query a webhooks table
    const integration = await this.getIntegration(tenantId, provider);
    if (!integration) {
      return { events: [] };
    }

    // Generate sample webhook events based on integration status
    const events = [];
    const eventTypes = [
      'candidate.created',
      'candidate.updated',
      'job.closed',
      'application.submitted',
    ];
    const statuses = ['success', 'failed', 'retrying', 'pending'];

    for (let i = 0; i < Math.min(safeLimit, 10); i++) {
      events.push({
        id: `evt-${Date.now()}-${i}`,
        integrationId: integration.id,
        eventType: eventTypes[i % eventTypes.length],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        payload: { recordId: `rec-${i}` },
        attempts: Math.floor(Math.random() * 3) + 1,
        createdAt: new Date(Date.now() - i * 15 * 60 * 1000),
        processedAt: new Date(Date.now() - i * 15 * 60 * 1000 + 200),
      });
    }

    return { events };
  }

  /**
   * Get sync metrics for an integration from real sync log data
   */
  async getMetrics(tenantId: string, provider: string) {
    const integration = await this.getIntegration(tenantId, provider);
    if (!integration) {
      return null;
    }

    // Get metrics from last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get sync counts by status
    const statusCounts = await this.prisma.integrationSyncLog.groupBy({
      by: ['status'],
      where: {
        tenantId,
        provider,
        createdAt: { gte: since },
      },
      _count: true,
    });

    let totalSyncs = 0,
      successfulSyncs = 0,
      failedSyncs = 0,
      queuedJobs = 0;
    for (const row of statusCounts) {
      totalSyncs += row._count;
      if (row.status === 'SUCCESS') successfulSyncs = row._count;
      if (row.status === 'FAILED') failedSyncs = row._count;
      if (row.status === 'PENDING' || row.status === 'IN_PROGRESS') {
        queuedJobs += row._count;
      }
    }

    // Calculate average latency from completed syncs
    const completedSyncs = await this.prisma.integrationSyncLog.findMany({
      where: {
        tenantId,
        provider,
        status: 'SUCCESS',
        createdAt: { gte: since },
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
      take: 100,
    });

    let avgLatencyMs = 0;
    if (completedSyncs.length > 0) {
      const totalLatency = completedSyncs.reduce((sum, s) => {
        return sum + (s.completedAt!.getTime() - s.createdAt.getTime());
      }, 0);
      avgLatencyMs = Math.round(totalLatency / completedSyncs.length);
    }

    // Count total records processed (unique entities)
    const recordsProcessed = await this.prisma.integrationSyncLog.count({
      where: {
        tenantId,
        provider,
        status: 'SUCCESS',
        createdAt: { gte: since },
      },
    });

    // Get last error if any
    const lastError = await this.prisma.integrationSyncLog.findFirst({
      where: {
        tenantId,
        provider,
        status: 'FAILED',
      },
      orderBy: { createdAt: 'desc' },
      select: { errorMessage: true },
    });

    const successRate =
      totalSyncs > 0
        ? Math.round((successfulSyncs / totalSyncs) * 1000) / 10
        : 100;

    return {
      integrationId: integration.id,
      period: 'Last 7 days',
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      successRate,
      avgLatencyMs,
      recordsProcessed,
      queuedJobs,
      lastError: lastError?.errorMessage || null,
    };
  }

  /**
   * Get field schemas for mapping configuration
   */
  async getFieldSchemas(tenantId: string, provider: string) {
    const integration = await this.getIntegration(tenantId, provider);
    if (!integration) {
      return { sourceFields: [], targetFields: [], mappings: [] };
    }

    // Standard source fields (from external provider)
    const sourceFields = [
      {
        name: 'first_name',
        type: 'string',
        label: 'First Name',
        required: true,
      },
      { name: 'last_name', type: 'string', label: 'Last Name', required: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true },
      { name: 'phone', type: 'phone', label: 'Phone Number', required: false },
      {
        name: 'company',
        type: 'string',
        label: 'Company Name',
        required: false,
      },
      { name: 'title', type: 'string', label: 'Job Title', required: false },
      {
        name: 'created_date',
        type: 'datetime',
        label: 'Created Date',
        required: true,
      },
      { name: 'status', type: 'picklist', label: 'Status', required: true },
    ];

    // Standard target fields (TalentSync fields)
    const targetFields = [
      {
        name: 'firstName',
        type: 'string',
        label: 'First Name',
        required: true,
      },
      { name: 'lastName', type: 'string', label: 'Last Name', required: true },
      { name: 'emailAddress', type: 'email', label: 'Email', required: true },
      { name: 'phoneNumber', type: 'phone', label: 'Phone', required: false },
      {
        name: 'organization',
        type: 'string',
        label: 'Organization',
        required: false,
      },
      { name: 'position', type: 'string', label: 'Position', required: false },
      {
        name: 'createdAt',
        type: 'datetime',
        label: 'Created At',
        required: true,
      },
      {
        name: 'candidateStatus',
        type: 'picklist',
        label: 'Candidate Status',
        required: true,
      },
    ];

    // Get existing mappings from integration config
    const mappings = (integration as any).mappingConfig?.mappings || [];

    return { sourceFields, targetFields, mappings };
  }

  /**
   * Get integration status with capabilities and sync statistics
   */
  async getIntegrationStatus(tenantId: string, provider: string) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: { tenantId, provider },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${provider} not found`);
    }

    // Get 24h sync stats from sync logs
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await this.prisma.integrationSyncLog.groupBy({
      by: ['status'],
      where: {
        tenantId,
        provider,
        createdAt: { gte: since },
      },
      _count: true,
    });

    let total = 0,
      success = 0,
      failed = 0,
      pending = 0;
    for (const log of logs) {
      total += log._count;
      if (log.status === 'SUCCESS') success = log._count;
      if (log.status === 'FAILED') failed = log._count;
      if (log.status === 'PENDING' || log.status === 'IN_PROGRESS') {
        pending += log._count;
      }
    }

    // Get provider capabilities if available
    let capabilities = {
      candidateSync: 'none',
      jobSync: 'none',
      interviewSync: 'none',
      supportsWebhooks: false,
    };

    try {
      const providerInstance = this.providerFactory.getProvider(provider);
      if (providerInstance.getCapabilities) {
        capabilities = providerInstance.getCapabilities();
      }
    } catch (e) {
      this.logger.warn(
        `Could not get capabilities for provider ${provider}:`,
        e,
      );
    }

    return {
      connected: integration.status === 'connected',
      provider,
      lastSyncAt: integration.lastSyncedAt,
      lastError: integration.lastError,
      capabilities,
      stats: {
        total,
        success,
        failed,
        pending,
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
      },
    };
  }

  /**
   * Get sync logs for an integration
   */
  async getSyncLogs(
    tenantId: string,
    provider: string,
    limit = 50,
    status?: string,
  ) {
    const safeLimit = Math.min(limit || 50, 200);
    const where: any = { tenantId, provider };
    if (status) {
      where.status = status;
    }

    return this.prisma.integrationSyncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        eventType: true,
        direction: true,
        entityType: true,
        entityId: true,
        externalId: true,
        status: true,
        errorMessage: true,
        retryCount: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  /**
   * Get failure summary for an integration
   */
  async getFailureSummary(tenantId: string, provider: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const errors = await this.prisma.integrationSyncLog.findMany({
      where: {
        tenantId,
        provider,
        status: 'FAILED',
        createdAt: { gte: since },
      },
      select: {
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by error message
    const errorMap = new Map<string, { count: number; lastOccurred: Date }>();

    for (const error of errors) {
      const message = error.errorMessage || 'Unknown error';
      const existing = errorMap.get(message);
      if (existing) {
        existing.count++;
        if (error.createdAt > existing.lastOccurred) {
          existing.lastOccurred = error.createdAt;
        }
      } else {
        errorMap.set(message, { count: 1, lastOccurred: error.createdAt });
      }
    }

    // Convert to array and sort by count
    const recentErrors = Array.from(errorMap.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      recentErrors,
      totalFailures24h: errors.length,
    };
  }

  // ============================================
  // Zoho Test Methods
  // ============================================

  /**
   * Test Zoho CRM connection
   */
  async testZohoConnection(tenantId: string) {
    try {
      return await this.zohoApi.testConnection(tenantId);
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Zoho CRM',
      };
    }
  }

  /**
   * Get contacts from Zoho CRM
   */
  async getZohoContacts(
    tenantId: string,
    page: number = 1,
    perPage: number = 20,
  ) {
    try {
      const contacts = await this.zohoApi.getContacts(tenantId, page, perPage);
      return {
        success: true,
        data: contacts,
        pagination: {
          page,
          perPage,
          total: contacts.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch contacts',
        data: [],
      };
    }
  }

  /**
   * Get leads from Zoho CRM
   */
  async getZohoLeads(tenantId: string, page: number = 1, perPage: number = 20) {
    try {
      // Note: ZohoApiService doesn't have getLeads, so we return a message
      // You can add a getLeads method to zoho.api.ts similar to getContacts
      return {
        success: true,
        message:
          'Leads endpoint - add getLeads() to ZohoApiService to implement',
        data: [],
        pagination: {
          page,
          perPage,
          total: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to fetch leads',
        data: [],
      };
    }
  }
}
