import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../api/client';

// Types
export interface Interview {
    id: string;
    tenantId: string;
    candidateId: string;
    interviewerIds: string[];
    date: string;
    durationMins: number;
    stage: string;
    status: string;
    meetingLink?: string;
    notes?: string;
    candidate?: {
        name: string;
        email?: string;
    };
}

export interface Interviewer {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface BulkScheduleRequest {
    candidateIds: string[];
    interviewerIds: string[];
    durationMins: number;
    bulkMode: 'SEQUENTIAL' | 'GROUP';
    startTime: string;
    stage?: string;
    timezone?: string;
    // Legacy fields for backward compatibility
    strategy?: 'AUTO' | 'SAME_TIME' | 'PER_CANDIDATE';
    scheduledTime?: string;
}

export interface BulkScheduleResult {
    total: number;
    scheduled: number;
    skipped: number;
    bulkBatchId: string;
    bulkMode: 'SEQUENTIAL' | 'GROUP';
    created: Array<{
        candidateId: string;
        interviewId: string;
        scheduledAt: string;
    }>;
    skippedCandidates: Array<{
        candidateId: string;
        reason: string;
    }>;
}

export interface InterviewListParams {
    page?: number;
    perPage?: number;
    interviewerId?: string;
    candidateId?: string;
    status?: string;
    from?: string;
    to?: string;
    sort?: string;
}

export interface InterviewListResponse {
    data: Interview[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        lastPage: number;
    };
}

// Query Keys
export const interviewKeys = {
    all: ['interviews'] as const,
    list: (params?: InterviewListParams) => [...interviewKeys.all, 'list', params] as const,
    detail: (id: string) => [...interviewKeys.all, 'detail', id] as const,
    interviewers: ['interviewers'] as const,
};

// API Functions
async function fetchInterviews(params?: InterviewListParams): Promise<InterviewListResponse> {
    return client.get('/interviews', { params: params as any });
}

async function fetchInterview(id: string): Promise<Interview> {
    return client.get(`/interviews/${id}`);
}

async function fetchInterviewers(): Promise<Interviewer[]> {
    // Fetch users that can act as interviewers (ADMIN, MANAGER, INTERVIEWER roles)
    const response = await client.get<{ data: Interviewer[] } | Interviewer[]>('/users', {
        params: { roles: 'ADMIN,MANAGER,INTERVIEWER' }
    });
    // Handle both paginated and non-paginated responses
    if (response && typeof response === 'object' && 'data' in response) {
        return (response as { data: Interviewer[] }).data;
    }
    return response as Interviewer[];
}


async function bulkScheduleInterviews(data: BulkScheduleRequest): Promise<BulkScheduleResult> {
    return client.post('/interviews/bulk-schedule', data);
}

async function cancelInterview(id: string): Promise<Interview> {
    return client.post(`/interviews/${id}/cancel`);
}

async function completeInterview(id: string): Promise<Interview> {
    return client.post(`/interviews/${id}/complete`);
}

// Hooks
export function useInterviews(params?: InterviewListParams) {
    return useQuery({
        queryKey: interviewKeys.list(params),
        queryFn: () => fetchInterviews(params),
    });
}

export function useInterview(id: string) {
    return useQuery({
        queryKey: interviewKeys.detail(id),
        queryFn: () => fetchInterview(id),
        enabled: !!id,
    });
}

export function useInterviewers() {
    return useQuery({
        queryKey: interviewKeys.interviewers,
        queryFn: fetchInterviewers,
    });
}

export function useBulkSchedule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: BulkScheduleRequest) => bulkScheduleInterviews(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: interviewKeys.all });
        },
    });
}

export function useCancelInterview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => cancelInterview(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: interviewKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: interviewKeys.all });
        },
    });
}

export function useCompleteInterview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => completeInterview(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: interviewKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: interviewKeys.all });
        },
    });
}
