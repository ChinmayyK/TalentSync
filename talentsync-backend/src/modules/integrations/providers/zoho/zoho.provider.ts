import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import { ProviderCapabilities } from '../../types/standard-entities';
import { ZohoOAuthService } from './zoho.oauth';
import { ZohoApiService } from './zoho.api';
import { ZohoSyncHandler } from './zoho.sync-handler';
import { getZohoMapping } from './zoho.mapping';
import { applyMapping, reverseMapping } from '../../utils/mapping.util';
import { decryptObject } from '../../utils/crypto.util';
import { OAuthTokenSet } from '../../types/oauth.interface';

/**
 * Zoho CRM Integration Provider
 *
 * Reference implementation for CRM integrations.
 * v1 supports outbound sync only (TalentSync → Zoho).
 */
@Injectable()
export class ZohoProvider implements IntegrationProvider {
  constructor(
    private prisma: PrismaService,
    private zohoOAuth: ZohoOAuthService,
    private zohoApi: ZohoApiService,
    private zohoSync: ZohoSyncHandler,
  ) {}

  /**
   * Get provider capabilities
   * v1: Outbound candidate sync only
   */
  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'push', // TalentSync → Zoho only (v1)
      jobSync: 'none',
      interviewSync: 'push', // Creates activities in Zoho
      supportsWebhooks: false, // v1: No inbound webhooks
    };
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    return this.zohoOAuth.getAuthUrl(tenantId);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(tenantId: string, code: string): Promise<void> {
    await this.zohoOAuth.exchangeCode(tenantId, code);
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(tenantId: string): Promise<void> {
    await this.zohoOAuth.refreshTokens(tenantId);
  }

  /**
   * Test the connection to Zoho
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.zohoApi.testConnection(tenantId);
  }

  /**
   * Get integration status for observability
   */
  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    lastSyncAt: Date | null;
    failureCount24h: number;
    successCount24h: number;
    tokenValid: boolean;
    lastError: string | null;
  }> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'zoho' },
      },
    });

    if (!integration) {
      return {
        connected: false,
        lastSyncAt: null,
        failureCount24h: 0,
        successCount24h: 0,
        tokenValid: false,
        lastError: null,
      };
    }

    // Get 24h stats
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await this.prisma.integrationSyncLog.groupBy({
      by: ['status'],
      where: {
        tenantId,
        provider: 'zoho',
        createdAt: { gte: since },
      },
      _count: true,
    });

    let successCount = 0;
    let failureCount = 0;
    for (const log of logs) {
      if (log.status === 'SUCCESS') successCount = log._count;
      if (log.status === 'FAILED') failureCount = log._count;
    }

    // Check token validity
    let tokenValid = false;
    if (integration.tokens) {
      try {
        const tokenSet: OAuthTokenSet = decryptObject(
          integration.tokens as string,
        );
        tokenValid = !!(
          tokenSet.accessToken &&
          (!tokenSet.expiresAt || Date.now() < tokenSet.expiresAt)
        );
      } catch {
        tokenValid = false;
      }
    }

    return {
      connected: integration.status === 'connected',
      lastSyncAt: integration.lastSyncedAt,
      failureCount24h: failureCount,
      successCount24h: successCount,
      tokenValid,
      lastError: integration.lastError,
    };
  }

  // ============================================
  // Sync Event Handlers (Delegated to ZohoSyncHandler)
  // ============================================

  /**
   * Sync candidate to Zoho (triggered by events)
   */
  async syncCandidate(
    tenantId: string,
    candidateId: string,
    eventType: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void> {
    switch (eventType) {
      case 'created':
        await this.zohoSync.handleCandidateCreated(tenantId, candidateId);
        break;
      case 'updated':
        await this.zohoSync.handleCandidateUpdated(tenantId, candidateId);
        break;
      case 'stage_changed':
        if (data?.newStage) {
          await this.zohoSync.handleStageChanged(
            tenantId,
            candidateId,
            data.newStage,
          );
        } else {
          await this.zohoSync.handleCandidateUpdated(tenantId, candidateId);
        }
        break;
    }
  }

  /**
   * Sync interview to Zoho (triggered by events)
   */
  async syncInterview(
    tenantId: string,
    interviewId: string,
    eventType: 'scheduled' | 'completed',
  ): Promise<void> {
    switch (eventType) {
      case 'scheduled':
        await this.zohoSync.handleInterviewScheduled(tenantId, interviewId);
        break;
      case 'completed':
        await this.zohoSync.handleInterviewCompleted(tenantId, interviewId);
        break;
    }
  }

  // ============================================
  // Legacy Push/Pull Methods (Kept for Interface Compatibility)
  // ============================================

  /**
   * Push a candidate to Zoho CRM as a Contact
   */
  async pushCandidate(tenantId: string, candidate: any): Promise<any> {
    try {
      const integration = await this.prisma.integration.findUnique({
        where: { tenantId_provider: { tenantId, provider: 'zoho' } },
      });

      const mappingConfig = getZohoMapping(integration?.settings);
      const zohoContact = applyMapping(candidate, mappingConfig);

      if (candidate.email) {
        const existingContact = await this.zohoApi.searchContactByEmail(
          tenantId,
          candidate.email,
        );

        if (existingContact) {
          return await this.zohoApi.updateContact(
            tenantId,
            existingContact.id,
            zohoContact,
          );
        }
      }

      return await this.zohoApi.createContact(tenantId, zohoContact);
    } catch (error) {
      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'zoho' } },
        data: {
          lastError: `Push candidate failed: ${(error as Error).message}`,
        },
      });
      throw error;
    }
  }

  /**
   * Pull candidates from Zoho CRM
   * NOTE: v1 does not support inbound sync. This returns empty.
   */
  async pullCandidates(tenantId: string, since?: Date): Promise<any[]> {
    // v1: Outbound only - do not pull from Zoho
    throw new Error(
      'Inbound sync not supported in v1. TalentSync is the system of record.',
    );
  }

  /**
   * Handle incoming webhook from Zoho CRM
   * NOTE: v1 does not process inbound webhooks
   */
  async handleWebhook(tenantId: string, event: any): Promise<void> {
    // v1: Outbound only - ignore inbound webhooks
    console.log(
      `Zoho webhook received but ignored (v1 outbound only): ${event?.module}`,
    );
  }
}
