import { CalendarEvent } from '@/types/calendar';
import { InterviewSlot, SlotParticipant } from '@/lib/api/calendar';

/**
 * Transform an InterviewSlot from the API to the CalendarEvent format
 * used by the existing calendar components
 */
export function slotToCalendarEvent(slot: InterviewSlot): CalendarEvent {
    // Extract participant info
    const userParticipant = slot.participants.find(p => p.type === 'user');
    const candidateParticipant = slot.participants.find(p => p.type === 'candidate');

    // Calculate duration in minutes
    const startTime = new Date(slot.startAt);
    const endTime = new Date(slot.endAt);
    const durationMins = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    // Generate initials from name
    const getInitials = (name?: string) => {
        if (!name) return 'UN';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Map slot status to interview status
    const getInterviewStatus = (status: string): CalendarEvent['status'] => {
        switch (status) {
            case 'AVAILABLE':
                return 'scheduled';
            case 'BOOKED':
                return 'scheduled';
            case 'CANCELLED':
                return 'cancelled';
            case 'EXPIRED':
                return 'cancelled';
            default:
                return 'scheduled';
        }
    };

    // Extract stage from metadata or default
    const stage = (slot.metadata as any)?.stage || 'screening';

    return {
        id: slot.id,
        candidateId: candidateParticipant?.id || '',
        candidateName: candidateParticipant?.name || 'Available Slot',
        interviewerId: userParticipant?.id || slot.organizerId || '',
        interviewerName: userParticipant?.name || 'Unknown',
        interviewerInitials: getInitials(userParticipant?.name),
        role: (slot.metadata as any)?.role || 'Interview',
        stage: stage as CalendarEvent['stage'],
        status: getInterviewStatus(slot.status),
        startTime: slot.startAt,
        endTime: slot.endAt,
        duration: durationMins,
        mode: (slot.metadata as any)?.mode || 'video',
        meetingLink: (slot.metadata as any)?.meetingLink,
        location: (slot.metadata as any)?.location,
        tenantId: slot.tenantId,
        source: 'slot',
    };
}

/**
 * Transform multiple slots to calendar events
 */
export function slotsToCalendarEvents(slots: InterviewSlot[]): CalendarEvent[] {
    return slots.map(slotToCalendarEvent);
}

/**
 * Calculate date range for a calendar view
 */
export function getCalendarDateRange(
    currentDate: Date,
    view: 'month' | 'week' | 'day'
): { start: Date; end: Date } {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'day') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
        // Start from the beginning of the week (Monday to match CalendarWeekView)
        const dayOfWeek = start.getDay();
        // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start.setDate(start.getDate() - daysToSubtract);
        start.setHours(0, 0, 0, 0);
        // End is 6 days after start
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else if (view === 'month') {
        // Start from 1st of the month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        // End at last day of month
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
}

/**
 * Transform an Interview from the API to the CalendarEvent format
 */
export function interviewToCalendarEvent(interview: {
    id: string;
    candidateId: string;
    candidate?: { name?: string; role?: string };
    candidateName?: string;  // Enriched field from backend
    candidateEmail?: string; // Enriched field from backend
    date?: string;           // Backend uses 'date' field
    startAt?: string;        // Alternative field name
    endAt?: string;
    durationMins?: number;
    stage?: string;
    status?: string;
    type?: string;
    location?: string;
    meetingLink?: string;
    interviewers?: Array<{ id: string; name: string | null; email: string }>;
    tenantId: string;
}): CalendarEvent {
    // Parse start time - backend uses 'date' or 'startAt'
    const startAt = interview.date
        ? new Date(interview.date)
        : interview.startAt
            ? new Date(interview.startAt)
            : new Date();

    // Calculate end time
    const endAt = interview.endAt
        ? new Date(interview.endAt)
        : new Date(startAt.getTime() + (interview.durationMins || 60) * 60000);

    // Get primary interviewer
    const primaryInterviewer = interview.interviewers?.[0];

    // Generate initials from name
    const getInitials = (name?: string | null) => {
        if (!name) return 'UN';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Map interview status
    const getStatus = (status?: string): CalendarEvent['status'] => {
        if (!status) return 'scheduled';
        switch (status.toUpperCase()) {
            case 'SCHEDULED':
                return 'scheduled';
            case 'COMPLETED':
                return 'completed';
            case 'CANCELLED':
                return 'cancelled';
            case 'NO_SHOW':
                return 'no-show';
            case 'PENDING_FEEDBACK':
                return 'pending-feedback';
            default:
                return 'scheduled';
        }
    };

    // Map interview type to mode
    const getMode = (type?: string): CalendarEvent['mode'] => {
        if (!type) return 'video';
        switch (type.toUpperCase()) {
            case 'VIDEO':
                return 'video';
            case 'PHONE':
                return 'phone';
            case 'IN_PERSON':
                return 'in-person';
            default:
                return 'video';
        }
    };

    return {
        id: interview.id,
        candidateId: interview.candidateId,
        candidateName: interview.candidateName || interview.candidate?.name || 'Unknown Candidate',
        interviewerId: primaryInterviewer?.id || '',
        interviewerName: primaryInterviewer?.name || 'Unknown',
        interviewerInitials: getInitials(primaryInterviewer?.name),
        role: interview.candidate?.role || 'Interview',
        stage: (interview.stage?.toLowerCase() || 'screening') as CalendarEvent['stage'],
        status: getStatus(interview.status),
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        duration: interview.durationMins || 60,
        mode: getMode(interview.type),
        meetingLink: interview.meetingLink,
        location: interview.location,
        tenantId: interview.tenantId,
        source: 'interview',
    };
}

/**
 * Transform multiple interviews to calendar events
 */
export function interviewsToCalendarEvents(interviews: any[]): CalendarEvent[] {
    return interviews.map(interviewToCalendarEvent);
}

