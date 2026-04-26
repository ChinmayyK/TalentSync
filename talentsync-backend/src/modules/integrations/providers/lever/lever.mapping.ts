/**
 * Lever Field Mapping Configuration
 *
 * Lever terminology: Candidates are called "Opportunities"
 * v1: Fixed mappings, no UI configuration
 */

/**
 * TalentSync Candidate → Lever Opportunity field mapping
 */
export const LEVER_OPPORTUNITY_MAPPING = {
  name: 'name',
  email: 'emails',
  phone: 'phones',
  source: 'origin',
  stage: 'stage',
} as const;

/**
 * Map TalentSync stages to Lever stage names
 * Note: Lever uses custom stages per account, these are common defaults
 */
export const TALENTSYNC_STAGE_TO_LEVER: Record<string, string> = {
  // Initial stages
  applied: 'New Applicant',
  new: 'New Lead',
  sourced: 'Sourced',

  // Screening
  screening: 'Reached Out',
  phone_screen: 'Phone Screen',
  recruiter_review: 'Recruiter Screen',

  // Interview stages
  interview: 'On-site',
  technical: 'Technical Interview',
  onsite: 'On-site',
  panel: 'Panel Interview',

  // Offer stages
  offer: 'Offer',
  offer_extended: 'Offer Extended',
  negotiation: 'Offer Review',

  // Final stages
  hired: 'Hired',
  accepted: 'Hired',

  // Negative outcomes
  rejected: 'Rejected',
  declined: 'Withdrew',
  withdrawn: 'Withdrew',
};

/**
 * Get Lever stage from TalentSync stage
 */
export function mapStageToLever(talentsyncStage: string): string {
  const normalized = talentsyncStage.toLowerCase().replace(/[\s-]/g, '_');
  return TALENTSYNC_STAGE_TO_LEVER[normalized] || 'New Lead';
}

/**
 * Split name into parts
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
 * Format interview as Lever note
 */
export function formatInterviewNote(interview: {
  stage?: string | null;
  notes?: string | null;
  status?: string;
  interviewerNames?: string[];
  date?: Date;
}): string {
  const lines: string[] = ['📋 TalentSync Interview'];

  if (interview.date) {
    lines.push(`Date: ${interview.date.toISOString().split('T')[0]}`);
  }

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
    lines.push(`\nNotes:\n${interview.notes}`);
  }

  return lines.join('\n');
}

/**
 * Format interview title
 */
export function formatInterviewTitle(
  candidateName: string,
  stage?: string,
): string {
  const stageText = stage ? ` - ${stage}` : '';
  return `Interview: ${candidateName}${stageText}`;
}
