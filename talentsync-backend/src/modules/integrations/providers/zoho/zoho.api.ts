import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ZohoOAuthService } from './zoho.oauth';

/**
 * Error types for retry logic
 */
type ZohoErrorType = 'transient' | 'permanent' | 'rate_limit' | 'auth';

interface ZohoApiError {
  type: ZohoErrorType;
  message: string;
  statusCode?: number;
  zohoCode?: string;
}

/**
 * Zoho CRM API Service
 *
 * Handles all API communication with Zoho CRM.
 * Includes retry logic with exponential backoff.
 */
@Injectable()
export class ZohoApiService {
  private readonly logger = new Logger(ZohoApiService.name);
  private readonly baseUrl = 'https://www.zohoapis.in/crm/v2'; // India region
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in ms

  constructor(private zohoOAuth: ZohoOAuthService) {}

  // ============================================
  // Contact Operations
  // ============================================

  /**
   * Create a new contact in Zoho CRM
   */
  async createContact(
    tenantId: string,
    contactData: Record<string, any>,
  ): Promise<any> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/Contacts', {
        data: [contactData],
      });
      return this.extractResult(response.data, 'create');
    });
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    tenantId: string,
    contactId: string,
    contactData: Record<string, any>,
  ): Promise<any> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.put(`/Contacts/${contactId}`, {
        data: [contactData],
      });
      return this.extractResult(response.data, 'update');
    });
  }

  /**
   * Search for a contact by email
   */
  async searchContactByEmail(
    tenantId: string,
    email: string,
  ): Promise<any | null> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/Contacts/search', {
        params: { email },
      });
      return response.data?.data?.[0] || null;
    });
  }

  /**
   * Get contacts, optionally filtered
   */
  async getContacts(tenantId: string, page = 1, perPage = 200): Promise<any[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/Contacts', {
        params: { page, per_page: perPage },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get contacts modified since a date
   */
  async getContactsSince(tenantId: string, since: Date): Promise<any[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/Contacts', {
        params: { modified_since: since.toISOString() },
      });
      return response.data?.data || [];
    });
  }

  // ============================================
  // Lead Operations
  // ============================================

  /**
   * Create a new lead in Zoho CRM
   */
  async createLead(
    tenantId: string,
    leadData: Record<string, any>,
  ): Promise<any> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/Leads', {
        data: [leadData],
      });
      return this.extractResult(response.data, 'create');
    });
  }

  /**
   * Update an existing lead
   */
  async updateLead(
    tenantId: string,
    leadId: string,
    leadData: Record<string, any>,
  ): Promise<any> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.put(`/Leads/${leadId}`, {
        data: [leadData],
      });
      return this.extractResult(response.data, 'update');
    });
  }

  /**
   * Search for a lead by email
   */
  async searchLeadByEmail(
    tenantId: string,
    email: string,
  ): Promise<any | null> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/Leads/search', {
        params: { email },
      });
      return response.data?.data?.[0] || null;
    });
  }

  // ============================================
  // Activity Operations (Meetings, Calls, Tasks)
  // ============================================

  /**
   * Create an activity (meeting/task) in Zoho
   */
  async createActivity(
    tenantId: string,
    activityData: Record<string, any>,
  ): Promise<any> {
    // Default to Meetings module for interviews
    const module = activityData.Activity_Type === 'Call' ? 'Calls' : 'Events';

    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post(`/${module}`, {
        data: [activityData],
      });
      return this.extractResult(response.data, 'create');
    });
  }

  /**
   * Update an activity
   */
  async updateActivity(
    tenantId: string,
    activityId: string,
    activityData: Record<string, any>,
  ): Promise<any> {
    const module = activityData.Activity_Type === 'Call' ? 'Calls' : 'Events';

    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.put(`/${module}/${activityId}`, {
        data: [activityData],
      });
      return this.extractResult(response.data, 'update');
    });
  }

  // ============================================
  // Generic & Utility Methods
  // ============================================

  /**
   * Get a specific record from any module
   */
  async getRecord(
    tenantId: string,
    module: string,
    recordId: string,
  ): Promise<any> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get(`/${module}/${recordId}`);
      return response.data?.data?.[0] || null;
    });
  }

  // ============================================
  // Settings & Metadata Operations
  // ============================================

  /**
   * Get all active users from Zoho CRM
   * These are recruiters/interviewers for TalentSync
   */
  async getUsers(tenantId: string): Promise<any[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/users', {
        params: { type: 'AllUsers' },
      });
      return response.data?.users || [];
    });
  }

  /**
   * Get current user info
   */
  async getCurrentUser(tenantId: string): Promise<any> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/users', {
        params: { type: 'CurrentUser' },
      });
      return response.data?.users?.[0] || null;
    });
  }

  /**
   * Get Lead stages/statuses from Zoho CRM settings
   * These map to pipeline stages in TalentSync
   */
  async getLeadStages(tenantId: string): Promise<any[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      // Get Lead_Status field picklist values
      const response = await client.get('/settings/fields', {
        params: { module: 'Leads' },
      });

      const fields = response.data?.fields || [];
      const statusField = fields.find(
        (f: any) =>
          f.api_name === 'Lead_Status' || f.field_label === 'Lead Status',
      );

      if (statusField?.pick_list_values) {
        return statusField.pick_list_values.map((v: any, index: number) => ({
          id: v.id || `stage_${index}`,
          name: v.display_value || v.actual_value,
          order: index,
        }));
      }

      return [];
    });
  }

  /**
   * Get Contact stages/statuses from Zoho CRM settings
   */
  async getContactStages(tenantId: string): Promise<any[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/settings/fields', {
        params: { module: 'Contacts' },
      });

      const fields = response.data?.fields || [];
      // Contact Status or similar field
      const statusField = fields.find(
        (f: any) =>
          f.api_name === 'Contact_Status' ||
          f.field_label === 'Status' ||
          f.api_name === 'Lead_Source', // Fallback
      );

      if (statusField?.pick_list_values) {
        return statusField.pick_list_values.map((v: any, index: number) => ({
          id: v.id || `stage_${index}`,
          name: v.display_value || v.actual_value,
          order: index,
        }));
      }

      return [];
    });
  }

  /**
   * Get Leads from Zoho CRM
   */
  async getLeads(tenantId: string, page = 1, perPage = 200): Promise<any[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/Leads', {
        params: { page, per_page: perPage },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Check API connectivity
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.createClient(tenantId);
      await client.get('/users', { params: { type: 'CurrentUser' } });
      return { success: true, message: 'Connected to Zoho CRM' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Zoho CRM',
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
    const accessToken = await this.zohoOAuth.getValidToken(tenantId);

    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
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
        `Zoho API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      // Don't retry permanent errors
      if (apiError.type === 'permanent') {
        throw new Error(`Zoho API error: ${apiError.message}`);
      }

      // Handle auth errors - try token refresh
      if (apiError.type === 'auth' && attempt === 1) {
        this.logger.log('Token expired, refreshing...');
        await this.zohoOAuth.refreshTokens(tenantId);
        return this.executeWithRetry(tenantId, operation, attempt + 1);
      }

      // Max retries exceeded
      if (attempt >= this.maxRetries) {
        throw new Error(
          `Zoho API failed after ${this.maxRetries} attempts: ${apiError.message}`,
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
  private classifyError(error: any): ZohoApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data as any;
      const zohoCode = data?.code;

      // Rate limit
      if (status === 429) {
        return {
          type: 'rate_limit',
          message: 'Rate limit exceeded',
          statusCode: 429,
        };
      }

      // Auth errors
      if (status === 401 || zohoCode === 'INVALID_TOKEN') {
        return {
          type: 'auth',
          message: 'Authentication failed',
          statusCode: 401,
          zohoCode,
        };
      }

      // Permanent client errors
      if (status && status >= 400 && status < 500) {
        return {
          type: 'permanent',
          message: data?.message || `Client error: ${status}`,
          statusCode: status,
          zohoCode,
        };
      }

      // Server errors - transient
      if (status && status >= 500) {
        return {
          type: 'transient',
          message: `Server error: ${status}`,
          statusCode: status,
        };
      }

      // Network errors - transient
      if (
        axiosError.code === 'ECONNABORTED' ||
        axiosError.code === 'ETIMEDOUT'
      ) {
        return {
          type: 'transient',
          message: 'Request timeout',
        };
      }
    }

    return {
      type: 'transient',
      message: error.message || 'Unknown error',
    };
  }

  /**
   * Extract result from Zoho response
   */
  private extractResult(data: any, operation: 'create' | 'update'): any {
    if (!data?.data?.[0]) {
      throw new Error(`Failed to ${operation}: No response data`);
    }

    const result = data.data[0];

    if (result.status === 'error') {
      throw new Error(result.message || `${operation} failed`);
    }

    return result;
  }
}
