import { ReportsData, ReportFilters } from '@/types/reports';

export const defaultFilters: ReportFilters = {
  dateRange: '30days',
};

export const mockReportsData: ReportsData = {
  kpis: [
    { label: 'Total Interviews', value: 248, trend: 12, trendLabel: 'vs last period', icon: 'calendar' },
    { label: 'Completed Interviews', value: 186, trend: 8, trendLabel: 'vs last period', icon: 'check-circle' },
    { label: 'Pending Feedback', value: 32, trend: -15, trendLabel: 'vs last period', icon: 'clock' },
    { label: 'Avg Time-to-Hire', value: '18 days', trend: -12, trendLabel: 'vs last period', icon: 'timer' },
    { label: 'Offer Acceptance Rate', value: '78%', trend: 5, trendLabel: 'vs last period', icon: 'thumbs-up' },
    { label: 'Drop-off Rate', value: '22%', trend: -8, trendLabel: 'vs last period', icon: 'trending-down' },
  ],
  funnel: [
    { stage: 'received', label: 'Received', count: 520, percentage: 100, dropOff: 0 },
    { stage: 'screening', label: 'Screening', count: 385, percentage: 74, dropOff: 26 },
    { stage: 'interview1', label: 'Interview 1', count: 248, percentage: 48, dropOff: 36 },
    { stage: 'interview2', label: 'Interview 2', count: 142, percentage: 27, dropOff: 43 },
    { stage: 'hr', label: 'HR Round', count: 98, percentage: 19, dropOff: 31 },
    { stage: 'offer', label: 'Offer', count: 64, percentage: 12, dropOff: 35 },
    { stage: 'hired', label: 'Hired', count: 50, percentage: 10, dropOff: 22 },
  ],
  timeToHire: [
    { date: 'Week 1', days: 22 },
    { date: 'Week 2', days: 20 },
    { date: 'Week 3', days: 19 },
    { date: 'Week 4', days: 21 },
    { date: 'Week 5', days: 18 },
    { date: 'Week 6', days: 17 },
    { date: 'Week 7', days: 18 },
    { date: 'Week 8', days: 16 },
  ],
  stageDuration: [
    { stage: 'Screening', avgDays: 3 },
    { stage: 'Interview 1', avgDays: 5 },
    { stage: 'Interview 2', avgDays: 4 },
    { stage: 'HR Round', avgDays: 3 },
    { stage: 'Offer', avgDays: 2 },
  ],
  recruiterLoad: [
    { recruiter: 'Sarah Chen', interviews: 45, completed: 38, pending: 7 },
    { recruiter: 'Michael Ross', interviews: 38, completed: 32, pending: 6 },
    { recruiter: 'Emily Davis', interviews: 52, completed: 44, pending: 8 },
    { recruiter: 'James Wilson', interviews: 41, completed: 35, pending: 6 },
    { recruiter: 'Lisa Anderson', interviews: 36, completed: 31, pending: 5 },
  ],
  offerAcceptance: [
    { status: 'Accepted', count: 50, fill: 'hsl(var(--chart-1))' },
    { status: 'Declined', count: 8, fill: 'hsl(var(--chart-2))' },
    { status: 'Pending', count: 6, fill: 'hsl(var(--chart-3))' },
  ],
  sourcePerformance: [
    { source: 'LinkedIn', candidatesAdded: 180, interviewsScheduled: 95, offers: 24, acceptances: 20, conversionRate: 11.1 },
    { source: 'Indeed', candidatesAdded: 145, interviewsScheduled: 68, offers: 16, acceptances: 12, conversionRate: 8.3 },
    { source: 'Referrals', candidatesAdded: 85, interviewsScheduled: 52, offers: 18, acceptances: 15, conversionRate: 17.6 },
    { source: 'Career Page', candidatesAdded: 62, interviewsScheduled: 28, offers: 5, acceptances: 3, conversionRate: 4.8 },
    { source: 'Job Fairs', candidatesAdded: 48, interviewsScheduled: 15, offers: 2, acceptances: 1, conversionRate: 2.1 },
  ],
};

export const recruiters = [
  { id: 'all', name: 'All Recruiters' },
  { id: 'sarah', name: 'Sarah Chen' },
  { id: 'michael', name: 'Michael Ross' },
  { id: 'emily', name: 'Emily Davis' },
  { id: 'james', name: 'James Wilson' },
  { id: 'lisa', name: 'Lisa Anderson' },
];

export const stages = [
  { id: 'all', name: 'All Stages' },
  { id: 'screening', name: 'Screening' },
  { id: 'interview1', name: 'Interview 1' },
  { id: 'interview2', name: 'Interview 2' },
  { id: 'hr', name: 'HR Round' },
  { id: 'offer', name: 'Offer' },
];

export const sources = [
  { id: 'all', name: 'All Sources' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'indeed', name: 'Indeed' },
  { id: 'referrals', name: 'Referrals' },
  { id: 'career-page', name: 'Career Page' },
  { id: 'job-fairs', name: 'Job Fairs' },
];

export const roles = [
  { id: 'all', name: 'All Roles' },
  { id: 'frontend', name: 'Frontend Engineer' },
  { id: 'backend', name: 'Backend Engineer' },
  { id: 'fullstack', name: 'Full Stack Developer' },
  { id: 'devops', name: 'DevOps Engineer' },
  { id: 'product', name: 'Product Manager' },
];
