import { Job } from '@prisma/client';
import {
  JobBoardProvider,
  JobPostingResponse,
  ProviderCredentials,
  JobPostingStatus,
} from '../dto';

/**
 * Base interface for all job board providers
 * Each provider (Indeed, LinkedIn, etc.) implements this interface
 */
export interface IJobBoardProvider {
  /**
   * Provider identifier
   */
  readonly provider: JobBoardProvider;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(credentials: ProviderCredentials): boolean;

  /**
   * Post a job to the external board
   */
  postJob(
    job: Job,
    credentials: ProviderCredentials,
    options?: {
      customTitle?: string;
      customDescription?: string;
      sponsored?: boolean;
    },
  ): Promise<JobPostingResponse>;

  /**
   * Update an existing job posting
   */
  updateJob(
    externalId: string,
    job: Job,
    credentials: ProviderCredentials,
  ): Promise<JobPostingResponse>;

  /**
   * Close/remove a job posting
   */
  closeJob(externalId: string, credentials: ProviderCredentials): Promise<void>;

  /**
   * Get current status of a job posting
   */
  getJobStatus(
    externalId: string,
    credentials: ProviderCredentials,
  ): Promise<JobPostingStatus>;

  /**
   * Sync applications from the job board
   */
  syncApplications?(
    externalId: string,
    credentials: ProviderCredentials,
    since?: Date,
  ): Promise<ExternalApplication[]>;
}

/**
 * External application from job board
 */
export interface ExternalApplication {
  externalId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  resumeUrl?: string;
  appliedAt: Date;
  source: JobBoardProvider;
  metadata?: Record<string, any>;
}

/**
 * Provider factory type
 */
export type JobBoardProviderFactory = () => IJobBoardProvider;
