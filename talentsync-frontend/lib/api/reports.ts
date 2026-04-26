import { client } from './client';

export type ReportType =
    | 'overview'
    | 'funnel'
    | 'time-to-hire'
    | 'interviewer-load'
    | 'source-performance'
    | 'stage-metrics';

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

export interface ScheduledReport {
    id: string;
    tenantId: string;
    reportType: ReportType;
    frequency: ScheduleFrequency;
    recipients: string[];
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    name?: string;
    isActive: boolean;
    lastRunAt?: string;
    nextRunAt?: string;
    createdAt: string;
    createdById: string;
}

export interface CreateScheduledReportDto {
    reportType: ReportType;
    frequency: ScheduleFrequency;
    recipients: string[];
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    name?: string;
}

// ─── Report Data Types ───────────────────────────────────────────────────────

export interface OverviewReport {
    funnel: FunnelStage[];
    timeToHireTrend: any[];
    stageDuration: any[];
    offerBreakdown: any[];
    interviewerLoad: InterviewerLoadData[];
    totalCandidates: number;
    activeInterviews: number;
    completedThisWeek: number;
    pendingFeedback: number;
}

export interface FunnelStage {
    stage: string;
    count: number;
    percentage?: number;
}

export interface TimeToHireData {
    averageDays: number;
    byStage?: {
        stage: string;
        averageDays: number;
    }[];
}

export interface InterviewerLoadData {
    interviewerId: string;
    interviewerName: string;
    totalInterviews: number;
    thisWeek: number;
    thisMonth: number;
    pendingFeedback: number;
}

// ─── Report Data API Functions ───────────────────────────────────────────────

export async function getOverview(refresh = false): Promise<OverviewReport> {
    const params = refresh ? { refresh: 'true' } : undefined;
    return client.get<OverviewReport>('/reports/overview', { params });
}

export async function getFunnel(refresh = false): Promise<FunnelStage[]> {
    const params = refresh ? { refresh: 'true' } : undefined;
    return client.get<FunnelStage[]>('/reports/funnel', { params });
}

export async function getTimeToHire(refresh = false): Promise<TimeToHireData> {
    const params = refresh ? { refresh: 'true' } : undefined;
    return client.get<TimeToHireData>('/reports/time-to-hire', { params });
}

export async function getInterviewerLoad(refresh = false): Promise<InterviewerLoadData[]> {
    const params = refresh ? { refresh: 'true' } : undefined;
    return client.get<InterviewerLoadData[]>('/reports/interviewer-load', { params });
}

// ─── Export Functions ────────────────────────────────────────────────────────

// Helper to get dynamic API URL (same as client.ts)
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:3001`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

import { getAuthToken } from "@/lib/auth";
import DOMPurify from 'dompurify';

export async function exportReportCsv(reportType: ReportType): Promise<void> {
    const apiUrl = getApiBaseUrl();
    const token = getAuthToken();

    // Use correct API path structure (api/v1 prefix and path param)
    const response = await fetch(`${apiUrl}/api/v1/reports/export/csv/${reportType}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to export CSV: ${response.statusText} (${response.status}) - ${errorText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export async function exportReportPdf(reportType: ReportType): Promise<void> {
    const apiUrl = getApiBaseUrl();
    const token = getAuthToken();

    // Use correct API path structure (api/v1 prefix and path param)
    const response = await fetch(`${apiUrl}/api/v1/reports/export/pdf/${reportType}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to export PDF: ${response.statusText} (${response.status}) - ${errorText}`);
    }

    const html = await response.text();

    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = typeof window !== 'undefined'
        ? DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true })
        : html;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(sanitizedHtml);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }
}

// ─── Scheduled Reports API ───────────────────────────────────────────────────

export async function getScheduledReports(): Promise<ScheduledReport[]> {
    return client.get<ScheduledReport[]>('/reports/schedules');
}

export async function createScheduledReport(dto: CreateScheduledReportDto): Promise<ScheduledReport> {
    return client.post<ScheduledReport>('/reports/schedules', dto);
}

export async function deleteScheduledReport(id: string): Promise<void> {
    await client.delete(`/reports/schedules/${id}`);
}

export async function toggleScheduledReport(id: string): Promise<ScheduledReport> {
    return client.post<ScheduledReport>(`/reports/schedules/${id}/toggle`);
}
