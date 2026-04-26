/**
 * Greenhouse Field Mapping Configuration
 * v1: Fixed mappings
 */

export const GREENHOUSE_CANDIDATE_MAPPING = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email_addresses',
  phone: 'phone_numbers',
} as const;

export const TALENTSYNC_STAGE_TO_GREENHOUSE: Record<string, string> = {
  applied: 'Application Review',
  new: 'Application Review',
  screening: 'Recruiter Screen',
  phone_screen: 'Phone Screen',
  interview: 'On-Site Interview',
  technical: 'Technical Interview',
  onsite: 'On-Site Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export function mapStageToGreenhouse(talentsyncStage: string): string {
  const normalized = talentsyncStage.toLowerCase().replace(/[\s-]/g, '_');
  return TALENTSYNC_STAGE_TO_GREENHOUSE[normalized] || 'Application Review';
}

export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0])
    return { firstName: 'Unknown', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function formatInterviewNote(interview: {
  stage?: string | null;
  notes?: string | null;
  status?: string;
  interviewerNames?: string[];
  date?: Date;
}): string {
  const lines: string[] = ['📋 TalentSync Interview'];
  if (interview.date)
    lines.push(`Date: ${interview.date.toISOString().split('T')[0]}`);
  if (interview.stage) lines.push(`Stage: ${interview.stage}`);
  if (interview.status) lines.push(`Status: ${interview.status}`);
  if (interview.interviewerNames?.length)
    lines.push(`Interviewers: ${interview.interviewerNames.join(', ')}`);
  if (interview.notes) lines.push(`\nNotes:\n${interview.notes}`);
  return lines.join('\n');
}
