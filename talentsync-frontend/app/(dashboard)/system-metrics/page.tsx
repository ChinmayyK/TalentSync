"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { MetricsHeader } from "@/components/system-metrics/MetricsHeader";
import { PlatformMetricsCards } from "@/components/system-metrics/PlatformMetricsCards";
import { QueueMetricsCards } from "@/components/system-metrics/QueueMetricsCards";
import { QueueMetricsChart } from "@/components/system-metrics/QueueMetricsChart";
import { CommunicationStats } from "@/components/system-metrics/CommunicationStats";
import { SchedulingStats } from "@/components/system-metrics/SchedulingStats";
import { TenantUsageTable } from "@/components/system-metrics/TenantUsageTable";
import {
    usePlatformMetrics,
    useQueueMetrics,
    useCommunicationMetrics,
    useSchedulingMetrics,
    useTenantUsageMetrics,
} from "@/hooks/useSystemMetrics";

export default function SystemMetricsPage() {
    const platformMetrics = usePlatformMetrics();
    const queueMetrics = useQueueMetrics();
    const communicationMetrics = useCommunicationMetrics();
    const schedulingMetrics = useSchedulingMetrics();
    const tenantUsageMetrics = useTenantUsageMetrics();

    // Check for any errors
    const hasError = platformMetrics.error || queueMetrics.error ||
        communicationMetrics.error || schedulingMetrics.error ||
        tenantUsageMetrics.error;

    return (
        <div className="p-4 md:p-8 h-full space-y-6">
            {/* Admin Access Badge */}
            <Alert className="mb-6 bg-blue-50 border-blue-200">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-900 font-semibold">Admin Access</AlertTitle>
                <AlertDescription className="text-blue-700">
                    You have full system visibility.
                </AlertDescription>
            </Alert>

            {/* Header */}
            <MetricsHeader />

            {/* Error Banner */}
            {hasError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Metrics</AlertTitle>
                    <AlertDescription>
                        Some metrics failed to load. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
            )}

            {/* Platform Metrics Cards */}
            <PlatformMetricsCards
                data={platformMetrics.data}
                isLoading={platformMetrics.isLoading}
            />

            {/* Tabbed Sections */}
            <Tabs defaultValue="queues" className="space-y-4">
                <TabsList className="w-full h-auto p-1 bg-muted/50 grid grid-cols-2 sm:grid-cols-4 gap-1">
                    <TabsTrigger value="queues" className="text-xs sm:text-sm">Queues</TabsTrigger>
                    <TabsTrigger value="communication" className="text-xs sm:text-sm">Communication</TabsTrigger>
                    <TabsTrigger value="scheduling" className="text-xs sm:text-sm">Scheduling</TabsTrigger>
                    <TabsTrigger value="tenants" className="text-xs sm:text-sm">Tenants</TabsTrigger>
                </TabsList>

                <TabsContent value="queues" className="space-y-4">
                    <QueueMetricsChart
                        data={queueMetrics.data}
                        isLoading={queueMetrics.isLoading}
                    />
                    <QueueMetricsCards
                        data={queueMetrics.data}
                        isLoading={queueMetrics.isLoading}
                    />
                </TabsContent>

                <TabsContent value="communication">
                    <CommunicationStats
                        data={communicationMetrics.data}
                        isLoading={communicationMetrics.isLoading}
                    />
                </TabsContent>

                <TabsContent value="scheduling">
                    <SchedulingStats
                        data={schedulingMetrics.data}
                        isLoading={schedulingMetrics.isLoading}
                    />
                </TabsContent>

                <TabsContent value="tenants">
                    <TenantUsageTable
                        data={tenantUsageMetrics.data}
                        isLoading={tenantUsageMetrics.isLoading}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
