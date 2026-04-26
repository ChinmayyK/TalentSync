import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { WorkdayAuthService } from './workday.auth';

/**
 * Error types for retry logic
 */
type WorkdayErrorType = 'transient' | 'permanent' | 'rate_limit' | 'auth';

interface WorkdayApiError {
  type: WorkdayErrorType;
  message: string;
  statusCode?: number;
  errorCode?: string;
}

/**
 * Workday Recruiting API Service
 *
 * Handles REST API calls to Workday Recruiting.
 * Uses Workday REST API v1 for recruiting operations.
 * Includes retry logic with exponential backoff.
 */
@Injectable()
export class WorkdayApiService {
  private readonly logger = new Logger(WorkdayApiService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(private authService: WorkdayAuthService) {}

  // ============================================
  // Candidate Operations
  // ============================================

  /**
   * Create a Candidate in Workday
   */
  async createCandidate(
    tenantId: string,
    candidate: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      source?: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      // Workday Recruiting REST API - Create Candidate
      const response = await client.post('/recruiting/v1/candidates', {
        candidateData: {
          name: {
            legalFirstName: candidate.firstName,
            legalLastName: candidate.lastName,
          },
          contactInformation: {
            emailAddresses: [
              {
                emailAddress: candidate.email,
                usageType: { id: 'Work' },
                primary: true,
              },
            ],
            phoneNumbers: candidate.phone
              ? [
                  {
                    phoneNumber: candidate.phone,
                    usageType: { id: 'Work' },
                    primary: true,
                  },
                ]
              : [],
          },
          source: candidate.source
            ? { descriptor: candidate.source }
            : undefined,
        },
      });

      return {
        id: response.data.id || response.data.candidateId,
        success: true,
      };
    });
  }

  /**
   * Update a Candidate in Workday
   */
  async updateCandidate(
    tenantId: string,
    candidateId: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.patch(`/recruiting/v1/candidates/${candidateId}`, {
        candidateData: data,
      });
      return true;
    });
  }

  /**
   * Update candidate recruiting stage
   */
  async updateCandidateStage(
    tenantId: string,
    candidateId: string,
    requisitionId: string,
    stage: string,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.post(`/recruiting/v1/jobApplications/${candidateId}/move`, {
        targetStage: { descriptor: stage },
        jobRequisition: { id: requisitionId },
      });
      return true;
    });
  }

  /**
   * Search for candidate by email
   */
  async searchCandidateByEmail(
    tenantId: string,
    email: string,
  ): Promise<{ id: string } | null> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/recruiting/v1/candidates', {
        params: {
          emailAddress: email,
          limit: 1,
        },
      });

      const candidates = response.data?.data || [];
      return candidates.length > 0 ? { id: candidates[0].id } : null;
    });
  }

  // ============================================
  // Job Application / Requisition Operations
  // ============================================

  /**
   * Link candidate to a job requisition (create job application)
   */
  async linkCandidateToRequisition(
    tenantId: string,
    candidateId: string,
    requisitionId: string,
  ): Promise<{ applicationId: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post('/recruiting/v1/jobApplications', {
        candidate: { id: candidateId },
        jobRequisition: { id: requisitionId },
      });

      return {
        applicationId: response.data.id || response.data.jobApplicationId,
        success: true,
      };
    });
  }

  /**
   * Get job requisitions
   */
  async getRequisitions(tenantId: string, status?: string): Promise<unknown[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/recruiting/v1/jobRequisitions', {
        params: {
          status: status || 'Open',
          limit: 100,
        },
      });

      return response.data?.data || [];
    });
  }

  // ============================================
  // Interview / Activity Operations
  // ============================================

  /**
   * Create an interview event in Workday
   */
  async createInterviewEvent(
    tenantId: string,
    applicationId: string,
    interview: {
      title: string;
      startTime: Date;
      endTime: Date;
      interviewers?: string[];
      notes?: string;
      status: string;
    },
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.post(
        `/recruiting/v1/jobApplications/${applicationId}/interviews`,
        {
          interviewData: {
            interviewTitle: interview.title,
            scheduledDateTime: interview.startTime.toISOString(),
            endDateTime: interview.endTime.toISOString(),
            interviewers: interview.interviewers?.map((id) => ({ id })) || [],
            notes: interview.notes || '',
            status: { descriptor: interview.status },
          },
        },
      );

      return {
        id: response.data.id || response.data.interviewId,
        success: true,
      };
    });
  }

  /**
   * Update interview status
   */
  async updateInterviewStatus(
    tenantId: string,
    interviewId: string,
    status: string,
    notes?: string,
  ): Promise<boolean> {
    return this.executeWithRetry(tenantId, async (client) => {
      await client.patch(`/recruiting/v1/interviews/${interviewId}`, {
        status: { descriptor: status },
        notes,
      });
      return true;
    });
  }

  // ============================================
  // Connection Test
  // ============================================

  /**
   * Test the connection to Workday
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.createClient(tenantId);
      // Test with a simple API call
      await client.get('/recruiting/v1/me');
      return { success: true, message: 'Connected to Workday Recruiting' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to connect to Workday: ${message}`,
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
    const { accessToken, tenantUrl } =
      await this.authService.getValidCredentials(tenantId);

    return axios.create({
      baseURL: `${tenantUrl}/ccx/api`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
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
        `Workday API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      // Don't retry permanent errors
      if (apiError.type === 'permanent') {
        throw new Error(`Workday API error: ${apiError.message}`);
      }

      // Handle auth errors - try token refresh
      if (apiError.type === 'auth' && attempt === 1) {
        this.logger.log('Token expired, refreshing...');
        await this.authService.refreshTokens(tenantId);
        return this.executeWithRetry(tenantId, operation, attempt + 1);
      }

      // Max retries exceeded
      if (attempt >= this.maxRetries) {
        throw new Error(
          `Workday API failed after ${this.maxRetries} attempts: ${apiError.message}`,
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
  private classifyError(error: unknown): WorkdayApiError {
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

    // Rate limit
    if (statusCode === 429) {
      return { type: 'rate_limit', message, statusCode };
    }

    // Auth errors
    if (statusCode === 401 || statusCode === 403) {
      return { type: 'auth', message, statusCode };
    }

    // Permanent errors (client errors except rate limit/auth)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return { type: 'permanent', message, statusCode };
    }

    // Server errors are transient
    if (statusCode && statusCode >= 500) {
      return { type: 'transient', message, statusCode };
    }

    // Network errors are transient
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return { type: 'transient', message: 'Network timeout', statusCode };
    }

    return { type: 'transient', message, statusCode };
  }
}
