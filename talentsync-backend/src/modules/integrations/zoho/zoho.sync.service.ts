import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../../common/prisma.service';
import { ZohoOAuthService } from './zoho.oauth.service';
import { ZohoFieldMapService } from './zoho.fieldmap.service';

/**
 * Zoho Lead Status → TalentSync Stage mapping (inbound)
 */
const ZOHO_STATUS_TO_STAGE: Record<string, string> = {
  'Attempted to Contact': 'SCREENING',
  'Contact in Future': 'APPLIED',
  Contacted: 'SCREENING',
  'Junk Lead': 'REJECTED',
  'Lost Lead': 'REJECTED',
  'Not Contacted': 'APPLIED',
  'Pre-Qualified': 'PHONE_SCREEN',
  'Not Qualified': 'REJECTED',
  Qualified: 'INTERVIEW',
  'Closed Won': 'HIRED',
  'Closed Lost': 'REJECTED',
};

@Injectable()
export class ZohoSyncService {
  private readonly logger = new Logger(ZohoSyncService.name);
  private zohoApi = 'https://recruit.zoho.in/recruit/v2'; // Zoho Recruit API (India region)

  constructor(
    private prisma: PrismaService,
    private oauth: ZohoOAuthService,
    private fieldmap: ZohoFieldMapService,
  ) {}

  /**
   * Sync Candidates from Zoho Recruit to TalentSync Candidates
   * @param tenantId - Tenant to sync for
   * @param since - Optional: Only fetch records modified after this date (delta sync)
   */
  async syncLeads(tenantId: string, since?: Date) {
    this.logger.log(
      `Starting Zoho Recruit Candidates sync for tenant: ${tenantId}${since ? ` (delta since ${since.toISOString()})` : ' (full sync)'}`,
    );
    const token = await this.oauth.getAccessToken(tenantId);
    const mapping = await this.fieldmap.getMapping(tenantId, 'candidates');

    let imported = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Zoho Recruit uses /Candidates endpoint
      let apiUrl = `${this.zohoApi}/Candidates`;
      const params: Record<string, string> = {};

      if (since) {
        // Use COQL for delta queries - more efficient than fetching all
        const isoDate = since.toISOString().replace('T', ' ').substring(0, 19);
        apiUrl = `${this.zohoApi}/coql`;
      }

      const res = since
        ? await axios.post(
            apiUrl,
            {
              select_query: `SELECT * FROM Candidates WHERE Modified_Time >= '${since.toISOString().replace('T', ' ').substring(0, 19)}'`,
            },
            { headers: { Authorization: `Zoho-oauthtoken ${token}` } },
          )
        : await axios.get(apiUrl, {
            headers: { Authorization: `Zoho-oauthtoken ${token}` },
          });

      const records = res.data?.data || [];
      this.logger.log(`Found ${records.length} candidates in Zoho Recruit`);

      for (const rec of records) {
        try {
          const mapped = this.applyMapping(rec, mapping);
          const zohoId = rec.id;
          const stage = this.mapZohoStatusToStage(rec.Candidate_Status);

          // Deduplication: Find by externalId → email → phone
          let existing = await this.prisma.candidate.findFirst({
            where: {
              tenantId,
              externalId: zohoId,
              externalSource: 'ZOHO_RECRUIT',
            },
          });

          // Fallback: find by email
          if (!existing && mapped.email) {
            existing = await this.prisma.candidate.findFirst({
              where: {
                tenantId,
                email: { equals: mapped.email, mode: 'insensitive' },
              },
            });
          }

          // Fallback: find by phone (normalized, last 10 digits)
          if (!existing && mapped.phone) {
            const normalizedPhone = mapped.phone.replace(/\D/g, '');
            if (normalizedPhone.length >= 10) {
              existing = await this.prisma.candidate.findFirst({
                where: {
                  tenantId,
                  phone: { contains: normalizedPhone.slice(-10) },
                },
              });
            }
          }

          if (existing) {
            await this.prisma.candidate.update({
              where: { id: existing.id },
              data: {
                name: mapped.name || existing.name,
                phone: mapped.phone || existing.phone,
                roleTitle: mapped.roleTitle || existing.roleTitle,
                externalId: zohoId,
                externalSource: 'ZOHO_RECRUIT',
                rawExternalData: rec, // Store complete Zoho payload
                // Don't overwrite stage if already set to something meaningful
                ...(existing.stage === 'APPLIED' ||
                existing.stage === 'imported'
                  ? { stage }
                  : {}),
              },
            });
            updated++;
          } else {
            await this.prisma.candidate.create({
              data: {
                tenantId,
                name: mapped.name || 'Unknown',
                email: mapped.email,
                phone: mapped.phone,
                roleTitle: mapped.roleTitle,
                stage: 'APPLIED', // SOW default
                source: 'ZOHO_RECRUIT',
                externalId: zohoId,
                externalSource: 'ZOHO_RECRUIT',
                rawExternalData: rec, // Store complete Zoho payload
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

      // Update integration last sync time
      await this.prisma.integration.updateMany({
        where: { tenantId, provider: 'zoho' },
        data: {
          status: 'connected',
          lastSyncedAt: new Date(),
        },
      });

      const result = { imported, updated, errors, total: records.length };
      this.logger.log(
        `Zoho Recruit Candidates sync complete: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (e: any) {
      this.logger.error(`Zoho Recruit Candidates sync failed: ${e.message}`);
      await this.prisma.integration.updateMany({
        where: { tenantId, provider: 'zoho' },
        data: { status: 'error', lastError: e.message },
      });
      throw e;
    }
  }

  /**
   * Sync Contacts from Zoho Recruit to TalentSync Candidates
   * Note: Zoho Recruit uses "Candidates" module, not "Contacts" like CRM
   * @param tenantId - Tenant to sync for
   * @param since - Optional: Only fetch records modified after this date (delta sync)
   */
  async syncContacts(tenantId: string, since?: Date) {
    // Zoho Recruit uses Candidates module, redirect to syncLeads which now handles Candidates
    this.logger.log(
      `syncContacts called - redirecting to syncLeads (Zoho Recruit uses Candidates module)`,
    );
    return this.syncLeads(tenantId, since);
  }

  /**
   * Map Zoho fields to TalentSync candidate fields
   */
  applyMapping(record: any, mapping: Record<string, string>) {
    const result: any = {};

    if (!mapping || Object.keys(mapping).length === 0) {
      // Default field mapping
      result.name =
        record.Full_Name ||
        `${record.First_Name || ''} ${record.Last_Name || ''}`.trim() ||
        'Unknown';
      result.email = record.Email;
      result.phone = record.Phone || record.Mobile;
      result.roleTitle = record.Title || record.Designation;
    } else {
      for (const [localField, zohoField] of Object.entries(mapping)) {
        result[localField] = record[zohoField];
      }
    }

    return result;
  }

  /**
   * Map Zoho Lead Status to TalentSync stage
   */
  mapZohoStatusToStage(zohoStatus: string): string {
    if (!zohoStatus) return 'APPLIED';
    return ZOHO_STATUS_TO_STAGE[zohoStatus] || 'APPLIED';
  }

  // ============================================
  // Pipeline Stages Sync
  // ============================================

  /**
   * Sync pipeline stages from Zoho Recruit to TalentSync HiringStage table
   * Note: Zoho Recruit uses Candidate_Status field in Candidates module
   */
  async syncStages(tenantId: string) {
    this.logger.log(
      `Starting Zoho Recruit Stages sync for tenant: ${tenantId}`,
    );
    const token = await this.oauth.getAccessToken(tenantId);

    let imported = 0;
    let updated = 0;

    try {
      // Zoho Recruit: Fetch Candidate_Status picklist values from Candidates module
      const res = await axios.get(`${this.zohoApi}/settings/fields`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params: { module: 'Candidates' },
      });

      const fields = res.data?.fields || [];
      const statusField = fields.find(
        (f: any) =>
          f.api_name === 'Candidate_Status' ||
          f.field_label === 'Candidate Status',
      );

      const stages = statusField?.pick_list_values || [];
      this.logger.log(`Found ${stages.length} stages in Zoho Recruit`);

      // Sync each stage to HiringStage table
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageName = stage.display_value || stage.actual_value;
        const stageKey = stageName.toUpperCase().replace(/\s+/g, '_');

        const existing = await this.prisma.hiringStage.findFirst({
          where: {
            tenantId,
            name: stageName,
          },
        });

        if (existing) {
          await this.prisma.hiringStage.update({
            where: { id: existing.id },
            data: { order: i },
          });
          updated++;
        } else {
          await this.prisma.hiringStage.create({
            data: {
              tenantId,
              name: stageName,
              key: stageKey,
              order: i,
              color: this.getStageColor(i),
            },
          });
          imported++;
        }
      }

      const result = { imported, updated, total: stages.length };
      this.logger.log(
        `Zoho Recruit Stages sync complete: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (e: any) {
      this.logger.error(`Zoho Recruit Stages sync failed: ${e.message}`);
      // Don't throw - stages sync is optional, continue with candidates
      return { imported: 0, updated: 0, total: 0, error: e.message };
    }
  }

  /**
   * Get a color for a stage based on its order
   */
  private getStageColor(index: number): string {
    const colors = [
      '#3B82F6', // blue
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#F59E0B', // amber
      '#10B981', // green
      '#EF4444', // red
      '#6366F1', // indigo
      '#14B8A6', // teal
    ];
    return colors[index % colors.length];
  }

  // ============================================
  // Users/Recruiters Sync
  // ============================================

  /**
   * Sync users/recruiters from Zoho Recruit to TalentSync User table
   */
  async syncUsers(tenantId: string) {
    this.logger.log(`Starting Zoho Recruit Users sync for tenant: ${tenantId}`);
    const token = await this.oauth.getAccessToken(tenantId);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Fetch all users from Zoho
      const res = await axios.get(`${this.zohoApi}/users`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params: { type: 'AllUsers' },
      });

      const users = res.data?.users || [];
      this.logger.log(`Found ${users.length} users in Zoho`);

      for (const zohoUser of users) {
        try {
          // Skip inactive users
          if (zohoUser.status === 'deleted' || zohoUser.status === 'inactive') {
            continue;
          }

          const email = zohoUser.email?.toLowerCase();
          if (!email) continue;

          const zohoUserId = zohoUser.id;
          const fullName = zohoUser.full_name || zohoUser.name || 'Unknown';

          // Check if user already exists in TalentSync
          const existingUser = await this.prisma.user.findFirst({
            where: { email },
          });

          if (existingUser) {
            // Update user with externalId if not set
            // Note: We don't create new users, just link existing ones
            this.logger.debug(`User ${email} already exists in TalentSync`);
            updated++;
          } else {
            // Create a new user with basic info
            // In production, you'd want to handle password/invite flow
            const newUser = await this.prisma.user.create({
              data: {
                email,
                name: fullName,
                password: '', // No password - needs invite flow
                emailVerified: false,
              },
            });

            // Link user to tenant
            await this.prisma.userTenant.create({
              data: {
                userId: newUser.id,
                tenantId,
                role: this.mapZohoRoleToTalentSync(zohoUser.role?.name),
                status: 'ACTIVE',
              },
            });

            imported++;
            this.logger.log(
              `Created user: ${email} with role ${zohoUser.role?.name}`,
            );
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to sync user ${zohoUser.email}: ${err.message}`,
          );
          errors++;
        }
      }

      const result = { imported, updated, errors, total: users.length };
      this.logger.log(
        `Zoho Recruit Users sync complete: ${JSON.stringify(result)}`,
      );
      return result;
    } catch (e: any) {
      this.logger.error(`Zoho Recruit Users sync failed: ${e.message}`);
      // Don't throw - users sync is optional, continue with candidates
      return { imported: 0, updated: 0, errors: 0, total: 0, error: e.message };
    }
  }

  /**
   * Map Zoho role to TalentSync role
   */
  private mapZohoRoleToTalentSync(zohoRole: string): any {
    const roleMap: Record<string, string> = {
      Administrator: 'ADMIN',
      CEO: 'ADMIN',
      Manager: 'MANAGER',
      Standard: 'RECRUITER',
    };
    return roleMap[zohoRole] || 'RECRUITER';
  }

  // ============================================
  // Full Sync (All Data)
  // ============================================

  /**
   * Perform a sync of all Zoho data
   * @param module - 'leads', 'contacts', or 'both'
   * @param since - Optional: Only fetch records modified after this date (delta sync)
   */
  async syncAll(tenantId: string, module: string = 'leads', since?: Date) {
    this.logger.log(
      `Starting Zoho sync for tenant: ${tenantId}, module: ${module}${since ? ' (delta)' : ' (full)'}`,
    );

    const results: any = {
      stages: null,
      users: null,
      candidates: null,
      syncType: since ? 'delta' : 'full',
      module,
    };

    try {
      // 1. Sync stages first (needed for candidate stage mapping) - always full
      results.stages = await this.syncStages(tenantId);
    } catch (e: any) {
      this.logger.error(`Stages sync failed: ${e.message}`);
      results.stages = { error: e.message };
    }

    try {
      // 2. Sync users (recruiters) - always full
      results.users = await this.syncUsers(tenantId);
    } catch (e: any) {
      this.logger.error(`Users sync failed: ${e.message}`);
      results.users = { error: e.message };
    }

    try {
      // 3. Sync candidates - supports delta and 'both' option
      if (module === 'both') {
        // Sync both leads and contacts
        const leadsResult = await this.syncLeads(tenantId, since);
        const contactsResult = await this.syncContacts(tenantId, since);
        results.candidates = {
          leads: leadsResult,
          contacts: contactsResult,
          totalImported:
            (leadsResult.imported || 0) + (contactsResult.imported || 0),
          totalUpdated:
            (leadsResult.updated || 0) + (contactsResult.updated || 0),
          totalErrors: (leadsResult.errors || 0) + (contactsResult.errors || 0),
        };
      } else if (module === 'contacts') {
        results.candidates = await this.syncContacts(tenantId, since);
      } else {
        results.candidates = await this.syncLeads(tenantId, since);
      }
    } catch (e: any) {
      this.logger.error(`Candidates sync failed: ${e.message}`);
      results.candidates = { error: e.message };
    }

    this.logger.log(`Zoho sync complete: ${JSON.stringify(results)}`);
    return results;
  }

  /**
   * DEMAND-DRIVEN SYNC
   *
   * Automatically performs delta sync if lastSyncedAt exists,
   * otherwise performs full sync. This is the PRIMARY entry point
   * for user-triggered syncs.
   *
   * @param tenantId - Tenant to sync
   * @param module - 'leads' or 'contacts'
   */
  async demandDrivenSync(tenantId: string, module: string = 'leads') {
    // Get integration to check lastSyncedAt
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'zoho' },
      },
      select: { lastSyncedAt: true },
    });

    // Use delta sync if we have a previous sync timestamp
    const since = integration?.lastSyncedAt || undefined;

    return this.syncAll(tenantId, module, since);
  }

  /**
   * Check if sync is stale (older than threshold)
   * Returns true if sync should be triggered
   */
  isSyncStale(
    lastSyncedAt: Date | null,
    thresholdMinutes: number = 15,
  ): boolean {
    if (!lastSyncedAt) return true;
    const staleThreshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    return lastSyncedAt < staleThreshold;
  }
}
