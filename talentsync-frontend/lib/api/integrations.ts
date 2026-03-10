import { client } from './client';
import {
    Integration,
    FieldMapping,
    IntegrationConfig,
    SyncDirection,
    ConflictResolution,
    WebhookEvent,
    IntegrationMetrics,
    IntegrationField,
} from '@/types/integrations';

// =============================================================================
// Types
// =============================================================================

export interface IntegrationListResponse {
    integrations: Integration[];
}

export interface IntegrationResponse {
    integration: Integration;
}

export interface ConnectResponse {
    authUrl: string;
    provider: string;
}

export interface DisconnectResponse {
    success: boolean;
    message: string;
}

export interface SyncResponse {
    success: boolean;
    message: string;
    jobId?: string;
}

export interface MappingUpdatePayload {
    provider: string;
    mappings: Array<{
        sourceField: string;
        targetField: string;
        transform?: string;
    }>;
    direction: SyncDirection;
}

export interface ConfigUpdatePayload {
    syncDirection?: SyncDirection;
    syncCadence?: string;
    conflictResolution?: ConflictResolution;
    enableWebhooks?: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all integrations for the current tenant
 */
export async function getIntegrations(): Promise<Integration[]> {
    try {
        const response = await client.get<Integration[]>('/integrations');
        return response || [];
    } catch (error) {
        throw error;
    }
}

/**
 * Get a specific integration by provider
 */
export async function getIntegration(provider: string): Promise<Integration | null> {
    try {
        const response = await client.get<Integration>(`/integrations/${provider}`);
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Initiate OAuth connection flow for a provider
 * Returns the authorization URL to redirect the user to
 */
export async function connect(provider: string): Promise<ConnectResponse> {
    try {
        const response = await client.post<ConnectResponse>('/integrations/connect', {
            provider,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Disconnect an integration
 */
export async function disconnect(provider: string): Promise<DisconnectResponse> {
    try {
        const response = await client.post<DisconnectResponse>('/integrations/disconnect', {
            provider,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Update field mappings for an integration
 */
export async function updateMapping(
    provider: string,
    mappings: MappingUpdatePayload['mappings'],
    direction: SyncDirection = 'bidirectional'
): Promise<{ success: boolean }> {
    try {
        const response = await client.post<{ success: boolean }>('/integrations/mapping', {
            provider,
            mappings,
            direction,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Trigger a manual sync for an integration
 * @param provider - Integration provider (e.g., 'zoho')
 * @param since - Optional: Only sync records modified after this date
 * @param module - Optional: For Zoho, specify 'leads' or 'contacts'
 */
export async function triggerSync(
    provider: string,
    since?: Date,
    module?: 'leads' | 'contacts' | 'both'
): Promise<SyncResponse> {
    try {
        const response = await client.post<SyncResponse>('/integrations/sync', {
            provider,
            since: since?.toISOString(),
            module, // Pass module for Zoho
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Update integration configuration (sync settings, zohoModule, etc.)
 */
export async function updateConfig(
    provider: string,
    config: IntegrationConfig
): Promise<{ success: boolean }> {
    try {
        const response = await client.post<{ success: boolean }>('/integrations/config', {
            provider,
            config,
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Get webhook events for an integration
 */
export async function getWebhookEvents(
    provider: string,
    limit: number = 50
): Promise<{ events: WebhookEvent[] }> {
    try {
        const response = await client.get<{ events: WebhookEvent[] }>(`/integrations/${provider}/webhooks`, {
            params: { limit },
        });
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Get sync metrics for an integration
 */
export async function getMetrics(provider: string): Promise<IntegrationMetrics | null> {
    try {
        const response = await client.get<IntegrationMetrics>(`/integrations/${provider}/metrics`);
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Get field schemas for mapping configuration
 */
export async function getFieldSchemas(provider: string): Promise<{
    sourceFields: IntegrationField[];
    targetFields: IntegrationField[];
    mappings: FieldMapping[];
}> {
    try {
        const response = await client.get<{
            sourceFields: IntegrationField[];
            targetFields: IntegrationField[];
            mappings: FieldMapping[];
        }>(`/integrations/${provider}/fields`);
        return response;
    } catch (error) {
        throw error;
    }
}

/**
 * Get sync logs for an integration (for audit/logs tab)
 */
export async function getSyncLogs(provider: string, limit = 50, status?: string): Promise<Array<{
    id: string;
    eventType: string;
    direction: string;
    entityType: string;
    entityId?: string;
    externalId?: string;
    status: string;
    errorMessage?: string;
    retryCount: number;
    createdAt: string;
    completedAt?: string;
}>> {
    try {
        const params: { limit: number; status?: string } = { limit };
        if (status) params.status = status;
        const response = await client.get(`/integrations/${provider}/logs`, { params });
        return response as any;
    } catch (error) {
        throw error;
    }
}

/**
 * Get available providers that can be connected
 */
export function getAvailableProviders() {
    return [
        {
            id: 'zoho',
            name: 'Zoho Recruit',
            description: 'Sync candidates and jobs with Zoho Recruit ATS',
            category: 'ats',
            authType: 'oauth2' as const,
            icon: 'ZH',
            color: 'bg-red-500',
        },
        {
            id: 'google_calendar',
            name: 'Google Calendar',
            description: 'Sync interview schedules with Google Calendar',
            category: 'calendar',
            authType: 'oauth2' as const,
            icon: 'GC',
            color: 'bg-blue-500',
        },
        {
            id: 'outlook_calendar',
            name: 'Outlook Calendar',
            description: 'Sync interview schedules with Microsoft Outlook',
            category: 'calendar',
            authType: 'oauth2' as const,
            icon: 'OC',
            color: 'bg-sky-600',
        },
        {
            id: 'salesforce',
            name: 'Salesforce',
            description: 'Sync candidates and jobs with Salesforce CRM',
            category: 'crm',
            authType: 'oauth2' as const,
            icon: 'SF',
            color: 'bg-blue-600',
        },
        {
            id: 'hubspot',
            name: 'HubSpot',
            description: 'Sync contacts and deals with HubSpot CRM',
            category: 'crm',
            authType: 'oauth2' as const,
            icon: 'HS',
            color: 'bg-orange-500',
        },
        {
            id: 'greenhouse',
            name: 'Greenhouse',
            description: 'Import candidates and applications from Greenhouse ATS',
            category: 'ats',
            authType: 'api_key' as const,
            icon: 'GH',
            color: 'bg-emerald-500',
        },
        {
            id: 'lever',
            name: 'Lever',
            description: 'Sync opportunities and postings with Lever ATS',
            category: 'ats',
            authType: 'oauth2' as const,
            icon: 'LV',
            color: 'bg-green-500',
        },
        {
            id: 'workday',
            name: 'Workday',
            description: 'Sync employee and position data with Workday HCM',
            category: 'hcm',
            authType: 'oauth2' as const,
            icon: 'WD',
            color: 'bg-indigo-500',
        },
        {
            id: 'bamboohr',
            name: 'BambooHR',
            description: 'Create employee records when candidates are hired',
            category: 'hris',
            authType: 'oauth2' as const,
            icon: 'BB',
            color: 'bg-lime-600',
        },
    ];
}

