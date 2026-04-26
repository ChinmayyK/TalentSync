import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ProviderFactory } from '../provider.factory';
import { AuditService } from '../../audit/audit.service';
import {
  IntegrationEventType,
  SyncEntityType,
} from '../types/standard-entities';
import { ZohoSyncService } from '../zoho/zoho.sync.service';
import { SalesforceSyncHandler } from '../providers/salesforce/salesforce.sync-handler';
import { HubspotSyncHandler } from '../providers/hubspot/hubspot.sync-handler';
import { WorkdaySyncHandler } from '../providers/workday/workday.sync-handler';
import { LeverSyncHandler } from '../providers/lever/lever.sync-handler';
import { GreenhouseSyncHandler } from '../providers/greenhouse/greenhouse.sync-handler';

/**
 * Provider interface for sync operations
 * Used by sync processor to call provider-specific sync methods
 */
interface SyncableProvider {
  syncCandidate?(
    tenantId: string,
    candidateId: string,
    eventType: 'created' | 'updated' | 'stage_changed',
    data?: { newStage?: string },
  ): Promise<void>;
  syncInterview?(
    tenantId: string,
    interviewId: string,
    eventType: 'scheduled' | 'completed',
  ): Promise<void>;
  pushCandidate?(tenantId: string, candidate: any): Promise<any>;
  pushInterview?(tenantId: string, interview: any): Promise<any>;
}

interface SyncJobData {
  tenantId: string;
  provider: string;
  since?: string;
  triggeredBy?: string;
  module?: 'leads' | 'contacts' | 'both'; // For Zoho: which module(s) to sync
}

interface EventJobData {
  tenantId: string;
  provider: string;
  eventType: IntegrationEventType;
  entityType: SyncEntityType;
  entityId: string;
  data?: Record<string, unknown>;
  triggeredBy?: string;
  direction: 'OUTBOUND' | 'INBOUND';
}

@Processor('integration-sync')
@Injectable()
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private prisma: PrismaService,
    private providerFactory: ProviderFactory,
    private auditService: AuditService,
    private zohoSyncService: ZohoSyncService,
    private salesforceSyncHandler: SalesforceSyncHandler,
    private hubspotSyncHandler: HubspotSyncHandler,
    private workdaySyncHandler: WorkdaySyncHandler,
    private leverSyncHandler: LeverSyncHandler,
    private greenhouseSyncHandler: GreenhouseSyncHandler,
  ) {
    super();
  }

  async process(job: Job<SyncJobData | EventJobData>): Promise<any> {
    // Handle event-driven jobs (from IntegrationEventsService)
    if (job.name === 'integration-event') {
      return this.processEventJob(job.data as EventJobData);
    }

    // Handle legacy full sync jobs
    return this.processFullSyncJob(job.data as SyncJobData);
  }

  /**
   * Process event-driven sync jobs
   * Routes events to provider-specific sync handlers
   */
  private async processEventJob(data: EventJobData): Promise<any> {
    const { tenantId, provider, eventType, entityType, entityId, triggeredBy } =
      data;

    this.logger.log(
      `Processing integration event: ${eventType} for ${entityType}/${entityId} to ${provider}`,
    );

    try {
      const providerInstance = this.providerFactory.getProvider(provider);

      // Route to provider-specific handlers based on entity type
      switch (entityType) {
        case SyncEntityType.CANDIDATE:
          await this.syncCandidateEvent(
            providerInstance,
            tenantId,
            entityId,
            eventType,
            data.data,
          );
          break;

        case SyncEntityType.INTERVIEW:
          await this.syncInterviewEvent(
            providerInstance,
            tenantId,
            entityId,
            eventType,
          );
          break;

        case SyncEntityType.JOB:
          // Job sync not yet implemented in v1
          this.logger.debug(`Job sync not yet implemented for ${provider}`);
          break;

        default:
          this.logger.warn(`Unknown entity type: ${entityType}`);
      }

      // Update last synced timestamp
      await this.prisma.integration.update({
        where: {
          tenantId_provider: { tenantId, provider },
        },
        data: {
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

      return { success: true, eventType, entityType, entityId };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Event sync failed for ${eventType}/${entityId} to ${provider}: ${errorMessage}`,
      );

      // Update integration with error (but don't fail the whole integration)
      await this.prisma.integration.update({
        where: {
          tenantId_provider: { tenantId, provider },
        },
        data: {
          lastError: `Event sync failed: ${errorMessage}`,
        },
      });

      throw error; // Re-throw to trigger BullMQ retry
    }
  }

  /**
   * Sync candidate events to external provider
   */
  private async syncCandidateEvent(
    provider: any,
    tenantId: string,
    candidateId: string,
    eventType: IntegrationEventType,
    data?: Record<string, unknown>,
  ): Promise<void> {
    // Check if provider supports candidate sync via the syncCandidate method
    if (typeof provider.syncCandidate === 'function') {
      const syncableProvider = provider as SyncableProvider;

      switch (eventType) {
        case IntegrationEventType.CANDIDATE_CREATED:
          await syncableProvider.syncCandidate!(
            tenantId,
            candidateId,
            'created',
          );
          break;

        case IntegrationEventType.CANDIDATE_UPDATED:
          await syncableProvider.syncCandidate!(
            tenantId,
            candidateId,
            'updated',
          );
          break;

        case IntegrationEventType.CANDIDATE_STAGE_CHANGED:
          const newStage = data?.newStage as string | undefined;
          await syncableProvider.syncCandidate!(
            tenantId,
            candidateId,
            'stage_changed',
            { newStage },
          );
          break;

        default:
          this.logger.debug(`Unhandled candidate event type: ${eventType}`);
      }
    } else if (provider.pushCandidate) {
      // Fallback to legacy pushCandidate method
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });
      if (candidate) {
        await provider.pushCandidate(tenantId, candidate);
      }
    }
  }

  /**
   * Sync interview events to external provider
   */
  private async syncInterviewEvent(
    provider: any,
    tenantId: string,
    interviewId: string,
    eventType: IntegrationEventType,
  ): Promise<void> {
    // Check if provider supports interview sync via the syncInterview method
    if (typeof provider.syncInterview === 'function') {
      const syncableProvider = provider as SyncableProvider;

      switch (eventType) {
        case IntegrationEventType.INTERVIEW_SCHEDULED:
        case IntegrationEventType.INTERVIEW_RESCHEDULED:
          await syncableProvider.syncInterview!(
            tenantId,
            interviewId,
            'scheduled',
          );
          break;

        case IntegrationEventType.INTERVIEW_COMPLETED:
          await syncableProvider.syncInterview!(
            tenantId,
            interviewId,
            'completed',
          );
          break;

        case IntegrationEventType.INTERVIEW_CANCELLED:
          // Cancelled interviews - could update activity status
          this.logger.debug(`Interview cancelled sync not yet implemented`);
          break;

        default:
          this.logger.debug(`Unhandled interview event type: ${eventType}`);
      }
    } else if (provider.pushInterview) {
      // Fallback to legacy pushInterview method
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: { candidate: true },
      });
      if (interview) {
        await provider.pushInterview(tenantId, {
          internalId: interview.id,
          candidateId: interview.candidateId,
          interviewerIds: interview.interviewerIds,
          startAt: interview.date,
          durationMins: interview.durationMins,
          stage: interview.stage,
          status: interview.status,
          meetingLink: interview.meetingLink || undefined,
          notes: interview.notes || undefined,
        });
      }
    }
  }

  /**
   * Process full sync jobs (legacy - for manual sync triggers)
   */
  private async processFullSyncJob(data: SyncJobData): Promise<any> {
    const { tenantId, provider, since, triggeredBy } = data;

    this.logger.log(
      `Processing full sync job for tenant ${tenantId}, provider ${provider}`,
    );

    // Check if integration requires re-authentication
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider },
      select: { status: true },
    });

    if (integration?.status === 'auth_required') {
      this.logger.warn(
        `Skipping sync for ${provider} - authentication required. Admin must reconnect.`,
      );
      // Don't throw error - just return success: false to avoid retries
      return {
        success: false,
        skipped: true,
        reason: 'Authentication required. Admin must reconnect.',
      };
    }

    try {
      const providerInstance = this.providerFactory.getProvider(provider);

      // Special handling for Zoho - use dedicated ZohoSyncService
      if (provider === 'zoho') {
        const module = (data as any).module || 'leads';
        this.logger.log(
          `Using ZohoSyncService for inbound sync (module: ${module})`,
        );
        const result = await this.zohoSyncService.syncAll(tenantId, module);

        // Create audit log
        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            ...result,
            triggeredBy,
          },
        });

        return { success: true, ...result };
      }

      // Special handling for Salesforce - use dedicated SalesforceSyncHandler
      if (provider === 'salesforce') {
        const module = (data as any).module || 'all';
        this.logger.log(
          `Using SalesforceSyncHandler for inbound sync (module: ${module})`,
        );
        const result = await this.salesforceSyncHandler.syncAll(
          tenantId,
          module,
        );

        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            ...result,
            triggeredBy,
          },
        });

        return { success: true, ...result };
      }

      // Special handling for HubSpot - use dedicated HubspotSyncHandler
      if (provider === 'hubspot') {
        this.logger.log(`Using HubspotSyncHandler for inbound sync`);
        const result = await this.hubspotSyncHandler.syncAll(tenantId);

        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            ...result,
            triggeredBy,
          },
        });

        return { success: true, ...result };
      }

      // Special handling for Workday - use dedicated WorkdaySyncHandler
      if (provider === 'workday') {
        this.logger.log(`Using WorkdaySyncHandler for inbound sync`);
        const result = await this.workdaySyncHandler.syncAll(tenantId);

        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            ...result,
            triggeredBy,
          },
        });

        return { success: true, ...result };
      }

      // Special handling for Lever - use dedicated LeverSyncHandler
      if (provider === 'lever') {
        this.logger.log(`Using LeverSyncHandler for inbound sync`);
        const result = await this.leverSyncHandler.syncAll(tenantId);

        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            ...result,
            triggeredBy,
          },
        });

        return { success: true, ...result };
      }

      // Special handling for Greenhouse - use dedicated GreenhouseSyncHandler
      if (provider === 'greenhouse') {
        this.logger.log(`Using GreenhouseSyncHandler for inbound sync`);
        const result = await this.greenhouseSyncHandler.syncAll(tenantId);

        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            ...result,
            triggeredBy,
          },
        });

        return { success: true, ...result };
      }

      // Pull candidates from provider (inbound sync - for non-Zoho/Salesforce/HubSpot/Workday/Lever/Greenhouse providers)
      if (providerInstance.pullCandidates) {
        const sinceDate = since ? new Date(since) : undefined;
        const candidates = await providerInstance.pullCandidates(
          tenantId,
          sinceDate,
        );

        this.logger.log(
          `Pulled ${candidates.length} candidates from ${provider}`,
        );

        // Process and save candidates to database
        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const candidate of candidates) {
          try {
            // Check if candidate already exists by email (primary identifier)
            let existing = null;
            if (candidate.email) {
              existing = await this.prisma.candidate.findFirst({
                where: {
                  tenantId,
                  email: candidate.email,
                },
              });
            }

            // If no email match, try phone
            if (!existing && candidate.phone) {
              existing = await this.prisma.candidate.findFirst({
                where: {
                  tenantId,
                  phone: candidate.phone,
                },
              });
            }

            if (existing) {
              // Update existing candidate
              await this.prisma.candidate.update({
                where: { id: existing.id },
                data: {
                  name: candidate.name || existing.name,
                  email: candidate.email || existing.email,
                  phone: candidate.phone || existing.phone,
                  source: candidate.source || existing.source,
                  notes: candidate.notes
                    ? `${existing.notes || ''}\n\n[Sync ${new Date().toISOString()}]: ${candidate.notes}`
                    : existing.notes,
                },
              });
              updated++;
            } else {
              // Create new candidate
              await this.prisma.candidate.create({
                data: {
                  tenantId,
                  name: candidate.name || 'Unknown',
                  email: candidate.email,
                  phone: candidate.phone,
                  source: candidate.source || provider,
                  stage: 'applied',
                  notes: candidate.notes,
                  tags: [`sync:${provider}`],
                },
              });
              created++;
            }
          } catch (err: unknown) {
            const errMessage =
              err instanceof Error ? err.message : 'Unknown error';
            this.logger.warn(`Failed to upsert candidate: ${errMessage}`);
            skipped++;
          }
        }

        this.logger.log(
          `Sync complete: created=${created}, updated=${updated}, skipped=${skipped}`,
        );

        // Update integration status
        await this.prisma.integration.update({
          where: {
            tenantId_provider: {
              tenantId,
              provider,
            },
          },
          data: {
            lastSyncedAt: new Date(),
            lastError: null,
          },
        });

        // Create audit log
        await this.auditService.log({
          tenantId,
          userId: null,
          action: 'integration.sync.completed',
          metadata: {
            provider,
            candidatesCount: candidates.length,
            created,
            updated,
            skipped,
            triggeredBy,
          },
        });

        return {
          success: true,
          candidatesCount: candidates.length,
          created,
          updated,
          skipped,
        };
      }

      return { success: true, message: 'No sync action available' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Sync job failed for tenant ${tenantId}, provider ${provider}`,
        error,
      );

      // Update integration with error
      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
        data: {
          lastError: errorMessage,
        },
      });

      // Create audit log for failure
      await this.auditService.log({
        tenantId,
        userId: null,
        action: 'integration.sync.failed',
        metadata: {
          provider,
          error: errorMessage,
          triggeredBy,
        },
      });

      throw error; // Re-throw to trigger retry
    }
  }
}
