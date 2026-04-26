import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Calendar, Clock, CheckCircle, XCircle, LucideIcon, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface KPICardProps {
  title: string;
  value: number;
  trend: number;
  icon: LucideIcon;
  description: string;
  isLoading?: boolean;
  onClick?: () => void;
  data: number[];
}

export function KPICard({ title, value, trend, icon: Icon, description, isLoading, onClick, data }: KPICardProps) {
  const isPositive = trend >= 0;

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20 sm:w-24" />
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg" />
        </div>
        <Skeleton className="mt-3 sm:mt-4 h-8 sm:h-9 w-16 sm:w-20" />
        <Skeleton className="mt-2 h-3 w-28 sm:w-32" />
        <Skeleton className="mt-2 sm:mt-3 h-4 w-20 sm:w-24" />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "group w-full text-left bg-card rounded-lg border border-border p-4 sm:p-5 shadow-sm",
            "transition-all duration-200",
            "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
            "active:translate-y-0 active:shadow-md"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
            <div className={cn(
              "p-2 sm:p-2.5 rounded-lg transition-colors duration-200",
              "bg-primary/5 group-hover:bg-primary/10"
            )}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{value}</span>
            <div className="h-8 w-16 sm:h-10 sm:w-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.map((val, i) => ({ value: val, index: i }))}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{description}</p>
          <div className="mt-2 sm:mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />
              )}
              <span className={cn(
                "text-[10px] sm:text-xs font-semibold",
                isPositive ? "text-emerald-600" : "text-red-500"
              )}>
                {isPositive ? '+' : ''}{trend}%
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">vs last week</span>
            </div>
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs">Click to filter interviews by this metric</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface KPICardsProps {
  metrics: {
    scheduledToday: number;
    scheduledTodayTrend: number;
    pendingFeedback: number;
    pendingFeedbackTrend: number;
    completed: number;
    completedTrend: number;
    noShows: number;
    noShowsTrend: number;
  } | null;
  isLoading?: boolean;
  onCardClick?: (filter: string) => void;
}

export function KPICards({ metrics, isLoading, onCardClick }: KPICardsProps) {
  const cards = [
    {
      title: 'Scheduled Today',
      value: metrics?.scheduledToday ?? 0,
      trend: metrics?.scheduledTodayTrend ?? 0,
      icon: Calendar,
      filter: 'scheduled-today',
      description: 'Interviews happening today',
      data: [10, 15, 12, 18, 20, 15, metrics?.scheduledToday ?? 0]
    },
    {
      title: 'Pending Feedback',
      value: metrics?.pendingFeedback ?? 0,
      trend: metrics?.pendingFeedbackTrend ?? 0,
      icon: Clock,
      filter: 'pending-feedback',
      description: 'Awaiting interviewer feedback',
      data: [5, 8, 5, 10, 8, 6, metrics?.pendingFeedback ?? 0]
    },
    {
      title: 'Completed',
      value: metrics?.completed ?? 0,
      trend: metrics?.completedTrend ?? 0,
      icon: CheckCircle,
      filter: 'completed',
      description: 'Successfully completed this week',
      data: [20, 25, 22, 30, 28, 35, metrics?.completed ?? 0]
    },
    {
      title: 'No-Shows',
      value: metrics?.noShows ?? 0,
      trend: metrics?.noShowsTrend ?? 0,
      icon: XCircle,
      filter: 'no-shows',
      description: 'Candidates who missed interviews',
      data: [3, 4, 2, 5, 3, 2, metrics?.noShows ?? 0]
    },
  ];

  /* Mobile Stacked View */
  const MobileView = () => (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden md:hidden">
      <div className="p-4 border-b border-border bg-muted/20">
        <h3 className="font-semibold text-foreground">Interview Summary</h3>
      </div>
      <div className="divide-y divide-border">
        {cards.map((card) => {
          const isPositive = card.trend >= 0;
          return (
            <div
              key={card.filter}
              onClick={() => onCardClick?.(card.filter)}
              className="flex items-center justify-between p-4 active:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/5 text-primary">
                  <card.icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                  {card.trend !== 0 && (
                    <span className={cn(
                      "text-xs font-medium",
                      isPositive ? "text-emerald-600" : "text-red-500"
                    )}>
                      {isPositive ? '+' : ''}{card.trend}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-foreground">{card.value}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section aria-label="Key metrics">
      {/* Desktop/Tablet Grid View */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <KPICard
            key={card.filter}
            title={card.title}
            value={card.value}
            trend={card.trend}
            icon={card.icon}
            description={card.description}
            isLoading={isLoading}
            onClick={() => onCardClick?.(card.filter)}
            data={card.data}
          />
        ))}
      </div>

      {/* Mobile Stacked View */}
      <MobileView />
    </section>
  );
}
