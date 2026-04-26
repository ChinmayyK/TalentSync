import { client } from './client';

// =============================================================================
// Types
// =============================================================================

export interface Interview {
    id: string;
    tenantId: string;
    candidateId: string;
    candidateName?: string;
    candidateEmail?: string;
    candidatePhone?: string;
    roleTitle?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    durationMins: number;
    stage: string;
    status: string;
    type: string;
    location?: string;
    meetingLink?: string;
    interviewers: Array<{
        id: string;
        name: string;
        email: string;
    }>;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface InterviewListResponse {
    data: Interview[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        totalPages: number;
    };
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all interviews with filtering
 */
export async function getInterviews(params?: {
    page?: number;
    perPage?: number;
    from?: string;
    to?: string;
    status?: string;
    candidateId?: string;
    interviewerId?: string;
}): Promise<InterviewListResponse> {
    try {
        const response = await client.get<InterviewListResponse>('/interviews', {
            params: params as Record<string, string | number | boolean | undefined | null>,
        });
        return response;
    } catch (error) {
        console.error('Failed to fetch interviews:', error);
        throw error;
    }
}

/**
 * Get a specific interview by ID
 */
export async function getInterview(id: string): Promise<Interview> {
    try {
        const response = await client.get<Interview>(`/interviews/${id}`);
        return response;
    } catch (error) {
        console.error(`Failed to fetch interview ${id}:`, error);
        throw error;
    }
}

/**
 * Create a new interview
 */
export async function createInterview(data: {
    candidateId: string;
    date: string;
    startTime?: string;
    durationMins?: number;
    stage?: string;
    type?: string;
    location?: string;
    meetingLink?: string;
    interviewerIds?: string[];
    notes?: string;
    candidateEmailSubject?: string;
    candidateEmailBody?: string;
    interviewerEmailSubject?: string;
    interviewerEmailBody?: string;
}): Promise<Interview> {
    try {
        // Transform date + startTime to startAt ISO format
        const { date, startTime, durationMins = 60, type, interviewerIds = [], ...rest } = data;

        // Parse date and time to create startAt
        let startAt: string;
        if (startTime && date) {
            // Combine date and time: "2024-01-15" + "09:00" -> ISO string
            startAt = new Date(`${date}T${startTime}:00`).toISOString();
        } else if (date) {
            // Just date, default to 9 AM
            startAt = new Date(`${date}T09:00:00`).toISOString();
        } else {
            throw new Error('Date is required');
        }

        // Build payload with only fields the backend DTO accepts
        const payload = {
            candidateId: rest.candidateId,
            interviewerIds,
            startAt,
            durationMins,
            stage: rest.stage,
            candidateEmailSubject: rest.candidateEmailSubject,
            candidateEmailBody: rest.candidateEmailBody,
            interviewerEmailSubject: rest.interviewerEmailSubject,
            interviewerEmailBody: rest.interviewerEmailBody,
            location: rest.location,
            meetingLink: rest.meetingLink,
            notes: rest.notes,
        };

        const response = await client.post<Interview>('/interviews', payload);
        return response;
    } catch (error: any) {
        // Only log non-conflict errors to console - conflicts are expected and handled in UI
        if (!error?.message?.toLowerCase()?.includes('conflict')) {
            console.error('Failed to create interview:', error);
        }
        throw error;
    }
}

/**
 * Reschedule an interview
 */
export async function rescheduleInterview(
    id: string,
    data: {
        newDate: string;
        newStartTime?: string;
        reason?: string;
    }
): Promise<Interview> {
    try {
        // Backend expects: PATCH /interviews/:id/reschedule with newStartAt and newDurationMins
        const response = await client.patch<Interview>(`/interviews/${id}/reschedule`, {
            newStartAt: data.newDate,
            newDurationMins: 60, // Default to 60 mins, can be parameterized later
            reason: data.reason,
        });
        return response;
    } catch (error) {
        console.error(`Failed to reschedule interview ${id}:`, error);
        throw error;
    }
}

/**
 * Cancel an interview
 */
export async function cancelInterview(id: string): Promise<{ success: boolean }> {
    try {
        const response = await client.post<{ success: boolean }>(`/interviews/${id}/cancel`);
        return response;
    } catch (error) {
        console.error(`Failed to cancel interview ${id}:`, error);
        throw error;
    }
}

/**
 * Mark interview as complete
 */
export async function completeInterview(id: string): Promise<Interview> {
    try {
        const response = await client.post<Interview>(`/interviews/${id}/complete`);
        return response;
    } catch (error) {
        console.error(`Failed to complete interview ${id}:`, error);
        throw error;
    }
}

// =============================================================================
// Interview Notes API
// =============================================================================

export interface InterviewNote {
    id: string;
    interviewId: string;
    content: string;
    authorId: string;
    author: {
        id: string;
        name: string | null;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface TimelineItem {
    type: 'note' | 'feedback' | 'activity';
    id: string;
    createdAt: string;
    author?: {
        id: string;
        name: string | null;
        email: string;
    };
    content?: string;
    rating?: number;
    action?: string;
}

/**
 * Get all notes for an interview
 */
export async function getInterviewNotes(interviewId: string): Promise<{ data: InterviewNote[] }> {
    try {
        const response = await client.get<{ data: InterviewNote[] }>(`/interviews/${interviewId}/notes`);
        return response;
    } catch (error) {
        console.error(`Failed to fetch interview notes:`, error);
        throw error;
    }
}

/**
 * Add a note to an interview
 */
export async function addInterviewNote(interviewId: string, content: string): Promise<InterviewNote> {
    try {
        const response = await client.post<InterviewNote>(`/interviews/${interviewId}/notes`, { content });
        return response;
    } catch (error) {
        console.error(`Failed to add interview note:`, error);
        throw error;
    }
}

/**
 * Update an interview note
 */
export async function updateInterviewNote(interviewId: string, noteId: string, content: string): Promise<InterviewNote> {
    try {
        const response = await client.patch<InterviewNote>(`/interviews/${interviewId}/notes/${noteId}`, { content });
        return response;
    } catch (error) {
        console.error(`Failed to update interview note:`, error);
        throw error;
    }
}

/**
 * Delete an interview note
 */
export async function deleteInterviewNote(interviewId: string, noteId: string): Promise<{ success: boolean }> {
    try {
        const response = await client.delete<{ success: boolean }>(`/interviews/${interviewId}/notes/${noteId}`);
        return response;
    } catch (error) {
        console.error(`Failed to delete interview note:`, error);
        throw error;
    }
}

/**
 * Get interview timeline (notes, feedback, activity)
 */
export async function getInterviewTimeline(interviewId: string): Promise<{ data: TimelineItem[] }> {
    try {
        const response = await client.get<{ data: TimelineItem[] }>(`/interviews/${interviewId}/timeline`);
        return response;
    } catch (error) {
        console.error(`Failed to fetch interview timeline:`, error);
        throw error;
    }
}
