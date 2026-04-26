import { Candidate, Interviewer, TimeSlot } from '@/types/scheduling';

export const mockCandidates: Candidate[] = [
  { id: 'c1', name: 'Alex Rivera', email: 'alex.rivera@gmail.com', phone: '+1-555-0101', role: 'Senior Frontend Engineer', stage: 'Screening', hasResume: true, priorInterviews: 0, appliedDate: '2024-01-15' },
  { id: 'c2', name: 'Emma Watson', email: 'emma.watson@outlook.com', phone: '+1-555-0102', role: 'Product Manager', stage: 'Interview', hasResume: true, priorInterviews: 1, appliedDate: '2024-01-18' },
  { id: 'c3', name: 'James Park', email: 'james.park@yahoo.com', phone: '+1-555-0103', role: 'Backend Developer', stage: 'Technical', hasResume: true, priorInterviews: 2, appliedDate: '2024-01-10' },
  { id: 'c4', name: 'Sofia Martinez', email: 'sofia.martinez@gmail.com', phone: '+1-555-0104', role: 'Data Analyst', stage: 'Offer', hasResume: true, priorInterviews: 3, appliedDate: '2024-01-05' },
  { id: 'c5', name: 'David Kim', email: 'david.kim@proton.me', phone: '+1-555-0105', role: 'DevOps Engineer', stage: 'Screening', hasResume: true, priorInterviews: 0, appliedDate: '2024-01-20' },
];

export const mockInterviewers: Interviewer[] = [
  { id: 'i1', name: 'Sarah Chen', email: 'sarah.chen@acme.com', role: 'Interviewer', department: 'Engineering', availability: 'available' },
  { id: 'i2', name: 'Mike Johnson', email: 'mike.johnson@acme.com', role: 'Interviewer', department: 'Engineering', availability: 'available' },
  { id: 'i3', name: 'Priya Sharma', email: 'priya.sharma@acme.com', role: 'Recruiter', department: 'Human Resources', availability: 'available' },
];

export const mockTimeSlots: TimeSlot[] = [
  { time: '09:00', available: true, recommended: true },
  { time: '09:30', available: true },
  { time: '10:00', available: true, recommended: true },
  { time: '10:30', available: false },
  { time: '11:00', available: true },
  { time: '11:30', available: true },
  { time: '12:00', available: false },
  { time: '12:30', available: false },
  { time: '13:00', available: true },
  { time: '13:30', available: true },
  { time: '14:00', available: true, recommended: true },
  { time: '14:30', available: true },
  { time: '15:00', available: true },
  { time: '15:30', available: false },
  { time: '16:00', available: true },
  { time: '16:30', available: true },
  { time: '17:00', available: false },
];

export const durationOptions = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];
