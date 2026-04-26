'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getOffers,
    getOffer,
    getOfferStats,
    createOffer,
    updateOffer,
    sendOffer,
    withdrawOffer,
    respondToOffer,
    deleteOffer,
    Offer,
    CreateOfferDto,
    UpdateOfferDto,
    QueryOffersParams,
} from '@/lib/api/offers';
import { toast } from 'sonner';

// Query keys
const offersKeys = {
    all: ['offers'] as const,
    lists: () => [...offersKeys.all, 'list'] as const,
    list: (params: QueryOffersParams) => [...offersKeys.lists(), params] as const,
    details: () => [...offersKeys.all, 'detail'] as const,
    detail: (id: string) => [...offersKeys.details(), id] as const,
    stats: () => [...offersKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch offers with filtering and pagination
 */
export function useOffers(params: QueryOffersParams = {}) {
    return useQuery({
        queryKey: offersKeys.list(params),
        queryFn: () => getOffers(params),
    });
}

/**
 * Hook to fetch a single offer by ID
 */
export function useOffer(id: string) {
    return useQuery({
        queryKey: offersKeys.detail(id),
        queryFn: () => getOffer(id),
        enabled: !!id,
    });
}

/**
 * Hook to fetch offer statistics
 */
export function useOfferStats() {
    return useQuery({
        queryKey: offersKeys.stats(),
        queryFn: getOfferStats,
    });
}

/**
 * Hook to create a new offer
 */
export function useCreateOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateOfferDto) => createOffer(dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: offersKeys.lists() });
            queryClient.invalidateQueries({ queryKey: offersKeys.stats() });
            toast.success('Offer created successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create offer');
        },
    });
}

/**
 * Hook to update an offer
 */
export function useUpdateOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateOfferDto }) => updateOffer(id, dto),
        onSuccess: (offer) => {
            queryClient.invalidateQueries({ queryKey: offersKeys.lists() });
            queryClient.invalidateQueries({ queryKey: offersKeys.detail(offer.id) });
            toast.success('Offer updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update offer');
        },
    });
}

/**
 * Hook to send an offer to candidate
 */
export function useSendOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => sendOffer(id),
        onSuccess: (offer) => {
            queryClient.invalidateQueries({ queryKey: offersKeys.lists() });
            queryClient.invalidateQueries({ queryKey: offersKeys.detail(offer.id) });
            queryClient.invalidateQueries({ queryKey: offersKeys.stats() });
            toast.success('Offer sent to candidate');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to send offer');
        },
    });
}

/**
 * Hook to withdraw an offer
 */
export function useWithdrawOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => withdrawOffer(id),
        onSuccess: (offer) => {
            queryClient.invalidateQueries({ queryKey: offersKeys.lists() });
            queryClient.invalidateQueries({ queryKey: offersKeys.detail(offer.id) });
            queryClient.invalidateQueries({ queryKey: offersKeys.stats() });
            toast.success('Offer withdrawn');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to withdraw offer');
        },
    });
}

/**
 * Hook to respond to an offer
 */
export function useRespondToOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, response, details }: {
            id: string;
            response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';
            details?: { declineReason?: string; counterOffer?: any };
        }) => respondToOffer(id, response, details),
        onSuccess: (offer) => {
            queryClient.invalidateQueries({ queryKey: offersKeys.lists() });
            queryClient.invalidateQueries({ queryKey: offersKeys.detail(offer.id) });
            queryClient.invalidateQueries({ queryKey: offersKeys.stats() });
            toast.success(`Offer ${offer.status.toLowerCase()}`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to respond to offer');
        },
    });
}

/**
 * Hook to delete an offer
 */
export function useDeleteOffer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteOffer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: offersKeys.lists() });
            queryClient.invalidateQueries({ queryKey: offersKeys.stats() });
            toast.success('Offer deleted');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete offer');
        },
    });
}
