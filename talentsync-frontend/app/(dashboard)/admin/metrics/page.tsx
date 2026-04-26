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
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

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
        <motion.div
            className="px-8 py-6 h-full space-y-6"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
        >
            {/* Admin Access Badge */}
            <motion.div variants={fadeInUp}>
                <Alert className="border-blue-200 bg-blue-50">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Admin Access</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        This page displays system-wide metrics. Only administrators can view this data.
                    </AlertDescription>
                </Alert>
            </motion.div>

            {/* Header */}
            <motion.div variants={fadeInUp}>
                <MetricsHeader />
            </motion.div>

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
            <motion.div variants={staggerItem}>
                <PlatformMetricsCards
                    data={platformMetrics.data}
                    isLoading={platformMetrics.isLoading}
                />
            </motion.div>

            {/* Tabbed Sections */}
            <motion.div variants={staggerItem}>
                <Tabs defaultValue="queues" className="space-y-4">
                    <TabsList className="grid grid-cols-4 w-full max-w-lg">
                        <TabsTrigger value="queues">Queues</TabsTrigger>
                        <TabsTrigger value="communication">Communication</TabsTrigger>
                        <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
                        <TabsTrigger value="tenants">Tenants</TabsTrigger>
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
            </motion.div>
        </motion.div>
    );
}
