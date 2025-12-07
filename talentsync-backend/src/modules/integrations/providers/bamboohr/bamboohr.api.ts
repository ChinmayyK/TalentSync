import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { BambooHROAuthService } from './bamboohr.oauth';

type BambooHRErrorType = 'transient' | 'permanent' | 'rate_limit' | 'auth';

interface BambooHRApiError {
  type: BambooHRErrorType;
  message: string;
  statusCode?: number;
}

interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  workEmail?: string;
  mobilePhone?: string;
  jobTitle?: string;
  department?: string;
  hireDate?: string; // YYYY-MM-DD format
  externalReference?: string; // TalentSync candidate ID
}

/**
 * BambooHR API Service
 *
 * Handles employee creation in BambooHR (outbound handoff only)
 * Uses OAuth 2.0 Bearer tokens
 */
@Injectable()
export class BambooHRApiService {
  private readonly logger = new Logger(BambooHRApiService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(private oauthService: BambooHROAuthService) {}

  /**
   * Create a new employee in BambooHR
   * This is a one-way handoff - no updates after creation
   */
  async createEmployee(
    tenantId: string,
    data: CreateEmployeeData,
  ): Promise<{ id: string; success: boolean }> {
    return this.executeWithRetry(tenantId, async (client) => {
      const payload: Record<string, string> = {
        firstName: data.firstName,
        lastName: data.lastName,
      };

      if (data.workEmail) payload.workEmail = data.workEmail;
      if (data.mobilePhone) payload.mobilePhone = data.mobilePhone;
      if (data.jobTitle) payload.jobTitle = data.jobTitle;
      if (data.department) payload.department = data.department;
      if (data.hireDate) payload.hireDate = data.hireDate;

      const response = await client.post('/employees', payload);

      // BambooHR returns the employee ID in Location header
      const locationHeader = response.headers.location;
      const employeeId = locationHeader?.split('/').pop() || 'unknown';

      this.logger.log(`Created BambooHR employee ${employeeId}`);
      return { id: employeeId, success: true };
    });
  }

  /**
   * Test connection to BambooHR
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.createClient(tenantId);
      await client.get('/employees/directory');
      return { success: true, message: 'Connected to BambooHR' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed: ${message}` };
    }
  }

  /**
   * Get departments (for optional mapping)
   */
  async getDepartments(
    tenantId: string,
  ): Promise<{ id: string; name: string }[]> {
    return this.executeWithRetry(tenantId, async (client) => {
      const response = await client.get('/meta/lists');
      const lists = response.data || [];
      const deptList = lists.find((l: any) => l.fieldId === 'department');
      return (deptList?.options || []).map((opt: any) => ({
        id: opt.id?.toString() || opt.name,
        name: opt.name,
      }));
    });
  }

  /**
   * Upload employee photo to BambooHR
   * Photo must be square (width == height), JPG/PNG/GIF, max 20MB
   */
  async uploadEmployeePhoto(
    tenantId: string,
    employeeId: string,
    photoBuffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.oauthService.getValidAccessToken(tenantId);
      const companyDomain = await this.oauthService.getCompanyDomain(tenantId);

      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', photoBuffer, {
        filename,
        contentType: mimeType,
      });

      const response = await axios.post(
        `https://api.bamboohr.com/api/gateway.php/${companyDomain}/v1/employees/${employeeId}/photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...formData.getHeaders(),
          },
          timeout: 60000,
        },
      );

      if (response.status === 201) {
        this.logger.log(`Uploaded photo for BambooHR employee ${employeeId}`);
        return { success: true };
      }
      return { success: false, error: `Unexpected status: ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to upload photo for employee ${employeeId}: ${message}`,
      );
      return { success: false, error: message };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async createClient(tenantId: string): Promise<AxiosInstance> {
    const accessToken = await this.oauthService.getValidAccessToken(tenantId);
    const companyDomain = await this.oauthService.getCompanyDomain(tenantId);

    return axios.create({
      baseURL: `https://api.bamboohr.com/api/gateway.php/${companyDomain}/v1`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
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
        `BambooHR API error (attempt ${attempt}/${this.maxRetries}): ${apiError.message}`,
      );

      // If auth error, try refreshing tokens
      if (apiError.type === 'auth' && attempt === 1) {
        try {
          await this.oauthService.refreshTokens(tenantId);
          return this.executeWithRetry(tenantId, operation, attempt + 1);
        } catch {
          throw new Error('BambooHR authentication failed');
        }
      }

      if (apiError.type === 'permanent') {
        throw new Error(`BambooHR API error: ${apiError.message}`);
      }

      if (attempt >= this.maxRetries) {
        throw new Error(
          `BambooHR API failed after ${this.maxRetries} attempts: ${apiError.message}`,
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

  private classifyError(error: unknown): BambooHRApiError {
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

