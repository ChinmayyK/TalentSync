import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import {
  ProviderCapabilities,
  StandardCandidate,
  SyncResult,
} from '../../types/standard-entities';
import { GreenhouseAuthService } from './greenhouse.auth';
import { GreenhouseApiService } from './greenhouse.api';
import { GreenhouseSyncHandler } from './greenhouse.sync-handler';
import { SyncLogService } from '../../services/sync-log.service';
import { splitName } from './greenhouse.mapping';

/**
 * Greenhouse ATS Integration Provider
 *
 * v1: Push-only (TalentSync → Greenhouse)
 * Uses API key auth (Harvest API)
 */
@Injectable()
export class GreenhouseProvider implements IntegrationProvider {
  private readonly logger = new Logger(GreenhouseProvider.name);

  constructor(
    private prisma: PrismaService,
    private authService: GreenhouseAuthService,
    private apiService: GreenhouseApiService,
    private syncHandler: GreenhouseSyncHandler,
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
    return this.authService.getConfigUrl(tenantId);
  }

  async exchangeCode(tenantId: string, code: string): Promise<void> {
    await this.authService.storeApiKey(tenantId, code);
  }

  async refreshTokens(tenantId: string): Promise<void> {
    // API keys don't expire
  }

  async syncCandidate(
    tenantId: string,
    candidateId: string,
    eventType: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void> {
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
    switch (eventType) {
      case 'scheduled':
        await this.syncHandler.handleInterviewScheduled(tenantId, interviewId);
        break;
      case 'completed':
        await this.syncHandler.handleInterviewCompleted(tenantId, interviewId);
        break;
    }
  }

  async pushCandidate(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult> {
    try {
      const { firstName, lastName } = splitName(candidate.name);
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
          first_name: firstName,
          last_name: lastName,
        });
        return { success: true, externalId: existingId };
      }

      const result = await this.apiService.createCandidate(tenantId, {
        firstName,
        lastName,
        email: candidate.email || undefined,
        phone: candidate.phone || undefined,
      });
      return { success: result.success, externalId: result.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown',
      };
    }
  }

  async pullCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<StandardCandidate[]> {
    throw new Error('Greenhouse v1 does not support inbound sync');
  }

  async handleWebhook(tenantId: string, event: unknown): Promise<void> {
    this.logger.warn('Greenhouse webhooks not supported in v1');
  }

  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    credentialValid: boolean;
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
      where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
    });

    if (!integration) return { connected: false, credentialValid: false };

    const credInfo = await this.authService.getCredentialInfo(tenantId);
    const stats = await this.syncLogService.getSummary24h(
      tenantId,
      'greenhouse',
    );

    return {
      connected: integration.status === 'connected',
      credentialValid: credInfo.valid,
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
