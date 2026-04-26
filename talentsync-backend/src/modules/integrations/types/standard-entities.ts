/**
 * Standard entity interfaces for provider-agnostic data exchange
 * These interfaces ensure consistent data format across all integrations
 */

/**
 * Provider capability flags
 * Declares what sync operations a provider supports
 */
export interface ProviderCapabilities {
  /** Candidate sync capability */
  candidateSync: SyncCapability;
  /** Job/requisition sync capability */
  jobSync: SyncCapability;
  /** Interview event sync capability */
  interviewSync: SyncCapability;
  /** Whether provider supports webhook callbacks */
  supportsWebhooks: boolean;
}

export type SyncCapability =
  | 'read'
  | 'write'
  | 'bidirectional'
  | 'none'
  | 'push'
  | 'pull'
  | 'outbound'
  | 'inbound';

/**
 * Standard candidate representation for cross-provider sync
 */
export interface StandardCandidate {
  /** External system's ID for this candidate */
  externalId?: string;
  /** TalentSync's internal ID (when pushing updates) */
  internalId?: string;
  /** Full name */
  name: string;
  /** Email address */
  email?: string;
  /** Phone number */
  phone?: string;
  /** Source of the candidate (e.g., "LinkedIn", "Referral") */
  source?: string;
  /** Current hiring stage */
  stage?: string;
  /** Role/position title */
  roleTitle?: string;
  /** Resume URL */
  resumeUrl?: string;
  /** Notes/comments */
  notes?: string;
  /** Custom tags */
  tags?: string[];
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** When the record was last modified */
  lastModifiedAt?: Date;
}

/**
 * Standard interview representation for cross-provider sync
 */
export interface StandardInterview {
  /** External system's ID for this interview */
  externalId?: string;
  /** TalentSync's internal ID (when pushing updates) */
  internalId?: string;
  /** Candidate's internal ID */
  candidateId: string;
  /** External candidate ID (in provider's system) */
  externalCandidateId?: string;
  /** List of interviewer IDs */
  interviewerIds: string[];
  /** Interview start time (UTC) */
  startAt: Date;
  /** Duration in minutes */
  durationMins: number;
  /** Interview stage (e.g., "Technical", "HR") */
  stage?: string;
  /** Status (scheduled, completed, cancelled) */
  status: string;
  /** Video/meeting link */
  meetingLink?: string;
  /** Notes */
  notes?: string;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Standard job/requisition representation for cross-provider sync
 */
export interface StandardJob {
  /** External system's ID for this job */
  externalId?: string;
  /** TalentSync's internal ID (when pushing updates) */
  internalId?: string;
  /** Job title */
  title: string;
  /** Department name */
  department?: string;
  /** Location */
  location?: string;
  /** Job status (open, closed, draft) */
  status: string;
  /** Job description */
  description?: string;
  /** Required skills/qualifications */
  requirements?: string[];
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** External system's ID for the synced entity */
  externalId?: string;
  /** Error message if failed */
  error?: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Integration event types emitted by core modules
 */
export enum IntegrationEventType {
  // Candidate events
  CANDIDATE_CREATED = 'CANDIDATE_CREATED',
  CANDIDATE_UPDATED = 'CANDIDATE_UPDATED',
  CANDIDATE_STAGE_CHANGED = 'CANDIDATE_STAGE_CHANGED',
  CANDIDATE_DELETED = 'CANDIDATE_DELETED',

  // Interview events
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_RESCHEDULED = 'INTERVIEW_RESCHEDULED',
  INTERVIEW_CANCELLED = 'INTERVIEW_CANCELLED',
  INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',

  // Job events (future)
  JOB_CREATED = 'JOB_CREATED',
  JOB_UPDATED = 'JOB_UPDATED',
  JOB_CLOSED = 'JOB_CLOSED',
}

/**
 * Entity types for sync logging
 */
export enum SyncEntityType {
  CANDIDATE = 'CANDIDATE',
  INTERVIEW = 'INTERVIEW',
  JOB = 'JOB',
}
