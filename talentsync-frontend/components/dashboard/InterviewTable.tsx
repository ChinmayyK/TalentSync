"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Interview, InterviewStage, InterviewStatus } from '@/types/interview';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, MoreHorizontal, ChevronLeft, ChevronRight, CalendarIcon,
  LayoutList, LayoutGrid, Mail, Video, Edit, Trash2, Eye, X, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

const statusStyles: Record<InterviewStatus, string> = {
  'scheduled': 'bg-blue-50 text-blue-700 border-blue-200',
  'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'cancelled': 'bg-slate-50 text-slate-600 border-slate-200',
  'no-show': 'bg-red-50 text-red-700 border-red-200',
  'pending-feedback': 'bg-amber-50 text-amber-700 border-amber-200',
};

const statusLabels: Record<InterviewStatus, string> = {
  'scheduled': 'Scheduled',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'no-show': 'No-Show',
  'pending-feedback': 'Pending Feedback',
};

const stageLabels: Record<InterviewStage, string> = {
  'applied': 'Applied',
  'received': 'Received',
  'screening': 'Screening',
  'interview-1': 'Interview 1',
  'interview-2': 'Interview 2',
  'hr-round': 'HR Round',
  'offer': 'Offer',
};

interface InterviewTableProps {
  interviews: Interview[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onAction?: (action: string, interview: Interview) => void;
  initialStageFilter?: InterviewStage;
  initialKPIFilter?: string;
}

export function InterviewTable({ interviews, isLoading, hasError, onRetry, onAction, initialStageFilter, initialKPIFilter }: InterviewTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [interviewerFilter, setInterviewerFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [isCompact, setIsCompact] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  // Dynamically extract unique interviewers and roles from interviews
  const uniqueInterviewers = useMemo(() => {
    const names = new Set<string>();
    interviews.forEach(i => {
      if (i.interviewerName) names.add(i.interviewerName);
    });
    return Array.from(names).sort();
  }, [interviews]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    interviews.forEach(i => {
      if (i.role) roles.add(i.role);
    });
    return Array.from(roles).sort();
  }, [interviews]);

  // Update filters when external props change
  useEffect(() => {
    setStageFilter(initialStageFilter || 'all');
  }, [initialStageFilter]);

  const handleRowClick = (interview: Interview, e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox, buttons, or dropdown
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="checkbox"]') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }
    router.push(`/interviews/${interview.id}`);
  };

  const handleCandidateClick = (e: React.MouseEvent, candidateId: string) => {
    e.stopPropagation();
    router.push(`/candidates/${candidateId}`);
  };

  const filtered = interviews.filter((i) => {
    const matchesSearch =
      i.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      i.role.toLowerCase().includes(search.toLowerCase()) ||
      i.interviewerName.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || i.stage === stageFilter;
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesInterviewer = interviewerFilter === 'all' || i.interviewerName === interviewerFilter;
    const matchesRole = roleFilter === 'all' || i.role === roleFilter;

    // Apply KPI filter from dashboard cards
    let matchesKPI = true;
    if (initialKPIFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const interviewDate = new Date(i.dateTime);
      interviewDate.setHours(0, 0, 0, 0);

      switch (initialKPIFilter) {
        case 'scheduled-today':
          matchesKPI = i.status === 'scheduled' && interviewDate.getTime() === today.getTime();
          break;
        case 'pending-feedback':
          matchesKPI = i.status === 'pending-feedback';
          break;
        case 'completed':
          matchesKPI = i.status === 'completed';
          break;
        case 'no-shows':
          matchesKPI = i.status === 'no-show';
          break;
      }
    }

    let matchesDate = true;
    if (dateRange?.from) {
      const interviewDate = new Date(i.dateTime);
      matchesDate = interviewDate >= dateRange.from;
      if (dateRange.to) {
        matchesDate = matchesDate && interviewDate <= dateRange.to;
      }
    }

    return matchesSearch && matchesStage && matchesStatus && matchesInterviewer && matchesRole && matchesDate && matchesKPI;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((i) => i.id)));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStageFilter('all');
    setStatusFilter('all');
    setInterviewerFilter('all');
    setRoleFilter('all');
    setDateRange(undefined);
  };

  const hasActiveFilters = search || stageFilter !== 'all' || statusFilter !== 'all' ||
    interviewerFilter !== 'all' || roleFilter !== 'all' || dateRange;

  if (hasError) {
    return (
      <ErrorState
        title="Failed to load interviews"
        description="We couldn't fetch the interview data. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border flex gap-3">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      {/* Filters Bar */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates, roles, interviewers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>

            <div className="hidden sm:flex border-l border-border pl-2 gap-1">
              <Button
                variant={!isCompact ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsCompact(false)}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={isCompact ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsCompact(true)}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={interviewerFilter} onValueChange={setInterviewerFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Interviewer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Interviewers</SelectItem>
                {uniqueInterviewers.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    <span className="text-muted-foreground">Date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="secondary">Reschedule</Button>
          <Button size="sm" variant="secondary">Send Reminder</Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">Cancel</Button>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={paginated.length > 0 && selectedIds.size === paginated.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium text-muted-foreground">Select All</span>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} results</span>
        </div>

        {paginated.length === 0 ? (
          <EmptyState
            title="No interviews found"
            description={hasActiveFilters
              ? "Try adjusting your filters to find what you're looking for."
              : "Get started by scheduling your first interview."
            }
            action={hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {paginated.map((interview) => (
              <div
                key={interview.id}
                onClick={(e) => handleRowClick(interview, e)}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  selectedIds.has(interview.id) && "bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(interview.id)}
                      onCheckedChange={() => toggleSelect(interview.id)}
                      className="mt-1"
                    />
                    <div>
                      <div
                        className="font-semibold text-foreground"
                        onClick={(e) => handleCandidateClick(e, interview.candidateId)}
                      >
                        {interview.candidateName}
                      </div>
                      <p className="text-sm text-muted-foreground">{interview.role}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onAction?.('view', interview)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction?.('join', interview)}>
                        <Video className="h-4 w-4 mr-2" />
                        Join Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction?.('edit', interview)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Interview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onAction?.('cancel', interview)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel Interview
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="pl-8 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded border",
                      statusStyles[interview.status]
                    )}>
                      {statusLabels[interview.status]}
                    </span>
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {format(new Date(interview.dateTime), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{interview.interviewerName}</span>
                    <span>{stageLabels[interview.stage]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={paginated.length > 0 && selectedIds.size === paginated.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="font-semibold">Candidate</TableHead>
              <TableHead className="font-semibold">Interviewer</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Date/Time</TableHead>
              <TableHead className="font-semibold">Stage</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-24 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    title="No interviews found"
                    description={hasActiveFilters
                      ? "Try adjusting your filters to find what you're looking for."
                      : "Get started by scheduling your first interview."
                    }
                    action={hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((interview) => (
                <TableRow
                  key={interview.id}
                  onClick={(e) => handleRowClick(interview, e)}
                  className={cn(
                    "group transition-colors cursor-pointer",
                    isCompact ? "h-12" : "h-16"
                  )}
                >
                  <TableCell className={cn(isCompact && "py-2")}>
                    <Checkbox
                      checked={selectedIds.has(interview.id)}
                      onCheckedChange={() => toggleSelect(interview.id)}
                    />
                  </TableCell>
                  <TableCell className={cn(isCompact && "py-2")}>
                    <div>
                      <div
                        className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                        onClick={(e) => handleCandidateClick(e, interview.candidateId)}
                      >
                        {interview.candidateName}
                      </div>
                      {!isCompact && (
                        <div className="text-xs text-muted-foreground">{interview.candidateEmail}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-sm", isCompact && "py-2")}>{interview.interviewerName}</TableCell>
                  <TableCell className={cn("text-sm max-w-[150px] truncate", isCompact && "py-2")}>{interview.role}</TableCell>
                  <TableCell className={cn("text-sm", isCompact && "py-2")}>
                    <span suppressHydrationWarning>
                      {format(new Date(interview.dateTime), isCompact ? 'MMM d, h:mm a' : 'MMM d, yyyy h:mm a')}
                    </span>
                  </TableCell>
                  <TableCell className={cn(isCompact && "py-2")}>
                    <span className="text-xs font-medium">{stageLabels[interview.stage]}</span>
                  </TableCell>
                  <TableCell className={cn(isCompact && "py-2")}>
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded border",
                      statusStyles[interview.status]
                    )}>
                      {statusLabels[interview.status]}
                    </span>
                  </TableCell>
                  <TableCell className={cn("text-right", isCompact && "py-2")}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onAction?.('view', interview)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onAction?.('email', interview)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onAction?.('view', interview)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction?.('join', interview)}>
                            <Video className="h-4 w-4 mr-2" />
                            Join Meeting
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction?.('edit', interview)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Interview
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onAction?.('cancel', interview)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel Interview
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="p-3 sm:p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs sm:text-sm text-muted-foreground">
          {filtered.length > 0 ? ((page - 1) * pageSize) + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Previous</span>
          </Button>
          <span className="text-xs sm:text-sm text-muted-foreground px-2">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(page + 1)}
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
