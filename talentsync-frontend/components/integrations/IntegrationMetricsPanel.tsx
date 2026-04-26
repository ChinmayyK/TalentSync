import { useState, useEffect } from 'react';
import { IntegrationMetrics } from '@/types/integrations';
import { getMetrics } from '@/lib/api/integrations';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Activity, Layers, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface IntegrationMetricsPanelProps {
  integrationId: string;
  provider: string;
  isLoading?: boolean;
}

const defaultMetrics: IntegrationMetrics = {
  integrationId: '',
  period: 'Last 7 days',
  totalSyncs: 0,
  successfulSyncs: 0,
  failedSyncs: 0,
  successRate: 0,
  avgLatencyMs: 0,
  recordsProcessed: 0,
  queuedJobs: 0,
  lastError: undefined,
};

export function IntegrationMetricsPanel({ integrationId, provider, isLoading: propIsLoading }: IntegrationMetricsPanelProps) {
  const [metrics, setMetrics] = useState<IntegrationMetrics>(defaultMetrics);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      try {
        const data = await getMetrics(provider);
        if (data) setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMetrics();
  }, [provider]);

  if (isLoading || propIsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const metricsCards = [
    {
      label: 'Success Rate',
      value: `${metrics.successRate}%`,
      icon: CheckCircle,
      color: metrics.successRate >= 95 ? 'text-emerald-600' : metrics.successRate >= 80 ? 'text-amber-500' : 'text-destructive',
      bgColor: metrics.successRate >= 95 ? 'bg-emerald-50' : metrics.successRate >= 80 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      label: 'Successful Syncs',
      value: metrics.successfulSyncs.toLocaleString(),
      icon: CheckCircle,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
    },
    {
      label: 'Failed Syncs',
      value: metrics.failedSyncs.toLocaleString(),
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/5',
    },
    {
      label: 'Avg Latency',
      value: `${metrics.avgLatencyMs}ms`,
      icon: Clock,
      color: metrics.avgLatencyMs < 500 ? 'text-emerald-600' : 'text-amber-500',
      bgColor: metrics.avgLatencyMs < 500 ? 'bg-emerald-50' : 'bg-amber-50',
    },
    {
      label: 'Records Processed',
      value: metrics.recordsProcessed.toLocaleString(),
      icon: Layers,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
    },
    {
      label: 'Queued Jobs',
      value: metrics.queuedJobs.toLocaleString(),
      icon: Activity,
      color: metrics.queuedJobs > 10 ? 'text-amber-500' : 'text-muted-foreground',
      bgColor: metrics.queuedJobs > 10 ? 'bg-amber-50' : 'bg-muted/50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Health Metrics</h3>
          <p className="text-sm text-muted-foreground">{metrics.period}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metricsCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                "p-4 rounded-lg border border-border",
                metric.bgColor
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-4 w-4", metric.color)} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </span>
              </div>
              <p className={cn("text-2xl font-bold", metric.color)}>{metric.value}</p>
            </div>
          );
        })}
      </div>

      {/* Success Rate Progress */}
      <div className="p-4 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Health</span>
          <span className={cn(
            "text-sm font-semibold",
            metrics.successRate >= 95 ? 'text-emerald-600' : metrics.successRate >= 80 ? 'text-amber-500' : 'text-destructive'
          )}>
            {metrics.successRate}%
          </span>
        </div>
        <Progress
          value={metrics.successRate}
          className={cn(
            "h-2",
            metrics.successRate >= 95 ? '[&>div]:bg-emerald-500' : metrics.successRate >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive'
          )}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{metrics.successfulSyncs} successful</span>
          <span>{metrics.failedSyncs} failed</span>
        </div>
      </div>

      {/* Last Error */}
      {metrics.lastError && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Last Error</p>
            <p className="text-sm text-amber-700 mt-0.5">{metrics.lastError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
