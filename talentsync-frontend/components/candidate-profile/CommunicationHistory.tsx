import { format, parseISO } from 'date-fns';
import { Mail, MessageSquare, Phone, MessageCircle, AlertCircle, Inbox, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CommunicationEntry, CommunicationChannel } from '@/types/candidate';
import { cn } from '@/lib/utils';

interface CommunicationHistoryProps {
  communications: CommunicationEntry[];
  isLoading?: boolean;
  error?: string;
}

const channelIcons: Record<CommunicationChannel, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  phone: Phone,
};

const channelColors: Record<CommunicationChannel, string> = {
  email: 'bg-primary/10 text-primary',
  sms: 'bg-emerald-500/10 text-emerald-600',
  whatsapp: 'bg-green-500/10 text-green-600',
  phone: 'bg-amber-500/10 text-amber-600',
};

const statusColors: Record<string, string> = {
  sent: 'bg-muted text-muted-foreground',
  delivered: 'bg-primary/10 text-primary',
  read: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-destructive/10 text-destructive',
};

export function CommunicationHistory({ communications, isLoading, error }: CommunicationHistoryProps) {
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Communication History</h2>
        </div>
        <div className="p-5 flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Failed to load communications</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="p-5 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Communication History</h2>
      </div>
      <div className="p-5">
        {communications.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {communications.map((comm, index) => {
                const Icon = channelIcons[comm.channel];
                return (
                  <div key={comm.id} className="relative flex gap-4 pl-0">
                    {/* Icon */}
                    <div className={cn(
                      'relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                      channelColors[comm.channel]
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {comm.type === 'outbound' ? (
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {comm.channel} · {comm.type}
                          </span>
                        </div>
                        <Badge variant="outline" className={cn('text-xs', statusColors[comm.status])}>
                          {comm.status}
                        </Badge>
                      </div>

                      {comm.subject && (
                        <p className="text-sm font-medium text-foreground mb-1 truncate">
                          {comm.subject}
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {comm.preview}
                      </p>

                      <p className="text-xs text-muted-foreground mt-2">
                        {format(parseISO(comm.timestamp), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No communications yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a conversation with this candidate</p>
          </div>
        )}
      </div>
    </div>
  );
}
