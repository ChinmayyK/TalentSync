import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import {
  ProviderCapabilities,
  StandardCandidate,
  SyncResult,
} from '../../types/standard-entities';
import { SalesforceOAuthService } from './salesforce.oauth';
import { SalesforceApiService } from './salesforce.api';

/**
 * Salesforce Integration Provider
 * Supports: Lead/Contact sync, Opportunity mapping
 */
@Injectable()
export class SalesforceProvider implements IntegrationProvider {
  constructor(
    private prisma: PrismaService,
    private oauthService: SalesforceOAuthService,
    private apiService: SalesforceApiService,
  ) {}

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'bidirectional',
      jobSync: 'write', // Map to Opportunities
      interviewSync: 'none',
      supportsWebhooks: true,
    };
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/integrations/salesforce/callback`;
    return this.oauthService.getAuthUrl(tenantId, redirectUri);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(tenantId: string, code: string): Promise<void> {
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/integrations/salesforce/callback`;
    await this.oauthService.exchangeCode(tenantId, code, redirectUri);
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(tenantId: string): Promise<void> {
    await this.oauthService.refreshToken(tenantId);
  }

  /**
   * Push a candidate to Salesforce as a Lead
   */
  async pushCandidate(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult> {
    try {
      // Create new Lead using existing API methods
      const [firstName, ...lastNameParts] = candidate.name.split(' ');
      const result = await this.apiService.createRecord(tenantId, 'Lead', {
        FirstName: firstName || 'Unknown',
        LastName: lastNameParts.join(' ') || 'Unknown',
        Email: candidate.email,
        Phone: candidate.phone,
        Company: 'Unknown', // Required by Salesforce
        Title: candidate.roleTitle,
        LeadSource: candidate.source,
      });

      return { success: result.success, externalId: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Pull candidates from Salesforce
   */
  async pullCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<StandardCandidate[]> {
    const records = await this.apiService.getLeads(tenantId, since);

    return records.map((record) => ({
      externalId: record.Id,
      name:
        record.Name ||
        `${record.FirstName || ''} ${record.LastName || ''}`.trim(),
      email: record.Email,
      phone: record.Phone,
      source: 'Salesforce',
      notes: undefined,
      metadata: { salesforceId: record.Id },
    }));
  }

  /**
   * Handle incoming webhook from Salesforce
   */
  async handleWebhook(tenantId: string, event: any): Promise<void> {
    // Salesforce Platform Events or Outbound Messages
    console.log(`Salesforce webhook for tenant ${tenantId}`, event);
  }
}
