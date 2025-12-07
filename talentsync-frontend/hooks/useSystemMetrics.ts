"use client";

import { useQuery } from "@tanstack/react-query";
import {
    getPlatformMetrics,
    getQueueMetrics,
    getCommunicationMetrics,
    getSchedulingMetrics,
    getTenantUsageMetrics,
} from "@/lib/api/system-metrics";

/**
 * Hook to fetch platform-wide metrics
 */
export function usePlatformMetrics() {
    return useQuery({
        queryKey: ["system-metrics", "platform"],
        queryFn: getPlatformMetrics,
        refetchInterval: 30000, // Refresh every 30 seconds
        staleTime: 15000,
    });
}

/**
 * Hook to fetch queue health metrics
 */
export function useQueueMetrics() {
    return useQuery({
        queryKey: ["system-metrics", "queues"],
        queryFn: getQueueMetrics,
        refetchInterval: 10000, // Refresh every 10 seconds for real-time queue monitoring
        staleTime: 5000,
    });
}

/**
 * Hook to fetch communication/messaging metrics
 */
export function useCommunicationMetrics() {
    return useQuery({
        queryKey: ["system-metrics", "communication"],
        queryFn: getCommunicationMetrics,
        refetchInterval: 60000, // Refresh every minute
        staleTime: 30000,
    });
}

/**
 * Hook to fetch scheduling/interview metrics
 */
export function useSchedulingMetrics() {
    return useQuery({
        queryKey: ["system-metrics", "scheduling"],
        queryFn: getSchedulingMetrics,
        refetchInterval: 60000,
        staleTime: 30000,
    });
}

/**
 * Hook to fetch per-tenant usage metrics
 */
export function useTenantUsageMetrics() {
    return useQuery({
        queryKey: ["system-metrics", "tenant-usage"],
        queryFn: getTenantUsageMetrics,
        refetchInterval: 300000, // Refresh every 5 minutes
        staleTime: 120000,
    });
}
