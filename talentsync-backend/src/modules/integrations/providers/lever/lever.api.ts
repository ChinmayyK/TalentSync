import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { LeverAuthService } from './lever.auth';

type LeverErrorType = 'transient' | 'permanent' | 'rate_limit' | 'auth';

interface LeverApiError {
  type: LeverErrorType;
  message: string;
  statusCode?: number;
}

/**
 * Lever API Service
 *
 * Handles REST API calls to Lever.
 * Uses Lever API v1.
 */
@Injectable()
export class LeverApiService {
  private readonly logger = new Logger(LeverApiService.name);
  private readonly baseUrl = 'https://api.lever.co/v1';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(private authService: LeverAuthService) {}

  // ============================================
  // Opportunity (Candidate) Operations
  // ============================================

  /**
   * Create an Opportunity (candidate) in Lever
   */
  async createOpportunity(
    tenantId: string,
    candidate: {
      name: string;
      email?: string;
      phone?: string;
      origin?: string;
      stage?: string;
      postingId?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/opportunities', {
        name: candidate.name,
        emails: candidate.email ? [candidate.email] : [],
        phones: candidate.phone ? [{ value: candidate.phone }] : [],
        origin: candidate.origin || 'TalentSync',
        stage: candidate.stage,
        postings: candidate.postingId ? [candidate.postingId] : [],
      });

      return { id: response.data.data.id, success: true };
    });
  }

  /**
   * Update an Opportunity in Lever
   */
  async updateOpportunity(
    tenantId: string,
    opportunityId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.put(`/opportunities/${opportunityId}`, data);
      return true;
    });
  }

  /**
   * Search for opportunity by email
   */
  async searchOpportunityByEmail(
    tenantId: string,
    email: string,
  ): Promise<{ id: string } | null> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/opportunities', {
        params: { email },
      });

      const opportunities = response.data?.data || [];
      return opportunities.length > 0 ? { id: opportunities[0].id } : null;
    });
  }

  /**
   * Update opportunity stage
   */
  async updateOpportunityStage(
    tenantId: string,
    opportunityId: string,
    stageId: string,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.post(`/opportunities/${opportunityId}/stage`, {
        stage: stageId,
      });
      return true;
    });
  }

  // ============================================
  // Note Operations (for interviews)
  // ============================================

  /**
   * Add a note to an opportunity
   */
  async addNote(
    tenantId: string,
    opportunityId: string,
    note: {
      value: string;
      secret?: boolean;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post(
        `/opportunities/${opportunityId}/notes`,
        {
          value: note.value,
          secret: note.secret || false,
        },
      );

      return { id: response.data.data.id, success: true };
    });
  }

  // ============================================
  // Posting (Job) Operations
  // ============================================

  /**
   * Get postings (jobs)
   */
  async getPostings(tenantId: string): Promise<unknown[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/postings', {
        params: { state: 'published' },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get job postings with parsed data (alias for inbound sync)
   */
  async getJobPostings(tenantId: string): Promise<
    {
      id: string;
      title: string;
      department?: string;
      location?: string;
      state: string;
      rawData: any;
    }[]
  > {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/postings', {
        params: { state: 'published' },
      });
      const postings = response.data?.data || [];

      return postings.map((posting: any) => ({
        id: posting.id,
        title: posting.text || 'Untitled Position',
        department: posting.categories?.department,
        location: posting.categories?.location,
        state: posting.state || 'published',
        rawData: posting,
      }));
    });
  }

  /**
   * Get candidates/opportunities
   */
  async getCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<
    {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      jobTitle?: string;
      postingIds: string[];
      source?: string;
      rawData: any;
    }[]
  > {
    return this.executeWithRetry(tenantId, async (client) => {
      const params: any = { limit: 100 };
      if (since) {
        params.created_at_start = since.getTime();
      }

      const response = await client.get('/opportunities', { params });
      const opportunities = response.data?.data || [];

      return opportunities.map((opp: any) => ({
        id: opp.id,
        name: opp.name || 'Unknown',
        email: opp.emails?.[0],
        phone: opp.phones?.[0]?.value,
        jobTitle: opp.headline,
        postingIds: (opp.applications || [])
          .map((app: any) => app.posting)
          .filter(Boolean),
        source: opp.origin || opp.sources?.[0],
        rawData: opp,
      }));
    });
  }

  /**
   * Link opportunity to posting
   */
  async linkOpportunityToPosting(
    tenantId: string,
    opportunityId: string,
    postingId: string,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.post(`/opportunities/${opportunityId}/addPostings`, {
        postings: [postingId],
      });
      return true;
    });
  }

  // ============================================
  // Stage Operations
  // ============================================

  /**
   * Get pipeline stages
   */
  async getStages(tenantId: string): Promise<unknown[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/stages');
      return response.data?.data || [];
    });
  }

  // ============================================
  // Connection Test
  // ============================================

  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.createClient(tenantId);
      await client.get('/users/me');
      return { success: true, message: 'Connected to Lever' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed to connect: ${message}` };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async createClient(tenantId: string): Promise<AxiosInstance> {
    const accessToken = await this.authService.getValidToken(tenantId);

    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

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
        `Lever API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      if (apiError.type === 'permanent') {
        throw new Error(`Lever API error: ${apiError.message}`);
      }

      if (apiError.type === 'auth' && attempt === 1) {
        this.logger.log('Token expired, refreshing...');
        await this.authService.refreshTokens(tenantId);
        return this.executeWithRetry(tenantId, operation, attempt + 1);
      }

      if (attempt >= this.maxRetries) {
        throw new Error(
          `Lever API failed after ${this.maxRetries} attempts: ${apiError.message}`,
        );
      }

      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const totalDelay =
        apiError.type === 'rate_limit' ? delay * 5 + jitter : delay + jitter;

      this.logger.log(`Retrying in ${Math.round(totalDelay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, totalDelay));

      return this.executeWithRetry(tenantId, operation, attempt + 1);
    }
  }

  private classifyError(error: unknown): LeverApiError {
    if (!axios.isAxiosError(error)) {
      return {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const axiosError = error as AxiosError<{
      error?: string;
      message?: string;
    }>;
    const statusCode = axiosError.response?.status;
    const message =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message;

    if (statusCode === 429) return { type: 'rate_limit', message, statusCode };
    if (statusCode === 401 || statusCode === 403)
      return { type: 'auth', message, statusCode };
    if (statusCode && statusCode >= 400 && statusCode < 500)
      return { type: 'permanent', message, statusCode };
    if (statusCode && statusCode >= 500)
      return { type: 'transient', message, statusCode };
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return { type: 'transient', message: 'Network timeout', statusCode };
    }

    return { type: 'transient', message, statusCode };
  }
}

