import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import {
  ProviderCapabilities,
  StandardCandidate,
  SyncResult,
} from '../../types/standard-entities';
import { WorkdayAuthService } from './workday.auth';
import { WorkdayApiService } from './workday.api';
import { WorkdaySyncHandler } from './workday.sync-handler';
import { mapCandidateToWorkday } from './workday.mapping';
import { SyncLogService } from '../../services/sync-log.service';

/**
 * Workday ATS Integration Provider
 *
 * v1 Capabilities:
 * - Candidate sync: push (TalentSync → Workday Candidates)
 * - Job sync: push (TalentSync → Workday Requisitions)
 * - Interview sync: push (TalentSync → Workday Interview Events)
 * - Webhooks: not supported (Workday uses polling)
 *
 * Required environment variables:
 * - WORKDAY_CLIENT_ID
 * - WORKDAY_CLIENT_SECRET
 * - WORKDAY_REDIRECT_URI
 * - WORKDAY_TENANT_URL (optional, per-tenant override)
 */
@Injectable()
export class WorkdayProvider implements IntegrationProvider {
  private readonly logger = new Logger(WorkdayProvider.name);

  constructor(
    private prisma: PrismaService,
    private authService: WorkdayAuthService,
    private apiService: WorkdayApiService,
    private syncHandler: WorkdaySyncHandler,
    private syncLogService: SyncLogService,
  ) {}

  /**
   * v1: Outbound push only
   */
  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'push', // TalentSync → Workday Candidates
      jobSync: 'push', // TalentSync → Workday Requisitions
      interviewSync: 'push', // TalentSync → Workday Interview Events
      supportsWebhooks: false, // v1: no inbound
    };
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    return this.authService.getAuthUrl(tenantId);
  }

  async exchangeCode(tenantId: string, code: string): Promise<void> {
    await this.authService.exchangeCode(tenantId, code);
  }

  async refreshTokens(tenantId: string): Promise<void> {
    await this.authService.refreshTokens(tenantId);
  }

  // ============================================
  // Event-Driven Sync Methods
  // ============================================

  /**
   * Sync a candidate to Workday
   */
  async syncCandidate(
    tenantId: string,
    candidateId: string,
    eventType: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void> {
    this.logger.log(
      `Syncing candidate ${candidateId} (${eventType}) to Workday`,
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
   * Sync an interview to Workday
   */
  async syncInterview(
    tenantId: string,
    interviewId: string,
    eventType: 'scheduled' | 'completed',
  ): Promise<void> {
    this.logger.log(
      `Syncing interview ${interviewId} (${eventType}) to Workday`,
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
  // Legacy Methods (for compatibility)
  // ============================================

  async pushCandidate(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult> {
    try {
      const workdayData = mapCandidateToWorkday({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        source: candidate.source,
      });

      // Check if exists
      let existingId: string | null = null;
      if (candidate.email) {
        const existing = await this.apiService.searchCandidateByEmail(
          tenantId,
          candidate.email,
        );
        existingId = existing?.id || null;
      }

      if (existingId) {
        await this.apiService.updateCandidate(tenantId, existingId, {
          name: {
            legalFirstName: workdayData.firstName,
            legalLastName: workdayData.lastName,
          },
        });
        return { success: true, externalId: existingId };
      }

      const result = await this.apiService.createCandidate(
        tenantId,
        workdayData,
      );
      return { success: result.success, externalId: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * v1: Pull is not supported
   */
  async pullCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<StandardCandidate[]> {
    throw new Error(
      'Workday v1 does not support inbound sync. TalentSync is the system of record.',
    );
  }

  async handleWebhook(tenantId: string, event: unknown): Promise<void> {
    this.logger.warn('Workday webhooks not supported in v1');
  }

  // ============================================
  // Status & Observability
  // ============================================

  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    tokenValid: boolean;
    tokenExpiresAt?: Date;
    tenantUrl?: string;
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
      where: { tenantId_provider: { tenantId, provider: 'workday' } },
    });

    if (!integration) {
      return { connected: false, tokenValid: false };
    }

    const tokenInfo = await this.authService.getTokenInfo(tenantId);
    const stats = await this.syncLogService.getSummary24h(tenantId, 'workday');

    return {
      connected: integration.status === 'connected',
      tokenValid: tokenInfo.valid,
      tokenExpiresAt: tokenInfo.expiresAt,
      tenantUrl: tokenInfo.tenantUrl,
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

  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.apiService.testConnection(tenantId);
  }
}
