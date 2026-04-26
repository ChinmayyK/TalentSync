import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import {
  ProviderCapabilities,
  StandardCandidate,
  SyncResult,
} from '../../types/standard-entities';
import { LeverAuthService } from './lever.auth';
import { LeverApiService } from './lever.api';
import { LeverSyncHandler } from './lever.sync-handler';
import { SyncLogService } from '../../services/sync-log.service';

/**
 * Lever ATS Integration Provider
 *
 * v1 Capabilities:
 * - Candidate sync: push (TalentSync → Lever Opportunities)
 * - Job sync: push (TalentSync → Lever Postings)
 * - Interview sync: push (TalentSync → Lever Notes)
 * - Webhooks: not supported in v1
 */
@Injectable()
export class LeverProvider implements IntegrationProvider {
  private readonly logger = new Logger(LeverProvider.name);

  constructor(
    private prisma: PrismaService,
    private authService: LeverAuthService,
    private apiService: LeverApiService,
    private syncHandler: LeverSyncHandler,
    private syncLogService: SyncLogService,
  ) {}

  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'push',
      jobSync: 'push',
      interviewSync: 'push',
      supportsWebhooks: false,
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

  async syncCandidate(
    tenantId: string,
    candidateId: string,
    eventType: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void> {
    this.logger.log(`Syncing candidate ${candidateId} (${eventType}) to Lever`);

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

  async syncInterview(
    tenantId: string,
    interviewId: string,
    eventType: 'scheduled' | 'completed',
  ): Promise<void> {
    this.logger.log(`Syncing interview ${interviewId} (${eventType}) to Lever`);

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
  // Legacy Methods
  // ============================================

  async pushCandidate(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult> {
    try {
      let existingId: string | null = null;
      if (candidate.email) {
        const existing = await this.apiService.searchOpportunityByEmail(
          tenantId,
          candidate.email,
        );
        existingId = existing?.id || null;
      }

      if (existingId) {
        await this.apiService.updateOpportunity(tenantId, existingId, {
          name: candidate.name,
          emails: candidate.email ? [candidate.email] : [],
        });
        return { success: true, externalId: existingId };
      }

      const result = await this.apiService.createOpportunity(tenantId, {
        name: candidate.name,
        email: candidate.email || undefined,
        phone: candidate.phone || undefined,
        origin: candidate.source || 'TalentSync',
      });

      return { success: result.success, externalId: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  async pullCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<StandardCandidate[]> {
    throw new Error(
      'Lever v1 does not support inbound sync. TalentSync is the system of record.',
    );
  }

  async handleWebhook(tenantId: string, event: unknown): Promise<void> {
    this.logger.warn('Lever webhooks not supported in v1');
  }

  // ============================================
  // Status & Observability
  // ============================================

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
      where: { tenantId_provider: { tenantId, provider: 'lever' } },
    });

    if (!integration) {
      return { connected: false, tokenValid: false };
    }

    const tokenInfo = await this.authService.getTokenInfo(tenantId);
    const stats = await this.syncLogService.getSummary24h(tenantId, 'lever');

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

  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.apiService.testConnection(tenantId);
  }
}
