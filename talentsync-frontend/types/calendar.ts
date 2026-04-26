import { InterviewStage, InterviewStatus } from './interview';

export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewerId: string;
  interviewerName: string;
  interviewerInitials: string;
  role: string;
  stage: InterviewStage;
  status: InterviewStatus;
  startTime: string;
  endTime: string;
  duration: number;
  mode: 'video' | 'phone' | 'in-person';
  meetingLink?: string;
  location?: string;
  tenantId: string;
  source?: 'slot' | 'interview';  // Track event source for proper API routing
}

export interface CalendarFilters {
  interviewerId: string | 'all';
  stage: InterviewStage | 'all';
  status: InterviewStatus | 'all';
  role: string | 'all';
}

export interface CalendarState {
  view: CalendarView;
  currentDate: Date;
  filters: CalendarFilters;
}
