import {
  ProviderCapabilities,
  StandardCandidate,
  StandardInterview,
  StandardJob,
  SyncResult,
} from './standard-entities';

/**
 * Base interface for all integration providers
 * Providers must implement core OAuth methods and declare capabilities
 */
export interface IntegrationProvider {
  /**
   * Get provider capabilities - declares what sync operations are supported
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * Generate OAuth authorization URL for the provider
   */
  getAuthUrl(tenantId: string, state?: string): Promise<string>;

  /**
   * Exchange authorization code for access/refresh tokens
   * @param companyDomain Optional company domain for providers like BambooHR
   */
  exchangeCode(
    tenantId: string,
    code: string,
    companyDomain?: string,
  ): Promise<void>;

  /**
   * Refresh expired access tokens
   */
  refreshTokens(tenantId: string): Promise<void>;

  // ===================
  // Candidate Sync
  // ===================

  /**
   * Push a candidate to the external CRM system
   */
  pushCandidate?(
    tenantId: string,
    candidate: StandardCandidate,
  ): Promise<SyncResult>;

  /**
   * Pull candidates from the external CRM system
   */
  pullCandidates?(tenantId: string, since?: Date): Promise<StandardCandidate[]>;

  // ===================
  // Interview Sync
  // ===================

  /**
   * Push an interview to the external system (calendar event)
   */
  pushInterview?(
    tenantId: string,
    interview: StandardInterview,
  ): Promise<SyncResult>;

  /**
   * Pull interviews/events from the external system
   */
  pullInterviews?(tenantId: string, since?: Date): Promise<StandardInterview[]>;

  /**
   * Create a calendar event for an interview (legacy - use pushInterview)
   */
  createCalendarEvent?(tenantId: string, interview: any): Promise<any>;

  /**
   * Update an existing calendar event
   */
  updateCalendarEvent?(tenantId: string, interview: any): Promise<any>;

  /**
   * Delete a calendar event
   */
  deleteCalendarEvent?(tenantId: string, interviewId: string): Promise<any>;

  // ===================
  // Job Sync
  // ===================

  /**
   * Push a job/requisition to the external system
   */
  pushJob?(tenantId: string, job: StandardJob): Promise<SyncResult>;

  /**
   * Pull jobs/requisitions from the external system
   */
  pullJobs?(tenantId: string, since?: Date): Promise<StandardJob[]>;

  // ===================
  // Webhooks
  // ===================

  /**
   * Handle incoming webhook events from the provider
   */
  handleWebhook?(tenantId: string, event: any): Promise<void>;
}
