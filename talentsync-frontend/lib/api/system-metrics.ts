import { client } from "./client";
import type {
    PlatformMetrics,
    QueueMetrics,
    CommunicationMetrics,
    SchedulingMetrics,
    TenantUsageMetrics,
} from "@/types/system-metrics";

const BASE_PATH = "/system-metrics";

/**
 * Get platform-wide metrics
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
    return client.get<PlatformMetrics>(`${BASE_PATH}/platform`);
}

/**
 * Get queue health and job metrics
 */
export async function getQueueMetrics(): Promise<QueueMetrics[]> {
    return client.get<QueueMetrics[]>(`${BASE_PATH}/queues`);
}

/**
 * Get communication/messaging metrics
 */
export async function getCommunicationMetrics(): Promise<CommunicationMetrics> {
    return client.get<CommunicationMetrics>(`${BASE_PATH}/communication`);
}

/**
 * Get scheduling/interview metrics
 */
export async function getSchedulingMetrics(): Promise<SchedulingMetrics> {
    return client.get<SchedulingMetrics>(`${BASE_PATH}/scheduling`);
}

/**
 * Get per-tenant usage metrics
 */
export async function getTenantUsageMetrics(): Promise<TenantUsageMetrics[]> {
    return client.get<TenantUsageMetrics[]>(`${BASE_PATH}/tenant-usage`);
}
