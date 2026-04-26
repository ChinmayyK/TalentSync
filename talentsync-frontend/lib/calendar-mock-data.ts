import { CalendarEvent } from '@/types/calendar';
import { addDays, addHours, setHours, setMinutes, format } from 'date-fns';

const today = new Date();

// TalentSync interviewers
export const mockInterviewers = [
  { id: 'int-1', name: 'Sarah Chen', initials: 'SC' },
  { id: 'int-2', name: 'Mike Johnson', initials: 'MJ' },
  { id: 'int-3', name: 'Priya Sharma', initials: 'PS' },
];

const createEvent = (
  id: string,
  candidateName: string,
  interviewer: typeof mockInterviewers[0],
  date: Date,
  hour: number,
  duration: number,
  stage: CalendarEvent['stage'],
  status: CalendarEvent['status']
): CalendarEvent => ({
  id,
  candidateId: `cand-${id}`,
  candidateName,
  interviewerId: interviewer.id,
  interviewerName: interviewer.name,
  interviewerInitials: interviewer.initials,
  role: ['Senior Frontend Engineer', 'Product Manager', 'Backend Developer', 'Data Analyst', 'DevOps Engineer'][parseInt(id.split('-')[1]) % 5],
  stage,
  status,
  startTime: setMinutes(setHours(date, hour), 0).toISOString(),
  endTime: addHours(setMinutes(setHours(date, hour), 0), duration).toISOString(),
  duration: duration * 60,
  mode: ['video', 'phone', 'in-person'][parseInt(id.split('-')[1]) % 3] as CalendarEvent['mode'],
  meetingLink: 'https://meet.google.com/abc-defg-hij',
  tenantId: 'tenant_123',
});

// TalentSync calendar events - only 5 candidates
export const mockCalendarEvents: CalendarEvent[] = [
  // Upcoming
  createEvent('evt-1', 'Alex Rivera', mockInterviewers[0], addDays(today, 1), 10, 1, 'screening', 'scheduled'),
  createEvent('evt-2', 'Emma Watson', mockInterviewers[1], addDays(today, 7), 14, 1, 'interview-1', 'scheduled'),
  createEvent('evt-3', 'David Kim', mockInterviewers[2], addDays(today, 3), 11, 1, 'screening', 'scheduled'),

  // Past events
  createEvent('evt-4', 'James Park', mockInterviewers[0], addDays(today, -2), 10, 1, 'interview-2', 'completed'),
  createEvent('evt-5', 'Sofia Martinez', mockInterviewers[1], addDays(today, -7), 14, 1, 'offer', 'completed'),
];

export const getEventsForDate = (date: Date, events: CalendarEvent[]): CalendarEvent[] => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return events.filter(event => format(new Date(event.startTime), 'yyyy-MM-dd') === dateStr);
};

export const getEventsForDateRange = (
  startDate: Date,
  endDate: Date,
  events: CalendarEvent[]
): CalendarEvent[] => {
  return events.filter(event => {
    const eventDate = new Date(event.startTime);
    return eventDate >= startDate && eventDate <= endDate;
  });
};
