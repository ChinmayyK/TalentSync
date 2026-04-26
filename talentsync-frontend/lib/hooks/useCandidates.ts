import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../api/client';

// Types
export interface Candidate {
    id: string;
    tenantId: string;
    name: string;
    email?: string;
    phone?: string;
    roleTitle?: string;
    stage: string;
    source?: string;
    tags: string[];
    resumeUrl?: string;
    notes?: string;
    createdById?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCandidateDto {
    name: string;
    email?: string;
    phone?: string;
    roleTitle?: string;
    stage?: string;
    source?: string;
    tags?: string[];
}

export interface UpdateCandidateDto {
    name?: string;
    email?: string;
    phone?: string;
    roleTitle?: string;
    stage?: string;
    source?: string;
    tags?: string[];
    notes?: string;
}

export interface CandidateListParams {
    page?: number;
    perPage?: number;
    stage?: string;
    source?: string;
    role?: string;
    q?: string;
    searchMode?: 'simple' | 'boolean';
    recruiterId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface CandidateListResponse {
    data: Candidate[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        lastPage: number;
    };
}

export interface BulkImportRow {
    name: string;
    email?: string;
    phone?: string;
    roleTitle?: string;
    source?: string;
    stage?: string;
    tags?: string;
    notes?: string;
    resumeUrl?: string;
}


export interface BulkImportResult {
    success: number;
    failed: number;
    duplicates: string[];
    errors: Array<{ row: number; message: string }>;
}

// Query Keys
export const candidateKeys = {
    all: ['candidates'] as const,
    list: (params?: CandidateListParams) => [...candidateKeys.all, 'list', params] as const,
    detail: (id: string) => [...candidateKeys.all, 'detail', id] as const,
};

// API Functions
async function fetchCandidates(params?: CandidateListParams): Promise<CandidateListResponse> {
    return client.get('/candidates', { params: params as any });
}

async function fetchCandidate(id: string): Promise<Candidate> {
    return client.get(`/candidates/${id}`);
}

async function createCandidate(data: CreateCandidateDto): Promise<Candidate> {
    return client.post('/candidates', data);
}

async function updateCandidate(id: string, data: UpdateCandidateDto): Promise<Candidate> {
    return client.patch(`/candidates/${id}`, data);
}

async function deleteCandidate(id: string): Promise<void> {
    return client.delete(`/candidates/${id}`);
}

async function bulkImportCandidates(rows: BulkImportRow[]): Promise<BulkImportResult> {
    return client.post('/candidates/bulk-import', { rows });
}

// Hooks
export function useCandidates(params?: CandidateListParams) {
    return useQuery({
        queryKey: candidateKeys.list(params),
        queryFn: () => fetchCandidates(params),
    });
}

export function useCandidate(id: string) {
    return useQuery({
        queryKey: candidateKeys.detail(id),
        queryFn: () => fetchCandidate(id),
        enabled: !!id,
    });
}

export function useCreateCandidate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateCandidateDto) => createCandidate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: candidateKeys.all });
        },
    });
}

export function useUpdateCandidate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCandidateDto }) =>
            updateCandidate(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: candidateKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: candidateKeys.all });
        },
    });
}

export function useDeleteCandidate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteCandidate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: candidateKeys.all });
        },
    });
}

export function useBulkImportCandidates() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (rows: BulkImportRow[]) => bulkImportCandidates(rows),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: candidateKeys.all });
        },
    });
}

export interface BulkSendPortalLinksResult {
    count: number;
    queued: number;
    failed: number;
}

async function bulkSendPortalLinks(data: {
    candidateIds: string[];
    channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
}): Promise<BulkSendPortalLinksResult> {
    return client.post('/candidates/bulk-send-portal-links', data);
}

export function useBulkSendPortalLinks() {
    return useMutation({
        mutationFn: (data: { candidateIds: string[]; channel: 'EMAIL' | 'WHATSAPP' | 'SMS' }) =>
            bulkSendPortalLinks(data),
    });
}
