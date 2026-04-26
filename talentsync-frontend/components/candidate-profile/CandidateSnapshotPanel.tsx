import { format, parseISO } from 'date-fns';
import { Mail, Phone, Calendar, Link2, Hash, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CandidateProfile } from '@/types/candidate';

interface CandidateSnapshotPanelProps {
  candidate: CandidateProfile;
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

const stageColors: Record<string, string> = {
  received: 'bg-muted text-muted-foreground',
  screening: 'bg-amber-500/10 text-amber-600',
  'interview-1': 'bg-primary/10 text-primary',
  'interview-2': 'bg-primary/10 text-primary',
  'hr-round': 'bg-purple-500/10 text-purple-600',
  offer: 'bg-emerald-500/10 text-emerald-600',
};

export function CandidateSnapshotPanel({ candidate, isLoading, error }: CandidateSnapshotPanelProps) {
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
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
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Candidate Snapshot</h2>
      </div>
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
            <Badge 
              variant="secondary" 
              className={`mt-1 ${stageColors[candidate.currentStage] || 'bg-muted text-muted-foreground'}`}
            >
              {stageLabels[candidate.currentStage] || candidate.currentStage}
            </Badge>
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-3">
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
            <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-foreground">{candidate.source}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              Added {format(parseISO(candidate.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground font-mono text-xs">{candidate.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
