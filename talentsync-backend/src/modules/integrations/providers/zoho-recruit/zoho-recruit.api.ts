import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';

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
 * Zoho Recruit API Service
 *
 * Handles all API communication with Zoho Recruit.
 * Uses different base URL than CRM: https://recruit.zoho.in/recruit/v2
 */
@Injectable()
export class ZohoRecruitApiService {
  private readonly logger = new Logger(ZohoRecruitApiService.name);
  private readonly baseUrl = 'https://recruit.zoho.in/recruit/v2'; // India region
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // Base delay in ms

  constructor() {}

  // ============================================
  // Job Openings Operations
  // ============================================

  /**
   * Get all active job openings
   */
  async getJobOpenings(
    accessToken: string,
    page = 1,
    perPage = 200,
  ): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/JobOpenings', {
        params: { page, per_page: perPage },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get job openings modified since a date
   */
  async getJobOpeningsSince(accessToken: string, since: Date): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/JobOpenings', {
        params: { modified_since: since.toISOString() },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get a single job opening by ID
   */
  async getJobOpening(accessToken: string, jobId: string): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get(`/JobOpenings/${jobId}`);
      return response.data?.data?.[0] || null;
    });
  }

  // ============================================
  // Candidates Operations
  // ============================================

  /**
   * Get all candidates
   */
  async getCandidates(
    accessToken: string,
    page = 1,
    perPage = 200,
  ): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/Candidates', {
        params: { page, per_page: perPage },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get candidates modified since a date
   */
  async getCandidatesSince(accessToken: string, since: Date): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/Candidates', {
        params: { modified_since: since.toISOString() },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get a single candidate by ID
   */
  async getCandidate(accessToken: string, candidateId: string): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get(`/Candidates/${candidateId}`);
      return response.data?.data?.[0] || null;
    });
  }

  /**
   * Search candidates by email
   */
  async searchCandidateByEmail(
    accessToken: string,
    email: string,
  ): Promise<any | null> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/Candidates/search', {
        params: { email },
      });
      return response.data?.data?.[0] || null;
    });
  }

  /**
   * Associate a candidate with a job opening
   */
  async associateCandidateWithJob(
    accessToken: string,
    candidateId: string,
    jobId: string,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.put(
        `/Candidates/${candidateId}/actions/associate`,
        {
          data: [{ JobOpening: { id: jobId } }],
        },
      );
      return response.data;
    });
  }

  /**
   * Update candidate stage/status
   */
  async updateCandidateStage(
    accessToken: string,
    candidateId: string,
    stage: string,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.put(`/Candidates/${candidateId}`, {
        data: [{ Candidate_Status: stage }],
      });
      return response.data;
    });
  }

  // ============================================
  // Interviews Operations
  // ============================================

  /**
   * Get all interviews
   */
  async getInterviews(
    accessToken: string,
    page = 1,
    perPage = 200,
  ): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/Interviews', {
        params: { page, per_page: perPage },
      });
      return response.data?.data || [];
    });
  }

  /**
   * Get interviews for a specific candidate
   */
  async getCandidateInterviews(
    accessToken: string,
    candidateId: string,
  ): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get(
        `/Candidates/${candidateId}/Interviews`,
      );
      return response.data?.data || [];
    });
  }

  /**
   * Create an interview in Zoho Recruit
   */
  async createInterview(
    accessToken: string,
    interviewData: Record<string, any>,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.post('/Interviews', {
        data: [interviewData],
      });
      return this.extractResult(response.data, 'create');
    });
  }

  /**
   * Update an interview
   */
  async updateInterview(
    accessToken: string,
    interviewId: string,
    interviewData: Record<string, any>,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.put(`/Interviews/${interviewId}`, {
        data: [interviewData],
      });
      return this.extractResult(response.data, 'update');
    });
  }

  /**
   * Cancel an interview
   */
  async cancelInterview(
    accessToken: string,
    interviewId: string,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.put(`/Interviews/${interviewId}`, {
        data: [{ Interview_Status: 'Cancelled' }],
      });
      return response.data;
    });
  }

  // ============================================
  // Assessments Operations
  // ============================================

  /**
   * Get assessment templates
   */
  async getAssessments(accessToken: string): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/Assessments');
      return response.data?.data || [];
    });
  }

  /**
   * Get assessment results for a candidate
   */
  async getCandidateAssessments(
    accessToken: string,
    candidateId: string,
  ): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get(
        `/Candidates/${candidateId}/Assessments`,
      );
      return response.data?.data || [];
    });
  }

  /**
   * Trigger an assessment for a candidate
   */
  async triggerAssessment(
    accessToken: string,
    candidateId: string,
    assessmentId: string,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.post(
        `/Candidates/${candidateId}/actions/send_assessment`,
        {
          data: [{ Assessment: { id: assessmentId } }],
        },
      );
      return response.data;
    });
  }

  // ============================================
  // Resume Parsing
  // ============================================

  /**
   * Upload and parse a resume
   */
  async parseResume(
    accessToken: string,
    fileBuffer: Buffer,
    filename: string,
  ): Promise<any> {
    return this.executeWithRetry(accessToken, async (client) => {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename });

      const response = await client.post('/Candidates/parse', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      return response.data;
    });
  }

  // ============================================
  // Settings & Metadata
  // ============================================

  /**
   * Get field metadata for a module
   */
  async getModuleFields(accessToken: string, module: string): Promise<any[]> {
    return this.executeWithRetry(accessToken, async (client) => {
      const response = await client.get('/settings/fields', {
        params: { module },
      });
      return response.data?.fields || [];
    });
  }

  /**
   * Get picklist values for a field
   */
  async getPicklistValues(
    accessToken: string,
    module: string,
    fieldApiName: string,
  ): Promise<any[]> {
    const fields = await this.getModuleFields(accessToken, module);
    const field = fields.find((f: any) => f.api_name === fieldApiName);
    return field?.pick_list_values || [];
  }

  /**
   * Test API connectivity
   */
  async testConnection(
    accessToken: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.createClient(accessToken);
      await client.get('/users', { params: { type: 'CurrentUser' } });
      return { success: true, message: 'Connected to Zoho Recruit' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Zoho Recruit',
      };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Create an authenticated axios client
   */
  private createClient(accessToken: string): AxiosInstance {
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
    accessToken: string,
    operation: (client: AxiosInstance) => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      const client = this.createClient(accessToken);
      return await operation(client);
    } catch (error) {
      const apiError = this.classifyError(error);

      this.logger.warn(
        `Zoho Recruit API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      // Don't retry permanent errors or auth errors
      if (apiError.type === 'permanent' || apiError.type === 'auth') {
        throw new Error(`Zoho Recruit API error: ${apiError.message}`);
      }

      // Max retries exceeded
      if (attempt >= this.maxRetries) {
        throw new Error(
          `Zoho Recruit API failed after ${this.maxRetries} attempts: ${apiError.message}`,
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

      return this.executeWithRetry(accessToken, operation, attempt + 1);
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
          message: 'Authentication failed - token may be expired',
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
