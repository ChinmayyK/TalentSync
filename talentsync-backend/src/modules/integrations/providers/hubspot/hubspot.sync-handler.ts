import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { HubspotApiService } from './hubspot.api';
import { SyncLogService } from '../../services/sync-log.service';
import {
  mapCandidateToContact,
  mapStageToHubspotStatus,
  formatInterviewTitle,
  formatInterviewBody,
  mapInterviewStatusToOutcome,
} from './hubspot.mapping';

/**
 * HubSpot Sync Handler
 *
 * Handles event-driven synchronization from TalentSync to HubSpot.
 * Called by the sync processor when integration events are queued.
 */
@Injectable()
export class HubspotSyncHandler {
  private readonly logger = new Logger(HubspotSyncHandler.name);

  constructor(
    private prisma: PrismaService,
    private apiService: HubspotApiService,
    private syncLogService: SyncLogService,
  ) {}

  // ============================================
  // Inbound Sync (HubSpot → TalentSync)
  // ============================================

  /**
   * Main sync entry point for inbound imports
   * Called by SyncProcessor for scheduled/manual imports
   */
  async syncAll(
    tenantId: string,
    module: string = 'contacts',
  ): Promise<{
    contacts?: { imported: number; updated: number; errors: number };
  }> {
    this.logger.log(
      `Starting HubSpot sync for tenant ${tenantId}, module: ${module}`,
    );

    // HubSpot only has Contacts (no separate Leads like Salesforce/Zoho)
    const contactsResult = await this.syncContacts(tenantId);

    this.logger.log(`HubSpot sync completed for tenant ${tenantId}`);
    this.logger.log('Object:', { contacts: contactsResult });

    return { contacts: contactsResult };
  }

  /**
   * Sync HubSpot Contacts to Candidates
   */
  async syncContacts(tenantId: string): Promise<{
    imported: number;
    updated: number;
    errors: number;
    module: string;
  }> {
    // Get last sync time for incremental sync
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'hubspot', status: 'CONNECTED' },
    });

    const lastSync = integration?.lastSyncedAt || undefined;

    // Fetch contacts from HubSpot
    const contacts = await this.apiService.getContacts(tenantId, lastSync);
    this.logger.log(`Fetched ${contacts.length} contacts from HubSpot`);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        // Skip contacts without email (can't deduplicate)
        if (!contact.email) {
          this.logger.warn(`Skipping HubSpot contact ${contact.id} - no email`);
          continue;
        }

        // Normalize name
        const fullName =
          [contact.firstName, contact.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || contact.email.split('@')[0];

        // Check for existing candidate by email (deduplication)
        const existingCandidate = await this.prisma.candidate.findFirst({
          where: {
            tenantId,
            email: contact.email.toLowerCase(),
            deletedAt: null,
          },
        });

        if (existingCandidate) {
          // Update existing candidate
          await this.prisma.candidate.update({
            where: { id: existingCandidate.id },
            data: {
              name: fullName,
              phone: contact.phone || existingCandidate.phone,
              roleTitle: contact.jobTitle || existingCandidate.roleTitle,
              externalId: contact.id,
              source: existingCandidate.source?.includes('HUBSPOT')
                ? existingCandidate.source
                : 'HUBSPOT_CONTACT',
              rawExternalData: contact as any,
              updatedAt: new Date(),
            },
          });

          // Fetch and store deal context (non-blocking)
          await this.syncDealContextForCandidate(
            tenantId,
            existingCandidate.id,
            contact.id,
          );

          updated++;
          this.logger.debug(
            `Updated candidate ${existingCandidate.id} from HubSpot contact ${contact.id}`,
          );
        } else {
          // Create new candidate
          const newCandidate = await this.prisma.candidate.create({
            data: {
              tenantId,
              name: fullName,
              email: contact.email.toLowerCase(),
              phone: contact.phone,
              roleTitle: contact.jobTitle,
              stage: 'applied',
              source: 'HUBSPOT_CONTACT',
              externalId: contact.id,
              rawExternalData: contact as any,
              tags: [],
            },
          });

          // Store mapping for outbound sync
          await this.storeMapping(
            tenantId,
            'candidate',
            newCandidate.id,
            contact.id,
          );

          // Fetch and store deal context (non-blocking)
          await this.syncDealContextForCandidate(
            tenantId,
            newCandidate.id,
            contact.id,
          );

          imported++;
          this.logger.debug(
            `Created candidate ${newCandidate.id} from HubSpot contact ${contact.id}`,
          );
        }
      } catch (error) {
        errors++;
        this.logger.error(
          `Failed to sync HubSpot contact ${contact.id}: ${error}`,
        );
      }
    }

    // Update last sync time
    if (integration) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncedAt: new Date() },
      });
    }

    this.logger.log(
      `Contacts sync: ${imported} imported, ${updated} updated, ${errors} errors`,
    );
    return { imported, updated, errors, module: 'contacts' };
  }

  /**
   * Fetch and store deal context for a candidate (non-blocking, failures don't stop import)
   * Deals provide hiring context only - read-only, not managed in TalentSync
   */
  private async syncDealContextForCandidate(
    tenantId: string,
    candidateId: string,
    hubspotContactId: string,
  ): Promise<void> {
    try {
      const deals = await this.apiService.getDealsForContact(
        tenantId,
        hubspotContactId,
      );

      if (deals.length === 0) {
        return;
      }

      this.logger.debug(
        `Found ${deals.length} deals for contact ${hubspotContactId}`,
      );

      for (const deal of deals) {
        try {
          // Upsert OpportunityContext
          const opportunityContext =
            await this.prisma.opportunityContext.upsert({
              where: {
                tenantId_provider_externalId: {
                  tenantId,
                  provider: 'hubspot',
                  externalId: deal.id,
                },
              },
              create: {
                tenantId,
                provider: 'hubspot',
                externalId: deal.id,
                name: deal.name,
                stageName: deal.stageName,
                amount: deal.amount,
                closeDate: deal.closeDate,
                rawData: deal as any,
              },
              update: {
                name: deal.name,
                stageName: deal.stageName,
                amount: deal.amount,
                closeDate: deal.closeDate,
                rawData: deal as any,
                updatedAt: new Date(),
              },
            });

          // Link candidate to deal (upsert to avoid duplicates)
          await this.prisma.candidateOpportunity.upsert({
            where: {
              candidateId_opportunityContextId: {
                candidateId,
                opportunityContextId: opportunityContext.id,
              },
            },
            create: {
              candidateId,
              opportunityContextId: opportunityContext.id,
              associationType: 'related',
            },
            update: {}, // No-op if exists
          });

          this.logger.debug(
            `Linked candidate ${candidateId} to deal ${deal.name}`,
          );
        } catch (dealError) {
          // Log but don't fail - deal context is non-blocking
          this.logger.warn(
            `Failed to store deal context for deal ${deal.id}: ${dealError}`,
          );
        }
      }
    } catch (error) {
      // Log but don't fail candidate import - deal context is optional
      this.logger.warn(
        `Failed to fetch deals for contact ${hubspotContactId}: ${error}`,
      );
    }
  }

  // ============================================
  // Candidate Event Handlers (Outbound)
  // ============================================

  /**
   * Handle candidate created event
   * Creates a new Contact in HubSpot
   */
  async handleCandidateCreated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'hubspot',
      eventType: 'CANDIDATE_CREATED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      // Fetch candidate data
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
        this.logger.log(`Candidate ${candidateId} already synced to HubSpot`);
        await this.syncLogService.markSuccess(
          log.id,
          { skipped: true },
          existingMapping,
        );
        return;
      }

      // Check if contact exists by email
      let hubspotId: string | null = null;
      if (candidate.email) {
        const existing = await this.apiService.searchContactByEmail(
          tenantId,
          candidate.email,
        );
        hubspotId = existing?.id || null;
      }

      if (hubspotId) {
        // Update existing contact
        const contactProps = mapCandidateToContact(candidate);
        await this.apiService.updateContact(tenantId, hubspotId, contactProps);
      } else {
        // Create new contact
        const contactProps = mapCandidateToContact(candidate);
        const result = await this.apiService.createContact(tenantId, {
          firstName: contactProps.firstname,
          lastName: contactProps.lastname,
          email: contactProps.email,
          phone: contactProps.phone,
          jobTitle: contactProps.jobtitle,
          source: contactProps.leadsource,
          stage: contactProps.hs_lead_status,
        });
        hubspotId = result.id;
      }

      // Store mapping
      await this.storeMapping(tenantId, 'candidate', candidateId, hubspotId);

      await this.syncLogService.markSuccess(log.id, { hubspotId }, hubspotId);
      this.logger.log(
        `Synced candidate ${candidateId} to HubSpot contact ${hubspotId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(`Failed to sync candidate ${candidateId}: ${message}`);
      throw error;
    }
  }

  /**
   * Handle candidate updated event
   * Updates the corresponding Contact in HubSpot
   */
  async handleCandidateUpdated(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'hubspot',
      eventType: 'CANDIDATE_UPDATED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      // Get HubSpot contact ID from mapping
      const hubspotId = await this.getMapping(
        tenantId,
        'candidate',
        candidateId,
      );

      if (!hubspotId) {
        // Not synced yet - create instead
        await this.handleCandidateCreated(tenantId, candidateId);
        await this.syncLogService.markSuccess(log.id, { createdInstead: true });
        return;
      }

      // Fetch candidate data
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Update contact in HubSpot
      const contactProps = mapCandidateToContact(candidate);
      await this.apiService.updateContact(tenantId, hubspotId, contactProps);

      await this.syncLogService.markSuccess(log.id, { hubspotId }, hubspotId);
      this.logger.log(
        `Updated HubSpot contact ${hubspotId} for candidate ${candidateId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(
        `Failed to update candidate ${candidateId}: ${message}`,
      );
      throw error;
    }
  }

  /**
   * Handle candidate stage changed event
   * Updates the lead status in HubSpot
   */
  async handleCandidateStageChanged(
    tenantId: string,
    candidateId: string,
    newStage: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'hubspot',
      eventType: 'CANDIDATE_STAGE_CHANGED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      payload: { newStage },
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      // Get HubSpot contact ID from mapping
      let hubspotId = await this.getMapping(tenantId, 'candidate', candidateId);

      if (!hubspotId) {
        // Not synced yet - create first
        await this.handleCandidateCreated(tenantId, candidateId);
        hubspotId = await this.getMapping(tenantId, 'candidate', candidateId);
        if (!hubspotId) {
          throw new Error('Failed to create candidate in HubSpot');
        }
      }

      // Map stage to HubSpot lead status
      const hubspotStatus = mapStageToHubspotStatus(newStage);

      // Update contact in HubSpot
      await this.apiService.updateContact(tenantId, hubspotId, {
        hs_lead_status: hubspotStatus,
      });

      await this.syncLogService.markSuccess(
        log.id,
        { hubspotId, hubspotStatus },
        hubspotId,
      );
      this.logger.log(
        `Updated HubSpot contact ${hubspotId} stage to ${hubspotStatus}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(
        `Failed to update stage for candidate ${candidateId}: ${message}`,
      );
      throw error;
    }
  }

  // ============================================
  // Interview Event Handlers
  // ============================================

  /**
   * Handle interview scheduled event
   * Creates a Meeting activity in HubSpot
   */
  async handleInterviewScheduled(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'hubspot',
      eventType: 'INTERVIEW_SCHEDULED',
      direction: 'OUTBOUND',
      entityType: 'INTERVIEW',
      entityId: interviewId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      // Fetch interview with candidate
      const interview = await this.prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          candidate: { select: { id: true, name: true } },
        },
      });

      if (!interview) {
        throw new Error('Interview not found');
      }

      // Get HubSpot contact ID for candidate
      let hubspotContactId = await this.getMapping(
        tenantId,
        'candidate',
        interview.candidateId,
      );

      if (!hubspotContactId) {
        // Candidate not synced - sync first
        await this.handleCandidateCreated(tenantId, interview.candidateId);
        hubspotContactId = await this.getMapping(
          tenantId,
          'candidate',
          interview.candidateId,
        );
        if (!hubspotContactId) {
          throw new Error('Failed to sync candidate to HubSpot');
        }
      }

      // Fetch interviewer names
      const interviewers = await this.prisma.user.findMany({
        where: { id: { in: interview.interviewerIds } },
        select: { name: true },
      });
      const interviewerNames = interviewers
        .map((i) => i.name)
        .filter(Boolean) as string[];

      // Create meeting in HubSpot
      const startTime = interview.date;
      const endTime = new Date(
        startTime.getTime() + interview.durationMins * 60000,
      );

      const result = await this.apiService.createMeeting(
        tenantId,
        hubspotContactId,
        {
          title: formatInterviewTitle(
            interview.candidate.name,
            interview.stage,
          ),
          startTime,
          endTime,
          body: formatInterviewBody({
            stage: interview.stage,
            notes: interview.notes,
            status: interview.status,
            interviewerNames,
          }),
          outcome: 'SCHEDULED',
        },
      );

      // Store meeting mapping
      await this.storeMapping(tenantId, 'interview', interviewId, result.id);

      await this.syncLogService.markSuccess(
        log.id,
        { meetingId: result.id },
        result.id,
      );
      this.logger.log(
        `Created HubSpot meeting ${result.id} for interview ${interviewId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(`Failed to sync interview ${interviewId}: ${message}`);
      throw error;
    }
  }

  /**
   * Handle interview completed event
   * Updates the Meeting outcome in HubSpot
   */
  async handleInterviewCompleted(
    tenantId: string,
    interviewId: string,
  ): Promise<void> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'hubspot',
      eventType: 'INTERVIEW_COMPLETED',
      direction: 'OUTBOUND',
      entityType: 'INTERVIEW',
      entityId: interviewId,
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      // Get HubSpot meeting ID from mapping
      let hubspotMeetingId = await this.getMapping(
        tenantId,
        'interview',
        interviewId,
      );

      if (!hubspotMeetingId) {
        // Meeting not synced - create it first
        await this.handleInterviewScheduled(tenantId, interviewId);
        hubspotMeetingId = await this.getMapping(
          tenantId,
          'interview',
          interviewId,
        );
      }

      if (hubspotMeetingId) {
        // Update meeting outcome to completed
        await this.apiService.updateMeeting(tenantId, hubspotMeetingId, {
          hs_meeting_outcome: 'COMPLETED',
        });
      }

      await this.syncLogService.markSuccess(
        log.id,
        { meetingId: hubspotMeetingId },
        hubspotMeetingId || undefined,
      );
      this.logger.log(
        `Marked HubSpot meeting ${hubspotMeetingId} as completed`,
      );
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

  /**
   * Get existing mapping from IntegrationMapping table
   */
  private async getMapping(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<string | null> {
    const mapping = await this.prisma.integrationMapping.findUnique({
      where: {
        tenantId_provider_entityType_entityId: {
          tenantId,
          provider: 'hubspot',
          entityType,
          entityId,
        },
      },
    });

    return mapping?.externalId || null;
  }

  /**
   * Store mapping in IntegrationMapping table
   */
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
          provider: 'hubspot',
          entityType,
          entityId,
        },
      },
      create: {
        tenantId,
        provider: 'hubspot',
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
