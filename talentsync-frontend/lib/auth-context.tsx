'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Types
export interface User {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
}

export interface TenantWithRole {
    id: string;
    name: string;
    role: string;
    brandingLogoUrl?: string | null;
    brandingColors?: { primary?: string; secondary?: string } | null;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    activeTenantId: string | null;
    tenants: TenantWithRole[];
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    logout: () => Promise<void>;
    signup: (data: SignupData) => Promise<void>;
    switchTenant: (tenantId: string) => Promise<void>;
    refreshTokens: () => Promise<boolean>;
    acceptInvite: (data: AcceptInviteData) => Promise<void>;
    setToken: (token: string) => void;
    setActiveTenant: (tenant: TenantWithRole) => void;
}

interface SignupData {
    email: string;
    password: string;
    name: string;
    companyName: string;
}

interface AcceptInviteData {
    token: string;
    password: string;
    name?: string;
}

// Dynamically determine API base URL for network access
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:3001`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const API_URL = getApiBaseUrl();

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();

    const [state, setState] = useState<AuthState>({
        user: null,
        accessToken: null,
        activeTenantId: null,
        tenants: [],
        isLoading: true,
        isAuthenticated: false,
    });

    // Store access token in memory and localStorage backup
    const setToken = useCallback((token: string | null) => {
        setState(prev => ({ ...prev, accessToken: token }));
        if (token) {
            localStorage.setItem('accessToken', token);
        } else {
            localStorage.removeItem('accessToken');
        }
    }, []);

    // Store active tenant
    const setActiveTenant = useCallback((tenant: TenantWithRole) => {
        setState(prev => ({ ...prev, activeTenantId: tenant.id }));
        localStorage.setItem('activeTenantId', tenant.id);
    }, []);

    // API request helper with auth
    const apiRequest = useCallback(async (
        endpoint: string,
        options: RequestInit = {},
        includeAuth: boolean = true,
    ): Promise<Response> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        // Add auth token if available and requested
        if (includeAuth && state.accessToken) {
            headers['Authorization'] = `Bearer ${state.accessToken}`;
        }

        // Add tenant ID header if available
        if (state.activeTenantId) {
            headers['X-Tenant-Id'] = state.activeTenantId;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include', // For HTTPOnly cookies
        });

        return response;
    }, [state.accessToken, state.activeTenantId]);

    // Refresh tokens
    const refreshTokens = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Send refresh token cookie
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();

            setState(prev => ({
                ...prev,
                user: data.user,
                accessToken: data.accessToken,
                activeTenantId: data.activeTenantId,
                tenants: data.tenants || [],
                isAuthenticated: true,
                isLoading: false,
            }));

            localStorage.setItem('accessToken', data.accessToken);
            if (data.activeTenantId) {
                localStorage.setItem('activeTenantId', data.activeTenantId);
            }

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }, []);

    // Initialize - try to restore session
    useEffect(() => {
        const initAuth = async () => {
            const savedToken = localStorage.getItem('accessToken');
            const savedTenantId = localStorage.getItem('activeTenantId');

            if (savedToken) {
                setState(prev => ({
                    ...prev,
                    accessToken: savedToken,
                    activeTenantId: savedTenantId,
                }));

                // Try to refresh to validate session
                const success = await refreshTokens();
                if (!success) {
                    // Token invalid, clear state
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('activeTenantId');
                    setState(prev => ({
                        ...prev,
                        user: null,
                        accessToken: null,
                        activeTenantId: null,
                        tenants: [],
                        isAuthenticated: false,
                        isLoading: false,
                    }));
                }
            } else {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        initAuth();
    }, [refreshTokens]);

    // Signup
    const signup = useCallback(async (data: SignupData) => {
        const response = await fetch(`${API_URL}/api/v1/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Signup failed');
        }

        const result = await response.json();

        setState(prev => ({
            ...prev,
            user: result.user,
            accessToken: result.accessToken,
            activeTenantId: result.activeTenantId,
            tenants: result.tenants || [],
            isAuthenticated: true,
            isLoading: false,
        }));

        localStorage.setItem('accessToken', result.accessToken);
        if (result.activeTenantId) {
            localStorage.setItem('activeTenantId', result.activeTenantId);
        }

        router.push('/dashboard');
    }, [router]);

    // Login
    const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, rememberMe }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const result = await response.json();

        setState(prev => ({
            ...prev,
            user: result.user,
            accessToken: result.accessToken,
            activeTenantId: result.activeTenantId,
            tenants: result.tenants || [],
            isAuthenticated: true,
            isLoading: false,
        }));

        localStorage.setItem('accessToken', result.accessToken);
        if (result.activeTenantId) {
            localStorage.setItem('activeTenantId', result.activeTenantId);
        }

        router.push('/dashboard');
    }, [router]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await apiRequest('/api/v1/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout API error:', error);
        }

        // Clear state regardless of API result
        localStorage.removeItem('accessToken');
        localStorage.removeItem('activeTenantId');

        setState({
            user: null,
            accessToken: null,
            activeTenantId: null,
            tenants: [],
            isLoading: false,
            isAuthenticated: false,
        });

        router.push('/login');
    }, [apiRequest, router]);

    // Switch tenant
    const switchTenant = useCallback(async (tenantId: string) => {
        const response = await apiRequest('/api/v1/auth/switch-tenant', {
            method: 'POST',
            body: JSON.stringify({ tenantId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to switch tenant');
        }

        const result = await response.json();

        setState(prev => ({
            ...prev,
            accessToken: result.accessToken,
            activeTenantId: result.activeTenantId,
            tenants: result.tenants || prev.tenants,
        }));

        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('activeTenantId', result.activeTenantId);

        // Refresh the current page to reload data for new tenant
        router.refresh();
    }, [apiRequest, router]);

    // Accept invitation
    const acceptInvite = useCallback(async (data: AcceptInviteData) => {
        const response = await fetch(`${API_URL}/api/v1/auth/accept-invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to accept invitation');
        }

        const result = await response.json();

        setState(prev => ({
            ...prev,
            user: result.user,
            accessToken: result.accessToken,
            activeTenantId: result.activeTenantId,
            tenants: result.tenants || [],
            isAuthenticated: true,
            isLoading: false,
        }));

        localStorage.setItem('accessToken', result.accessToken);
        if (result.activeTenantId) {
            localStorage.setItem('activeTenantId', result.activeTenantId);
        }

        router.push('/dashboard');
    }, [router]);

    const value: AuthContextType = {
        ...state,
        login,
        logout,
        signup,
        switchTenant,
        refreshTokens,
        acceptInvite,
        setToken,
        setActiveTenant,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Hook for pages that require authentication
export function useRequireAuth(redirectTo: string = '/login') {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(redirectTo);
        }
    }, [isAuthenticated, isLoading, redirectTo, router]);

    return { isAuthenticated, isLoading };
}

// Hook to get current active tenant
export function useActiveTenant() {
    const { activeTenantId, tenants } = useAuth();

    const activeTenant = tenants.find(t => t.id === activeTenantId);

    return {
        activeTenantId,
        activeTenant,
        tenants,
    };
}
