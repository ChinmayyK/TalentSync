import { format } from 'date-fns';
import { Calendar, Clock, MapPin, User, Video, Phone, ExternalLink, X, CheckCircle, MessageSquarePlus } from 'lucide-react';
import { CalendarEvent } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserRole } from '@/types/navigation';
import { useRouter } from 'next/navigation';

interface CalendarEventPopoverProps {
  event: CalendarEvent;
  userRole: UserRole;
  onClose: () => void;
  onReschedule: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onComplete?: (event: CalendarEvent) => void;
  onAddNote?: (event: CalendarEvent) => void;
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
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-muted text-muted-foreground border-border',
  'no-show': 'bg-destructive/10 text-destructive border-destructive/20',
  'pending-feedback': 'bg-amber-100 text-amber-700 border-amber-200',
};

const modeIcons = {
  video: Video,
  phone: Phone,
  'in-person': MapPin,
};

export function CalendarEventPopover({
  event,
  userRole,
  onClose,
  onReschedule,
  onCancel,
  onComplete,
  onAddNote,
}: CalendarEventPopoverProps) {
  const router = useRouter();
  const canEdit = userRole !== 'interviewer';
  const ModeIcon = modeIcons[event.mode];

  const handleViewDetails = () => {
    router.push(`/interviews/${event.id}`);
    onClose();
  };

  const handleViewCandidate = () => {
    router.push(`/candidates/${event.candidateId}`);
    onClose();
  };

  return (
    <div className="w-80 bg-card rounded-lg shadow-lg border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{event.candidateName}</h3>
          <p className="text-sm text-muted-foreground">{event.role}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 -mr-2 -mt-1">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="text-xs">
          {stageLabels[event.stage]}
        </Badge>
        <Badge variant="outline" className={statusColors[event.status]}>
          {event.status.replace('-', ' ')}
        </Badge>
      </div>

      <Separator className="my-3" />

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(event.startTime), 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ModeIcon className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize">{event.mode}</span>
          {event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1"
            >
              Join <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span>{event.interviewerName}</span>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={handleViewDetails} className="w-full">
          View Interview Details
        </Button>
        <Button variant="ghost" size="sm" onClick={handleViewCandidate} className="w-full">
          View Candidate Profile
        </Button>
        {canEdit && event.status === 'scheduled' && (
          <>
            <Separator className="my-1" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReschedule(event)}
                className="flex-1"
              >
                Reschedule
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(event)}
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Cancel
              </Button>
            </div>
            {onComplete && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onComplete(event)}
                className="w-full gap-2 mt-1"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Complete
              </Button>
            )}
          </>
        )}
        {onAddNote && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddNote(event)}
            className="w-full gap-2 mt-1"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Add Note
          </Button>
        )}
      </div>
    </div>
  );
}
