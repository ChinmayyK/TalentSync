import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import {
  ProviderCapabilities,
  StandardCandidate,
  SyncResult,
} from '../../types/standard-entities';
import { HubspotOAuthService } from './hubspot.oauth';
import { HubspotApiService } from './hubspot.api';
import { HubspotSyncHandler } from './hubspot.sync-handler';
import { mapCandidateToContact } from './hubspot.mapping';
import { SyncLogService } from '../../services/sync-log.service';

/**
 * HubSpot Integration Provider
 *
 * v1 Capabilities:
 * - Candidate sync: push (TalentSync → HubSpot Contacts)
 * - Job sync: push (TalentSync → HubSpot Deals)
 * - Interview sync: push (TalentSync → HubSpot Meetings)
 * - Webhooks: not supported in v1
 */
@Injectable()
export class HubspotProvider implements IntegrationProvider {
  private readonly logger = new Logger(HubspotProvider.name);

  constructor(
    private prisma: PrismaService,
    private oauthService: HubspotOAuthService,
    private apiService: HubspotApiService,
    private syncHandler: HubspotSyncHandler,
    private syncLogService: SyncLogService,
  ) {}

  /**
   * v1: Outbound push only
   */
  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'push', // TalentSync → HubSpot Contacts
      jobSync: 'push', // TalentSync → HubSpot Deals
      interviewSync: 'push', // TalentSync → HubSpot Meetings
      supportsWebhooks: false, // v1: no inbound
    };
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    return this.oauthService.getAuthUrl(tenantId);
  }

  async exchangeCode(tenantId: string, code: string): Promise<void> {
    await this.oauthService.exchangeCode(tenantId, code);
  }

  async refreshTokens(tenantId: string): Promise<void> {
    await this.oauthService.refreshTokens(tenantId);
  }

  // ============================================
  // Event-Driven Sync Methods
  // ============================================

  /**
   * Sync a candidate to HubSpot
   * Called by the sync processor for integration events
   */
  async syncCandidate(
    tenantId: string,
    candidateId: string,
    eventType: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void> {
    this.logger.log(
      `Syncing candidate ${candidateId} (${eventType}) to HubSpot`,
    );

    switch (eventType) {
      case 'created':
        await this.syncHandler.handleCandidateCreated(tenantId, candidateId);
        break;
      case 'updated':
        await this.syncHandler.handleCandidateUpdated(tenantId, candidateId);
        break;
      case 'stage_changed':
        if (data?.newStage) {
          await this.syncHandler.handleCandidateStageChanged(
            tenantId,
            candidateId,
            data.newStage,
          );
        }
        break;
    }
  }

  /**
   * Sync an interview to HubSpot
   * Called by the sync processor for integration events
   */
  async syncInterview(
    tenantId: string,
    interviewId: string,
    eventType: 'scheduled' | 'completed',
  ): Promise<void> {
    this.logger.log(
      `Syncing interview ${interviewId} (${eventType}) to HubSpot`,
    );

    switch (eventType) {
      case 'scheduled':
        await this.syncHandler.handleInterviewScheduled(tenantId, interviewId);
        break;
      case 'completed':
        await this.syncHandler.handleInterviewCompleted(tenantId, interviewId);
        break;
    }
  }

  // ============================================
  // Legacy Push Methods (for compatibility)
  // ============================================

  async pushCandidate(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult> {
    try {
      // Check if contact exists
      let existingId: string | null = null;
      if (candidate.email) {
        const existing = await this.apiService.searchContactByEmail(
          tenantId,
          candidate.email,
        );
        existingId = existing?.id || null;
      }

      const contactProps = mapCandidateToContact({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        roleTitle: candidate.roleTitle,
        source: candidate.source,
      });

      if (existingId) {
        await this.apiService.updateContact(tenantId, existingId, contactProps);
        return { success: true, externalId: existingId };
      }

      const result = await this.apiService.createContact(tenantId, {
        firstName: contactProps.firstname,
        lastName: contactProps.lastname,
        email: contactProps.email,
        phone: contactProps.phone,
        jobTitle: contactProps.jobtitle,
        source: contactProps.leadsource,
        stage: contactProps.hs_lead_status,
      });

      return { success: result.success, externalId: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * v1: Pull is not supported - throws error
   */
  async pullCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<StandardCandidate[]> {
    throw new Error(
      'HubSpot v1 does not support inbound sync. TalentSync is the system of record.',
    );
  }

  async handleWebhook(tenantId: string, event: unknown): Promise<void> {
    this.logger.warn('HubSpot webhooks not supported in v1');
  }

  // ============================================
  // Status & Observability
  // ============================================

  /**
   * Get integration status for observability
   */
  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    tokenValid: boolean;
    tokenExpiresAt?: Date;
    lastSyncAt?: Date;
    lastError?: string;
    stats24h?: {
      total: number;
      success: number;
      failed: number;
      successRate: number;
    };
  }> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
    });

    if (!integration) {
      return { connected: false, tokenValid: false };
    }

    // Get token info
    const tokenInfo = await this.oauthService.getTokenInfo(tenantId);

    // Get sync stats
    const stats = await this.syncLogService.getSummary24h(tenantId, 'hubspot');

    return {
      connected: integration.status === 'connected',
      tokenValid: tokenInfo.valid,
      tokenExpiresAt: tokenInfo.expiresAt,
      lastSyncAt: integration.lastSyncedAt || undefined,
      lastError: integration.lastError || undefined,
      stats24h: {
        total: stats.total,
        success: stats.success,
        failed: stats.failed,
        successRate: stats.successRate,
      },
    };
  }

  /**
   * Test the connection to HubSpot
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.apiService.testConnection(tenantId);
  }
}
