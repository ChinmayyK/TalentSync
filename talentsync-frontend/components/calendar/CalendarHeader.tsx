import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Users, Globe } from 'lucide-react';
import { format, addMonths, addWeeks, addDays, subMonths, subWeeks, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarView, CalendarFilters } from '@/types/calendar';
import { UserRole } from '@/types/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Interviewer {
  id: string;
  name: string;
}

interface CalendarHeaderProps {
  view: CalendarView;
  currentDate: Date;
  filters: CalendarFilters;
  userRole: UserRole;
  interviewers?: Interviewer[];
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onFiltersChange: (filters: CalendarFilters) => void;
  onScheduleClick: () => void;
  onBulkScheduleClick?: () => void;
}

const stageOptions = [
  { value: 'all', label: 'All Stages' },
  { value: 'received', label: 'Received' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview-1', label: 'Interview 1' },
  { value: 'interview-2', label: 'Interview 2' },
  { value: 'hr-round', label: 'HR Round' },
  { value: 'offer', label: 'Offer' },
];

export function CalendarHeader({
  view,
  currentDate,
  filters,
  userRole,
  interviewers = [],
  onViewChange,
  onDateChange,
  onFiltersChange,
  onScheduleClick,
  onBulkScheduleClick,
}: CalendarHeaderProps) {
  const canSchedule = userRole !== 'interviewer';
  const [timeZone, setTimeZone] = useState('');

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const getDateLabel = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        return format(currentDate, "'Week of' MMM d, yyyy");
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  const navigatePrev = () => {
    switch (view) {
      case 'month':
        onDateChange(subMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(subDays(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'month':
        onDateChange(addMonths(currentDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(currentDate, 1));
        break;
      case 'day':
        onDateChange(addDays(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col gap-6 pb-6 border-b border-border/40 bg-background/50 backdrop-blur-sm -mx-4 px-4 sticky top-0 z-10">
      {/* Row 1: Title + Actions */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <div className="p-2 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors">
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">Calendar</h1>
            {timeZone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Globe className="w-3 h-3" />
                <span>{timeZone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 flex-wrap 2xl:justify-end">
          <div className="grid grid-cols-2 sm:flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select
              value={filters.interviewerId}
              onValueChange={(value) => onFiltersChange({ ...filters, interviewerId: value as CalendarFilters['interviewerId'] })}
            >
              <SelectTrigger className="w-full sm:w-[160px] h-9 bg-background border-border/60">
                <SelectValue placeholder="All Interviewers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Interviewers</SelectItem>
                {interviewers.map((interviewer) => (
                  <SelectItem key={interviewer.id} value={interviewer.id}>
                    {interviewer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.stage}
              onValueChange={(value) => onFiltersChange({ ...filters, stage: value as CalendarFilters['stage'] })}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-9 bg-background border-border/60">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value as CalendarFilters['status'] })}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-9 bg-background/50 border-border/50 hover:bg-background/80 transition-colors">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
                <SelectItem value="pending-feedback">Pending Feedback</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by Role..."
              value={filters.role === 'all' ? '' : filters.role}
              onChange={(e) => onFiltersChange({ ...filters, role: e.target.value || 'all' })}
              className="w-full sm:w-[140px] h-9 bg-background border-border/60"
            />
          </div>

          {canSchedule && (
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <Button onClick={onScheduleClick} className="flex-1 sm:flex-none gap-2 shadow-sm whitespace-nowrap">
                <Plus className="h-4 w-4" />
                Schedule Interview
              </Button>
              {onBulkScheduleClick && (
                <Button onClick={onBulkScheduleClick} variant="outline" className="flex-1 sm:flex-none gap-2 whitespace-nowrap">
                  <Users className="h-4 w-4" />
                  Bulk Schedule
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Navigation + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50 self-start sm:self-auto">
          {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium capitalize rounded-md transition-all duration-200",
                view === v
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-background rounded-md border border-border p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={navigatePrev}
              className="h-8 w-8 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="h-8 px-3 text-xs font-medium hover:bg-muted"
            >
              Today
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="icon"
              onClick={navigateNext}
              className="h-8 w-8 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-lg font-semibold text-foreground min-w-[200px] text-right tabular-nums">
            {getDateLabel()}
          </span>
        </div>
      </div>
    </div>
  );
}
