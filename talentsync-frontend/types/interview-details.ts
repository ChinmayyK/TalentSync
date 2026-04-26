import { InterviewStage, InterviewStatus } from './interview';

export type UserRole = 'interviewer' | 'recruiter' | 'manager' | 'admin';

export interface InterviewDetails {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  role: string;
  stage: InterviewStage;
  status: InterviewStatus;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  interviewMode: 'online' | 'offline' | 'phone';
  meetingLink?: string;
  location?: string;
  interviewers: InterviewerInfo[];
  internalNotes?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewerInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'notification_sent' | 'rescheduled' | 'invite_viewed' | 'feedback_submitted' | 'status_changed' | 'note_added' | 'reminder_sent';
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackSummary {
  overallRating: number;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire' | 'pending';
  feedbackEntries: FeedbackEntry[];
}

export interface FeedbackEntry {
  id: string;
  interviewerId: string;
  interviewerName: string;
  rating: number;
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire';
  strengths: string[];
  improvements: string[];
  notes: string;
  submittedAt: string;
}

export interface CandidateDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  appliedRole: string;
  currentStage: InterviewStage;
  appliedDate: string;
  resumeUrl?: string;
  resumeName?: string;
  previousInterviews: PreviousInterview[];
}

export interface PreviousInterview {
  id: string;
  date: string;
  stage: InterviewStage;
  status: InterviewStatus;
  interviewers: string[];
  rating?: number;
}

export interface InterviewNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}
