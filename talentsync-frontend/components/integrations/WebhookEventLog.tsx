import { useState, useEffect } from 'react';
import { WebhookEvent } from '@/types/integrations';
import { getWebhookEvents } from '@/lib/api/integrations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Search, RefreshCw, Eye, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookEventLogProps {
  integrationId: string;
  provider: string;
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  success: { variant: 'default', icon: CheckCircle },
  failed: { variant: 'destructive', icon: XCircle },
  pending: { variant: 'secondary', icon: Clock },
  retrying: { variant: 'outline', icon: Loader2 },
};

export function WebhookEventLog({ integrationId, provider }: WebhookEventLogProps) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const response = await getWebhookEvents(provider);
      setEvents(response.events || []);
    } catch (error) {
      console.error('Failed to load webhook events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [provider]);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRetry = async (eventId: string) => {
    setIsRetrying(eventId);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setEvents(events.map((e) =>
      e.id === eventId ? { ...e, status: 'pending', attempts: e.attempts + 1 } : e
    ));

    toast.success('Retry initiated', { description: 'The event will be reprocessed shortly.' });
    setIsRetrying(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Webhook Events</h3>
          <p className="text-sm text-muted-foreground">Recent webhook deliveries and their status</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="retrying">Retrying</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr,120px,80px,100px,80px] gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Event</span>
          <span>Status</span>
          <span>Attempts</span>
          <span>Time</span>
          <span>Actions</span>
        </div>

        <div className="divide-y divide-border">
          {filteredEvents.map((event) => {
            const status = statusConfig[event.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={event.id}
                className="grid grid-cols-[1fr,120px,80px,100px,80px] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm text-foreground">{event.eventType}</p>
                  <p className="text-xs text-muted-foreground font-mono">{event.id}</p>
                </div>

                <Badge variant={status.variant} className="w-fit flex items-center gap-1">
                  <StatusIcon className={cn("h-3 w-3", event.status === 'retrying' && "animate-spin")} />
                  {event.status}
                </Badge>

                <span className="text-sm text-muted-foreground">{event.attempts}</span>

                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(event.createdAt, { addSuffix: true })}
                </span>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(event.status === 'failed' || event.status === 'retrying') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleRetry(event.id)}
                      disabled={isRetrying === event.id}
                    >
                      {isRetrying === event.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p className="text-sm">No events found</p>
            </div>
          )}
        </div>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="w-screen h-[100dvh] max-w-none md:max-w-2xl md:h-auto md:rounded-lg">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Event Type</p>
                  <p className="font-medium">{selectedEvent.eventType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge variant={statusConfig[selectedEvent.status].variant}>
                    {selectedEvent.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Event ID</p>
                  <p className="font-mono text-sm">{selectedEvent.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Attempts</p>
                  <p>{selectedEvent.attempts}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Payload</p>
                <ScrollArea className="h-[150px] rounded-lg border border-border bg-muted/30 p-3">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {selectedEvent.response && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Response</p>
                  <ScrollArea className="h-[100px] rounded-lg border border-border bg-muted/30 p-3">
                    <pre className="text-xs font-mono">
                      {JSON.stringify(selectedEvent.response, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedEvent.error && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Error</p>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive">{selectedEvent.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
