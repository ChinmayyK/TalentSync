import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { LeverApiService } from './lever.api';
import { SyncLogService } from '../../services/sync-log.service';
import { mapStageToLever, formatInterviewNote } from './lever.mapping';

/**
 * Lever Sync Handler
 *
 * Event-driven synchronization from TalentSync to Lever.
 * Lever calls candidates "Opportunities"
 */
@Injectable()
export class LeverSyncHandler {
  private readonly logger = new Logger(LeverSyncHandler.name);

  constructor(
    private prisma: PrismaService,
    private apiService: LeverApiService,
    private syncLogService: SyncLogService,
  ) {}

  // ============================================
  // Inbound Sync (Lever → TalentSync)
  // ============================================

  /**
   * Main entry point for full sync (called by sync processor)
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
    this.logger.log(`Starting Lever inbound sync for tenant ${tenantId}`);

    // Sync job postings first (as hiring context)
    await this.syncJobPostings(tenantId);

    // Then sync candidates
    const result = await this.syncCandidates(tenantId);

    return result;
  }

  /**
   * Sync job postings as read-only hiring context
   */
  async syncJobPostings(tenantId: string): Promise<void> {
    try {
      const postings = await this.apiService.getJobPostings(tenantId);

      for (const posting of postings) {
        try {
          await this.prisma.opportunityContext.upsert({
            where: {
              tenantId_provider_externalId: {
                tenantId,
                provider: 'lever',
                externalId: posting.id,
              },
            },
            create: {
              tenantId,
              provider: 'lever',
              externalId: posting.id,
              name: posting.title,
              stageName: posting.state,
              accountName: posting.department,
              rawData: posting.rawData,
            },
            update: {
              name: posting.title,
              stageName: posting.state,
              accountName: posting.department,
              rawData: posting.rawData,
              updatedAt: new Date(),
            },
          });
        } catch (err) {
          this.logger.warn(`Failed to sync job posting ${posting.id}: ${err}`);
        }
      }

      this.logger.log(`Synced ${postings.length} Lever job postings`);
    } catch (error) {
      this.logger.error(`Failed to sync Lever job postings: ${error}`);
    }
  }

  /**
   * Sync candidates with deduplication
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
        where: { tenantId_provider: { tenantId, provider: 'lever' } },
      });

      const candidates = await this.apiService.getCandidates(tenantId);

      for (const candidate of candidates) {
        try {
          const email = candidate.email?.toLowerCase();
          const phone = candidate.phone;
          const name = candidate.name;

          if (!name) {
            errors++;
            continue;
          }

          // Deduplication: Check by email first, then phone
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

          if (existingCandidate) {
            await this.prisma.candidate.update({
              where: { id: existingCandidate.id },
              data: {
                name,
                phone: phone || existingCandidate.phone,
                roleTitle: candidate.jobTitle || existingCandidate.roleTitle,
                externalId: candidate.id,
                externalSource: 'LEVER',
                source: existingCandidate.source?.includes('LEVER')
                  ? existingCandidate.source
                  : 'LEVER_CANDIDATE',
                rawExternalData: candidate.rawData,
                updatedAt: new Date(),
              },
            });
            updated++;
          } else {
            const newCandidate = await this.prisma.candidate.create({
              data: {
                tenantId,
                name,
                email: email || null,
                phone: phone,
                roleTitle: candidate.jobTitle,
                stage: 'applied',
                source: 'LEVER_CANDIDATE',
                externalId: candidate.id,
                externalSource: 'LEVER',
                rawExternalData: candidate.rawData,
                tags: [],
              },
            });

            await this.storeMapping(
              tenantId,
              'candidate',
              newCandidate.id,
              candidate.id,
            );
            imported++;
          }

          // Link candidate to job postings (hiring context)
          if (candidate.postingIds && candidate.postingIds.length > 0) {
            for (const postingId of candidate.postingIds) {
              try {
                const opp = await this.prisma.opportunityContext.findUnique({
                  where: {
                    tenantId_provider_externalId: {
                      tenantId,
                      provider: 'lever',
                      externalId: postingId,
                    },
                  },
                });

                if (opp) {
                  const candidateToLink =
                    existingCandidate ||
                    (await this.prisma.candidate.findFirst({
                      where: { tenantId, externalId: candidate.id },
                    }));

                  if (candidateToLink) {
                    await this.prisma.candidateOpportunity.upsert({
                      where: {
                        candidateId_opportunityContextId: {
                          candidateId: candidateToLink.id,
                          opportunityContextId: opp.id,
                        },
                      },
                      create: {
                        candidateId: candidateToLink.id,
                        opportunityContextId: opp.id,
                        associationType: 'applied',
                      },
                      update: {},
                    });
                  }
                }
              } catch (linkErr) {
                this.logger.warn(
                  `Failed to link candidate to posting: ${linkErr}`,
                );
              }
            }
          }
        } catch (err) {
          errors++;
          this.logger.error(
            `Failed to sync Lever candidate ${candidate.id}: ${err}`,
          );
        }
      }

      if (integration) {
        await this.prisma.integration.update({
          where: { id: integration.id },
          data: { lastSyncedAt: new Date() },
        });
      }

      this.logger.log(
        `Lever sync: ${imported} imported, ${updated} updated, ${errors} errors`,
      );
    } catch (error) {
      this.logger.error(`Failed to sync Lever candidates: ${error}`);
    }

    return { imported, updated, errors, module: 'candidates' };
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
      provider: 'lever',
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

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Check if already synced
      const existingMapping = await this.getMapping(
        tenantId,
        'candidate',
        candidateId,
      );
      if (existingMapping) {
        this.logger.log(`Candidate ${candidateId} already synced to Lever`);
        await this.syncLogService.markSuccess(
          log.id,
          { skipped: true },
          existingMapping,
        );
        return;
      }

      // Check if opportunity exists by email
      let leverId: string | null = null;
      if (candidate.email) {
        const existing = await this.apiService.searchOpportunityByEmail(
          tenantId,
          candidate.email,
        );
        leverId = existing?.id || null;
      }

      if (leverId) {
        // Update existing opportunity
        await this.apiService.updateOpportunity(tenantId, leverId, {
          name: candidate.name,
          emails: candidate.email ? [candidate.email] : [],
          phones: candidate.phone ? [{ value: candidate.phone }] : [],
        });
      } else {
        // Create new opportunity
        const result = await this.apiService.createOpportunity(tenantId, {
          name: candidate.name,
          email: candidate.email || undefined,
          phone: candidate.phone || undefined,
          origin: candidate.source || 'TalentSync',
          stage: candidate.stage ? mapStageToLever(candidate.stage) : undefined,
        });
        leverId = result.id;
      }

      await this.storeMapping(tenantId, 'candidate', candidateId, leverId);

      await this.syncLogService.markSuccess(log.id, { leverId }, leverId);
      this.logger.log(`Synced candidate ${candidateId} to Lever ${leverId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(`Failed to sync candidate ${candidateId}: ${message}`);
      throw error;
    }
  }

  async handleCandidateUpdated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'lever',
      eventType: 'CANDIDATE_UPDATED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      const leverId = await this.getMapping(tenantId, 'candidate', candidateId);

      if (!leverId) {
        await this.handleCandidateCreated(tenantId, candidateId);
        await this.syncLogService.markSuccess(log.id, { createdInstead: true });
        return;
      }

      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      await this.apiService.updateOpportunity(tenantId, leverId, {
        name: candidate.name,
        emails: candidate.email ? [candidate.email] : [],
        phones: candidate.phone ? [{ value: candidate.phone }] : [],
      });

      await this.syncLogService.markSuccess(log.id, { leverId }, leverId);
      this.logger.log(`Updated Lever opportunity ${leverId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(
        `Failed to update candidate ${candidateId}: ${message}`,
      );
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
      provider: 'lever',
      eventType: 'CANDIDATE_STAGE_CHANGED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      payload: { newStage },
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      let leverId = await this.getMapping(tenantId, 'candidate', candidateId);

      if (!leverId) {
        await this.handleCandidateCreated(tenantId, candidateId);
        leverId = await this.getMapping(tenantId, 'candidate', candidateId);
        if (!leverId) {
          throw new Error('Failed to create candidate in Lever');
        }
      }

      // Note: Lever stage updates require stage IDs which are account-specific
      // For v1, we log the stage change as a note
      const leverStage = mapStageToLever(newStage);
      await this.apiService.addNote(tenantId, leverId, {
        value: `Stage changed to: ${leverStage} (from TalentSync stage: ${newStage})`,
      });

      await this.syncLogService.markSuccess(
        log.id,
        { leverId, newStage },
        leverId,
      );
      this.logger.log(
        `Updated Lever opportunity ${leverId} stage to ${newStage}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(
        `Failed to update stage for ${candidateId}: ${message}`,
      );
      throw error;
    }
  }

  // ============================================
  // Interview Event Handlers
  // ============================================

  async handleInterviewScheduled(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'lever',
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

      if (!interview) {
        throw new Error('Interview not found');
      }

      // Get Lever opportunity ID
      let leverId = await this.getMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );
      if (!leverId) {
        await this.handleCandidateCreated(tenantId, interview.candidateId);
        leverId = await this.getMapping(
          tenantId,
          'candidate',
          interview.candidateId,
        );
      }

      if (!leverId) {
        throw new Error('Failed to sync candidate to Lever');
      }

      // Get interviewers
      const interviewers = await this.prisma.user.findMany({
        where: { id: { in: interview.interviewerIds } },
        select: { name: true },
      });
      const interviewerNames = interviewers
        .map((i) => i.name)
        .filter(Boolean) as string[];

      // Add interview as a note
      const noteContent = formatInterviewNote({
        stage: interview.stage,
        notes: interview.notes,
        status: interview.status,
        date: interview.date,
        interviewerNames,
      });

      const result = await this.apiService.addNote(tenantId, leverId, {
        value: noteContent,
      });

      await this.storeMapping(tenantId, 'interview', interviewId, result.id);
      await this.syncLogService.markSuccess(
        log.id,
        { noteId: result.id },
        result.id,
      );
      this.logger.log(`Created Lever note ${result.id} for interview`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(`Failed to sync interview ${interviewId}: ${message}`);
      throw error;
    }
  }

  async handleInterviewCompleted(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'lever',
      eventType: 'INTERVIEW_COMPLETED',
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

      if (!interview) {
        throw new Error('Interview not found');
      }

      const leverId = await this.getMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );

      if (leverId) {
        // Add completion note
        await this.apiService.addNote(tenantId, leverId, {
          value: `✅ Interview Completed: ${interview.stage || 'Interview'}\nStatus: ${interview.status}`,
        });
      }

      await this.syncLogService.markSuccess(
        log.id,
        { leverId },
        leverId || undefined,
      );
      this.logger.log(`Marked interview ${interviewId} as completed in Lever`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(
        `Failed to complete interview ${interviewId}: ${message}`,
      );
      throw error;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getMapping(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<string | null> {
    const mapping = await this.prisma.integrationMapping.findUnique({
      where: {
        tenantId_provider_entityType_entityId: {
          tenantId,
          provider: 'lever',
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
          provider: 'lever',
          entityType,
          entityId,
        },
      },
      create: {
        tenantId,
        provider: 'lever',
        entityType,
        entityId,
        externalId,
      },
      update: {
        externalId,
      },
    });
  }
}
