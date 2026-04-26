
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getVendorJobs,
    getVendorJob,
    getVendorCandidates,
    submitCandidate,
    getResumeUploadUrl,
    SubmitCandidateDto
} from '@/lib/api/vendor-portal';
import { toast } from 'sonner';

const portalKeys = {
    all: ['vendor-portal'] as const,
    jobs: () => [...portalKeys.all, 'jobs'] as const,
    job: (id: string) => [...portalKeys.all, 'job', id] as const,
    candidates: () => [...portalKeys.all, 'candidates'] as const,
};

export function useVendorJobs() {
    return useQuery({
        queryKey: portalKeys.jobs(),
        queryFn: getVendorJobs,
    });
}

export function useVendorJob(id: string) {
    return useQuery({
        queryKey: portalKeys.job(id),
        queryFn: () => getVendorJob(id),
        enabled: !!id
    });
}

export function useVendorCandidates() {
    return useQuery({
        queryKey: portalKeys.candidates(),
        queryFn: getVendorCandidates,
    });
}

export function useSubmitCandidate() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: SubmitCandidateDto) => submitCandidate(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: portalKeys.candidates() });
            toast.success('Candidate submitted successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to submit candidate');
        },
    });
}
