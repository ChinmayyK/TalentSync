import { useState, useEffect } from 'react';
import { getSyncLogs } from '@/lib/api/integrations';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, RotateCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SyncLog {
    id: string;
    eventType: string;
    direction: string;
    entityType: string;
    entityId?: string;
    externalId?: string;
    status: string;
    errorMessage?: string;
    retryCount: number;
    createdAt: string;
    completedAt?: string;
}

interface SyncLogsPanelProps {
    integrationId: string;
    provider: string;
}

export function SyncLogsPanel({ integrationId, provider }: SyncLogsPanelProps) {
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const loadLogs = async () => {
            setIsLoading(true);
            try {
                const status = statusFilter !== 'all' ? statusFilter : undefined;
                const data = await getSyncLogs(provider, 50, status);
                setLogs(data || []);
            } catch (err) {
                console.error('Failed to load sync logs:', err);
                setLogs([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadLogs();
    }, [provider, statusFilter]);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
            SUCCESS: { variant: 'default', icon: CheckCircle },
            FAILED: { variant: 'destructive', icon: XCircle },
            PENDING: { variant: 'secondary', icon: Clock },
            IN_PROGRESS: { variant: 'secondary', icon: RotateCw },
            RETRYING: { variant: 'outline', icon: RotateCw },
        };
        const config = variants[status] || { variant: 'secondary' as const, icon: Clock };
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {status}
            </Badge>
        );
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Sync Logs</h3>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No sync logs found
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={cn(
                                "border rounded-lg p-3 transition-colors",
                                log.status === 'FAILED' && "border-destructive/30 bg-destructive/5"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(log.status)}
                                    <span className="font-medium text-sm">{log.eventType}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {log.entityType}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(log.createdAt)}
                                    </span>
                                    {log.errorMessage && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                        >
                                            {expandedId === log.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {expandedId === log.id && log.errorMessage && (
                                <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                                    <p className="font-medium text-destructive mb-1">Error Details:</p>
                                    <p className="text-muted-foreground">{log.errorMessage}</p>
                                    {log.retryCount > 0 && (
                                        <p className="text-xs mt-2 text-muted-foreground">
                                            Retry attempts: {log.retryCount}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
