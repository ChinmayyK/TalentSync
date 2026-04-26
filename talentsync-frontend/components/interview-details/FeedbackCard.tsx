import { format, parseISO } from 'date-fns';
import { Star, ThumbsUp, ThumbsDown, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedbackSummary, FeedbackEntry } from '@/types/interview-details';
import { cn } from '@/lib/utils';

interface FeedbackCardProps {
  feedback: FeedbackSummary;
  isLoading?: boolean;
  error?: string;
}

const recommendationConfig = {
  strong_hire: { label: 'Strong Hire', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  hire: { label: 'Hire', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  no_hire: { label: 'No Hire', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  strong_no_hire: { label: 'Strong No Hire', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground border-border' },
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/30'
          )}
        />
      ))}
      <span className="ml-1.5 text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

function FeedbackEntryCard({ entry }: { entry: FeedbackEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = recommendationConfig[entry.recommendation];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-xs font-medium text-secondary-foreground">
              {entry.interviewerName.split(' ').map((n) => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{entry.interviewerName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <RatingStars rating={entry.rating} />
              <Badge variant="outline" className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div className="grid grid-cols-2 gap-4 pt-4">
            {/* Strengths */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Strengths</p>
              </div>
              <ul className="space-y-1">
                {entry.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ThumbsDown className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Areas to Improve</p>
              </div>
              <ul className="space-y-1">
                {entry.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Notes */}
          {entry.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
              <p className="text-sm text-muted-foreground">{entry.notes}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-3">
            Submitted {format(parseISO(entry.submittedAt), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>
      )}
    </div>
  );
}

export function FeedbackCard({ feedback, isLoading, error }: FeedbackCardProps) {
  const isPending = feedback.recommendation === 'pending';

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Feedback Summary</h2>
        {!isPending && !isLoading && (
          <Badge 
            variant="outline" 
            className={cn('font-medium', recommendationConfig[feedback.recommendation].color)}
          >
            {recommendationConfig[feedback.recommendation].label}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Failed to load feedback</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : isPending ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Feedback Pending</p>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for interviewers to submit their feedback
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Rating */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Rating</p>
                <div className="mt-1">
                  <RatingStars rating={feedback.overallRating} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {feedback.feedbackEntries.length} review{feedback.feedbackEntries.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Individual Feedback */}
            <div className="space-y-3">
              {feedback.feedbackEntries.map((entry) => (
                <FeedbackEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
