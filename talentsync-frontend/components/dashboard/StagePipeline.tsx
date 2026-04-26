import { cn } from '@/lib/utils';
import { StageCount, InterviewStage } from '@/types/interview';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Users } from 'lucide-react';

const stageColors: Record<string, { bg: string; border: string; text: string; activeBg: string }> = {
  // Uppercase keys (matching database format)
  'APPLIED': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    activeBg: 'bg-purple-100'
  },
  'SCREENING': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    activeBg: 'bg-blue-100'
  },
  'INTERVIEW': {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    activeBg: 'bg-cyan-100'
  },
  'INTERVIEW_1': {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    activeBg: 'bg-cyan-100'
  },
  'INTERVIEW_2': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    activeBg: 'bg-indigo-100'
  },
  'HR_ROUND': {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    activeBg: 'bg-violet-100'
  },
  'OFFER': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-100'
  },
  'HIRED': {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    activeBg: 'bg-green-100'
  },
  'REJECTED': {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    activeBg: 'bg-red-100'
  },
  // Legacy lowercase keys for backward compatibility
  'applied': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    activeBg: 'bg-purple-100'
  },
  'received': {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    activeBg: 'bg-slate-100'
  },
  'screening': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    activeBg: 'bg-blue-100'
  },
  'interview': {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    activeBg: 'bg-cyan-100'
  },
  'interview-1': {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    activeBg: 'bg-cyan-100'
  },
  'interview-2': {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    activeBg: 'bg-indigo-100'
  },
  'hr-round': {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    activeBg: 'bg-violet-100'
  },
  'offer': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-100'
  },
  'hired': {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    activeBg: 'bg-green-100'
  },
  'rejected': {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    activeBg: 'bg-red-100'
  },
};

interface StagePipelineProps {
  stages: StageCount[];
  activeStage?: InterviewStage;
  isLoading?: boolean;
  onStageClick?: (stage: InterviewStage) => void;
}

export function StagePipeline({ stages, activeStage, isLoading, onStageClick }: StagePipelineProps) {
  if (isLoading) {
    return (
      <section className="bg-card rounded-lg border border-border p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <Skeleton className="h-5 w-32 sm:w-40" />
          <Skeleton className="h-4 w-20 sm:w-24" />
        </div>
        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-28 sm:h-24 sm:w-36 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  const totalCandidates = stages.reduce((sum, s) => sum + s.count, 0);

  /* Mobile Vertical Pipeline View */
  const MobilePipeline = () => (
    <div className="space-y-3 md:hidden">
      {stages.map((stage, index) => {
        const isActive = activeStage === stage.stage;
        const defaultColor = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', activeBg: 'bg-gray-100' };
        const colors = stageColors[stage.stage] || defaultColor;

        return (
          <div key={stage.stage} className="relative">
            {/* Connector Line */}
            {index < stages.length - 1 && (
              <div className="absolute left-[22px] top-[45px] bottom-[-20px] w-0.5 bg-border -z-10" />
            )}

            <button
              onClick={() => onStageClick?.(stage.stage)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all relative z-10 bg-background",
                isActive ? `${colors.border} ${colors.activeBg}` : "border-border bg-card",
                "active:scale-[0.98]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold",
                  isActive ? `${colors.border} bg-white ${colors.text}` : "border-border bg-muted/20 text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                <div className="text-left">
                  <div className={cn("text-sm font-semibold", isActive ? colors.text : "text-foreground")}>
                    {stage.label}
                  </div>
                  {isActive && (
                    <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                      <span>{stage.pending} Pending</span>
                      <span>•</span>
                      <span>{stage.completed} Done</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-lg font-bold", isActive ? colors.text : "text-foreground")}>
                  {stage.count}
                </span>
                {isActive && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <section aria-label="Interview pipeline">
      <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50 bg-muted/10">
          <div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">Interview Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Candidate distribution across hiring stages</p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-background border border-border shadow-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{totalCandidates} Candidates</span>
          </div>
        </div>

        {/* Desktop Horizontal Connected View */}
        <div className="hidden md:flex overflow-x-auto scrollbar-thin">
          {stages.map((stage, index) => {
            const defaultColor = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', activeBg: 'bg-white' };
            const colors = stageColors[stage.stage] || defaultColor;
            const isActive = activeStage === stage.stage;
            const isFirst = index === 0;
            const isLast = index === stages.length - 1;

            return (
              <div
                key={stage.stage}
                className="flex-1 min-w-[140px] relative"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onStageClick?.(stage.stage)}
                      className={cn(
                        "w-full h-full relative px-2 py-4 flex flex-col items-center justify-center transition-all duration-200 group hover:bg-muted/50 focus:outline-none",
                        isActive && "bg-white shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.1)] z-10",
                      )}
                    >
                      {/* Chevron Shape Background */}
                      {!isLast && (
                        <div className="absolute top-0 bottom-0 -right-3 w-6 z-20 overflow-hidden pointer-events-none">
                          <div className="h-full w-full bg-border/40 transform -skew-x-12 translate-x-3" />
                        </div>
                      )}

                      {/* Active Indicator Line */}
                      {isActive && (
                        <div className={cn("absolute top-0 left-0 right-0 h-1", colors.text.replace('text-', 'bg-'))} />
                      )}

                      <div className="relative z-10 flex flex-col items-center gap-1.5 w-full">
                        {/* Circle Badge with Count */}
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shadow-sm border transition-all duration-300",
                          isActive
                            ? cn(colors.bg, colors.text, colors.border, "scale-110")
                            : "bg-white border-border text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground"
                        )}>
                          {stage.count}
                        </div>

                        <div className="text-center px-2">
                          <div className={cn(
                            "text-xs font-semibold truncate max-w-[120px]",
                            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {stage.label}
                          </div>

                          {/* Hover details */}
                          <div className={cn(
                            "h-4 overflow-hidden transition-all duration-200 opacity-0 transform translate-y-1",
                            "group-hover:opacity-100 group-hover:translate-y-0",
                            isActive && "opacity-100 translate-y-0"
                          )}>
                            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 mt-0.5">
                              {stage.pending > 0 && <span>{stage.pending} active</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vertical separator for non-active items */}
                      {!isLast && !isActive && activeStage !== stages[index + 1]?.stage && (
                        <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-border/50" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <span className="font-semibold">{stage.label}</span>: {stage.count} Total
                    ({stage.pending} active, {stage.completed} done)
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical View */}
        <div className="md:hidden p-4">
          <MobilePipeline />
        </div>
      </div>
    </section>
  );
}
