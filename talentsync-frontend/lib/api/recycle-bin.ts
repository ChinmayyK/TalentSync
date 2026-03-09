/**
 * Recycle Bin API Service
 * Handles soft-deleted items management with role-based access
 */

import { getApiBaseUrl } from '@/lib/api/client';

const API_BASE_URL = getApiBaseUrl();

export interface RecycleBinItem {
    id: string;
    tenantId: string;
    module: string;  // 'candidate', 'interview', 'file', 'template'
    itemId: string;
    itemSnapshot: any;
    deletedBy: string;
    deletedAt: string;
    restoredAt: string | null;
    purgedAt: string | null;
    expiresAt: string | null;
}

export interface RecycleBinStats {
    total: number;
    byModule: { module: string; count: number }[];
}

export interface RecycleBinListResponse {
    data: RecycleBinItem[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        lastPage: number;
    };
}

export interface RecycleBinFilters {
    module?: string;
    from?: string;
    to?: string;
    deletedBy?: string;
    page?: number;
    perPage?: number;
}

/**
 * List all soft-deleted items with role-based filtering
 */
export async function getRecycleBinItems(
    token: string,
    filters?: RecycleBinFilters
): Promise<RecycleBinListResponse> {
    const params = new URLSearchParams();
    if (filters?.module) params.append('module', filters.module);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.deletedBy) params.append('deletedBy', filters.deletedBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('perPage', filters.perPage.toString());

    const response = await fetch(
        `${API_BASE_URL}/api/v1/recycle-bin?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch recycle bin items');
    }

    return response.json();
}

/**
 * Get recycle bin statistics (counts by module)
 */
export async function getRecycleBinStats(token: string): Promise<RecycleBinStats> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recycle-bin/stats`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch recycle bin stats');
    }

    return response.json();
}

/**
 * Get single item details
 */
export async function getRecycleBinItem(id: string, token: string): Promise<RecycleBinItem> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recycle-bin/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch item');
    }

    return response.json();
}

/**
 * Restore a deleted item
 */
export async function restoreRecycleBinItem(id: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/api/v1/recycle-bin/${id}/restore`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to restore item');
    }

    return response.json();
}

/**
 * Permanently delete an item (admin only)
 */
export async function purgeRecycleBinItem(id: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/api/v1/recycle-bin/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to purge item');
    }

    return response.json();
}
