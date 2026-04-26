import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { CalendarEventCard } from './CalendarEvent';
import { CalendarEventPopover } from './CalendarEventPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserRole } from '@/types/navigation';
import { cn } from '@/lib/utils';

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  userRole: UserRole;
  onEmptySlotClick: (date: Date) => void;
  onReschedule: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onComplete?: (event: CalendarEvent) => void;
  onAddNote?: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Increased from 3 to allow more events on larger screens
const MAX_VISIBLE_EVENTS = 5;

export function CalendarMonthView({
  currentDate,
  events,
  userRole,
  onEmptySlotClick,
  onReschedule,
  onCancel,
  onComplete,
  onAddNote,
}: CalendarMonthViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weeksCount = days.length / 7;

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startTime), day));
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 overflow-hidden shadow-sm">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold tracking-wide text-muted-foreground bg-muted/30"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - auto-fills remaining height */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{
          gridTemplateRows: `repeat(${weeksCount}, minmax(0, 1fr))`
        }}
      >
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const hasMoreEvents = dayEvents.length > MAX_VISIBLE_EVENTS;
          const displayEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);

          // Calculate if this is the last row or last column to remove borders
          // const isLastRow = Math.floor(idx / 7) === weeksCount - 1;
          const isLastCol = (idx + 1) % 7 === 0;

          return (
            <div
              key={idx}
              className={cn(
                'relative p-1 transition-colors border-b border-r border-border/30 hover:bg-muted/10',
                !isCurrentMonth && 'bg-muted/5',
                isCurrentDay && 'bg-primary/5',
                isLastCol && 'border-r-0'
              )}
              onClick={(e) => {
                // Only trigger if clicking the cell background, not an event
                if (e.target === e.currentTarget || e.target === e.currentTarget.firstChild) {
                  onEmptySlotClick(day);
                }
              }}
            >
              {/* Date Header */}
              <div
                className={cn(
                  "flex justify-between items-center px-1 py-1 mb-1 pointer-events-none",
                  !isCurrentMonth && "text-muted-foreground/50"
                )}
              >
                <div className={cn(
                  "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                  isCurrentDay
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/80"
                )}>
                  {format(day, 'd')}
                </div>
                {isCurrentDay && (
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wider mr-1">Today</span>
                )}
              </div>

              {/* Events Container */}
              <div className="space-y-1 overflow-y-auto max-h-[calc(100%-2rem)] px-0.5 custom-scrollbar">
                {displayEvents.map((event) => (
                  <Popover
                    key={event.id}
                    open={selectedEvent?.id === event.id}
                    onOpenChange={(open) => setSelectedEvent(open ? event : null)}
                  >
                    <PopoverTrigger asChild>
                      <div onClick={(e) => e.stopPropagation()}>
                        <CalendarEventCard
                          event={event}
                          compact
                          onClick={() => setSelectedEvent(event)}
                        />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <CalendarEventPopover
                        event={event}
                        userRole={userRole}
                        onClose={() => setSelectedEvent(null)}
                        onReschedule={onReschedule}
                        onCancel={onCancel}
                        onComplete={onComplete}
                        onAddNote={onAddNote}
                      />
                    </PopoverContent>
                  </Popover>
                ))}

                {hasMoreEvents && (
                  <div
                    className="text-xs text-muted-foreground hover:text-primary font-medium px-2 py-1 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Ideally switch to day view or show a modal
                      onEmptySlotClick(day);
                    }}
                  >
                    + {dayEvents.length - MAX_VISIBLE_EVENTS} more...
                  </div>
                )}
              </div>

              {/* Click target overlay for empty space */}
              <div
                className="absolute inset-0 z-0"
                onClick={() => onEmptySlotClick(day)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
