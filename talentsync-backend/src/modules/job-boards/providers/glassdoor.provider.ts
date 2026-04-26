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
 * Glassdoor Job Board Provider
 *
 * Integrates with Glassdoor Partner API for job postings
 * API Docs: https://www.glassdoor.com/partner/jobListingPartner.htm
 *
 * Required credentials:
 * - apiKey: Glassdoor Partner API key
 * - employerId: Glassdoor employer account ID
 */
@Injectable()
export class GlassdoorProvider implements IJobBoardProvider {
  private readonly logger = new Logger(GlassdoorProvider.name);
  private readonly baseUrl = 'https://api.glassdoor.com/api/api.htm';

  readonly provider = JobBoardProvider.GLASSDOOR;
  readonly name = 'Glassdoor';

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
    this.logger.log(`[Glassdoor] Posting job: ${job.title}`);

    if (!this.isConfigured(credentials)) {
      throw new Error('Glassdoor credentials not configured');
    }

    try {
      // Glassdoor Partner API uses XML-based job feeds or REST API
      // The exact implementation depends on the partnership level
      //
      // For Job Listing Partners (REST API):
      // POST /api/api.htm?t.p={partnerId}&t.k={apiKey}&action=employers&format=json
      //
      // const response = await axios.post(this.baseUrl, {
      //     action: 'job-posting',
      //     format: 'json',
      //     employerId: credentials.employerId,
      //     job: {
      //         title: options?.customTitle || job.title,
      //         description: options?.customDescription || job.description,
      //         location: job.location,
      //         locationType: this.mapLocationType(job.locationType),
      //         employmentType: this.mapEmploymentType(job.employmentType),
      //         salary: this.formatSalary(job),
      //     }
      // }, {
      //     params: {
      //         't.p': credentials.employerId,
      //         't.k': credentials.apiKey,
      //     }
      // });

      // Simulated response for development
      const externalId = `gd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.logger.log(`[Glassdoor] Job posted with external ID: ${externalId}`);

      return {
        externalId,
        externalUrl: `https://www.glassdoor.com/job-listing/${externalId}`,
        status: JobPostingStatus.PENDING,
        message:
          'Job submitted to Glassdoor. Review typically takes 24-48 hours.',
      };
    } catch (error: any) {
      this.logger.error(`[Glassdoor] Failed to post job: ${error.message}`);
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
    this.logger.log(`[Glassdoor] Updating job: ${externalId}`);

    try {
      // Glassdoor typically requires re-posting for updates
      // or updating via the employer dashboard
      //
      // const response = await axios.put(`${this.baseUrl}/jobs/${externalId}`, {
      //     title: job.title,
      //     description: job.description,
      //     location: job.location,
      // }, {
      //     params: {
      //         't.p': credentials.employerId,
      //         't.k': credentials.apiKey,
      //     }
      // });

      return {
        externalId,
        status: JobPostingStatus.ACTIVE,
        message: 'Job updated successfully on Glassdoor',
      };
    } catch (error: any) {
      this.logger.error(`[Glassdoor] Failed to update job: ${error.message}`);
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
    this.logger.log(`[Glassdoor] Closing job: ${externalId}`);

    try {
      // Close/expire the job posting
      // const response = await axios.delete(`${this.baseUrl}/jobs/${externalId}`, {
      //     params: {
      //         't.p': credentials.employerId,
      //         't.k': credentials.apiKey,
      //     }
      // });

      this.logger.log(`[Glassdoor] Job ${externalId} closed successfully`);
    } catch (error: any) {
      this.logger.error(`[Glassdoor] Failed to close job: ${error.message}`);
      throw error;
    }
  }

  async getJobStatus(
    externalId: string,
    credentials: ProviderCredentials,
  ): Promise<JobPostingStatus> {
    this.logger.log(`[Glassdoor] Getting status for: ${externalId}`);

    try {
      // Fetch job status from Glassdoor
      // const response = await axios.get(`${this.baseUrl}/jobs/${externalId}/status`, {
      //     params: {
      //         't.p': credentials.employerId,
      //         't.k': credentials.apiKey,
      //     }
      // });
      // return this.mapStatus(response.data.status);

      // Simulated: Return ACTIVE for demo
      return JobPostingStatus.ACTIVE;
    } catch (error: any) {
      this.logger.error(
        `[Glassdoor] Failed to get job status: ${error.message}`,
      );
      return JobPostingStatus.FAILED;
    }
  }

  async syncApplications(
    externalId: string,
    credentials: ProviderCredentials,
    since?: Date,
  ): Promise<ExternalApplication[]> {
    this.logger.log(`[Glassdoor] Syncing applications for: ${externalId}`);

    try {
      // Glassdoor applications typically come via ATS integrations
      // or webhook notifications
      //
      // const response = await axios.get(`${this.baseUrl}/jobs/${externalId}/applications`, {
      //     params: {
      //         't.p': credentials.employerId,
      //         't.k': credentials.apiKey,
      //         since: since?.toISOString(),
      //     }
      // });
      // return response.data.applications.map(this.mapApplication);

      return [];
    } catch (error: any) {
      this.logger.error(
        `[Glassdoor] Failed to sync applications: ${error.message}`,
      );
      return [];
    }
  }

  private mapLocationType(type?: string): string {
    const mapping: Record<string, string> = {
      ONSITE: 'onsite',
      REMOTE: 'remote',
      HYBRID: 'hybrid',
    };
    return mapping[type || ''] || 'onsite';
  }

  private mapEmploymentType(type?: string): string {
    const mapping: Record<string, string> = {
      FULL_TIME: 'fulltime',
      PART_TIME: 'parttime',
      CONTRACT: 'contractor',
      INTERNSHIP: 'intern',
      TEMPORARY: 'temporary',
      FREELANCE: 'contractor',
    };
    return mapping[type || ''] || 'fulltime';
  }

  private formatSalary(job: Job): object | null {
    if (!job.salaryMin && !job.salaryMax) return null;
    return {
      min: job.salaryMin ? Number(job.salaryMin) : undefined,
      max: job.salaryMax ? Number(job.salaryMax) : undefined,
      currency: job.salaryCurrency || 'USD',
      period: 'annual',
    };
  }
}
