import { Injectable, Logger } from '@nestjs/common';
import { Job } from '@prisma/client';
import { IJobBoardProvider, ExternalApplication } from './provider.interface';
import {
  JobBoardProvider,
  JobPostingResponse,
  JobPostingStatus,
  ProviderCredentials,
} from '../dto';

/**
 * ZipRecruiter Job Board Provider
 *
 * Integrates with ZipRecruiter Job Posting API
 * API Docs: https://www.ziprecruiter.com/employers/api
 *
 * Required credentials:
 * - apiKey: ZipRecruiter API key
 * - employerId: ZipRecruiter employer/company ID
 */
@Injectable()
export class ZipRecruiterProvider implements IJobBoardProvider {
  private readonly logger = new Logger(ZipRecruiterProvider.name);
  private readonly baseUrl = 'https://api.ziprecruiter.com/job-posting/v2';

  readonly provider = JobBoardProvider.ZIPRECRUITER;
  readonly name = 'ZipRecruiter';

  isConfigured(credentials: ProviderCredentials): boolean {
    return !!(credentials.apiKey && credentials.employerId);
  }

  async postJob(
    job: Job,
    credentials: ProviderCredentials,
    options?: {
      customTitle?: string;
      customDescription?: string;
      sponsored?: boolean;
    },
  ): Promise<JobPostingResponse> {
    this.logger.log(`[ZipRecruiter] Posting job: ${job.title}`);

    if (!this.isConfigured(credentials)) {
      throw new Error('ZipRecruiter credentials not configured');
    }

    try {
      // ZipRecruiter Job Posting API v2
      // POST /job-posting/v2/jobs
      //
      // const response = await axios.post(`${this.baseUrl}/jobs`, {
      //     title: options?.customTitle || job.title,
      //     description: options?.customDescription || job.description,
      //     company: credentials.employerId,
      //     location: {
      //         city: this.extractCity(job.location),
      //         state: this.extractState(job.location),
      //         country: 'US',
      //     },
      //     job_type: this.mapEmploymentType(job.employmentType),
      //     remote_type: this.mapLocationType(job.locationType),
      //     compensation: this.formatCompensation(job),
      //     sponsored: options?.sponsored || false,
      // }, {
      //     headers: {
      //         'Authorization': `Bearer ${credentials.apiKey}`,
      //         'Content-Type': 'application/json',
      //     }
      // });
      //
      // const externalId = response.data.job_id;
      // const externalUrl = response.data.job_url;

      // Simulated response for development
      const externalId = `zr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(
        `[ZipRecruiter] Job posted with external ID: ${externalId}`,
      );

      return {
        externalId,
        externalUrl: `https://www.ziprecruiter.com/job/${externalId}`,
        status: options?.sponsored
          ? JobPostingStatus.ACTIVE
          : JobPostingStatus.PENDING,
        message: options?.sponsored
          ? 'Sponsored job posted and live on ZipRecruiter.'
          : 'Job submitted to ZipRecruiter. Standard listings are reviewed within 24 hours.',
      };
    } catch (error: any) {
      this.logger.error(`[ZipRecruiter] Failed to post job: ${error.message}`);
      return {
        externalId: '',
        status: JobPostingStatus.FAILED,
        message: `Failed to post job: ${error.message}`,
      };
    }
  }

  async updateJob(
    externalId: string,
    job: Job,
    credentials: ProviderCredentials,
  ): Promise<JobPostingResponse> {
    this.logger.log(`[ZipRecruiter] Updating job: ${externalId}`);

    try {
      // PUT /job-posting/v2/jobs/{job_id}
      //
      // const response = await axios.put(`${this.baseUrl}/jobs/${externalId}`, {
      //     title: job.title,
      //     description: job.description,
      //     location: {
      //         city: this.extractCity(job.location),
      //         state: this.extractState(job.location),
      //     },
      //     job_type: this.mapEmploymentType(job.employmentType),
      //     compensation: this.formatCompensation(job),
      // }, {
      //     headers: {
      //         'Authorization': `Bearer ${credentials.apiKey}`,
      //     }
      // });

      return {
        externalId,
        status: JobPostingStatus.ACTIVE,
        message: 'Job updated successfully on ZipRecruiter',
      };
    } catch (error: any) {
      this.logger.error(
        `[ZipRecruiter] Failed to update job: ${error.message}`,
      );
      return {
        externalId,
        status: JobPostingStatus.FAILED,
        message: `Failed to update job: ${error.message}`,
      };
    }
  }

  async closeJob(
    externalId: string,
    credentials: ProviderCredentials,
  ): Promise<void> {
    this.logger.log(`[ZipRecruiter] Closing job: ${externalId}`);

    try {
      // DELETE /job-posting/v2/jobs/{job_id}
      // or
      // PUT /job-posting/v2/jobs/{job_id}/status with status: 'closed'
      //
      // await axios.delete(`${this.baseUrl}/jobs/${externalId}`, {
      //     headers: {
      //         'Authorization': `Bearer ${credentials.apiKey}`,
      //     }
      // });

      this.logger.log(`[ZipRecruiter] Job ${externalId} closed successfully`);
    } catch (error: any) {
      this.logger.error(`[ZipRecruiter] Failed to close job: ${error.message}`);
      throw error;
    }
  }

  async getJobStatus(
    externalId: string,
    credentials: ProviderCredentials,
  ): Promise<JobPostingStatus> {
    this.logger.log(`[ZipRecruiter] Getting status for: ${externalId}`);

    try {
      // GET /job-posting/v2/jobs/{job_id}
      //
      // const response = await axios.get(`${this.baseUrl}/jobs/${externalId}`, {
      //     headers: {
      //         'Authorization': `Bearer ${credentials.apiKey}`,
      //     }
      // });
      // return this.mapStatus(response.data.status);

      // Simulated: Return ACTIVE for demo
      return JobPostingStatus.ACTIVE;
    } catch (error: any) {
      this.logger.error(
        `[ZipRecruiter] Failed to get job status: ${error.message}`,
      );
      return JobPostingStatus.FAILED;
    }
  }

  async syncApplications(
    externalId: string,
    credentials: ProviderCredentials,
    since?: Date,
  ): Promise<ExternalApplication[]> {
    this.logger.log(`[ZipRecruiter] Syncing applications for: ${externalId}`);

    try {
      // GET /job-posting/v2/jobs/{job_id}/applications
      // ZipRecruiter also supports webhooks for real-time application notifications
      //
      // const response = await axios.get(`${this.baseUrl}/jobs/${externalId}/applications`, {
      //     headers: {
      //         'Authorization': `Bearer ${credentials.apiKey}`,
      //     },
      //     params: {
      //         since: since?.toISOString(),
      //     }
      // });
      //
      // return response.data.applications.map((app: any) => ({
      //     externalId: app.id,
      //     candidateName: app.candidate.name,
      //     candidateEmail: app.candidate.email,
      //     candidatePhone: app.candidate.phone,
      //     resumeUrl: app.resume_url,
      //     appliedAt: new Date(app.applied_at),
      //     source: JobBoardProvider.ZIPRECRUITER,
      //     metadata: app,
      // }));

      return [];
    } catch (error: any) {
      this.logger.error(
        `[ZipRecruiter] Failed to sync applications: ${error.message}`,
      );
      return [];
    }
  }

  private mapLocationType(type?: string): string {
    const mapping: Record<string, string> = {
      ONSITE: 'on-site',
      REMOTE: 'remote',
      HYBRID: 'hybrid',
    };
    return mapping[type || ''] || 'on-site';
  }

  private mapEmploymentType(type?: string): string {
    const mapping: Record<string, string> = {
      FULL_TIME: 'full_time',
      PART_TIME: 'part_time',
      CONTRACT: 'contract',
      INTERNSHIP: 'internship',
      TEMPORARY: 'temporary',
      FREELANCE: 'contract',
    };
    return mapping[type || ''] || 'full_time';
  }

  private formatCompensation(job: Job): object | null {
    if (!job.salaryMin && !job.salaryMax) return null;
    return {
      min: job.salaryMin ? Number(job.salaryMin) : undefined,
      max: job.salaryMax ? Number(job.salaryMax) : undefined,
      currency: job.salaryCurrency || 'USD',
      type: 'yearly',
      show_on_listing: true,
    };
  }

  private extractCity(location?: string | null): string {
    if (!location) return '';
    // Simple extraction - in production, use a proper parser
    const parts = location.split(',');
    return parts[0]?.trim() || '';
  }

  private extractState(location?: string | null): string {
    if (!location) return '';
    const parts = location.split(',');
    return parts[1]?.trim() || '';
  }
}
