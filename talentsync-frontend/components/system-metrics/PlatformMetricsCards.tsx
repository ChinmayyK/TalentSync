"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, Clock, Building2, Users } from "lucide-react";
import type { PlatformMetrics } from "@/types/system-metrics";

interface PlatformMetricsCardsProps {
    data?: PlatformMetrics;
    isLoading?: boolean;
}

export function PlatformMetricsCards({ data, isLoading }: PlatformMetricsCardsProps) {
    const cards = [
        {
            title: "API Requests (24h)",
            value: data?.apiRequests24h?.toLocaleString() ?? "-",
            icon: Activity,
            description: "Total API calls",
            color: "text-blue-500",
        },
        {
            title: "Error Rate",
            value: data ? `${data.errorRate.toFixed(2)}%` : "-",
            icon: AlertTriangle,
            description: "4xx/5xx responses",
            color: data && data.errorRate > 5 ? "text-red-500" : "text-green-500",
        },
        {
            title: "P95 Latency",
            value: data ? `${data.p95Latency}ms` : "-",
            icon: Clock,
            description: "95th percentile response time",
            color: data && data.p95Latency > 500 ? "text-yellow-500" : "text-green-500",
        },
        {
            title: "Active Tenants (7d)",
            value: data?.activeTenants7d?.toLocaleString() ?? "-",
            icon: Building2,
            description: "Unique tenants this week",
            color: "text-purple-500",
        },
        {
            title: "Active Users (7d)",
            value: data?.activeUsers7d?.toLocaleString() ?? "-",
            icon: Users,
            description: "Unique users this week",
            color: "text-indigo-500",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {cards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">
                            {card.title}
                        </CardTitle>
                        <card.icon className={`h-4 w-4 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {card.description}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
