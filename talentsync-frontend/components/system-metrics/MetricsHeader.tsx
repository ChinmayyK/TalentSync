"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface MetricsHeaderProps {
    onRefresh?: () => void;
}

export function MetricsHeader({ onRefresh }: MetricsHeaderProps) {
    const queryClient = useQueryClient();

    const handleRefresh = () => {
        // Invalidate all system metrics queries
        queryClient.invalidateQueries({ queryKey: ["system-metrics"] });
        onRefresh?.();
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Metrics</h1>
                <p className="text-muted-foreground mt-1">
                    Real-time platform analytics and monitoring
                </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="w-full sm:w-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All
            </Button>
        </div>
    );
}
