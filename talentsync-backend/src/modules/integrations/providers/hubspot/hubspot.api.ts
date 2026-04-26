import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { HubspotOAuthService } from './hubspot.oauth';

/**
 * Error types for retry logic
 */
type HubspotErrorType = 'transient' | 'permanent' | 'rate_limit' | 'auth';

interface HubspotApiError {
  type: HubspotErrorType;
  message: string;
  statusCode?: number;
  category?: string;
}

/**
 * HubSpot CRM API Service
 *
 * Handles REST API calls to HubSpot CRM.
 * Includes retry logic with exponential backoff.
 */
@Injectable()
export class HubspotApiService {
  private readonly logger = new Logger(HubspotApiService.name);
  private readonly baseUrl = 'https://api.hubapi.com';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in ms

  constructor(private oauthService: HubspotOAuthService) {}

  // ============================================
  // Contact Operations
  // ============================================

  /**
   * Create a Contact in HubSpot
   */
  async createContact(
    tenantId: string,
    contact: {
      firstName?: string;
      lastName?: string;
      email: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      source?: string;
      stage?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/crm/v3/objects/contacts', {
        properties: {
          firstname: contact.firstName || '',
          lastname: contact.lastName || '',
          email: contact.email,
          phone: contact.phone || '',
          company: contact.company || '',
          jobtitle: contact.jobTitle || '',
          hs_lead_status: contact.stage || 'NEW',
          // Note: leadsource removed - not a default HubSpot property
        },
      });

      return { id: response.data.id, success: true };
    });
  }

  /**
   * Update a Contact in HubSpot
   */
  async updateContact(
    tenantId: string,
    contactId: string,
    properties: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.patch(`/crm/v3/objects/contacts/${contactId}`, {
        properties,
      });
      return true;
    });
  }

  /**
   * Search for a contact by email
   */
  async searchContactByEmail(
    tenantId: string,
    email: string,
  ): Promise<{ id: string } | null> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/crm/v3/objects/contacts/search', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: ['email', 'firstname', 'lastname'],
        limit: 1,
      });

      const results = response.data?.results || [];
      return results.length > 0 ? { id: results[0].id } : null;
    });
  }

  /**
   * Get contacts modified since a date (for incremental sync)
   */
  async getModifiedContacts(tenantId: string, since: Date): Promise<unknown[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/crm/v3/objects/contacts/search', {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'lastmodifieddate',
                operator: 'GTE',
                value: since.getTime().toString(),
              },
            ],
          },
        ],
        properties: [
          'email',
          'firstname',
          'lastname',
          'phone',
          'jobtitle',
          'company',
        ],
        limit: 100,
      });

      return response.data?.results || [];
    });
  }

  /**
   * Get all contacts for inbound sync (with pagination)
   * Fetches contacts created or modified since lastSync date
   */
  async getContacts(
    tenantId: string,
    lastSync?: Date,
  ): Promise<
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      jobTitle?: string;
      company?: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  > {
    const contacts: any[] = [];
    let after: string | undefined;
    const pageLimit = 100;
    const maxPages = 50; // Safety limit: 5000 contacts max per sync
    let pageCount = 0;

    this.logger.log(
      `Fetching HubSpot contacts for tenant ${tenantId}${lastSync ? ` (since ${lastSync.toISOString()})` : ''}`,
    );

    try {
      do {
        pageCount++;
        const result = await this.executeWithRetry(tenantId, async (client) => {
          // Build search request
          const searchBody: any = {
            properties: [
              'email',
              'firstname',
              'lastname',
              'phone',
              'jobtitle',
              'company',
              'createdate',
              'lastmodifieddate',
            ],
            limit: pageLimit,
            sorts: [{ propertyName: 'createdate', direction: 'ASCENDING' }],
          };

          // Add filter for incremental sync
          if (lastSync) {
            searchBody.filterGroups = [
              {
                filters: [
                  {
                    propertyName: 'lastmodifieddate',
                    operator: 'GTE',
                    value: lastSync.getTime().toString(),
                  },
                ],
              },
            ];
          }

          if (after) {
            searchBody.after = after;
          }

          const response = await client.post(
            '/crm/v3/objects/contacts/search',
            searchBody,
          );
          return response.data;
        });

        const pageContacts = result?.results || [];
        contacts.push(...pageContacts);
        after = result?.paging?.next?.after;

        this.logger.debug(
          `Fetched page ${pageCount}: ${pageContacts.length} contacts (total: ${contacts.length})`,
        );
      } while (after && pageCount < maxPages);

      this.logger.log(`Fetched ${contacts.length} contacts from HubSpot`);

      // Map to normalized format
      return contacts.map((c: any) => ({
        id: c.id,
        email: c.properties?.email || '',
        firstName: c.properties?.firstname || '',
        lastName: c.properties?.lastname || '',
        phone: c.properties?.phone,
        jobTitle: c.properties?.jobtitle,
        company: c.properties?.company,
        createdAt: new Date(c.properties?.createdate || c.createdAt),
        updatedAt: new Date(c.properties?.lastmodifieddate || c.updatedAt),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch HubSpot contacts: ${error}`);
      throw error;
    }
  }

  // ============================================
  // Deal Operations
  // ============================================

  /**
   * Create a Deal in HubSpot (for Job/Requisition)
   */
  async createDeal(
    tenantId: string,
    deal: {
      name: string;
      stage?: string;
      pipeline?: string;
      amount?: number;
      closeDate?: Date;
      description?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/crm/v3/objects/deals', {
        properties: {
          dealname: deal.name,
          dealstage: deal.stage || 'appointmentscheduled',
          pipeline: deal.pipeline || 'default',
          amount: deal.amount?.toString() || '0',
          closedate: deal.closeDate?.toISOString() || '',
          description: deal.description || '',
        },
      });

      return { id: response.data.id, success: true };
    });
  }

  /**
   * Update a Deal in HubSpot
   */
  async updateDeal(
    tenantId: string,
    dealId: string,
    properties: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.patch(`/crm/v3/objects/deals/${dealId}`, {
        properties,
      });
      return true;
    });
  }

  /**
   * Associate a contact with a deal
   */
  async associateContactToDeal(
    tenantId: string,
    contactId: string,
    dealId: string,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.put(
        `/crm/v3/objects/contacts/${contactId}/associations/deals/${dealId}/contact_to_deal`,
        {},
      );
      return true;
    });
  }

  /**
   * Get deals associated with a contact (for hiring context)
   * Returns deals linked to a specific contact - read-only context
   */
  async getDealsForContact(
    tenantId: string,
    contactId: string,
  ): Promise<
    {
      id: string;
      name: string;
      stageName?: string;
      amount?: number;
      closeDate?: Date;
      companyName?: string;
      ownerName?: string;
    }[]
  > {
    return this.executeWithRetry(tenantId, async (client) => {
      // Get associations first
      const assocResponse = await client.get(
        `/crm/v3/objects/contacts/${contactId}/associations/deals`,
      );

      const dealIds = assocResponse.data?.results?.map((r: any) => r.id) || [];
      if (dealIds.length === 0) {
        return [];
      }

      // Batch read deal details
      const batchResponse = await client.post(
        '/crm/v3/objects/deals/batch/read',
        {
          inputs: dealIds.map((id: string) => ({ id })),
          properties: [
            'dealname',
            'dealstage',
            'amount',
            'closedate',
            'hubspot_owner_id',
          ],
        },
      );

      return (batchResponse.data?.results || []).map((deal: any) => ({
        id: deal.id,
        name: deal.properties?.dealname || 'Unnamed Deal',
        stageName: deal.properties?.dealstage,
        amount: deal.properties?.amount
          ? parseFloat(deal.properties.amount)
          : undefined,
        closeDate: deal.properties?.closedate
          ? new Date(deal.properties.closedate)
          : undefined,
      }));
    });
  }

  // ============================================
  // Timeline Activity Operations
  // ============================================

  /**
   * Create a Note on a Contact (for interview activities)
   */
  async createNote(
    tenantId: string,
    contactId: string,
    noteBody: string,
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      // Create the note
      const noteResponse = await client.post('/crm/v3/objects/notes', {
        properties: {
          hs_note_body: noteBody,
          hs_timestamp: new Date().toISOString(),
        },
      });

      const noteId = noteResponse.data.id;

      // Associate note with contact
      await client.put(
        `/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}/note_to_contact`,
        {},
      );

      return { id: noteId, success: true };
    });
  }

  /**
   * Create a Meeting on a Contact (for interview events)
   */
  async createMeeting(
    tenantId: string,
    contactId: string,
    meeting: {
      title: string;
      startTime: Date;
      endTime: Date;
      body?: string;
      outcome?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      // Create the meeting
      const meetingResponse = await client.post('/crm/v3/objects/meetings', {
        properties: {
          hs_meeting_title: meeting.title,
          hs_meeting_start_time: meeting.startTime.toISOString(),
          hs_meeting_end_time: meeting.endTime.toISOString(),
          hs_meeting_body: meeting.body || '',
          hs_meeting_outcome: meeting.outcome || 'SCHEDULED',
        },
      });

      const meetingId = meetingResponse.data.id;

      // Associate meeting with contact
      await client.put(
        `/crm/v3/objects/meetings/${meetingId}/associations/contacts/${contactId}/meeting_to_contact`,
        {},
      );

      return { id: meetingId, success: true };
    });
  }

  /**
   * Update a Meeting status
   */
  async updateMeeting(
    tenantId: string,
    meetingId: string,
    properties: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.patch(`/crm/v3/objects/meetings/${meetingId}`, {
        properties,
      });
      return true;
    });
  }

  // ============================================
  // Connection Test
  // ============================================

  /**
   * Test the connection to HubSpot
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.createClient(tenantId);
      await client.get('/crm/v3/objects/contacts', { params: { limit: 1 } });
      return { success: true, message: 'Connected to HubSpot CRM' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to connect to HubSpot: ${message}`,
      };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Create an authenticated axios client
   */
  private async createClient(tenantId: string): Promise<AxiosInstance> {
    const accessToken = await this.oauthService.getValidToken(tenantId);

    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Execute with retry and exponential backoff
   */
  private async executeWithRetry<T>(
    tenantId: string,
    operation: (client: AxiosInstance) => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      const client = await this.createClient(tenantId);
      return await operation(client);
    } catch (error) {
      const apiError = this.classifyError(error);

      this.logger.warn(
        `HubSpot API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      // Don't retry permanent errors
      if (apiError.type === 'permanent') {
        throw new Error(`HubSpot API error: ${apiError.message}`);
      }

      // Handle auth errors - try token refresh
      if (apiError.type === 'auth' && attempt === 1) {
        this.logger.log('Token expired, refreshing...');
        await this.oauthService.refreshTokens(tenantId);
        return this.executeWithRetry(tenantId, operation, attempt + 1);
      }

      // Max retries exceeded
      if (attempt >= this.maxRetries) {
        throw new Error(
          `HubSpot API failed after ${this.maxRetries} attempts: ${apiError.message}`,
        );
      }

      // Calculate delay with exponential backoff + jitter
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;

      // Extra delay for rate limits
      const totalDelay =
        apiError.type === 'rate_limit' ? delay * 5 + jitter : delay + jitter;

      this.logger.log(`Retrying in ${Math.round(totalDelay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, totalDelay));

      return this.executeWithRetry(tenantId, operation, attempt + 1);
    }
  }

  /**
   * Classify error type for retry logic
   */
  private classifyError(error: unknown): HubspotApiError {
    if (!axios.isAxiosError(error)) {
      return {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const axiosError = error as AxiosError<{
      message?: string;
      category?: string;
    }>;
    const statusCode = axiosError.response?.status;
    const message = axiosError.response?.data?.message || axiosError.message;
    const category = axiosError.response?.data?.category;

    // Rate limit
    if (statusCode === 429) {
      return { type: 'rate_limit', message, statusCode, category };
    }

    // Auth errors
    if (statusCode === 401 || statusCode === 403) {
      return { type: 'auth', message, statusCode, category };
    }

    // Permanent errors (client errors except rate limit/auth)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return { type: 'permanent', message, statusCode, category };
    }

    // Server errors are transient
    if (statusCode && statusCode >= 500) {
      return { type: 'transient', message, statusCode, category };
    }

    // Network errors are transient
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return { type: 'transient', message: 'Network timeout', statusCode };
    }

    return { type: 'transient', message, statusCode };
  }
}
