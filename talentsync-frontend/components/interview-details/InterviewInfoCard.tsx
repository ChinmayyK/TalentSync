import { format, parseISO } from 'date-fns';
import { 
  Calendar, Clock, Video, MapPin, Phone, Users, FileText, 
  ExternalLink, Copy, Pencil, Check 
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InterviewDetails, UserRole } from '@/types/interview-details';
import { cn } from '@/lib/utils';

interface InterviewInfoCardProps {
  interview: InterviewDetails;
  userRole: UserRole;
  onEdit: () => void;
}

const stageLabels: Record<string, string> = {
  received: 'Received',
  screening: 'Screening',
  'interview-1': 'Interview 1',
  'interview-2': 'Interview 2',
  'hr-round': 'HR Round',
  offer: 'Offer',
};

const modeIcons = {
  online: Video,
  offline: MapPin,
  phone: Phone,
};

const modeLabels = {
  online: 'Video Call',
  offline: 'In-Person',
  phone: 'Phone Call',
};

export function InterviewInfoCard({ interview, userRole, onEdit }: InterviewInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const canEdit = userRole !== 'interviewer';
  const ModeIcon = modeIcons[interview.interviewMode];

  const handleCopyLink = async () => {
    if (interview.meetingLink) {
      await navigator.clipboard.writeText(interview.meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), 'EEEE, MMMM d, yyyy');
    } catch {
      return date;
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Interview Information</h2>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-2 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
            Edit Details
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Candidate & Role */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Candidate</p>
            <p className="text-sm font-medium text-foreground">{interview.candidateName}</p>
            <p className="text-xs text-muted-foreground">{interview.candidateEmail}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Role</p>
            <p className="text-sm font-medium text-foreground">{interview.role}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {stageLabels[interview.stage] || interview.stage}
            </Badge>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Date, Time, Duration */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
              <p className="text-sm font-medium text-foreground">{formatDate(interview.date)}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</p>
              <p className="text-sm font-medium text-foreground">
                {interview.startTime} - {interview.endTime}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</p>
            <p className="text-sm font-medium text-foreground">{interview.duration} minutes</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Mode & Link/Location */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ModeIcon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{modeLabels[interview.interviewMode]}</p>
          </div>
          
          {interview.interviewMode === 'online' && interview.meetingLink && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Meeting Link</p>
                <p className="text-sm text-primary truncate">{interview.meetingLink}</p>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyLink}>
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Copied!' : 'Copy link'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open link</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          {interview.interviewMode === 'offline' && interview.location && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <p className="text-sm text-foreground">{interview.location}</p>
            </div>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Interviewers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Interviewers ({interview.interviewers.length})</p>
          </div>
          <div className="space-y-2">
            {interview.interviewers.map((interviewer) => (
              <div 
                key={interviewer.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-medium text-secondary-foreground">
                    {interviewer.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{interviewer.name}</p>
                  <p className="text-xs text-muted-foreground">{interviewer.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Internal Notes */}
        {interview.internalNotes && (
          <>
            <div className="h-px bg-border" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Internal Notes</p>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {interview.internalNotes}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
