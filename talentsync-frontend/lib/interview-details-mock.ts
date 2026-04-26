import { 
  InterviewDetails, 
  TimelineEvent, 
  FeedbackSummary, 
  CandidateDetails, 
  InterviewNote,
  UserRole 
} from '@/types/interview-details';

export const mockInterviewDetails: InterviewDetails = {
  id: 'int-1',
  candidateId: 'c1',
  candidateName: 'Sarah Chen',
  candidateEmail: 'sarah.chen@email.com',
  candidatePhone: '+1 555-0101',
  role: 'Senior Frontend Engineer',
  stage: 'interview-1',
  status: 'scheduled',
  date: '2024-12-10',
  startTime: '14:00',
  endTime: '15:00',
  duration: 60,
  interviewMode: 'online',
  meetingLink: 'https://meet.google.com/abc-defg-hij',
  interviewers: [
    { id: 'i1', name: 'Alex Thompson', email: 'alex.t@company.com', role: 'Engineering Manager' },
    { id: 'i2', name: 'Jennifer Lee', email: 'jennifer.l@company.com', role: 'Senior Engineer' },
  ],
  internalNotes: 'Strong background in React and TypeScript. Focus on system design questions.',
  tenantId: 'tenant-1',
  createdAt: '2024-12-01T10:00:00Z',
  updatedAt: '2024-12-05T14:30:00Z',
};

export const mockTimeline: TimelineEvent[] = [
  {
    id: 't1',
    type: 'created',
    title: 'Interview Scheduled',
    description: 'Interview was created and scheduled',
    timestamp: '2024-12-01T10:00:00Z',
    actor: 'Jessica Miller',
  },
  {
    id: 't2',
    type: 'notification_sent',
    title: 'Invitation Sent',
    description: 'Email invitation sent to candidate and interviewers',
    timestamp: '2024-12-01T10:05:00Z',
  },
  {
    id: 't3',
    type: 'invite_viewed',
    title: 'Invitation Viewed',
    description: 'Candidate viewed the interview invitation',
    timestamp: '2024-12-02T09:15:00Z',
  },
  {
    id: 't4',
    type: 'rescheduled',
    title: 'Interview Rescheduled',
    description: 'Moved from Dec 8 to Dec 10 per candidate request',
    timestamp: '2024-12-03T16:20:00Z',
    actor: 'Jessica Miller',
  },
  {
    id: 't5',
    type: 'reminder_sent',
    title: 'Reminder Sent',
    description: '24-hour reminder sent to all participants',
    timestamp: '2024-12-09T14:00:00Z',
  },
];

export const mockFeedback: FeedbackSummary = {
  overallRating: 4.2,
  recommendation: 'hire',
  feedbackEntries: [
    {
      id: 'f1',
      interviewerId: 'i1',
      interviewerName: 'Alex Thompson',
      rating: 4.5,
      recommendation: 'hire',
      strengths: ['Strong technical skills', 'Excellent communication', 'Good problem-solving approach'],
      improvements: ['Could improve on system design depth'],
      notes: 'Great candidate overall. Would be a strong addition to the team.',
      submittedAt: '2024-12-10T16:00:00Z',
    },
    {
      id: 'f2',
      interviewerId: 'i2',
      interviewerName: 'Jennifer Lee',
      rating: 3.9,
      recommendation: 'hire',
      strengths: ['Deep React knowledge', 'Clean coding style'],
      improvements: ['Needs more exposure to large-scale systems', 'Could be more concise'],
      notes: 'Solid technical foundation. Recommend for the role.',
      submittedAt: '2024-12-10T17:30:00Z',
    },
  ],
};

export const mockFeedbackPending: FeedbackSummary = {
  overallRating: 0,
  recommendation: 'pending',
  feedbackEntries: [],
};

export const mockCandidate: CandidateDetails = {
  id: 'c1',
  name: 'Sarah Chen',
  email: 'sarah.chen@email.com',
  phone: '+1 555-0101',
  appliedRole: 'Senior Frontend Engineer',
  currentStage: 'interview-1',
  appliedDate: '2024-11-15',
  resumeUrl: '/resumes/sarah-chen-resume.pdf',
  resumeName: 'Sarah_Chen_Resume.pdf',
  previousInterviews: [
    {
      id: 'prev-1',
      date: '2024-11-20',
      stage: 'screening',
      status: 'completed',
      interviewers: ['HR Team'],
      rating: 4.0,
    },
    {
      id: 'prev-2',
      date: '2024-11-28',
      stage: 'interview-1',
      status: 'completed',
      interviewers: ['Tech Lead'],
      rating: 4.2,
    },
  ],
};

export const mockNotes: InterviewNote[] = [
  {
    id: 'n1',
    content: 'Candidate has prior experience at Google and Meta. Strong background in performance optimization.',
    authorId: 'u1',
    authorName: 'Jessica Miller',
    createdAt: '2024-12-01T10:30:00Z',
  },
  {
    id: 'n2',
    content: 'Salary expectations are within range. Open to hybrid work arrangement.',
    authorId: 'u2',
    authorName: 'Mark Davis',
    createdAt: '2024-12-03T11:45:00Z',
  },
];

export const currentUserRole: UserRole = 'recruiter'; // Change to test different RBAC states
