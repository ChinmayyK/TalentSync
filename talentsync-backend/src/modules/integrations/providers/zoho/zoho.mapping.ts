import { MappingConfig } from '../../types/mapping.interface';

/**
 * Zoho CRM Module Types
 * TalentSync can sync to either Contacts or Leads based on configuration
 */
export type ZohoModule = 'Contacts' | 'Leads';

/**
 * Stage to Zoho Status mapping
 * Maps TalentSync candidate stages to Zoho Lead/Contact status
 */
export const STAGE_TO_ZOHO_STATUS: Record<string, string> = {
  // TalentSync stages → Zoho Lead Status
  New: 'Attempted to Contact',
  Screening: 'Contact in Future',
  'Phone Screen': 'Contacted',
  Interview: 'Contacted',
  Technical: 'Contacted',
  Onsite: 'Contacted',
  Offer: 'Qualified',
  Hired: 'Closed Won',
  Rejected: 'Closed Lost',
  Withdrawn: 'Closed Lost',
  'On Hold': 'Not Contacted',
};

/**
 * Interview status to Zoho Activity status
 */
export const INTERVIEW_STATUS_TO_ACTIVITY: Record<string, string> = {
  scheduled: 'Planned',
  confirmed: 'Planned',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'Cancelled',
};

/**
 * Default field mappings for Zoho CRM Contacts
 * Maps TalentSync Candidate fields to Zoho Contact fields
 */
export const ZOHO_CONTACT_MAPPING: MappingConfig = {
  mappings: [
    // Basic Info
    {
      sourceField: 'name',
      targetField: 'Full_Name',
      transform: 'none',
    },
    {
      sourceField: 'firstName',
      targetField: 'First_Name',
      transform: 'none',
    },
    {
      sourceField: 'lastName',
      targetField: 'Last_Name',
      transform: 'none',
    },
    {
      sourceField: 'email',
      targetField: 'Email',
      transform: 'lowercase',
    },
    {
      sourceField: 'phone',
      targetField: 'Phone',
      transform: 'none',
    },
    // Professional Info
    {
      sourceField: 'roleTitle',
      targetField: 'Title',
      transform: 'none',
    },
    {
      sourceField: 'currentCompany',
      targetField: 'Account_Name',
      transform: 'none',
    },
    {
      sourceField: 'location',
      targetField: 'Mailing_City',
      transform: 'none',
    },
    // Source tracking
    {
      sourceField: 'source',
      targetField: 'Lead_Source',
      transform: 'none',
    },
    // LinkedIn if available
    {
      sourceField: 'linkedinUrl',
      targetField: 'LinkedIn_URL',
      transform: 'none',
    },
  ],
  direction: 'outbound', // v1: TalentSync → Zoho only
};

/**
 * Default field mappings for Zoho CRM Leads
 * Used when tenant prefers to sync as Leads instead of Contacts
 */
export const ZOHO_LEAD_MAPPING: MappingConfig = {
  mappings: [
    {
      sourceField: 'name',
      targetField: 'Full_Name',
      transform: 'none',
    },
    {
      sourceField: 'firstName',
      targetField: 'First_Name',
      transform: 'none',
    },
    {
      sourceField: 'lastName',
      targetField: 'Last_Name',
      transform: 'none',
    },
    {
      sourceField: 'email',
      targetField: 'Email',
      transform: 'lowercase',
    },
    {
      sourceField: 'phone',
      targetField: 'Phone',
      transform: 'none',
    },
    {
      sourceField: 'roleTitle',
      targetField: 'Designation',
      transform: 'none',
    },
    {
      sourceField: 'currentCompany',
      targetField: 'Company',
      transform: 'none',
    },
    {
      sourceField: 'source',
      targetField: 'Lead_Source',
      transform: 'none',
    },
    // Stage maps to Lead Status
    {
      sourceField: 'stage',
      targetField: 'Lead_Status',
      transform: 'custom', // Uses STAGE_TO_ZOHO_STATUS
    },
  ],
  direction: 'outbound',
};

/**
 * Get mapping configuration for a tenant
 * Supports tenant-specific overrides
 */
export function getZohoMapping(tenantSettings?: any): MappingConfig {
  if (tenantSettings?.mapping) {
    return tenantSettings.mapping;
  }

  // Default to Contact mapping
  const targetModule: ZohoModule = tenantSettings?.zohoModule || 'Contacts';

  return targetModule === 'Leads' ? ZOHO_LEAD_MAPPING : ZOHO_CONTACT_MAPPING;
}

/**
 * Get Zoho module name for tenant
 */
export function getZohoModule(tenantSettings?: any): ZohoModule {
  return tenantSettings?.zohoModule || 'Contacts';
}

/**
 * Map TalentSync stage to Zoho status
 */
export function mapStageToZohoStatus(stage: string): string {
  return STAGE_TO_ZOHO_STATUS[stage] || 'Not Contacted';
}

/**
 * Create Zoho Activity data from Interview
 */
export function createInterviewActivity(interview: {
  candidateName: string;
  interviewerName?: string;
  scheduledAt: Date;
  duration?: number;
  type?: string;
  notes?: string;
  status?: string;
}) {
  return {
    Subject: `Interview: ${interview.candidateName}`,
    Activity_Type: 'Meeting',
    Start_DateTime: interview.scheduledAt.toISOString(),
    End_DateTime: interview.duration
      ? new Date(
          interview.scheduledAt.getTime() + interview.duration * 60000,
        ).toISOString()
      : new Date(interview.scheduledAt.getTime() + 60 * 60000).toISOString(), // Default 1 hour
    Description: [
      `Candidate: ${interview.candidateName}`,
      interview.interviewerName
        ? `Interviewer: ${interview.interviewerName}`
        : '',
      interview.type ? `Type: ${interview.type}` : '',
      interview.notes ? `Notes: ${interview.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    Status:
      INTERVIEW_STATUS_TO_ACTIVITY[interview.status || 'scheduled'] ||
      'Planned',
  };
}
