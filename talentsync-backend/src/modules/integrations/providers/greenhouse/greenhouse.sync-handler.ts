import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { GreenhouseApiService } from './greenhouse.api';
import { SyncLogService } from '../../services/sync-log.service';
import {
  splitName,
  formatInterviewNote,
  mapStageToGreenhouse,
} from './greenhouse.mapping';

@Injectable()
export class GreenhouseSyncHandler {
  private readonly logger = new Logger(GreenhouseSyncHandler.name);

  constructor(
    private prisma: PrismaService,
    private apiService: GreenhouseApiService,
    private syncLogService: SyncLogService,
  ) {}

  // ============================================
  // Inbound Sync (Greenhouse → TalentSync)
  // ============================================

  /**
   * Main entry point for full sync
   */
  async syncAll(
    tenantId: string,
    _module?: string,
  ): Promise<{
    imported: number;
    updated: number;
    errors: number;
    module: string;
  }> {
    this.logger.log(`Starting Greenhouse inbound sync for tenant ${tenantId}`);

    // Sync jobs first (as hiring context)
    await this.syncJobs(tenantId);

    // Then sync candidates with feedback
    const result = await this.syncCandidates(tenantId);

    return result;
  }

  /**
   * Sync job requisitions as read-only hiring context
   */
  async syncJobs(tenantId: string): Promise<void> {
    try {
      const jobs = await this.apiService.getJobsParsed(tenantId);

      for (const job of jobs) {
        try {
          await this.prisma.opportunityContext.upsert({
            where: {
              tenantId_provider_externalId: {
                tenantId,
                provider: 'greenhouse',
                externalId: job.id,
              },
            },
            create: {
              tenantId,
              provider: 'greenhouse',
              externalId: job.id,
              name: job.title,
              stageName: job.status,
              accountName: job.department,
              rawData: job.rawData,
            },
            update: {
              name: job.title,
              stageName: job.status,
              accountName: job.department,
              rawData: job.rawData,
              updatedAt: new Date(),
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to sync job ${job.id}: ${err}`);
        }
      }

      this.logger.log(`Synced ${jobs.length} Greenhouse jobs`);
    } catch (error) {
      this.logger.error(`Failed to sync Greenhouse jobs: ${error}`);
    }
  }

  /**
   * Sync candidates with deduplication and feedback
   */
  async syncCandidates(tenantId: string): Promise<{
    imported: number;
    updated: number;
    errors: number;
    module: string;
  }> {
    let imported = 0;
    let updated = 0;
    let errors = 0;

    try {
      const integration = await this.prisma.integration.findUnique({
        where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
      });

      const candidates = await this.apiService.getCandidates(tenantId);

      for (const candidate of candidates) {
        try {
          const email = candidate.email?.toLowerCase();
          const phone = candidate.phone;
          const fullName =
            `${candidate.firstName} ${candidate.lastName}`.trim();

          if (!fullName) {
            errors++;
            continue;
          }

          // Deduplication
          let existingCandidate = null;
          if (email) {
            existingCandidate = await this.prisma.candidate.findFirst({
              where: { tenantId, email },
            });
          }
          if (!existingCandidate && phone) {
            existingCandidate = await this.prisma.candidate.findFirst({
              where: { tenantId, phone },
            });
          }

          let candidateId: string;

          if (existingCandidate) {
            await this.prisma.candidate.update({
              where: { id: existingCandidate.id },
              data: {
                name: fullName,
                phone: phone || existingCandidate.phone,
                externalId: candidate.id,
                externalSource: 'GREENHOUSE',
                source: existingCandidate.source?.includes('GREENHOUSE')
                  ? existingCandidate.source
                  : 'GREENHOUSE_CANDIDATE',
                rawExternalData: candidate.rawData,
                updatedAt: new Date(),
              },
            });
            candidateId = existingCandidate.id;
            updated++;
          } else {
            const newCandidate = await this.prisma.candidate.create({
              data: {
                tenantId,
                name: fullName,
                email: email || null,
                phone: phone,
                stage: 'applied',
                source: 'GREENHOUSE_CANDIDATE',
                externalId: candidate.id,
                externalSource: 'GREENHOUSE',
                rawExternalData: candidate.rawData,
                tags: [],
              },
            });
            candidateId = newCandidate.id;
            await this.storeMapping(
              tenantId,
              'candidate',
              candidateId,
              candidate.id,
            );
            imported++;
          }

          // Sync historical feedback for this candidate (non-blocking)
          this.syncFeedbackForCandidate(
            tenantId,
            candidateId,
            candidate.id,
          ).catch((err) => {
            this.logger.warn(
              `Failed to sync feedback for ${candidate.id}: ${err}`,
            );
          });
        } catch (err) {
          errors++;
          this.logger.error(`Failed to sync candidate ${candidate.id}: ${err}`);
        }
      }

      if (integration) {
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: { lastSyncedAt: new Date() },
        });
      }

      this.logger.log(
        `Greenhouse sync: ${imported} imported, ${updated} updated, ${errors} errors`,
      );
    } catch (error) {
      this.logger.error(`Failed to sync Greenhouse candidates: ${error}`);
    }

    return { imported, updated, errors, module: 'candidates' };
  }

  /**
   * Sync historical interview feedback for a candidate (read-only)
   */
  async syncFeedbackForCandidate(
    tenantId: string,
    candidateId: string,
    externalCandidateId: string,
  ): Promise<void> {
    try {
      const feedbacks = await this.apiService.getFeedbackForCandidate(
        tenantId,
        externalCandidateId,
      );

      for (const fb of feedbacks) {
        try {
          await this.prisma.externalFeedbackContext.upsert({
            where: {
              tenantId_provider_externalId: {
                tenantId,
                provider: 'greenhouse',
                externalId: fb.id,
              },
            },
            create: {
              tenantId,
              provider: 'greenhouse',
              externalId: fb.id,
              candidateId,
              interviewerName: fb.interviewerName,
              interviewType: fb.interviewType,
              interviewDate: fb.interviewDate,
              overallScore: fb.overallScore,
              recommendation: fb.recommendation,
              comments: fb.comments,
              scorecard: fb.scorecard,
              rawData: fb.rawData,
            },
            update: {
              interviewerName: fb.interviewerName,
              overallScore: fb.overallScore,
              recommendation: fb.recommendation,
              comments: fb.comments,
              scorecard: fb.scorecard,
              rawData: fb.rawData,
              updatedAt: new Date(),
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to sync feedback ${fb.id}: ${err}`);
        }
      }

      this.logger.log(
        `Synced ${feedbacks.length} feedback records for candidate ${candidateId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to sync feedback for candidate ${candidateId}: ${error}`,
      );
    }
  }

  // ============================================
  // Candidate Event Handlers (Outbound)
  // ============================================

  async handleCandidateCreated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'greenhouse',
      eventType: 'CANDIDATE_CREATED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });
      if (!candidate) throw new Error('Candidate not found');

      const existingMapping = await this.getMapping(
        tenantId,
        'candidate',
        candidateId,
      );
      if (existingMapping) {
        await this.syncLogService.markSuccess(
          log.id,
          { skipped: true },
          existingMapping,
        );
        return;
      }

      let greenhouseId: string | null = null;
      if (candidate.email) {
        const existing = await this.apiService.searchCandidateByEmail(
          tenantId,
          candidate.email,
        );
        greenhouseId = existing?.id || null;
      }

      const { firstName, lastName } = splitName(candidate.name);

      if (greenhouseId) {
        await this.apiService.updateCandidate(tenantId, greenhouseId, {
          first_name: firstName,
          last_name: lastName,
        });
      } else {
        const result = await this.apiService.createCandidate(tenantId, {
          firstName,
          lastName,
          email: candidate.email || undefined,
          phone: candidate.phone || undefined,
        });
        greenhouseId = result.id;
      }

      await this.storeMapping(tenantId, 'candidate', candidateId, greenhouseId);
      await this.syncLogService.markSuccess(
        log.id,
        { greenhouseId },
        greenhouseId,
      );
      this.logger.log(
        `Synced candidate ${candidateId} to Greenhouse ${greenhouseId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      throw error;
    }
  }

  async handleCandidateUpdated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'greenhouse',
      eventType: 'CANDIDATE_UPDATED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      const greenhouseId = await this.getMapping(
        tenantId,
        'candidate',
        candidateId,
      );
      if (!greenhouseId) {
        await this.handleCandidateCreated(tenantId, candidateId);
        await this.syncLogService.markSuccess(log.id, { createdInstead: true });
        return;
      }

      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });
      if (!candidate) throw new Error('Candidate not found');

      const { firstName, lastName } = splitName(candidate.name);
      await this.apiService.updateCandidate(tenantId, greenhouseId, {
        first_name: firstName,
        last_name: lastName,
      });

      await this.syncLogService.markSuccess(
        log.id,
        { greenhouseId },
        greenhouseId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      throw error;
    }
  }

  async handleCandidateStageChanged(
    tenantId: string,
    candidateId: string,
    newStage: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'greenhouse',
      eventType: 'CANDIDATE_STAGE_CHANGED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      payload: { newStage },
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      let greenhouseId = await this.getMapping(
        tenantId,
        'candidate',
        candidateId,
      );
      if (!greenhouseId) {
        await this.handleCandidateCreated(tenantId, candidateId);
        greenhouseId = await this.getMapping(
          tenantId,
          'candidate',
          candidateId,
        );
      }

      if (greenhouseId) {
        const ghStage = mapStageToGreenhouse(newStage);
        await this.apiService.addNote(
          tenantId,
          greenhouseId,
          `Stage changed to: ${ghStage} (TalentSync: ${newStage})`,
        );
      }

      await this.syncLogService.markSuccess(
        log.id,
        { greenhouseId, newStage },
        greenhouseId || undefined,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      throw error;
    }
  }

  async handleInterviewScheduled(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'greenhouse',
      eventType: 'INTERVIEW_SCHEDULED',
      direction: 'OUTBOUND',
      entityType: 'INTERVIEW',
      entityId: interviewId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: { candidate: true },
      });
      if (!interview) throw new Error('Interview not found');

      let greenhouseId = await this.getMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );
      if (!greenhouseId) {
        await this.handleCandidateCreated(tenantId, interview.candidateId);
        greenhouseId = await this.getMapping(
          tenantId,
          'candidate',
          interview.candidateId,
        );
      }

      if (!greenhouseId) throw new Error('Failed to sync candidate');

      const interviewers = await this.prisma.user.findMany({
        where: { id: { in: interview.interviewerIds } },
        select: { name: true },
      });

      const note = formatInterviewNote({
        stage: interview.stage,
        notes: interview.notes,
        status: interview.status,
        date: interview.date,
        interviewerNames: interviewers
          .map((i) => i.name)
          .filter(Boolean) as string[],
      });

      const result = await this.apiService.addNote(
        tenantId,
        greenhouseId,
        note,
      );
      await this.storeMapping(tenantId, 'interview', interviewId, result.id);
      await this.syncLogService.markSuccess(
        log.id,
        { noteId: result.id },
        result.id,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      throw error;
    }
  }

  async handleInterviewCompleted(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'greenhouse',
      eventType: 'INTERVIEW_COMPLETED',
      direction: 'OUTBOUND',
      entityType: 'INTERVIEW',
      entityId: interviewId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
      });
      if (!interview) throw new Error('Interview not found');

      const greenhouseId = await this.getMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );
      if (greenhouseId) {
        await this.apiService.addNote(
          tenantId,
          greenhouseId,
          `✅ Interview Completed: ${interview.stage || 'Interview'}`,
        );
      }

      await this.syncLogService.markSuccess(
        log.id,
        { greenhouseId },
        greenhouseId || undefined,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      throw error;
    }
  }

  private async getMapping(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<string | null> {
    const mapping = await this.prisma.integrationMapping.findUnique({
      where: {
        tenantId_provider_entityType_entityId: {
          tenantId,
          provider: 'greenhouse',
          entityType,
          entityId,
        },
      },
    });
    return mapping?.externalId || null;
  }

  private async storeMapping(
    tenantId: string,
    entityType: string,
    entityId: string,
    externalId: string,
  ): Promise<void> {
    await this.prisma.integrationMapping.upsert({
      where: {
        tenantId_provider_entityType_entityId: {
          tenantId,
          provider: 'greenhouse',
          entityType,
          entityId,
        },
      },
      create: {
        tenantId,
        provider: 'greenhouse',
        entityType,
        entityId,
        externalId,
      },
      update: { externalId },
    });
  }
}
