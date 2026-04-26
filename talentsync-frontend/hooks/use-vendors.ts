
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    deleteVendor,
    inviteVendorUser,
    assignJobToVendor,
    removeJobFromVendor,
    CreateVendorDto,
    UpdateVendorDto,
    InviteVendorUserDto,
    AssignJobDto
} from '@/lib/api/vendors';
import { toast } from 'sonner'; // Using sonner as per use-jobs.ts pattern (or hooks/use-toast if AppShell used that?)
// AppShell used import { toast } from '@/hooks/use-toast'; but use-jobs used sonner directly. Use hooks/use-toast to be safe or sonner if preferred.
// Checking use-jobs.ts again at lines 18: import { toast } from 'sonner';
// So I will use sonner.

const vendorsKeys = {
    all: ['vendors'] as const,
    lists: () => [...vendorsKeys.all, 'list'] as const,
    details: () => [...vendorsKeys.all, 'detail'] as const,
    detail: (id: string) => [...vendorsKeys.details(), id] as const,
};

export function useVendors() {
    return useQuery({
        queryKey: vendorsKeys.lists(),
        queryFn: getVendors,
    });
}

export function useVendor(id: string) {
    return useQuery({
        queryKey: vendorsKeys.detail(id),
        queryFn: () => getVendor(id),
        enabled: !!id,
    });
}

export function useCreateVendor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateVendorDto) => createVendor(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorsKeys.lists() });
            toast.success('Vendor created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create vendor');
        },
    });
}

export function useUpdateVendor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateVendorDto }) => updateVendor(id, dto),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: vendorsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: vendorsKeys.detail(data.id) });
            toast.success('Vendor updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update vendor');
        },
    });
}

export function useDeleteVendor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteVendor(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vendorsKeys.lists() });
            toast.success('Vendor deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete vendor');
        },
    });
}

export function useInviteVendorUser() {
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: InviteVendorUserDto }) => inviteVendorUser(id, dto),
        onSuccess: () => {
            toast.success('User invited successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to invite user');
        },
    });
}

export function useAssignJobToVendor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: AssignJobDto }) => assignJobToVendor(id, dto),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorsKeys.detail(variables.id) });
            toast.success('Job assigned successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to assign job');
        },
    });
}

export function useRemoveJobFromVendor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, jobId }: { id: string; jobId: string }) => removeJobFromVendor(id, jobId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: vendorsKeys.detail(variables.id) });
            toast.success('Job removed successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to remove job');
        },
    });
}
