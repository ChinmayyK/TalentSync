import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { ZohoApiService } from './zoho.api';
import { SyncLogService } from '../../services/sync-log.service';
import {
  getZohoMapping,
  getZohoModule,
  mapStageToZohoStatus,
  createInterviewActivity,
} from './zoho.mapping';
import { applyMapping } from '../../utils/mapping.util';

/**
 * Zoho Sync Handler
 *
 * Handles event-driven synchronization between TalentSync and Zoho CRM.
 * All sync operations are outbound-only (TalentSync → Zoho).
 */
@Injectable()
export class ZohoSyncHandler {
  private readonly logger = new Logger(ZohoSyncHandler.name);
  private readonly provider = 'zoho';

  constructor(
    private prisma: PrismaService,
    private zohoApi: ZohoApiService,
    private syncLog: SyncLogService,
  ) {}

  /**
   * Handle candidate created event
   * Creates a new Contact/Lead in Zoho
   */
  async handleCandidateCreated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const logEntry = await this.syncLog.createLog({
      tenantId,
      provider: this.provider,
      eventType: 'candidate_created',
      direction: 'OUTBOUND',
      entityType: 'candidate',
      entityId: candidateId,
    });

    try {
      await this.syncLog.markInProgress(logEntry.id);

      // Fetch candidate data
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      // Get integration settings
      const integration = await this.getIntegration(tenantId);
      const mappingConfig = getZohoMapping(integration?.settings);
      const module = getZohoModule(integration?.settings);

      // Prepare candidate data for mapping
      const candidateData = this.prepareCandidateData(candidate);

      // Apply field mapping
      const zohoData = applyMapping(candidateData, mappingConfig);

      // Add stage status
      if (candidate.stage) {
        zohoData.Lead_Status = mapStageToZohoStatus(candidate.stage);
      }

      // Create in Zoho
      let result: any;
      if (module === 'Leads') {
        result = await this.zohoApi.createLead(tenantId, zohoData);
      } else {
        result = await this.zohoApi.createContact(tenantId, zohoData);
      }

      // Store external ID mapping
      const externalId = result?.details?.id || result?.id;
      if (externalId) {
        await this.storeExternalMapping(
          tenantId,
          'candidate',
          candidateId,
          externalId,
        );
      }

      await this.syncLog.markSuccess(logEntry.id, result, externalId);
      this.logger.log(`Synced candidate ${candidateId} to Zoho as ${module}`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to sync candidate ${candidateId} to Zoho: ${error.message}`,
      );
      await this.syncLog.markFailed(logEntry.id, error.message, 0);
      throw error;
    }
  }

  /**
   * Handle candidate updated event
   * Updates existing Contact/Lead in Zoho, or creates if not exists
   */
  async handleCandidateUpdated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const logEntry = await this.syncLog.createLog({
      tenantId,
      provider: this.provider,
      eventType: 'candidate_updated',
      direction: 'OUTBOUND',
      entityType: 'candidate',
      entityId: candidateId,
    });

    try {
      await this.syncLog.markInProgress(logEntry.id);

      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      const integration = await this.getIntegration(tenantId);
      const mappingConfig = getZohoMapping(integration?.settings);
      const module = getZohoModule(integration?.settings);

      const candidateData = this.prepareCandidateData(candidate);
      const zohoData = applyMapping(candidateData, mappingConfig);

      if (candidate.stage) {
        zohoData.Lead_Status = mapStageToZohoStatus(candidate.stage);
      }

      // Check for existing Zoho ID
      const existingMapping = await this.getExternalMapping(
        tenantId,
        'candidate',
        candidateId,
      );

      let result: any;
      let externalId: string | undefined;

      if (existingMapping) {
        // Update existing record
        if (module === 'Leads') {
          result = await this.zohoApi.updateLead(
            tenantId,
            existingMapping.externalId,
            zohoData,
          );
        } else {
          result = await this.zohoApi.updateContact(
            tenantId,
            existingMapping.externalId,
            zohoData,
          );
        }
        externalId = existingMapping.externalId;
      } else {
        // Try to find by email, or create new
        if (candidate.email) {
          const existing = await this.zohoApi.searchContactByEmail(
            tenantId,
            candidate.email,
          );
          if (existing) {
            if (module === 'Leads') {
              result = await this.zohoApi.updateLead(
                tenantId,
                existing.id,
                zohoData,
              );
            } else {
              result = await this.zohoApi.updateContact(
                tenantId,
                existing.id,
                zohoData,
              );
            }
            externalId = existing.id;
            if (externalId) {
              await this.storeExternalMapping(
                tenantId,
                'candidate',
                candidateId,
                externalId,
              );
            }
          } else {
            // Create new
            if (module === 'Leads') {
              result = await this.zohoApi.createLead(tenantId, zohoData);
            } else {
              result = await this.zohoApi.createContact(tenantId, zohoData);
            }
            externalId = result?.details?.id || result?.id;
            if (externalId) {
              await this.storeExternalMapping(
                tenantId,
                'candidate',
                candidateId,
                externalId,
              );
            }
          }
        } else {
          // No email - create new
          if (module === 'Leads') {
            result = await this.zohoApi.createLead(tenantId, zohoData);
          } else {
            result = await this.zohoApi.createContact(tenantId, zohoData);
          }
          externalId = result?.details?.id || result?.id;
        }
      }

      await this.syncLog.markSuccess(logEntry.id, result, externalId);
      this.logger.log(`Updated candidate ${candidateId} in Zoho`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to update candidate ${candidateId} in Zoho: ${error.message}`,
      );
      await this.syncLog.markFailed(logEntry.id, error.message, 0);
      throw error;
    }
  }

  /**
   * Handle candidate stage change event
   * Updates the Lead Status field in Zoho
   */
  async handleStageChanged(
    tenantId: string,
    candidateId: string,
    newStage: string,
  ): Promise<void> {
    const logEntry = await this.syncLog.createLog({
      tenantId,
      provider: this.provider,
      eventType: 'candidate_stage_changed',
      direction: 'OUTBOUND',
      entityType: 'candidate',
      entityId: candidateId,
      payload: { newStage },
    });

    try {
      await this.syncLog.markInProgress(logEntry.id);

      const existingMapping = await this.getExternalMapping(
        tenantId,
        'candidate',
        candidateId,
      );

      if (!existingMapping) {
        // No existing Zoho record - do full sync instead
        await this.handleCandidateUpdated(tenantId, candidateId);
        return;
      }

      const integration = await this.getIntegration(tenantId);
      const module = getZohoModule(integration?.settings);

      const updateData = {
        Lead_Status: mapStageToZohoStatus(newStage),
      };

      let result: any;
      if (module === 'Leads') {
        result = await this.zohoApi.updateLead(
          tenantId,
          existingMapping.externalId,
          updateData,
        );
      } else {
        result = await this.zohoApi.updateContact(
          tenantId,
          existingMapping.externalId,
          updateData,
        );
      }

      await this.syncLog.markSuccess(
        logEntry.id,
        result,
        existingMapping.externalId,
      );
      this.logger.log(
        `Updated stage for candidate ${candidateId} to ${newStage} in Zoho`,
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to update stage for ${candidateId}: ${error.message}`,
      );
      await this.syncLog.markFailed(logEntry.id, error.message, 0);
      throw error;
    }
  }

  /**
   * Handle interview scheduled event
   * Creates an Activity in Zoho linked to the Contact/Lead
   */
  async handleInterviewScheduled(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const logEntry = await this.syncLog.createLog({
      tenantId,
      provider: this.provider,
      eventType: 'interview_scheduled',
      direction: 'OUTBOUND',
      entityType: 'interview',
      entityId: interviewId,
    });

    try {
      await this.syncLog.markInProgress(logEntry.id);

      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: { candidate: true },
      });

      if (!interview) {
        throw new Error(`Interview ${interviewId} not found`);
      }

      // Get candidate's Zoho ID
      const candidateMapping = await this.getExternalMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );

      if (!candidateMapping) {
        // Candidate not synced yet - sync first
        await this.handleCandidateCreated(tenantId, interview.candidateId);
      }

      // Create activity
      const activityData = createInterviewActivity({
        candidateName: interview.candidate?.name || 'Unknown',
        interviewerName: undefined, // Would need to join with users
        scheduledAt: interview.date,
        duration: interview.durationMins,
        type: interview.stage,
        notes: interview.notes || undefined,
        status: 'scheduled',
      });

      // Link to contact if we have the mapping
      const updatedMapping = await this.getExternalMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );

      const activityPayload: Record<string, any> = { ...activityData };
      if (updatedMapping) {
        activityPayload['What_Id'] = updatedMapping.externalId;
      }

      const result = await this.zohoApi.createActivity(
        tenantId,
        activityPayload,
      );

      // Store interview external mapping
      const externalId = result?.details?.id || result?.id;
      if (externalId) {
        await this.storeExternalMapping(
          tenantId,
          'interview',
          interviewId,
          externalId,
        );
      }

      await this.syncLog.markSuccess(logEntry.id, result, externalId);
      this.logger.log(`Created interview activity for ${interviewId} in Zoho`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to sync interview ${interviewId}: ${error.message}`,
      );
      await this.syncLog.markFailed(logEntry.id, error.message, 0);
      throw error;
    }
  }

  /**
   * Handle interview completed event
   * Updates Activity status and adds outcome
   */
  async handleInterviewCompleted(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const logEntry = await this.syncLog.createLog({
      tenantId,
      provider: this.provider,
      eventType: 'interview_completed',
      direction: 'OUTBOUND',
      entityType: 'interview',
      entityId: interviewId,
    });

    try {
      await this.syncLog.markInProgress(logEntry.id);

      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: { feedbacks: true },
      });

      if (!interview) {
        throw new Error(`Interview ${interviewId} not found`);
      }

      const interviewMapping = await this.getExternalMapping(
        tenantId,
        'interview',
        interviewId,
      );

      if (!interviewMapping) {
        // Activity doesn't exist in Zoho - create it as completed
        await this.handleInterviewScheduled(tenantId, interviewId);
        return;
      }

      // Update activity to completed
      const updateData = {
        Status: 'Completed',
        Description: interview.feedbacks?.length
          ? `Interview completed with ${interview.feedbacks.length} feedback entries`
          : 'Interview completed',
      };

      const result = await this.zohoApi.updateActivity(
        tenantId,
        interviewMapping.externalId,
        updateData,
      );

      await this.syncLog.markSuccess(
        logEntry.id,
        result,
        interviewMapping.externalId,
      );
      this.logger.log(`Updated interview ${interviewId} to completed in Zoho`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to update interview ${interviewId}: ${error.message}`,
      );
      await this.syncLog.markFailed(logEntry.id, error.message, 0);
      throw error;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async getIntegration(tenantId: string) {
    return this.prisma.integration.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: this.provider },
      },
    });
  }

  private prepareCandidateData(candidate: {
    name: string;
    email?: string | null;
    phone?: string | null;
    roleTitle?: string | null;
    source?: string | null;
    stage: string;
  }) {
    const nameParts = (candidate.name || '').split(' ');
    return {
      name: candidate.name,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
      email: candidate.email || undefined,
      phone: candidate.phone || undefined,
      roleTitle: candidate.roleTitle || undefined,
      source: candidate.source || undefined,
      stage: candidate.stage,
    };
  }

  private async storeExternalMapping(
    tenantId: string,
    entityType: string,
    entityId: string,
    externalId: string,
  ) {
    await this.prisma.integrationMapping.upsert({
      where: {
        tenantId_provider_entityType_entityId: {
          tenantId,
          provider: this.provider,
          entityType,
          entityId,
        },
      },
      create: {
        tenantId,
        provider: this.provider,
        entityType,
        entityId,
        externalId,
      },
      update: {
        externalId,
        updatedAt: new Date(),
      },
    });
  }

  private async getExternalMapping(
    tenantId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.integrationMapping.findUnique({
      where: {
        tenantId_provider_entityType_entityId: {
          tenantId,
          provider: this.provider,
          entityType,
          entityId,
        },
      },
    });
  }
}
