import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { GreenhouseAuthService } from './greenhouse.auth';

type GreenhouseErrorType = 'transient' | 'permanent' | 'rate_limit' | 'auth';

interface GreenhouseApiError {
  type: GreenhouseErrorType;
  message: string;
  statusCode?: number;
}

/**
 * Greenhouse Harvest API Service
 *
 * Uses Basic Auth with API key as username, empty password.
 */
@Injectable()
export class GreenhouseApiService {
  private readonly logger = new Logger(GreenhouseApiService.name);
  private readonly baseUrl = 'https://harvest.greenhouse.io/v1';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(private authService: GreenhouseAuthService) {}

  // ============================================
  // Candidate Operations
  // ============================================

  async createCandidate(
    tenantId: string,
    candidate: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/candidates', {
        first_name: candidate.firstName,
        last_name: candidate.lastName,
        email_addresses: candidate.email
          ? [{ value: candidate.email, type: 'personal' }]
          : [],
        phone_numbers: candidate.phone
          ? [{ value: candidate.phone, type: 'mobile' }]
          : [],
      });
      return { id: response.data.id.toString(), success: true };
    });
  }

  async updateCandidate(
    tenantId: string,
    candidateId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.patch(`/candidates/${candidateId}`, data);
      return true;
    });
  }

  async searchCandidateByEmail(
    tenantId: string,
    email: string,
  ): Promise<{ id: string } | null> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/candidates', {
        params: { email },
      });
      const candidates = response.data || [];
      return candidates.length > 0 ? { id: candidates[0].id.toString() } : null;
    });
  }

  // ============================================
  // Application Operations
  // ============================================

  async createApplication(
    tenantId: string,
    candidateId: string,
    jobId: string,
    source?: string,
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post(
        `/candidates/${candidateId}/applications`,
        {
          job_id: parseInt(jobId),
          source_id: null,
          referrer: source ? { type: 'id', value: null } : null,
        },
      );
      return { id: response.data.id.toString(), success: true };
    });
  }

  async updateApplicationStage(
    tenantId: string,
    applicationId: string,
    stageId: string,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.put(`/applications/${applicationId}/move`, {
        from_stage_id: null,
        to_stage_id: parseInt(stageId),
      });
      return true;
    });
  }

  // ============================================
  // Activity / Note Operations
  // ============================================

  async addNote(
    tenantId: string,
    candidateId: string,
    note: string,
    visibility: 'public' | 'private' = 'public',
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post(
        `/candidates/${candidateId}/activity_feed/notes`,
        {
          body: note,
          visibility,
        },
      );
      return { id: response.data.id?.toString() || 'note', success: true };
    });
  }

  // ============================================
  // Job Operations
  // ============================================

  async getJobs(tenantId: string): Promise<unknown[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/jobs', {
        params: { status: 'open' },
      });
      return response.data || [];
    });
  }

  /**
   * Get jobs with parsed data for inbound sync
   */
  async getJobsParsed(tenantId: string): Promise<
    {
      id: string;
      title: string;
      department?: string;
      location?: string;
      status: string;
      rawData: any;
    }[]
  > {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/jobs', {
        params: { status: 'open' },
      });
      const jobs = response.data || [];

      return jobs.map((job: any) => ({
        id: job.id?.toString(),
        title: job.name || 'Untitled',
        department: job.departments?.[0]?.name,
        location: job.offices?.[0]?.name,
        status: job.status || 'open',
        rawData: job,
      }));
    });
  }

  /**
   * Get candidates for inbound sync
   */
  async getCandidates(
    tenantId: string,
    since?: Date,
  ): Promise<
    {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      jobIds: string[];
      rawData: any;
    }[]
  > {
    return this.executeWithRetry(tenantId, async (client) => {
      const params: any = { per_page: 100 };
      if (since) {
        params.created_after = since.toISOString();
      }

      const response = await client.get('/candidates', { params });
      const candidates = response.data || [];

      return candidates.map((c: any) => ({
        id: c.id?.toString(),
        firstName: c.first_name || '',
        lastName: c.last_name || '',
        email: c.email_addresses?.[0]?.value,
        phone: c.phone_numbers?.[0]?.value,
        jobIds: (c.applications || [])
          .map((app: any) => app.job_id?.toString())
          .filter(Boolean),
        rawData: c,
      }));
    });
  }

  /**
   * Get interview feedback/scorecards for a candidate (read-only)
   */
  async getFeedbackForCandidate(
    tenantId: string,
    candidateId: string,
  ): Promise<
    {
      id: string;
      interviewerName?: string;
      interviewType?: string;
      interviewDate?: Date;
      overallScore?: string;
      recommendation?: string;
      comments?: string;
      scorecard: any;
      rawData: any;
    }[]
  > {
    return this.executeWithRetry(tenantId, async (client) => {
      // Get scorecards for this candidate's applications
      const response = await client.get(
        `/candidates/${candidateId}/scorecards`,
      );
      const scorecards = response.data || [];

      return scorecards.map((sc: any) => ({
        id: sc.id?.toString(),
        interviewerName: sc.submitted_by?.name,
        interviewType: sc.interview || 'Interview',
        interviewDate: sc.submitted_at ? new Date(sc.submitted_at) : undefined,
        overallScore: sc.overall_recommendation,
        recommendation: sc.overall_recommendation,
        comments:
          sc.attributes
            ?.map((a: any) => a.notes || '')
            .join('\n')
            .trim() || undefined,
        scorecard: sc.attributes,
        rawData: sc,
      }));
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
      await client.get('/users');
      return { success: true, message: 'Connected to Greenhouse' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed: ${message}` };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async createClient(tenantId: string): Promise<AxiosInstance> {
    const apiKey = await this.authService.getApiKey(tenantId);
    const onBehalfOf = await this.authService.getOnBehalfOfUserId(tenantId);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (onBehalfOf) {
      headers['On-Behalf-Of'] = onBehalfOf;
    }

    return axios.create({
      baseURL: this.baseUrl,
      auth: { username: apiKey, password: '' },
      headers,
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
        `Greenhouse API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      if (apiError.type === 'permanent') {
        throw new Error(`Greenhouse API error: ${apiError.message}`);
      }

      if (attempt >= this.maxRetries) {
        throw new Error(
          `Greenhouse API failed after ${this.maxRetries} attempts: ${apiError.message}`,
        );
      }

      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const totalDelay =
        apiError.type === 'rate_limit' ? delay * 5 + jitter : delay + jitter;

      await new Promise((resolve) => setTimeout(resolve, totalDelay));
      return this.executeWithRetry(tenantId, operation, attempt + 1);
    }
  }

  private classifyError(error: unknown): GreenhouseApiError {
    if (!axios.isAxiosError(error)) {
      return {
        type: 'transient',
        message: error instanceof Error ? error.message : 'Unknown',
      };
    }

    const axiosError = error as AxiosError<{ message?: string }>;
    const statusCode = axiosError.response?.status;
    const message = axiosError.response?.data?.message || axiosError.message;

    if (statusCode === 429) return { type: 'rate_limit', message, statusCode };
    if (statusCode === 401 || statusCode === 403)
      return { type: 'auth', message, statusCode };
    if (statusCode && statusCode >= 400 && statusCode < 500)
      return { type: 'permanent', message, statusCode };
    if (statusCode && statusCode >= 500)
      return { type: 'transient', message, statusCode };

    return { type: 'transient', message, statusCode };
  }
}
