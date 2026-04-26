import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../api/client';

// Types
export interface ResumeInbox {
    id: string;
    name: string;
    email: string;
    enabled: boolean;
    lastPolledAt?: string;
    _count?: { emails: number };
}

export interface InboxEmail {
    id: string;
    resumeInboxId: string;
    resumeInbox?: ResumeInbox;
    messageId: string;
    fromAddress: string;
    fromName?: string;
    subject: string;
    bodyPreview?: string;
    attachmentFilename?: string;
    attachmentFileId?: string;
    status: 'PENDING' | 'PROCESSING' | 'PARSED' | 'CANDIDATE_CREATED' | 'SKIPPED' | 'FAILED' | 'NO_RESUME';
    parsedData?: Record<string, any>;
    candidateId?: string;
    errorMessage?: string;
    receivedAt: string;
    processedAt?: string;
    createdAt: string;
}

export interface EmailListParams {
    inboxId?: string;
    status?: string;
    page?: number;
    perPage?: number;
}

export interface EmailListResponse {
    data: InboxEmail[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        lastPage: number;
    };
}

// Query Keys
export const resumeInboxKeys = {
    all: ['resume-inbox'] as const,
    inboxes: () => [...resumeInboxKeys.all, 'inboxes'] as const,
    emails: (params?: EmailListParams) => [...resumeInboxKeys.all, 'emails', params] as const,
    email: (id: string) => [...resumeInboxKeys.all, 'email', id] as const,
};

// API Functions
async function fetchInboxes(): Promise<ResumeInbox[]> {
    return client.get('/api/v1/resume-inbox/inboxes');
}

async function fetchEmails(params?: EmailListParams): Promise<EmailListResponse> {
    return client.get('/api/v1/resume-inbox/emails', { params: params as any });
}

async function fetchEmail(id: string): Promise<InboxEmail> {
    return client.get(`/api/v1/resume-inbox/emails/${id}`);
}

async function processEmail(id: string): Promise<{ status: string; parsedData?: any }> {
    return client.post(`/api/v1/resume-inbox/emails/${id}/process`);
}

async function skipEmail(id: string): Promise<InboxEmail> {
    return client.post(`/api/v1/resume-inbox/emails/${id}/skip`);
}

async function createCandidateFromEmail(id: string): Promise<{ candidateId: string }> {
    return client.post(`/api/v1/resume-inbox/emails/${id}/create-candidate`);
}

async function pollInbox(inboxId: string): Promise<{ emailsFound: number; created: number }> {
    return client.post(`/api/v1/resume-inbox/inboxes/${inboxId}/poll`);
}

// Hooks
export function useResumeInboxes() {
    return useQuery({
        queryKey: resumeInboxKeys.inboxes(),
        queryFn: fetchInboxes,
    });
}

export function useInboxEmails(params?: EmailListParams) {
    return useQuery({
        queryKey: resumeInboxKeys.emails(params),
        queryFn: () => fetchEmails(params),
    });
}

export function useInboxEmail(id: string) {
    return useQuery({
        queryKey: resumeInboxKeys.email(id),
        queryFn: () => fetchEmail(id),
        enabled: !!id,
    });
}

export function useProcessEmail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => processEmail(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: resumeInboxKeys.all });
        },
    });
}

export function useSkipEmail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => skipEmail(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: resumeInboxKeys.all });
        },
    });
}

export function useCreateCandidateFromEmail() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => createCandidateFromEmail(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: resumeInboxKeys.all });
        },
    });
}

export function usePollInbox() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (inboxId: string) => pollInbox(inboxId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: resumeInboxKeys.all });
        },
    });
}
