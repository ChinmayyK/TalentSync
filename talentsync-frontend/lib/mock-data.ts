import { Interview, DashboardMetrics, StageCount, InterviewStage, InterviewStatus } from '@/types/interview';

const stages: InterviewStage[] = ['received', 'screening', 'interview-1', 'interview-2', 'hr-round', 'offer'];
const statuses: InterviewStatus[] = ['scheduled', 'completed', 'cancelled', 'no-show', 'pending-feedback'];

// TalentSync candidates and interviewers
const candidates = ['Alex Rivera', 'Emma Watson', 'James Park', 'Sofia Martinez', 'David Kim'];
const interviewers = ['Sarah Chen', 'Mike Johnson', 'Priya Sharma'];
const roles = ['Senior Frontend Engineer', 'Product Manager', 'Backend Developer', 'Data Analyst', 'DevOps Engineer'];

export const mockInterviews: Interview[] = [
  {
    id: 'int-1',
    candidateId: 'cand-1',
    candidateName: 'Alex Rivera',
    candidateEmail: 'alex.rivera@gmail.com',
    interviewerName: 'Sarah Chen',
    interviewerEmail: 'sarah.chen@talentsync.com',
    role: 'Senior Frontend Engineer',
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    stage: 'screening',
    status: 'scheduled',
    tenantId: 'tenant_123',
  },
  {
    id: 'int-2',
    candidateId: 'cand-2',
    candidateName: 'Emma Watson',
    candidateEmail: 'emma.watson@outlook.com',
    interviewerName: 'Mike Johnson',
    interviewerEmail: 'mike.johnson@talentsync.com',
    role: 'Product Manager',
    dateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
    stage: 'interview-1',
    status: 'scheduled',
    tenantId: 'tenant_123',
  },
  {
    id: 'int-3',
    candidateId: 'cand-3',
    candidateName: 'James Park',
    candidateEmail: 'james.park@yahoo.com',
    interviewerName: 'Priya Sharma',
    interviewerEmail: 'priya.sharma@talentsync.com',
    role: 'Backend Developer',
    dateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    stage: 'interview-2',
    status: 'completed',
    tenantId: 'tenant_123',
  },
  {
    id: 'int-4',
    candidateId: 'cand-4',
    candidateName: 'Sofia Martinez',
    candidateEmail: 'sofia.martinez@gmail.com',
    interviewerName: 'Sarah Chen',
    interviewerEmail: 'sarah.chen@talentsync.com',
    role: 'Data Analyst',
    dateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Week ago
    stage: 'offer',
    status: 'completed',
    tenantId: 'tenant_123',
  },
  {
    id: 'int-5',
    candidateId: 'cand-5',
    candidateName: 'David Kim',
    candidateEmail: 'david.kim@proton.me',
    interviewerName: 'Mike Johnson',
    interviewerEmail: 'mike.johnson@talentsync.com',
    role: 'DevOps Engineer',
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    stage: 'screening',
    status: 'scheduled',
    tenantId: 'tenant_123',
  },
];

export const mockMetrics: DashboardMetrics = {
  scheduledToday: 2,
  scheduledTodayTrend: 8.5,
  pendingFeedback: 1,
  pendingFeedbackTrend: -12.3,
  completed: 2,
  completedTrend: 15.2,
  noShows: 0,
  noShowsTrend: -5.0,
};

export const mockStageCounts: StageCount[] = [
  { stage: 'screening', label: 'Screening', count: 2, pending: 2, completed: 0 },
  { stage: 'interview-1', label: 'Interview 1', count: 1, pending: 1, completed: 0 },
  { stage: 'interview-2', label: 'Interview 2', count: 1, pending: 0, completed: 1 },
  { stage: 'offer', label: 'Offer', count: 1, pending: 0, completed: 1 },
];
