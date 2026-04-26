import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import {
  ProviderCapabilities,
  StandardCandidate,
  SyncResult,
} from '../../types/standard-entities';
import { BambooHROAuthService } from './bamboohr.oauth';
import { BambooHRApiService } from './bamboohr.api';
import { BambooHRHandoffHandler } from './bamboohr.handoff-handler';
import { SyncLogService } from '../../services/sync-log.service';

/**
 * BambooHR Integration Provider
 * Supports: Employee record creation, offer acceptance workflows
 *
 * Uses OAuth 2.0 authentication
 */
@Injectable()
export class BambooHRProvider implements IntegrationProvider {
  private readonly logger = new Logger(BambooHRProvider.name);

  constructor(
    private prisma: PrismaService,
    private oauthService: BambooHROAuthService,
    private apiService: BambooHRApiService,
    private handoffHandler: BambooHRHandoffHandler,
    private syncLogService: SyncLogService,
  ) {}

  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'write', // Create employees from hired candidates
      jobSync: 'none',
      interviewSync: 'none',
      supportsWebhooks: true,
    };
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    // BambooHR OAuth requires company domain - if not provided, redirect to domain input
    return this.oauthService.getAuthUrl(tenantId);
  }

  async exchangeCode(
    tenantId: string,
    code: string,
    companyDomain?: string,
  ): Promise<void> {
    if (!companyDomain) {
      throw new Error('Company domain is required for BambooHR');
    }
    await this.oauthService.exchangeCode(tenantId, code, companyDomain);
  }

  async refreshTokens(tenantId: string): Promise<void> {
    await this.oauthService.refreshTokens(tenantId);
  }

  /**
   * Sync candidate - triggers employee creation when stage is 'hired'
   */
  async syncCandidate(
    tenantId: string,
    candidateId: string,
    action: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void> {
    this.logger.log(
      `BambooHR syncCandidate called: action=${action}, candidateId=${candidateId}, newStage=${data?.newStage}`,
    );

    // Only create employee when stage changes to 'hired'
    if (
      action === 'stage_changed' &&
      data?.newStage?.toLowerCase() === 'hired'
    ) {
      this.logger.log(
        `Candidate ${candidateId} marked as hired - creating employee in BambooHR`,
      );
      await this.handoffHandler.handleCandidateHired(tenantId, candidateId);
    } else {
      this.logger.log(
        `BambooHR skipping - action is ${action}, stage is ${data?.newStage} (need 'stage_changed' and 'hired')`,
      );
    }
  }

  /**
   * Create employee record from hired candidate
   */
  async pushCandidate(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult> {
    if (!candidate.internalId) {
      return { success: false, error: 'Candidate internalId required' };
    }
    const result = await this.handoffHandler.handleCandidateHired(
      tenantId,
      candidate.internalId,
    );
    return {
      success: result.success,
      externalId: result.employeeId,
      error: result.error,
    };
  }

  /**
   * Pull employees from BambooHR - NOT SUPPORTED
   * TalentSync doesn't manage employees
   */
  async pullCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<StandardCandidate[]> {
    this.logger.log(
      `BambooHR pull not supported - TalentSync doesn't manage employees`,
    );
    return [];
  }

  /**
   * Handle offer acceptance workflow
   */
  async handleOfferAccepted(
    tenantId: string,
    candidateId: string,
    offerData: {
      startDate: Date;
      department?: string;
      jobTitle?: string;
      salary?: number;
    },
  ): Promise<SyncResult> {
    const result = await this.handoffHandler.handleOfferAccepted(
      tenantId,
      candidateId,
      {
        startDate: offerData.startDate,
        department: offerData.department,
      },
    );
    return {
      success: result.success,
      externalId: result.employeeId,
      error: result.error,
    };
  }

  async handleWebhook(tenantId: string, event: any): Promise<void> {
    // BambooHR webhooks: employee_added, employee_changed, etc.
    this.logger.log(`BambooHR webhook for tenant ${tenantId}`, event);
  }
}
