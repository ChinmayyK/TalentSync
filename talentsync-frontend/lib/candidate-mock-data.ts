import { 
  CandidateProfile, 
  CandidateDocument, 
  CandidateInterview, 
  CommunicationEntry, 
  CandidateNote,
  UserRole
} from '@/types/candidate';

export const mockCandidateProfile: CandidateProfile = {
  id: 'cand-001',
  name: 'Sarah Chen',
  email: 'sarah.chen@email.com',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  appliedRole: 'Senior Frontend Engineer',
  experienceSummary: '8+ years of experience in frontend development with expertise in React, TypeScript, and modern web technologies. Previously led a team of 5 engineers at a Series B startup.',
  assignedRecruiter: {
    id: 'rec-001',
    name: 'Emily Johnson',
    email: 'emily.johnson@company.com',
  },
  tags: ['React', 'TypeScript', 'Team Lead', 'Remote OK', 'Senior'],
  currentStage: 'interview-2',
  source: 'LinkedIn',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-25T14:22:00Z',
  tenantId: 'tenant-001',
};

export const mockDocuments: CandidateDocument[] = [
  {
    id: 'doc-001',
    name: 'Sarah_Chen_Resume.pdf',
    type: 'resume',
    url: '/documents/resume.pdf',
    uploadedAt: '2024-01-15T10:30:00Z',
    size: '245 KB',
  },
  {
    id: 'doc-002',
    name: 'Cover_Letter.pdf',
    type: 'cover_letter',
    url: '/documents/cover-letter.pdf',
    uploadedAt: '2024-01-15T10:32:00Z',
    size: '128 KB',
  },
  {
    id: 'doc-003',
    name: 'Portfolio_Projects.pdf',
    type: 'portfolio',
    url: '/documents/portfolio.pdf',
    uploadedAt: '2024-01-16T09:15:00Z',
    size: '2.4 MB',
  },
];

export const mockInterviews: CandidateInterview[] = [
  {
    id: 'int-001',
    stage: 'screening',
    date: '2024-01-18',
    startTime: '10:00',
    endTime: '10:30',
    interviewers: ['Emily Johnson'],
    status: 'completed',
    feedbackStatus: 'complete',
    rating: 4.5,
  },
  {
    id: 'int-002',
    stage: 'interview-1',
    date: '2024-01-22',
    startTime: '14:00',
    endTime: '15:00',
    interviewers: ['Michael Torres', 'Lisa Park'],
    status: 'completed',
    feedbackStatus: 'complete',
    rating: 4.2,
  },
  {
    id: 'int-003',
    stage: 'interview-2',
    date: '2024-01-28',
    startTime: '11:00',
    endTime: '12:00',
    interviewers: ['David Kim', 'Jennifer Wu'],
    status: 'scheduled',
    feedbackStatus: 'pending',
  },
];

export const mockCommunications: CommunicationEntry[] = [
  {
    id: 'comm-001',
    channel: 'email',
    type: 'outbound',
    subject: 'Interview Invitation - Senior Frontend Engineer',
    preview: 'We are pleased to invite you to an interview for the Senior Frontend Engineer position...',
    timestamp: '2024-01-16T09:00:00Z',
    status: 'read',
  },
  {
    id: 'comm-002',
    channel: 'email',
    type: 'inbound',
    subject: 'Re: Interview Invitation - Senior Frontend Engineer',
    preview: 'Thank you for the opportunity! I am available on the suggested dates...',
    timestamp: '2024-01-16T11:30:00Z',
    status: 'read',
  },
  {
    id: 'comm-003',
    channel: 'sms',
    type: 'outbound',
    preview: 'Reminder: Your interview is scheduled for tomorrow at 10:00 AM PST.',
    timestamp: '2024-01-17T15:00:00Z',
    status: 'delivered',
  },
  {
    id: 'comm-004',
    channel: 'email',
    type: 'outbound',
    subject: 'Interview 2 Confirmation',
    preview: 'Your technical interview has been scheduled for January 28th at 11:00 AM...',
    timestamp: '2024-01-23T10:15:00Z',
    status: 'read',
  },
  {
    id: 'comm-005',
    channel: 'whatsapp',
    type: 'outbound',
    preview: 'Hi Sarah, just confirming you received the calendar invite for tomorrow.',
    timestamp: '2024-01-27T16:00:00Z',
    status: 'delivered',
  },
];

export const mockNotes: CandidateNote[] = [
  {
    id: 'note-001',
    content: 'Initial screening went well. Candidate has strong technical background and clear communication skills. Recommended for technical interview.',
    authorId: 'user-001',
    authorName: 'Emily Johnson',
    createdAt: '2024-01-18T11:00:00Z',
  },
  {
    id: 'note-002',
    content: 'Technical interview feedback: Excellent problem-solving skills. Demonstrated deep understanding of React patterns and TypeScript. Good culture fit based on team interview.',
    authorId: 'user-002',
    authorName: 'Michael Torres',
    createdAt: '2024-01-22T16:30:00Z',
  },
  {
    id: 'note-003',
    content: 'Candidate mentioned salary expectations in the range of $180-200k. Currently at a competing offer from another company with a deadline of Feb 5th.',
    authorId: 'user-001',
    authorName: 'Emily Johnson',
    createdAt: '2024-01-24T09:15:00Z',
    updatedAt: '2024-01-24T10:00:00Z',
  },
];

export const currentUserRole: UserRole = 'recruiter';
