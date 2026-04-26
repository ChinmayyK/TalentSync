'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getHiringStages,
    createHiringStage,
    updateHiringStage,
    reorderHiringStages,
    toggleHiringStage,
    deleteHiringStage,
    HiringStage,
    CreateHiringStageDto,
    UpdateHiringStageDto
} from '@/lib/api/hiring-stages';
import { toast } from 'sonner';

const QUERY_KEY = ['hiring-stages'];

/**
 * Hook to fetch all hiring stages
 */
export function useHiringStages(includeInactive = false) {
    return useQuery({
        queryKey: [...QUERY_KEY, { includeInactive }],
        queryFn: () => getHiringStages(includeInactive),
    });
}

/**
 * Hook to create a new hiring stage
 */
export function useCreateHiringStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateHiringStageDto) => createHiringStage(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Stage created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create stage');
        },
    });
}

/**
 * Hook to update a hiring stage
 */
export function useUpdateHiringStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateHiringStageDto }) =>
            updateHiringStage(id, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Stage updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update stage');
        },
    });
}

/**
 * Hook to reorder hiring stages
 */
export function useReorderHiringStages() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (stageIds: string[]) => reorderHiringStages(stageIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Stages reordered');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to reorder stages');
        },
    });
}

/**
 * Hook to toggle a hiring stage's active status
 */
export function useToggleHiringStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => toggleHiringStage(id),
        onSuccess: (stage) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success(`Stage ${stage.isActive ? 'enabled' : 'disabled'}`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to toggle stage');
        },
    });
}

/**
 * Hook to delete a hiring stage
 */
export function useDeleteHiringStage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteHiringStage(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Stage deleted');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete stage');
        },
    });
}

/**
 * Get stages grouped for pipeline display
 */
export function useHiringStagesForPipeline() {
    const { data: stages, isLoading, error } = useHiringStages(false);

    return {
        stages: stages || [],
        isLoading,
        error,
        // Helper to get stage display info by key
        getStageInfo: (key: string): HiringStage | undefined => {
            return stages?.find(s => s.key === key);
        },
        // Get all stage keys in order
        stageKeys: stages?.map(s => s.key) || [],
        // Get stage name by key with fallback
        getStageName: (key: string): string => {
            return stages?.find(s => s.key === key)?.name || key;
        },
        // Get stage color by key with fallback
        getStageColor: (key: string): string => {
            return stages?.find(s => s.key === key)?.color || '#6b7280';
        },
    };
}
