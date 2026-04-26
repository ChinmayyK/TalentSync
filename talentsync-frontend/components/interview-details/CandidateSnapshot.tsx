import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import {
  Mail, Phone, Briefcase, Calendar, FileText, Download,
  ExternalLink, Star, ChevronRight, AlertCircle, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CandidateDetails, PreviousInterview } from '@/types/interview-details';
import { cn } from '@/lib/utils';

interface CandidateSnapshotProps {
  candidate: CandidateDetails;
  isLoading?: boolean;
  error?: string;
  onViewProfile: () => void;
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
  completed: 'bg-emerald-500/10 text-emerald-600',
  scheduled: 'bg-primary/10 text-primary',
  cancelled: 'bg-destructive/10 text-destructive',
  'no-show': 'bg-amber-500/10 text-amber-600',
};

export function CandidateSnapshot({ candidate, isLoading, error, onViewProfile }: CandidateSnapshotProps) {
  const router = useRouter();

  const handleViewProfile = () => {
    router.push(`/candidate/${candidate.id}`);
  };

  if (error) {
    return (
      <div className="bg-background rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Failed to load candidate</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-background rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Candidate Snapshot</h2>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Avatar & Name */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-primary">
              {candidate.name.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{candidate.name}</h3>
            <Badge variant="secondary" className="mt-1">
              {stageLabels[candidate.currentStage] || candidate.currentStage}
            </Badge>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={`mailto:${candidate.email}`}
              className="text-foreground hover:text-primary transition-colors truncate"
            >
              {candidate.email}
            </a>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a
              href={`tel:${candidate.phone}`}
              className="text-foreground hover:text-primary transition-colors"
            >
              {candidate.phone}
            </a>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground">{candidate.appliedRole}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              Applied {format(parseISO(candidate.appliedDate), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Resume */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Documents</p>
          {candidate.resumeUrl ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{candidate.resumeName}</p>
                  <p className="text-xs text-muted-foreground">Resume</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={candidate.resumeUrl} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No resume uploaded</p>
            </div>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* Previous Interviews */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Previous Interviews ({candidate.previousInterviews.length})
          </p>
          {candidate.previousInterviews.length > 0 ? (
            <div className="space-y-2">
              {candidate.previousInterviews.slice(0, 3).map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      interview.status === 'completed' ? 'bg-emerald-500' : 'bg-muted-foreground'
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {stageLabels[interview.stage] || interview.stage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(interview.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {interview.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-foreground">{interview.rating}</span>
                      </div>
                    )}
                    <Badge
                      variant="outline"
                      className={cn('text-xs', statusColors[interview.status])}
                    >
                      {interview.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No previous interviews</p>
            </div>
          )}
        </div>

        {/* View Full Profile Button */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleViewProfile}
        >
          <User className="h-4 w-4" />
          View Full Candidate Profile
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  );
}
