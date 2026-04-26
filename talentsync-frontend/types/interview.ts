export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'pending-feedback';

export type InterviewStage =
  | 'applied'
  | 'received'
  | 'screening'
  | 'interview-1'
  | 'interview-2'
  | 'hr-round'
  | 'offer';

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  interviewerName: string;
  interviewerEmail: string;
  role: string;
  dateTime: string;
  stage: InterviewStage;
  status: InterviewStatus;
  tenantId: string;
}

export interface DashboardMetrics {
  scheduledToday: number;
  scheduledTodayTrend: number;
  pendingFeedback: number;
  pendingFeedbackTrend: number;
  completed: number;
  completedTrend: number;
  noShows: number;
  noShowsTrend: number;
}

export interface StageCount {
  stage: InterviewStage;
  label: string;
  count: number;
  pending: number;
  completed: number;
}

export interface InterviewFilters {
  search: string;
  stage: InterviewStage | 'all';
  status: InterviewStatus | 'all';
  dateRange: { from: Date | null; to: Date | null };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
