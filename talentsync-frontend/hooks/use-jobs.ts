'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getJobs,
    getJob,
    getJobStats,
    createJob,
    updateJob,
    publishJob,
    closeJob,
    deleteJob,
    Job,
    CreateJobDto,
    UpdateJobDto,
    QueryJobsParams,
} from '@/lib/api/jobs';
import { toast } from 'sonner';

// Query keys
const jobsKeys = {
    all: ['jobs'] as const,
    lists: () => [...jobsKeys.all, 'list'] as const,
    list: (params: QueryJobsParams) => [...jobsKeys.lists(), params] as const,
    details: () => [...jobsKeys.all, 'detail'] as const,
    detail: (id: string) => [...jobsKeys.details(), id] as const,
    stats: () => [...jobsKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch jobs with filtering and pagination
 */
export function useJobs(params: QueryJobsParams = {}, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: jobsKeys.list(params),
        queryFn: () => getJobs(params),
        enabled: options?.enabled !== false,
    });
}

/**
 * Hook to fetch a single job by ID
 */
export function useJob(id: string) {
    return useQuery({
        queryKey: jobsKeys.detail(id),
        queryFn: () => getJob(id),
        enabled: !!id,
    });
}

/**
 * Hook to fetch job statistics
 */
export function useJobStats(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: jobsKeys.stats(),
        queryFn: getJobStats,
        enabled: options?.enabled !== false,
    });
}

/**
 * Hook to create a new job
 */
export function useCreateJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateJobDto) => createJob(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: jobsKeys.stats() });
            toast.success('Job created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create job');
        },
    });
}

/**
 * Hook to update a job
 */
export function useUpdateJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateJobDto }) => updateJob(id, dto),
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: jobsKeys.detail(job.id) });
            toast.success('Job updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update job');
        },
    });
}

/**
 * Hook to publish a draft job
 */
export function usePublishJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => publishJob(id),
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: jobsKeys.detail(job.id) });
            queryClient.invalidateQueries({ queryKey: jobsKeys.stats() });
            toast.success('Job published successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to publish job');
        },
    });
}

/**
 * Hook to close a job
 */
export function useCloseJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => closeJob(id),
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: jobsKeys.detail(job.id) });
            queryClient.invalidateQueries({ queryKey: jobsKeys.stats() });
            toast.success('Job closed');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to close job');
        },
    });
}

/**
 * Hook to delete a job
 */
export function useDeleteJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteJob(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: jobsKeys.stats() });
            toast.success('Job deleted');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete job');
        },
    });
}
