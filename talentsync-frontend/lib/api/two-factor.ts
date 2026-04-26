import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from './client';

// ============================================
// Types
// ============================================

export interface TwoFactorStatus {
    enabled: boolean;
    hasRecoveryCodes: boolean;
}

export interface TwoFactorSetupResponse {
    secret: string;
    qrCodeUrl: string;
    manualEntryKey: string;
}

export interface TwoFactorEnabledResponse {
    recoveryCodes: string[];
    message: string;
}

// ============================================
// API Functions
// ============================================

export async function get2FAStatus(): Promise<TwoFactorStatus> {
    return client.get<TwoFactorStatus>('/auth/2fa/status');
}

export async function initiate2FASetup(): Promise<TwoFactorSetupResponse> {
    return client.post<TwoFactorSetupResponse>('/auth/2fa/enable');
}

export async function verify2FASetup(token: string): Promise<TwoFactorEnabledResponse> {
    return client.post<TwoFactorEnabledResponse>('/auth/2fa/verify-setup', { token });
}

export async function disable2FA(data: { password: string; token: string }): Promise<{ success: boolean }> {
    return client.post<{ success: boolean }>('/auth/2fa/disable', data);
}

export async function regenerateRecoveryCodes(): Promise<TwoFactorEnabledResponse> {
    return client.post<TwoFactorEnabledResponse>('/auth/2fa/regenerate-codes');
}

export async function verify2FALogin(data: { userId: string; token: string }): Promise<any> {
    return client.post<any>('/auth/2fa/verify-login', data);
}

// ============================================
// React Query Hooks
// ============================================

export function use2FAStatus() {
    return useQuery({
        queryKey: ['2fa', 'status'],
        queryFn: get2FAStatus,
        staleTime: 30000, // 30 seconds
    });
}

export function useInitiate2FASetup() {
    return useMutation({
        mutationFn: initiate2FASetup,
    });
}

export function useVerify2FASetup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: verify2FASetup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
        },
    });
}

export function useDisable2FA() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: disable2FA,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['2fa', 'status'] });
        },
    });
}

export function useRegenerateRecoveryCodes() {
    return useMutation({
        mutationFn: regenerateRecoveryCodes,
    });
}

export function useVerify2FALogin() {
    return useMutation({
        mutationFn: verify2FALogin,
    });
}
