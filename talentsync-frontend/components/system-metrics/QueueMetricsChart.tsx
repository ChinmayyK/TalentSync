"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import type { QueueMetrics } from "@/types/system-metrics";

interface QueueMetricsChartProps {
    data?: QueueMetrics[];
    isLoading?: boolean;
}

const queueShortNames: Record<string, string> = {
    email: "Email",
    whatsapp: "WhatsApp",
    sms: "SMS",
    automation: "Auto",
    scheduler: "Scheduler",
    "communication-dlq": "DLQ",
};

export function QueueMetricsChart({ data, isLoading }: QueueMetricsChartProps) {
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Queue Job Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    const chartData = data?.map((queue) => ({
        name: queueShortNames[queue.queue] || queue.queue,
        waiting: queue.waiting,
        active: queue.active,
        completed: queue.completed24h,
        failed: queue.failed24h,
    })) || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Queue Job Distribution (24h)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <YAxis
                                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                }}
                                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                            />
                            <Legend />
                            <Bar dataKey="waiting" fill="#facc15" name="Waiting" />
                            <Bar dataKey="active" fill="#3b82f6" name="Active" />
                            <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                            <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
