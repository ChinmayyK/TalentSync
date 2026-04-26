import { format, parseISO } from 'date-fns';
import { Mail, Phone, MapPin, Briefcase, User, Tag, Clock, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CandidateProfile, UserRole } from '@/types/candidate';

interface CandidateOverviewCardProps {
  candidate: CandidateProfile;
  userRole: UserRole;
  isLoading?: boolean;
  onEdit: () => void;
}

export function CandidateOverviewCard({ candidate, userRole, isLoading, onEdit }: CandidateOverviewCardProps) {
  const canEdit = userRole !== 'interviewer';

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Candidate Overview</h2>
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Details
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit candidate information</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="p-5 space-y-5">
        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Mail className="h-3.5 w-3.5" />
              Email
            </div>
            <a 
              href={`mailto:${candidate.email}`}
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              {candidate.email}
            </a>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </div>
            <a 
              href={`tel:${candidate.phone}`}
              className="text-sm text-foreground hover:text-primary transition-colors"
            >
              {candidate.phone}
            </a>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
            <p className="text-sm text-foreground">{candidate.location}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Briefcase className="h-3.5 w-3.5" />
              Applied Role
            </div>
            <p className="text-sm text-foreground">{candidate.appliedRole}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <User className="h-3.5 w-3.5" />
              Assigned Recruiter
            </div>
            <p className="text-sm text-foreground">{candidate.assignedRecruiter.name}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              Last Updated
            </div>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(candidate.updatedAt), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Experience Summary */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Experience Summary</p>
          <p className="text-sm text-foreground leading-relaxed">{candidate.experienceSummary}</p>
        </div>

        <div className="h-px bg-border" />

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Tag className="h-3.5 w-3.5" />
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {candidate.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
