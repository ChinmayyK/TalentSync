// System Metrics Types

export interface PlatformMetrics {
    apiRequests24h: number;
    errorRate: number;
    p95Latency: number;
    activeTenants7d: number;
    activeUsers7d: number;
}

export interface QueueMetrics {
    queue: string;
    waiting: number;
    active: number;
    completed24h: number;
    failed24h: number;
    avgJobDurationMs: number;
}

export interface CommunicationMetrics {
    messagesToday: number;
    successRate: number;
    failedCount: number;
    channelBreakdown: {
        email: number;
        whatsapp: number;
        sms: number;
    };
    topTemplates: {
        templateName: string;
        usageCount: number;
    }[];
    recentFailures: {
        id: string;
        channel: string;
        recipientEmail?: string;
        recipientPhone?: string;
        status: string;
        failedAt?: string;
        metadata?: Record<string, unknown>;
    }[];
}

export interface SchedulingMetrics {
    interviewsToday: number;
    rescheduledToday: number;
    cancelledToday: number;
    availabilityEngineAvgMs: number;
    avgTimeToFirstInterviewHours: number;
}

export interface TenantUsageMetrics {
    tenantId: string;
    tenantName: string;
    candidates: number;
    interviews: number;
    messageVolume30d: number;
    storageUsedMb: number;
}
