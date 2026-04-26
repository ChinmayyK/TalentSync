"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { QueueMetrics } from "@/types/system-metrics";

interface QueueMetricsCardsProps {
    data?: QueueMetrics[];
    isLoading?: boolean;
}

const queueDisplayNames: Record<string, string> = {
    email: "Email Queue",
    whatsapp: "WhatsApp Queue",
    sms: "SMS Queue",
    automation: "Automation Queue",
    scheduler: "Scheduler Queue",
    "communication-dlq": "Dead Letter Queue",
};

export function QueueMetricsCards({ data, isLoading }: QueueMetricsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-32" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No queue data available
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((queue) => {
                const hasBacklog = queue.waiting > 100;
                const hasFailures = queue.failed24h > 0;

                return (
                    <Card key={queue.queue}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium">
                                    {queueDisplayNames[queue.queue] || queue.queue}
                                </CardTitle>
                                {hasBacklog && (
                                    <Badge variant="destructive" className="text-xs">
                                        Backlog
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Avg job duration: {queue.avgJobDurationMs}ms
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Waiting</p>
                                    <p className={`text-lg font-semibold ${hasBacklog ? "text-yellow-500" : ""}`}>
                                        {queue.waiting}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Active</p>
                                    <p className="text-lg font-semibold text-blue-500">
                                        {queue.active}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Completed (24h)</p>
                                    <p className="text-lg font-semibold text-green-500">
                                        {queue.completed24h}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Failed (24h)</p>
                                    <p className={`text-lg font-semibold ${hasFailures ? "text-red-500" : ""}`}>
                                        {queue.failed24h}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
