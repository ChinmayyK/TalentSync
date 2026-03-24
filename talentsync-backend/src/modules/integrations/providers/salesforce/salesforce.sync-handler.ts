import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { SalesforceApiService } from './salesforce.api';
import {
  SalesforceOAuthService,
  SalesforceAuthRequiredError,
} from './salesforce.oauth';

interface SyncResult {
  imported: number;
  updated: number;
  errors: number;
  module: string;
}

@Injectable()
export class SalesforceSyncHandler {
  private readonly logger = new Logger(SalesforceSyncHandler.name);

  constructor(
    private prisma: PrismaService,
    private apiService: SalesforceApiService,
    private oauthService: SalesforceOAuthService,
  ) {}

  /**
   * Main sync entry point
   * @param module - 'leads', 'contacts', 'opportunities', or 'all'
   */
  async syncAll(
    tenantId: string,
    module: string = 'all',
  ): Promise<{
    leads?: SyncResult;
    contacts?: SyncResult;
    opportunities?: SyncResult;
  }> {
    this.logger.log(
      `Starting Salesforce sync for tenant ${tenantId}, module: ${module}`,
    );

    if (await this.oauthService.isAuthRequired(tenantId)) {
      throw new SalesforceAuthRequiredError(
        'Salesforce authentication required. Admin must reconnect.',
      );
    }

    const results: {
      leads?: SyncResult;
      contacts?: SyncResult;
      opportunities?: SyncResult;
    } = {};

    try {
      const integration = await this.prisma.integration.findFirst({
        where: { tenantId, provider: 'salesforce' },
      });
      const lastSync = integration?.lastSyncedAt || undefined;

      if (module === 'leads' || module === 'all') {
        results.leads = await this.syncLeads(tenantId, lastSync);
      }

      if (module === 'contacts' || module === 'all') {
        results.contacts = await this.syncContacts(tenantId, lastSync);
      }

      if (module === 'opportunities' || module === 'all') {
        results.opportunities = await this.syncOpportunities(
          tenantId,
          lastSync,
        );
      }

      await this.prisma.integration.updateMany({
        where: { tenantId, provider: 'salesforce' },
        data: { lastSyncedAt: new Date(), lastError: null },
      });

      this.logger.log(
        `Salesforce sync completed for tenant ${tenantId}`,
        results,
      );
      return results;
    } catch (error: any) {
      this.logger.error(
        `Salesforce sync failed for tenant ${tenantId}: ${error.message}`,
      );
      await this.prisma.integration.updateMany({
        where: { tenantId, provider: 'salesforce' },
        data: { lastError: error.message },
      });
      throw error;
    }
  }

  /**
   * Sync Salesforce Leads to Candidates
   */
  async syncLeads(tenantId: string, lastSync?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      imported: 0,
      updated: 0,
      errors: 0,
      module: 'leads',
    };

    try {
      const leads = await this.apiService.getLeads(tenantId, lastSync);

      for (const lead of leads) {
        try {
          const email = lead.Email?.toLowerCase().trim() || null;
          const phone = lead.Phone?.replace(/\D/g, '') || null;
          const name =
            lead.Name ||
            `${lead.FirstName || ''} ${lead.LastName || ''}`.trim() ||
            'Unknown';

          const existing = await this.findExistingCandidate(
            tenantId,
            email,
            phone,
            lead.Id,
          );

          if (existing) {
            await this.prisma.candidate.update({
              where: { id: existing.id },
              data: {
                name,
                email: email || existing.email,
                phone: phone || existing.phone,
                roleTitle: lead.Title || existing.roleTitle,
                rawExternalData: lead as any,
              },
            });
            result.updated++;
          } else {
            await this.prisma.candidate.create({
              data: {
                tenantId,
                name,
                email,
                phone,
                roleTitle: lead.Title,
                stage: 'APPLIED',
                source: 'SALESFORCE_LEAD',
                externalId: lead.Id,
                externalSource: 'SALESFORCE',
                rawExternalData: lead as any,
                tags: ['salesforce-lead'],
              },
            });
            result.imported++;
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to sync Salesforce lead ${lead.Id}: ${err.message}`,
          );
          result.errors++;
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to fetch Salesforce leads: ${error.message}`);
      throw error;
    }

    this.logger.log(
      `Leads sync: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`,
    );
    return result;
  }

  /**
   * Sync Salesforce Contacts to Candidates
   */
  async syncContacts(tenantId: string, lastSync?: Date): Promise<SyncResult> {
    const result: SyncResult = {
      imported: 0,
      updated: 0,
      errors: 0,
      module: 'contacts',
    };

    try {
      const contacts = await this.apiService.getContacts(tenantId, lastSync);

      for (const contact of contacts) {
        try {
          const email = contact.Email?.toLowerCase().trim() || null;
          const phone = contact.Phone?.replace(/\D/g, '') || null;
          const name =
            contact.Name ||
            `${contact.FirstName || ''} ${contact.LastName || ''}`.trim() ||
            'Unknown';

          const existing = await this.findExistingCandidate(
            tenantId,
            email,
            phone,
            contact.Id,
          );

          if (existing) {
            await this.prisma.candidate.update({
              where: { id: existing.id },
              data: {
                name,
                email: email || existing.email,
                phone: phone || existing.phone,
                roleTitle: contact.Title || existing.roleTitle,
                rawExternalData: contact as any,
              },
            });
            result.updated++;
          } else {
            await this.prisma.candidate.create({
              data: {
                tenantId,
                name,
                email,
                phone,
                roleTitle: contact.Title,
                stage: 'APPLIED',
                source: 'SALESFORCE_CONTACT',
                externalId: contact.Id,
                externalSource: 'SALESFORCE',
                rawExternalData: contact as any,
                tags: ['salesforce-contact'],
              },
            });
            result.imported++;
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to sync Salesforce contact ${contact.Id}: ${err.message}`,
          );
          result.errors++;
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch Salesforce contacts: ${error.message}`,
      );
      throw error;
    }

    this.logger.log(
      `Contacts sync: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`,
    );
    return result;
  }

  /**
   * Sync Salesforce Opportunities to OpportunityContext
   */
  async syncOpportunities(
    tenantId: string,
    lastSync?: Date,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      imported: 0,
      updated: 0,
      errors: 0,
      module: 'opportunities',
    };

    try {
      const opportunities = await this.apiService.getOpportunities(
        tenantId,
        lastSync,
      );

      for (const opp of opportunities) {
        try {
          const existing = await this.prisma.opportunityContext.findUnique({
            where: {
              tenantId_provider_externalId: {
                tenantId,
                provider: 'salesforce',
                externalId: opp.Id,
              },
            },
          });

          if (existing) {
            await this.prisma.opportunityContext.update({
              where: { id: existing.id },
              data: {
                name: opp.Name,
                stageName: opp.StageName,
                amount: opp.Amount,
                closeDate: opp.CloseDate ? new Date(opp.CloseDate) : null,
                probability: opp.Probability,
                accountId: opp.AccountId,
                accountName: opp.Account?.Name,
                ownerId: opp.OwnerId,
                ownerName: opp.Owner?.Name,
                rawData: opp as any,
              },
            });
            result.updated++;
          } else {
            await this.prisma.opportunityContext.create({
              data: {
                tenantId,
                provider: 'salesforce',
                externalId: opp.Id,
                name: opp.Name,
                stageName: opp.StageName,
                amount: opp.Amount,
                closeDate: opp.CloseDate ? new Date(opp.CloseDate) : null,
                probability: opp.Probability,
                accountId: opp.AccountId,
                accountName: opp.Account?.Name,
                ownerId: opp.OwnerId,
                ownerName: opp.Owner?.Name,
                rawData: opp as any,
              },
            });
            result.imported++;
          }
        } catch (err: any) {
          this.logger.error(
            `Failed to sync Salesforce opportunity ${opp.Id}: ${err.message}`,
          );
          result.errors++;
        }
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch Salesforce opportunities: ${error.message}`,
      );
      throw error;
    }

    this.logger.log(
      `Opportunities sync: ${result.imported} imported, ${result.updated} updated, ${result.errors} errors`,
    );
    return result;
  }

  /**
   * Find existing candidate by email, phone, or external ID (deduplication)
   */
  private async findExistingCandidate(
    tenantId: string,
    email: string | null,
    phone: string | null,
    externalId: string,
  ): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    roleTitle: string | null;
  } | null> {
    // First try to find by external ID
    const byExternalId = await this.prisma.candidate.findFirst({
      where: { tenantId, externalSource: 'SALESFORCE', externalId },
      select: { id: true, email: true, phone: true, roleTitle: true },
    });
    if (byExternalId) return byExternalId;

    // Try to find by email
    if (email) {
      const byEmail = await this.prisma.candidate.findFirst({
        where: { tenantId, email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, phone: true, roleTitle: true },
      });
      if (byEmail) return byEmail;
    }

    // Try to find by phone
    if (phone && phone.length >= 10) {
      const byPhone = await this.prisma.candidate.findFirst({
        where: { tenantId, phone: { contains: phone.slice(-10) } },
        select: { id: true, email: true, phone: true, roleTitle: true },
      });
      if (byPhone) return byPhone;
    }

    return null;
  }

  /**
   * Push candidate update to Salesforce (two-way sync)
   */
  async pushCandidateUpdate(
    tenantId: string,
    candidateId: string,
  ): Promise<void> {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, tenantId, externalSource: 'SALESFORCE' },
    });

    if (!candidate || !candidate.externalId) {
      this.logger.warn(
        `Candidate ${candidateId} not found or not linked to Salesforce`,
      );
      return;
    }

    const sobject =
      candidate.source === 'SALESFORCE_CONTACT' ? 'Contact' : 'Lead';

    try {
      await this.apiService.updateRecord(
        tenantId,
        sobject,
        candidate.externalId,
        {
          Description: `Interview stage: ${candidate.stage}. Last updated from TalentSync.`,
        },
      );
      this.logger.log(
        `Pushed candidate ${candidateId} update to Salesforce ${sobject} ${candidate.externalId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to push candidate update to Salesforce: ${error.message}`,
      );
      throw error;
    }
  }
}

