import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Calendar, CheckCircle, Clock, Timer, ThumbsUp, TrendingDown as TrendingDownIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportKPI } from '@/types/reports';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'calendar': Calendar,
  'check-circle': CheckCircle,
  'clock': Clock,
  'timer': Timer,
  'thumbs-up': ThumbsUp,
  'trending-down': TrendingDownIcon,
};

interface ReportsKPICardProps {
  kpi: ReportKPI;
  isLoading?: boolean;
}

function ReportsKPICard({ kpi, isLoading }: ReportsKPICardProps) {
  const Icon = iconMap[kpi.icon] || Calendar;
  const isPositive = kpi.trend >= 0;
  // For metrics where lower is better (drop-off, time-to-hire), invert the color logic
  const isGoodTrend = kpi.label.includes('Drop-off') || kpi.label.includes('Time-to-Hire') 
    ? kpi.trend < 0 
    : kpi.trend >= 0;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-8 w-20" />
        <Skeleton className="mt-3 h-4 w-28" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-5 transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {kpi.label}
        </span>
        <div className="p-2 rounded-lg bg-primary/5">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-4">
        <span className="text-2xl font-bold text-foreground tracking-tight">{kpi.value}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp className={cn("h-3.5 w-3.5", isGoodTrend ? "text-emerald-600" : "text-red-500")} />
        ) : (
          <TrendingDown className={cn("h-3.5 w-3.5", isGoodTrend ? "text-emerald-600" : "text-red-500")} />
        )}
        <span className={cn(
          "text-xs font-semibold",
          isGoodTrend ? "text-emerald-600" : "text-red-500"
        )}>
          {isPositive ? '+' : ''}{kpi.trend}%
        </span>
        <span className="text-xs text-muted-foreground">{kpi.trendLabel}</span>
      </div>
    </div>
  );
}

interface ReportsKPICardsProps {
  kpis: ReportKPI[];
  isLoading?: boolean;
}

export function ReportsKPICards({ kpis, isLoading }: ReportsKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ReportsKPICard key={i} kpi={{ label: '', value: 0, trend: 0, trendLabel: '', icon: 'calendar' }} isLoading />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <ReportsKPICard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
