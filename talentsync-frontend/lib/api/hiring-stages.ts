/**
 * API client for hiring stages management
 */
import { client } from './client';

export interface HiringStage {
    id: string;
    tenantId: string;
    name: string;
    key: string;
    order: number;
    color: string | null;
    isActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateHiringStageDto {
    name: string;
    key: string;
    color?: string;
    isDefault?: boolean;
}

export interface UpdateHiringStageDto {
    name?: string;
    color?: string;
    isActive?: boolean;
    isDefault?: boolean;
}

/**
 * Get all hiring stages for the tenant
 */
export async function getHiringStages(includeInactive = false): Promise<HiringStage[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return client.get(`/settings/stages${params}`);
}

/**
 * Get a single hiring stage by ID
 */
export async function getHiringStage(id: string): Promise<HiringStage> {
    return client.get(`/settings/stages/${id}`);
}

/**
 * Create a new hiring stage
 */
export async function createHiringStage(dto: CreateHiringStageDto): Promise<HiringStage> {
    return client.post('/settings/stages', dto);
}

/**
 * Update a hiring stage
 */
export async function updateHiringStage(id: string, dto: UpdateHiringStageDto): Promise<HiringStage> {
    return client.put(`/settings/stages/${id}`, dto);
}

/**
 * Reorder hiring stages
 */
export async function reorderHiringStages(stageIds: string[]): Promise<HiringStage[]> {
    return client.patch('/settings/stages/reorder', { stageIds });
}

/**
 * Toggle a hiring stage's active status
 */
export async function toggleHiringStage(id: string): Promise<HiringStage> {
    return client.patch(`/settings/stages/${id}/toggle`, {});
}

/**
 * Delete a hiring stage
 */
export async function deleteHiringStage(id: string): Promise<{ success: boolean }> {
    return client.delete(`/settings/stages/${id}`);
}
