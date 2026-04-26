'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { mockTenants } from '@/lib/navigation-mock-data';

interface TenantContextType {
    currentTenantId: string;
    currentTenant: { id: string; name: string; logo?: string } | undefined;
    setCurrentTenantId: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({
    children,
    initialTenantId = 'tenant_123'
}: {
    children: React.ReactNode;
    initialTenantId?: string;
}) {
    const [currentTenantId, setCurrentTenantIdState] = useState(initialTenantId);

    const currentTenant = mockTenants.find(t => t.id === currentTenantId);

    const setCurrentTenantId = useCallback((tenantId: string) => {
        setCurrentTenantIdState(tenantId);
    }, []);

    return (
        <TenantContext.Provider value={{ currentTenantId, currentTenant, setCurrentTenantId }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}

// Helper to filter data by tenant
export function filterByTenant<T extends { tenantId?: string }>(
    data: T[],
    tenantId: string
): T[] {
    return data.filter(item => item.tenantId === tenantId);
}
