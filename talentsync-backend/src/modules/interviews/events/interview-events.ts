/**
 * Interview Domain Events
 * Used to trigger automation rules when interview lifecycle events occur
 */

export interface InterviewEventPayload {
  tenantId: string;
  interviewId: string;
  candidateId: string;
  interviewerIds: string[];
  interviewDate: Date;
  interviewTime: string;
  duration: number;
  stage: string;
  meetingLink?: string;
  notes?: string;
  // Custom email overrides
  candidateEmailSubject?: string;
  candidateEmailBody?: string;
  interviewerEmailSubject?: string;
  interviewerEmailBody?: string;
}

export interface InterviewRescheduledPayload extends InterviewEventPayload {
  previousDate: Date;
  newDate: Date;
}

export const INTERVIEW_EVENTS = {
  CREATED: 'interview.created',
  RESCHEDULED: 'interview.rescheduled',
  CANCELLED: 'interview.cancelled',
  COMPLETED: 'interview.completed',
  REMINDER_24H: 'interview.reminder.24h',
  REMINDER_1H: 'interview.reminder.1h',
} as const;

export type InterviewEventType =
  (typeof INTERVIEW_EVENTS)[keyof typeof INTERVIEW_EVENTS];
