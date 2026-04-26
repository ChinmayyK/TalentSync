import { ArrowLeft, Calendar, Send, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InterviewStatus } from '@/types/interview';
import { UserRole } from '@/types/interview-details';
import { cn } from '@/lib/utils';

interface InterviewHeaderProps {
  status: InterviewStatus;
  userRole: UserRole;
  onReschedule: () => void;
  onSendReminder: () => void;
  onCancel: () => void;
}

const statusConfig: Record<InterviewStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  'no-show': { label: 'No Show', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'pending-feedback': { label: 'Pending Feedback', className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
};

const defaultStatusConfig = { label: 'Unknown', className: 'bg-muted text-muted-foreground border-muted' };

export function InterviewHeader({
  status,
  userRole,
  onReschedule,
  onSendReminder,
  onCancel,
}: InterviewHeaderProps) {
  const router = useRouter();
  const config = statusConfig[status] || defaultStatusConfig;
  const canTakeActions = userRole !== 'interviewer';

  return (
    <div className="bg-background border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Interviews</span>
              <span className="sm:hidden">Back</span>
            </Button>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">Interview Details</h1>
              <Badge variant="outline" className={cn('font-medium', config.className)}>
                {config.label}
              </Badge>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {canTakeActions ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onReschedule} className="gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Reschedule</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reschedule this interview</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="secondary" onClick={onSendReminder} className="gap-2">
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Send Reminder</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send reminder to participants</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={onCancel}
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Cancel</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel this interview</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">View only</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
