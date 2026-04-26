/**
 * Workday Field Mapping Configuration
 *
 * Defines fixed mappings between TalentSync entities and Workday Recruiting objects.
 * v1: No UI configuration - these are hardcoded defaults.
 */

/**
 * TalentSync Candidate → Workday Candidate field mapping
 */
export const WORKDAY_CANDIDATE_MAPPING = {
  // Name fields
  firstName: 'legalFirstName',
  lastName: 'legalLastName',

  // Contact fields
  email: 'emailAddress',
  phone: 'phoneNumber',

  // Additional fields
  source: 'recruitingSource',
  stage: 'recruitingStage',
} as const;

/**
 * TalentSync Job → Workday Requisition field mapping
 */
export const WORKDAY_REQUISITION_MAPPING = {
  title: 'jobTitle',
  description: 'jobDescription',
  department: 'supervisoryOrganization',
  location: 'location',
} as const;

/**
 * Map TalentSync candidate stages to Workday recruiting stages
 */
export const TALENTSYNC_STAGE_TO_WORKDAY: Record<string, string> = {
  // Application stages
  applied: 'Application',
  new: 'Application',
  sourced: 'Application',

  // Screening stages
  screening: 'Screen',
  phone_screen: 'Screen',
  recruiter_review: 'Screen',

  // Interview stages
  interview: 'Interview',
  technical: 'Interview',
  onsite: 'Interview',
  panel: 'Interview',

  // Offer stages
  offer: 'Offer',
  offer_extended: 'Offer',
  negotiation: 'Offer',

  // Final stages
  hired: 'Hire',
  accepted: 'Hire',
  onboarding: 'Hire',

  // Negative outcomes
  rejected: 'Reject',
  declined: 'Reject',
  withdrawn: 'Reject',
  no_show: 'Reject',
};

/**
 * Map interview status to Workday interview status
 */
export const TALENTSYNC_INTERVIEW_STATUS_TO_WORKDAY: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  RESCHEDULED: 'Rescheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

/**
 * Get Workday stage from TalentSync stage
 */
export function mapStageToWorkday(talentsyncStage: string): string {
  const normalized = talentsyncStage.toLowerCase().replace(/[\s-]/g, '_');
  return TALENTSYNC_STAGE_TO_WORKDAY[normalized] || 'Application';
}

/**
 * Get Workday interview status from TalentSync status
 */
export function mapInterviewStatusToWorkday(talentsyncStatus: string): string {
  return (
    TALENTSYNC_INTERVIEW_STATUS_TO_WORKDAY[talentsyncStatus.toUpperCase()] ||
    'Scheduled'
  );
}

/**
 * Split a full name into first and last name components
 */
export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0 || !parts[0]) {
    return { firstName: 'Unknown', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Map a TalentSync candidate to Workday Candidate format
 */
export function mapCandidateToWorkday(candidate: {
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  stage?: string | null;
}): {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  stage?: string;
} {
  const { firstName, lastName } = splitName(candidate.name);

  return {
    firstName,
    lastName,
    email: candidate.email || '',
    phone: candidate.phone || undefined,
    source: candidate.source || 'TalentSync',
    stage: candidate.stage ? mapStageToWorkday(candidate.stage) : 'Application',
  };
}

/**
 * Format interview title for Workday
 */
export function formatInterviewTitle(
  candidateName: string,
  stage?: string,
): string {
  const stageText = stage ? ` - ${stage}` : '';
  return `Interview: ${candidateName}${stageText}`;
}

/**
 * Format interview notes for Workday
 */
export function formatInterviewNotes(interview: {
  stage?: string | null;
  notes?: string | null;
  status?: string;
  interviewerNames?: string[];
}): string {
  const lines: string[] = ['TalentSync Interview'];

  if (interview.stage) {
    lines.push(`Stage: ${interview.stage}`);
  }

  if (interview.status) {
    lines.push(`Status: ${interview.status}`);
  }

  if (interview.interviewerNames && interview.interviewerNames.length > 0) {
    lines.push(`Interviewers: ${interview.interviewerNames.join(', ')}`);
  }

  if (interview.notes) {
    lines.push(`Notes: ${interview.notes}`);
  }

  return lines.join('\n');
}
