'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    validatePortalToken,
    getPortalProfile,
    getPortalInterviews,
    getPortalDocuments,
    generateUploadUrl,
    confirmDocumentUpload,
    setPortalToken,
    getPortalToken,
    clearPortalToken,
    type PortalCandidate,
    type PortalInterview,
    type PortalDocument,
} from '@/lib/api/portal';

// Query keys
const PORTAL_KEYS = {
    profile: ['portal', 'profile'] as const,
    interviews: ['portal', 'interviews'] as const,
    documents: ['portal', 'documents'] as const,
};

/**
 * Hook to validate and store portal token
 */
export function usePortalValidation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (token: string) => {
            const result = await validatePortalToken(token);
            if (result.valid && result.candidate) {
                setPortalToken(token);
                // Pre-populate profile cache
                queryClient.setQueryData(PORTAL_KEYS.profile, result.candidate);
            }
            return result;
        },
    });
}

/**
 * Hook to get candidate profile
 */
export function usePortalProfile() {
    return useQuery<PortalCandidate>({
        queryKey: PORTAL_KEYS.profile,
        queryFn: getPortalProfile,
        enabled: !!getPortalToken(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to get upcoming interviews
 */
export function usePortalInterviews() {
    return useQuery<PortalInterview[]>({
        queryKey: PORTAL_KEYS.interviews,
        queryFn: getPortalInterviews,
        enabled: !!getPortalToken(),
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Hook to get documents
 */
export function usePortalDocuments() {
    return useQuery<PortalDocument[]>({
        queryKey: PORTAL_KEYS.documents,
        queryFn: getPortalDocuments,
        enabled: !!getPortalToken(),
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Hook to upload a document
 */
export function usePortalUpload() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File) => {
            // Step 1: Get pre-signed upload URL with correct content type
            const { uploadUrl, fileId, s3Key } = await generateUploadUrl(file.name, file.type || 'application/octet-stream');

            // Step 2: Upload to S3
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                },
            });

            // Step 3: Confirm upload
            const document = await confirmDocumentUpload(
                fileId,
                s3Key,
                file.type,
                file.size,
            );

            return document;
        },
        onSuccess: () => {
            // Invalidate documents cache
            queryClient.invalidateQueries({ queryKey: PORTAL_KEYS.documents });
        },
    });
}

/**
 * Hook to check if portal is authenticated
 */
export function usePortalAuth() {
    const hasToken = typeof window !== 'undefined' && !!getPortalToken();

    return {
        isAuthenticated: hasToken,
        logout: () => {
            clearPortalToken();
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        },
    };
}
