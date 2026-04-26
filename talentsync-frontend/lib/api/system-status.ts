import { client } from './client';

// Types
export interface SystemStatus {
    status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
    uptimePercentage: number;
    activeIncidentCount: number;
    componentCount: number;
    timestamp: string;
}

export interface ComponentWithStatus {
    id: string;
    key: string;
    name: string;
    description: string | null;
    category: string | null;
    order: number;
    isMonitored: boolean;
    currentStatus: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
    lastCheckedAt: string | null;
    lastLatencyMs: number | null;
}

export interface DailyUptime {
    date: string;
    status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
    uptimePercentage: number;
    checksCount: number;
}

export interface UptimeData {
    componentId: string;
    componentKey: string;
    period: string;
    uptimePercentage: number;
    totalChecks: number;
    successfulChecks: number;
    dailyData: DailyUptime[];
}

export interface IncidentComponent {
    id: string;
    key: string;
    name: string;
    impactLevel: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
}

export interface IncidentUpdate {
    id: string;
    status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
    message: string;
    createdAt: string;
}

export interface Incident {
    id: string;
    title: string;
    status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    startedAt: string;
    resolvedAt: string | null;
    components: IncidentComponent[];
    updates: IncidentUpdate[];
}

export interface CreateIncidentDto {
    title: string;
    severity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
    componentIds: string[];
    impactLevel?: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE';
    message: string;
}

export interface UpdateIncidentDto {
    title?: string;
    severity?: 'MINOR' | 'MAJOR' | 'CRITICAL';
    status?: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
}

export interface AddIncidentUpdateDto {
    status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
    message: string;
}

// Public API functions (no auth required)
export async function getSystemStatus(): Promise<SystemStatus> {
    return client.get<SystemStatus>('/status');
}

export async function getComponents(): Promise<ComponentWithStatus[]> {
    return client.get<ComponentWithStatus[]>('/status/components');
}

export async function getComponentUptime(componentId: string, period: '24h' | '7d' | '30d' | '90d' = '90d'): Promise<UptimeData> {
    return client.get<UptimeData>(`/status/uptime/${componentId}`, { params: { period } });
}

export async function getIncidents(days = 7): Promise<Incident[]> {
    return client.get<Incident[]>('/status/incidents', { params: { days } });
}

export async function getIncidentById(id: string): Promise<Incident> {
    return client.get<Incident>(`/status/incidents/${id}`);
}

export async function getIncidentsByDate(days = 7): Promise<Record<string, Incident[]>> {
    return client.get<Record<string, Incident[]>>('/status/incidents-by-date', { params: { days } });
}

// Admin API functions (auth required)
export async function runHealthChecks(): Promise<unknown> {
    return client.post('/status/admin/run-checks');
}

export async function createIncident(dto: CreateIncidentDto): Promise<Incident> {
    return client.post<Incident>('/status/admin/incidents', dto);
}

export async function updateIncident(id: string, dto: UpdateIncidentDto): Promise<Incident> {
    return client.patch<Incident>(`/status/admin/incidents/${id}`, dto);
}

export async function addIncidentUpdate(id: string, dto: AddIncidentUpdateDto): Promise<Incident> {
    return client.post<Incident>(`/status/admin/incidents/${id}/updates`, dto);
}

export async function deleteIncident(id: string): Promise<void> {
    await client.delete(`/status/admin/incidents/${id}`);
}

export async function overrideComponentStatus(
    id: string,
    status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE' | null
): Promise<ComponentWithStatus> {
    return client.patch<ComponentWithStatus>(`/status/admin/components/${id}/override`, { status });
}

export async function clearComponentOverride(id: string): Promise<ComponentWithStatus> {
    return client.delete<ComponentWithStatus>(`/status/admin/components/${id}/override`);
}
