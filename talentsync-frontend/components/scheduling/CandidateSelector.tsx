import { useState, useMemo } from 'react';
import { Search, FileText, Check, User, X, Calendar, Users, ChevronDown, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Candidate } from '@/types/scheduling';

interface CandidateSelectorProps {
  candidates: Candidate[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
  error?: string;
}

type FilterMode = 'all' | 'available' | 'scheduled';

export function CandidateSelector({
  candidates,
  selectedIds,
  onSelectionChange,
  isLoading,
  error,
}: CandidateSelectorProps) {
  const [search, setSearch] = useState('');
  const [showAllSelected, setShowAllSelected] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // First filter by search
  const searchFilteredCandidates = useMemo(() =>
    candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.role.toLowerCase().includes(search.toLowerCase())
    ),
    [candidates, search]
  );

  // Then filter by availability mode
  const filteredCandidates = useMemo(() => {
    switch (filterMode) {
      case 'available':
        return searchFilteredCandidates.filter(c => !c.hasActiveInterview);
      case 'scheduled':
        return searchFilteredCandidates.filter(c => c.hasActiveInterview);
      default:
        return searchFilteredCandidates;
    }
  }, [searchFilteredCandidates, filterMode]);

  // Get counts
  const availableCount = useMemo(() =>
    searchFilteredCandidates.filter(c => !c.hasActiveInterview).length,
    [searchFilteredCandidates]
  );

  const scheduledCount = useMemo(() =>
    searchFilteredCandidates.filter(c => c.hasActiveInterview).length,
    [searchFilteredCandidates]
  );

  const toggleCandidate = (id: string) => {
    const candidate = candidates.find(c => c.id === id);
    if (candidate?.hasActiveInterview) return;

    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAllAvailable = () => {
    const availableCandidates = filteredCandidates.filter(c => !c.hasActiveInterview);
    const availableIds = availableCandidates.map(c => c.id);
    const newSelection = [...new Set([...selectedIds, ...availableIds])];
    onSelectionChange(newSelection);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const selectedCandidates = candidates.filter((c) => selectedIds.includes(c.id));
  const displayedChips = showAllSelected ? selectedCandidates : selectedCandidates.slice(0, 3);
  const hiddenCount = selectedCandidates.length - displayedChips.length;

  // Format stage for display
  const formatStage = (stage: string) => {
    return stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-3">
          <X className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-destructive font-medium">Failed to load candidates</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-border h-11"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filterMode === 'all'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({searchFilteredCandidates.length})
            </button>
            <button
              onClick={() => setFilterMode('available')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filterMode === 'available'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1">
                Available ({availableCount})
              </span>
            </button>
            <button
              onClick={() => setFilterMode('scheduled')}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                filterMode === 'scheduled'
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-1">
                Scheduled ({scheduledCount})
              </span>
            </button>
          </div>

          <div className="flex-1" />

          {selectedIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              Clear ({selectedIds.length})
            </Button>
          )}
          {filterMode !== 'scheduled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllAvailable}
              disabled={availableCount === 0}
              className="h-8"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Select All Available
            </Button>
          )}
        </div>

        {/* Selected Candidates - Compact Chips */}
        {selectedCandidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg flex-shrink-0">
            <span className="text-xs font-medium text-primary uppercase tracking-wide mr-1">
              Selected ({selectedCandidates.length})
            </span>
            {displayedChips.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 bg-background border border-border rounded-full pl-2 pr-1 py-1 text-sm group hover:border-primary/30 transition-colors"
              >
                <span className="font-medium text-foreground truncate max-w-[120px]">{c.name}</span>
                <button
                  onClick={() => toggleCandidate(c.id)}
                  className="p-0.5 hover:bg-destructive/10 rounded-full transition-colors"
                  aria-label={`Remove ${c.name}`}
                >
                  <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                </button>
              </div>
            ))}
            {hiddenCount > 0 && !showAllSelected && (
              <button
                onClick={() => setShowAllSelected(true)}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                +{hiddenCount} more
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            {showAllSelected && selectedCandidates.length > 3 && (
              <button
                onClick={() => setShowAllSelected(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* Candidate List */}
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex-shrink-0">
            {filterMode === 'available' ? 'Available Candidates' : filterMode === 'scheduled' ? 'Scheduled Candidates' : 'All Candidates'}
          </p>
          <ScrollArea className="flex-1 min-h-0 rounded-lg border border-border bg-background">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-3 mb-3">
                  {filterMode === 'available' ? (
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <User className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {filterMode === 'available'
                    ? 'No available candidates'
                    : filterMode === 'scheduled'
                      ? 'No scheduled candidates'
                      : 'No candidates found'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  {filterMode === 'available'
                    ? 'All candidates have interviews scheduled.'
                    : filterMode === 'scheduled'
                      ? 'No candidates have interviews scheduled yet.'
                      : search
                        ? `No results for "${search}". Try a different search term.`
                        : 'No candidates available for scheduling.'}
                </p>
                {filterMode !== 'all' && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setFilterMode('all')}
                    className="mt-2 text-xs"
                  >
                    Show all candidates
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredCandidates.map((candidate) => {
                  const isSelected = selectedIds.includes(candidate.id);
                  const hasActiveInterview = candidate.hasActiveInterview;

                  const CandidateRow = (
                    <button
                      key={candidate.id}
                      onClick={() => toggleCandidate(candidate.id)}
                      disabled={hasActiveInterview}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 sm:p-4 text-left transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-inset',
                        hasActiveInterview
                          ? 'opacity-60 cursor-not-allowed bg-amber-50/50 dark:bg-amber-900/10'
                          : 'hover:bg-accent/50',
                        isSelected && !hasActiveInterview && 'bg-primary/5'
                      )}
                    >
                      {/* Selection Checkbox */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                          hasActiveInterview
                            ? 'bg-muted border-muted-foreground/30'
                            : isSelected
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/40 hover:border-primary/60'
                        )}
                      >
                        {isSelected && !hasActiveInterview && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-background">
                        <span className="text-sm font-semibold text-primary">
                          {candidate.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate text-sm sm:text-base">{candidate.name}</p>
                          {candidate.hasResume && (
                            <Tooltip>
                              <TooltipTrigger>
                                <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top">Resume attached</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
                      </div>

                      {/* Role & Status */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasActiveInterview ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700/50 text-xs font-medium">
                            <Calendar className="h-3 w-3 mr-1" />
                            Scheduled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs font-normal hidden sm:inline-flex">
                            {formatStage(candidate.stage)}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );

                  // Wrap with tooltip if has active interview
                  if (hasActiveInterview) {
                    return (
                      <Tooltip key={candidate.id}>
                        <TooltipTrigger asChild>
                          {CandidateRow}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium">Already has interview scheduled</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Cancel or complete their existing interview first.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return CandidateRow;
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}
