import { InterviewStage, InterviewStatus } from './interview';

export type UserRole = 'interviewer' | 'recruiter' | 'manager' | 'admin';

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'phone';

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  appliedRole: string;
  experienceSummary: string;
  assignedRecruiter: {
    id: string;
    name: string;
    email: string;
  };
  tags: string[];
  currentStage: InterviewStage;
  source: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface CandidateDocument {
  id: string;
  name: string;
  type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'other';
  url: string;
  uploadedAt: string;
  size: string;
}

export interface CandidateInterview {
  id: string;
  stage: InterviewStage;
  date: string;
  startTime: string;
  endTime: string;
  interviewers: string[];
  status: InterviewStatus;
  feedbackStatus: 'pending' | 'partial' | 'complete';
  rating?: number;
}

export interface CommunicationEntry {
  id: string;
  channel: CommunicationChannel;
  type: 'outbound' | 'inbound';
  subject?: string;
  preview: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface CandidateNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}
