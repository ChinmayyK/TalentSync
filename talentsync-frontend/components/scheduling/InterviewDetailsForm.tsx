import { useState, useMemo, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Video, MapPin, Phone, Check, Clock, Sparkles, Sun, Sunset, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Interviewer, TimeSlot } from '@/types/scheduling';
import { durationOptions } from '@/lib/scheduling-mock-data';
import { getTeamAvailability, UserAvailability } from '@/lib/api/calendar';

type InterviewMode = 'online' | 'offline' | 'phone';

interface InterviewDetailsFormProps {
  interviewers: Interviewer[];
  timeSlots: TimeSlot[];
  selectedInterviewerIds: string[];
  onInterviewerChange: (ids: string[]) => void;
  interviewMode: InterviewMode;
  onModeChange: (mode: InterviewMode) => void;
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  selectedTime: string;
  onTimeChange: (time: string) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  location: string;
  onLocationChange: (location: string) => void;
  meetingLink: string;
  onMeetingLinkChange: (link: string) => void;
  isLoading?: boolean;
}

const modeOptions = [
  { value: 'online' as const, label: 'Video Call', icon: Video, description: 'Google Meet, Zoom, etc.' },
  { value: 'offline' as const, label: 'In-Person', icon: MapPin, description: 'Office meeting room' },
  { value: 'phone' as const, label: 'Phone', icon: Phone, description: 'Phone call' },
];

export function InterviewDetailsForm({
  interviewers,
  timeSlots,
  selectedInterviewerIds,
  onInterviewerChange,
  interviewMode,
  onModeChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  duration,
  onDurationChange,
  location,
  onLocationChange,
  meetingLink,
  onMeetingLinkChange,
  isLoading,
}: InterviewDetailsFormProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<UserAvailability[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Fetch real availability when date changes
  useEffect(() => {
    // Only fetch if we have a date and at least one interviewer
    const interviewerIds = interviewers.map(i => i.id);
    if (selectedDate && interviewerIds.length > 0) {
      setLoadingAvailability(true);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      getTeamAvailability({
        userIds: interviewerIds,
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
        slotDurationMins: duration,
      })
        .then(response => {
          setAvailabilityData(response.userAvailability || []);
        })
        .catch(err => {
          console.error('Failed to fetch availability:', err);
          setAvailabilityData([]);
        })
        .finally(() => {
          setLoadingAvailability(false);
        });
    } else {
      setAvailabilityData([]);
    }
  }, [selectedDate, interviewers, duration]);

  // Calculate availability status for each interviewer
  const getInterviewerAvailability = (interviewerId: string): 'available' | 'partial' | 'busy' => {
    if (!selectedDate || loadingAvailability) return 'partial';

    const userAvail = availabilityData.find(u => u.userId === interviewerId);
    if (!userAvail) return 'partial'; // No data, assume partially available

    // Count available hours
    let totalAvailableMinutes = 0;
    userAvail.intervals.forEach(interval => {
      const start = new Date(interval.start);
      const end = new Date(interval.end);
      totalAvailableMinutes += (end.getTime() - start.getTime()) / 60000;
    });

    // If more than 4 hours available, they're available
    if (totalAvailableMinutes >= 240) return 'available';
    // If some availability, they're partial
    if (totalAvailableMinutes > 0) return 'partial';
    // Otherwise busy
    return 'busy';
  };

  // Check if a specific time slot is available for selected interviewers
  const isTimeSlotAvailableForInterviewers = (slotTime: string): boolean => {
    if (!selectedDate || selectedInterviewerIds.length === 0) return true;

    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    // Check if all selected interviewers are available at this time
    return selectedInterviewerIds.every(interviewerId => {
      const userAvail = availabilityData.find(u => u.userId === interviewerId);
      if (!userAvail) return true; // No data, assume available

      // Check if this slot falls within any of their available intervals
      return userAvail.intervals.some(interval => {
        const intervalStart = new Date(interval.start);
        const intervalEnd = new Date(interval.end);
        return slotStart >= intervalStart && slotEnd <= intervalEnd;
      });
    });
  };

  // Group time slots by morning/afternoon
  const groupedTimeSlots = useMemo(() => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];

    timeSlots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0], 10);
      if (hour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    });

    return { morning, afternoon };
  }, [timeSlots]);

  const toggleInterviewer = (id: string) => {
    if (selectedInterviewerIds.includes(id)) {
      onInterviewerChange(selectedInterviewerIds.filter((i) => i !== id));
    } else {
      onInterviewerChange([...selectedInterviewerIds, id]);
    }
  };

  const getAvailabilityColor = (availability: 'available' | 'partial' | 'busy') => {
    switch (availability) {
      case 'available':
        return 'bg-emerald-500';
      case 'partial':
        return 'bg-amber-500';
      case 'busy':
        return 'bg-red-500';
    }
  };

  const getAvailabilityText = (availability: 'available' | 'partial' | 'busy') => {
    if (!selectedDate) return 'Select a date to check availability';
    switch (availability) {
      case 'available':
        return `Available on ${format(selectedDate, 'MMM d')}`;
      case 'partial':
        return `Limited availability on ${format(selectedDate, 'MMM d')}`;
      case 'busy':
        return `Busy on ${format(selectedDate, 'MMM d')}`;
    }
  };

  // Determine if a slot should be recommended based on:
  // 1. All selected interviewers are available
  // 2. Falls in common interview windows (10-11 AM or 2-4 PM)
  const isSlotRecommended = (slotTime: string): boolean => {
    const [hours] = slotTime.split(':').map(Number);
    const isCommonTime = (hours >= 10 && hours < 12) || (hours >= 14 && hours < 17);
    const isAvailableForAll = isTimeSlotAvailableForInterviewers(slotTime);

    // If interviewers are selected, recommend slots where all are available during common times
    if (selectedInterviewerIds.length > 0) {
      return isAvailableForAll && isCommonTime;
    }

    // If no interviewers selected yet, just recommend common interview times
    return isCommonTime;
  };

  const TimeSlotButton = ({ slot }: { slot: TimeSlot }) => {
    const isAvailableForTeam = isTimeSlotAvailableForInterviewers(slot.time);
    const isDisabled = !slot.available || (!isAvailableForTeam && selectedInterviewerIds.length > 0);
    const isRecommended = isSlotRecommended(slot.time);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            key={slot.time}
            disabled={isDisabled}
            onClick={() => onTimeChange(slot.time)}
            className={cn(
              'relative px-3 py-2 rounded-md text-sm font-medium transition-all min-w-[60px]',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              isDisabled
                ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                : selectedTime === slot.time
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isRecommended && isAvailableForTeam
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/50'
                    : !isAvailableForTeam
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/50'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {slot.time}
            {isRecommended && selectedTime !== slot.time && isAvailableForTeam && (
              <Check className="absolute -top-1 -right-1 h-3 w-3 text-emerald-600 bg-emerald-100 rounded-full p-0.5" />
            )}
            {!isAvailableForTeam && selectedInterviewerIds.length > 0 && (
              <AlertCircle className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isDisabled
            ? 'Not available'
            : !isAvailableForTeam
              ? 'Selected interviewer(s) may not be available'
              : isRecommended
                ? 'Recommended - All interviewers available'
                : 'Available'}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Interview Mode - Prominent at top */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Interview Format</Label>
          <div className="grid grid-cols-3 gap-3">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = interviewMode === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => onModeChange(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-background hover:bg-accent/30'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <span className={cn('text-sm font-medium block', isSelected ? 'text-primary' : 'text-foreground')}>
                      {option.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{option.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Duration Row - Move before interviewers for better availability checking */}
        <div className="grid grid-cols-2 gap-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Interview Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-11',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'EEE, MMM d') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    onDateChange(date);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Duration</Label>
            <Select value={duration.toString()} onValueChange={(v) => onDurationChange(Number(v))}>
              <SelectTrigger className="bg-background h-11">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                {durationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Interviewers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Select Interviewers</Label>
              {loadingAvailability && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            {selectedInterviewerIds.length > 0 && (
              <span className="text-xs text-primary font-medium">{selectedInterviewerIds.length} selected</span>
            )}
          </div>

          {selectedDate && (
            <p className="text-xs text-muted-foreground -mt-1">
              Showing availability for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {interviewers.map((interviewer) => {
                const isSelected = selectedInterviewerIds.includes(interviewer.id);
                const availability = getInterviewerAvailability(interviewer.id);
                const isBusy = availability === 'busy';

                return (
                  <Tooltip key={interviewer.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => toggleInterviewer(interviewer.id)}
                        className={cn(
                          'relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : isBusy && selectedDate
                              ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'
                              : 'border-border bg-background hover:bg-accent/30'
                        )}
                      >
                        {/* Avatar with availability dot */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                            <span className="text-xs font-semibold text-secondary-foreground">
                              {interviewer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          {selectedDate && (
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                                getAvailabilityColor(availability)
                              )}
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {interviewer.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{interviewer.department || interviewer.role}</p>
                        </div>

                        {/* Availability Badge for selected date */}
                        {selectedDate && isBusy && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700">
                            Busy
                          </Badge>
                        )}

                        {/* Selection check */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{getAvailabilityText(availability)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>

        {/* Time Slots - Grouped */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Time Slot</Label>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/50">
                <Check className="h-3 w-3" />
                Best
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/50">
                <AlertCircle className="h-3 w-3" />
                Limited
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Morning Slots */}
            {groupedTimeSlots.morning.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sun className="h-3.5 w-3.5" />
                  <span>Morning</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupedTimeSlots.morning.map((slot) => (
                    <TimeSlotButton key={slot.time} slot={slot} />
                  ))}
                </div>
              </div>
            )}

            {/* Afternoon Slots */}
            {groupedTimeSlots.afternoon.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sunset className="h-3.5 w-3.5" />
                  <span>Afternoon</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {groupedTimeSlots.afternoon.map((slot) => (
                    <TimeSlotButton key={slot.time} slot={slot} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conditional: Meeting Link or Location */}
        {interviewMode === 'online' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Meeting Link</Label>
            <Input
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => onMeetingLinkChange(e.target.value)}
              className="bg-background h-11"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Leave empty to auto-generate a meeting link
            </p>
          </div>
        )}

        {interviewMode === 'offline' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Location</Label>
            <Input
              placeholder="e.g., Conference Room A, Floor 3"
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="bg-background h-11"
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
