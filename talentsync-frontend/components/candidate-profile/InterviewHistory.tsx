import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Star, ChevronRight, AlertCircle, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CandidateInterview } from '@/types/candidate';
import { cn } from '@/lib/utils';

interface InterviewHistoryProps {
  interviews: CandidateInterview[];
  isLoading?: boolean;
  error?: string;
}

const stageLabels: Record<string, string> = {
  received: 'Received',
  screening: 'Screening',
  'interview-1': 'Interview 1',
  'interview-2': 'Interview 2',
  'hr-round': 'HR Round',
  offer: 'Offer',
};

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  'no-show': 'bg-amber-500/10 text-amber-600 border-amber-200',
};

const feedbackColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  partial: 'bg-amber-500/10 text-amber-600',
  complete: 'bg-emerald-500/10 text-emerald-600',
};

export function InterviewHistory({ interviews, isLoading, error }: InterviewHistoryProps) {
  const router = useRouter();

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Interview History</h2>
        </div>
        <div className="p-5 flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Failed to load interviews</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="p-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Interview History</h2>
      </div>
      <div className="p-5">
        {interviews.length > 0 ? (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer"
                onClick={() => router.push(`/interview/${interview.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold text-foreground">
                        {stageLabels[interview.stage] || interview.stage}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', statusColors[interview.status])}
                      >
                        {interview.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(parseISO(interview.date), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {interview.startTime} - {interview.endTime}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {interview.interviewers.join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {interview.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-medium text-foreground">{interview.rating}</span>
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className={cn('text-xs', feedbackColors[interview.feedbackStatus])}
                    >
                      {interview.feedbackStatus === 'complete' ? 'Feedback Complete' :
                        interview.feedbackStatus === 'partial' ? 'Partial Feedback' : 'Feedback Pending'}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <CalendarX className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No interviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Schedule an interview to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
