import { format, parseISO } from 'date-fns';
import { 
  Calendar, Mail, RefreshCw, Eye, MessageSquare, 
  CheckCircle2, Bell, Clock, AlertCircle 
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TimelineEvent } from '@/types/interview-details';
import { cn } from '@/lib/utils';

interface TimelineCardProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  error?: string;
}

const eventConfig: Record<TimelineEvent['type'], { icon: typeof Calendar; color: string }> = {
  created: { icon: Calendar, color: 'text-primary bg-primary/10' },
  notification_sent: { icon: Mail, color: 'text-blue-500 bg-blue-500/10' },
  rescheduled: { icon: RefreshCw, color: 'text-amber-500 bg-amber-500/10' },
  invite_viewed: { icon: Eye, color: 'text-emerald-500 bg-emerald-500/10' },
  feedback_submitted: { icon: MessageSquare, color: 'text-violet-500 bg-violet-500/10' },
  status_changed: { icon: CheckCircle2, color: 'text-cyan-500 bg-cyan-500/10' },
  note_added: { icon: MessageSquare, color: 'text-gray-500 bg-gray-500/10' },
  reminder_sent: { icon: Bell, color: 'text-orange-500 bg-orange-500/10' },
};

export function TimelineCard({ events, isLoading, error }: TimelineCardProps) {
  const formatTimestamp = (timestamp: string) => {
    try {
      return format(parseISO(timestamp), 'MMM d, yyyy • h:mm a');
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Activity Timeline</h2>
        </div>
        {events.length > 0 && (
          <span className="text-xs text-muted-foreground">{events.length} events</span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Failed to load timeline</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

            <div className="space-y-4">
              {events.map((event, index) => {
                const config = eventConfig[event.type];
                const Icon = config.icon;
                const isLast = index === events.length - 1;

                return (
                  <div key={event.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        config.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                          {event.actor && (
                            <p className="text-xs text-muted-foreground/70 mt-1">by {event.actor}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
