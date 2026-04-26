import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FunnelStage } from '@/types/reports';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDown, ArrowRight, TrendingDown } from 'lucide-react';

interface ReportsFunnelProps {
  stages: FunnelStage[];
  isLoading?: boolean;
  onStageClick?: (stage: string) => void;
}

export function ReportsFunnel({ stages, isLoading, onStageClick }: ReportsFunnelProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-40" />
        </div>
        {/* Mobile: vertical skeleton */}
        <div className="flex flex-col gap-3 sm:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-20 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        {/* Desktop: horizontal skeleton */}
        <div className="hidden sm:flex items-center justify-between gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1">
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxCount = stages[0]?.count || 1;

  return (
    <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-sm font-semibold text-foreground">Hiring Funnel</h3>
        <span className="text-xs text-muted-foreground hidden sm:block">Click stage to filter</span>
      </div>

      {/* Mobile Layout: Vertical funnel */}
      <div className="flex flex-col gap-2 sm:hidden">
        {stages.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage} className="relative">
              <button
                onClick={() => onStageClick?.(stage.stage)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div
                  className="h-10 rounded bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center min-w-[60px]"
                  style={{ width: `${Math.max(widthPercent, 30)}%`, maxWidth: '120px' }}
                >
                  <span className="text-sm font-bold text-primary-foreground">{stage.count}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.percentage}% of total</p>
                </div>
                {stage.dropOff > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    <span>-{stage.dropOff}%</span>
                  </div>
                )}
              </button>
              {!isLast && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Layout: Horizontal funnel */}
      <div className="hidden sm:flex items-end gap-1 md:gap-2">
        {stages.map((stage, index) => {
          const heightPercent = (stage.count / maxCount) * 100;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.stage} className="flex-1 flex flex-col items-center relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onStageClick?.(stage.stage)}
                    className={cn(
                      "w-full rounded-t-lg transition-all duration-200 cursor-pointer",
                      "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/20",
                      "bg-gradient-to-t from-primary/80 to-primary"
                    )}
                    style={{ height: `${Math.max(heightPercent, 20)}px`, minHeight: '40px', maxHeight: '120px' }}
                  >
                    <span className="sr-only">{stage.label}: {stage.count}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-sm">{stage.count} candidates ({stage.percentage}%)</p>
                    {stage.dropOff > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        {stage.dropOff}% drop-off from previous
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              <div className="mt-3 text-center">
                <p className="text-base md:text-lg font-bold text-foreground">{stage.count}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[60px] md:max-w-[80px]">{stage.label}</p>
                <p className="text-xs text-muted-foreground">{stage.percentage}%</p>
              </div>

              {!isLast && (
                <div className="absolute -right-2 md:-right-3 top-1/3 hidden lg:block">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span>Total drop-off: {100 - (stages[stages.length - 1]?.percentage || 0)}%</span>
          <span className="text-border hidden sm:inline">•</span>
          <span>Conversion rate: {stages[stages.length - 1]?.percentage || 0}%</span>
        </div>
      </div>
    </div>
  );
}
