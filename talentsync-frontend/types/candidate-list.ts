import { InterviewStage } from './interview';

export interface CandidateListItem {
  id: string;
  candidateId?: string;  // Display ID like ZR_171639_CAND
  name: string;
  email: string;
  phone: string;
  mobile?: string;
  role: string;
  stage: InterviewStage;
  source: string;
  recruiterName: string;
  recruiterId: string;
  lastActivity: string;
  lastActivityType: 'interview' | 'email' | 'note' | 'stage-change' | 'created';
  dateAdded: string;
  modifiedTime?: string;
  skills: string[];
  experienceYears: number;
  tenantId: string;
  // New fields for Zoho Recruit parity
  rating?: number;  // 1-5 stars
  city?: string;
  currentSalary?: string;
  currentEmployer?: string;
  currentJobTitle?: string;
  highestQualification?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  secondaryEmail?: string;
  profileSummary?: string;
}


export interface CandidateListFilters {
  search: string;
  searchMode?: 'simple' | 'boolean';
  role: string;
  stage: InterviewStage | 'all';
  source: string | 'all';
  recruiterId: string | 'all';
  experienceMin: number | null;
  experienceMax: number | null;
  dateAddedFrom: Date | null;
  dateAddedTo: Date | null;
}

export type CandidateBulkAction = 'change-stage' | 'send-email' | 'add-tag' | 'assign-recruiter' | 'delete' | 'email' | 'schedule' | 'sms';

