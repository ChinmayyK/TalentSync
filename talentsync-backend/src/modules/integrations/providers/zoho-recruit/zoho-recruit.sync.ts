import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { ZohoRecruitApiService } from './zoho-recruit.api';
import { ZohoRecruitOAuthService } from './zoho-recruit.oauth';

/**
 * Zoho Recruit Status → TalentSync Stage mapping
 */
const RECRUIT_STATUS_TO_STAGE: Record<string, string> = {
  New: 'APPLIED',
  'Waiting-for-Evaluation': 'SCREENING',
  Qualified: 'PHONE_SCREEN',
  Unqualified: 'REJECTED',
  'Junk Candidate': 'REJECTED',
  Contacted: 'SCREENING',
  'Contact in Future': 'APPLIED',
  'Not Contacted': 'APPLIED',
  'Attempted to Contact': 'SCREENING',
  Associated: 'INTERVIEW',
  'Submitted-to-Client': 'INTERVIEW',
  'Approved-by-Client': 'INTERVIEW',
  'Rejected-by-Client': 'REJECTED',
  'Interview-Scheduled': 'INTERVIEW',
  'Interview-in-Progress': 'INTERVIEW',
  'On-Hold': 'ON_HOLD',
  Offered: 'OFFER',
  'Offer-Accepted': 'OFFER',
  'Offer-Declined': 'REJECTED',
  Hired: 'HIRED',
  Joined: 'HIRED',
  Rejected: 'REJECTED',
  Withdrawn: 'WITHDRAWN',
};

/**
 * Zoho Recruit Sync Service
 *
 * Handles synchronization of data between Zoho Recruit and TalentSync.
 *
 * NOTE: Job Openings and Interviews sync require schema changes:
 * - Add Job model to Prisma schema
 * - Add externalId/externalSource to Interview model
 */
@Injectable()
export class ZohoRecruitSyncService {
  private readonly logger = new Logger(ZohoRecruitSyncService.name);

  constructor(
    private prisma: PrismaService,
    private api: ZohoRecruitApiService,
    private oauth: ZohoRecruitOAuthService,
  ) {}

  // ============================================
  // Candidates Sync (Primary - Works with current schema)
  // ============================================

  /**
   * Sync candidates from Zoho Recruit to TalentSync
   */
  async syncCandidates(tenantId: string, since?: Date) {
    this.logger.log(
      `Starting Zoho Recruit Candidates sync for tenant: ${tenantId}`,
    );
    const token = await this.oauth.getAccessToken(tenantId);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    try {
      const candidates = since
        ? await this.api.getCandidatesSince(token, since)
        : await this.api.getCandidates(token);

      this.logger.log(`Found ${candidates.length} candidates in Zoho Recruit`);

      for (const rec of candidates) {
        try {
          const zohoId = rec.id;
          const stage = this.mapRecruitStatusToStage(rec.Candidate_Status);

          // Dedupe: externalId → email → phone
          let existing = await this.prisma.candidate.findFirst({
            where: {
              tenantId,
              externalId: zohoId,
              externalSource: 'ZOHO_RECRUIT',
            },
          });

          const email = rec.Email || rec.Secondary_Email;
          if (!existing && email) {
            existing = await this.prisma.candidate.findFirst({
              where: {
                tenantId,
                email: { equals: email, mode: 'insensitive' },
              },
            });
          }

          const phone = rec.Phone || rec.Mobile;
          if (!existing && phone) {
            const normalized = phone.replace(/\D/g, '');
            if (normalized.length >= 10) {
              existing = await this.prisma.candidate.findFirst({
                where: { tenantId, phone: { contains: normalized.slice(-10) } },
              });
            }
          }

          const candidateData = {
            name:
              rec.Full_Name ||
              `${rec.First_Name || ''} ${rec.Last_Name || ''}`.trim() ||
              'Unknown',
            email,
            phone,
            roleTitle:
              rec.Current_Job_Title ||
              (rec.Experience_in_Years
                ? `${rec.Experience_in_Years} years exp`
                : null),
            externalId: zohoId,
            externalSource: 'ZOHO_RECRUIT',
            rawExternalData: rec,
          };

          if (existing) {
            await this.prisma.candidate.update({
              where: { id: existing.id },
              data: {
                ...candidateData,
                // Only update stage if it's still at APPLIED
                ...(existing.stage === 'APPLIED' ? { stage } : {}),
              },
            });
            updated++;
          } else {
            await this.prisma.candidate.create({
              data: {
                tenantId,
                ...candidateData,
                stage,
                source: 'ZOHO_RECRUIT',
                tags: ['zoho-recruit'],
              },
            });
            imported++;
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to sync candidate ${rec.id}: ${err.message}`,
          );
          errors++;
        }
      }

      await this.updateSyncTime(tenantId);

      const result = { imported, updated, errors, total: candidates.length };
      this.logger.log(
        `Zoho Recruit Candidates sync complete: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (e: any) {
      this.logger.error(`Zoho Recruit Candidates sync failed: ${e.message}`);
      throw e;
    }
  }

  // ============================================
  // Outbound Sync (TalentSync → Zoho)
  // ============================================

  /**
   * Push candidate stage change to Zoho Recruit
   */
  async pushCandidateStage(
    tenantId: string,
    candidateId: string,
    newStage: string,
  ) {
    const token = await this.oauth.getAccessToken(tenantId);

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate?.externalId || candidate.externalSource !== 'ZOHO_RECRUIT') {
      throw new Error('Candidate not linked to Zoho Recruit');
    }

    const zohoStatus = this.mapStageToRecruitStatus(newStage);
    return this.api.updateCandidateStage(
      token,
      candidate.externalId,
      zohoStatus,
    );
  }

  // ============================================
  // Full Sync
  // ============================================

  /**
   * Sync all data from Zoho Recruit
   * TODO: Add Job Openings and Interviews sync after schema changes
   */
  async syncAll(tenantId: string, since?: Date) {
    this.logger.log(`Starting full Zoho Recruit sync for tenant: ${tenantId}`);

    const results: any = {
      candidates: null,
      // TODO: Add after Job model is added to schema
      // jobs: null,
      // TODO: Add after Interview.externalId is added to schema
      // interviews: null,
    };

    try {
      results.candidates = await this.syncCandidates(tenantId, since);
    } catch (e: any) {
      results.candidates = { error: e.message };
    }

    return results;
  }

  /**
   * Demand-driven sync - auto-detects delta vs full sync
   */
  async demandDrivenSync(tenantId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'zoho_recruit' },
      },
      select: { lastSyncedAt: true },
    });

    const since = integration?.lastSyncedAt || undefined;
    return this.syncAll(tenantId, since);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private mapRecruitStatusToStage(status: string): string {
    if (!status) return 'APPLIED';
    return RECRUIT_STATUS_TO_STAGE[status] || 'APPLIED';
  }

  private mapStageToRecruitStatus(stage: string): string {
    const reverseMap: Record<string, string> = {
      APPLIED: 'New',
      SCREENING: 'Contacted',
      PHONE_SCREEN: 'Qualified',
      INTERVIEW: 'Interview-Scheduled',
      OFFER: 'Offered',
      HIRED: 'Hired',
      REJECTED: 'Rejected',
      WITHDRAWN: 'Withdrawn',
      ON_HOLD: 'On-Hold',
    };
    return reverseMap[stage] || 'New';
  }

  private async updateSyncTime(tenantId: string) {
    await this.prisma.integration.updateMany({
      where: { tenantId, provider: 'zoho_recruit' },
      data: {
        status: 'connected',
        lastSyncedAt: new Date(),
      },
    });
  }
}
