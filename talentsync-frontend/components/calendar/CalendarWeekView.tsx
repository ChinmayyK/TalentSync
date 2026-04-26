import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  setHours,
  getHours,
  getMinutes,
  differenceInMinutes,
  isWeekend,
} from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { CalendarEventPopover } from './CalendarEventPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Video, Plus } from 'lucide-react';
import { UserRole } from '@/types/navigation';
import { cn } from '@/lib/utils';
import { getEventLayout } from '@/lib/calendar-layout';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  userRole: UserRole;
  onEmptySlotClick: (date: Date) => void;
  onReschedule: (event: CalendarEvent) => void;
  onManualReschedule?: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onComplete?: (event: CalendarEvent) => void;
  onAddNote?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
const HOUR_HEIGHT = 64; // Increased slightly for better readability


const stageColors: Record<string, string> = {
  received: 'bg-slate-500/15 text-slate-700 border-slate-500/20 backdrop-blur-sm hover:bg-slate-500/25 shadow-sm',
  screening: 'bg-blue-500/15 text-blue-700 border-blue-500/20 backdrop-blur-sm hover:bg-blue-500/25 shadow-sm',
  'interview-1': 'bg-indigo-500/15 text-indigo-700 border-indigo-500/20 backdrop-blur-sm hover:bg-indigo-500/25 shadow-sm',
  'interview-2': 'bg-violet-500/15 text-violet-700 border-violet-500/20 backdrop-blur-sm hover:bg-violet-500/25 shadow-sm',
  'hr-round': 'bg-amber-500/15 text-amber-700 border-amber-500/20 backdrop-blur-sm hover:bg-amber-500/25 shadow-sm',
  offer: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 backdrop-blur-sm hover:bg-emerald-500/25 shadow-sm',
};

export function CalendarWeekView({
  currentDate,
  events,
  userRole,
  onEmptySlotClick,
  onReschedule,
  onManualReschedule,
  onCancel,
  onComplete,
  onAddNote,
}: CalendarWeekViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{ id: string; originalDuration: number; startY: number; newDuration: number } | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ day: Date; hour: number } | null>(null);
  const [now, setNow] = useState(new Date());

  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Update "Now" every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Auto-scroll to current time on mount (only once)
  useEffect(() => {
    if (!containerRef.current || hasScrolledRef.current) return;

    const currentHour = getHours(new Date());
    if (currentHour >= 8 && currentHour <= 19) {
      const scrollPos = (currentHour - 8) * HOUR_HEIGHT - (containerRef.current.clientHeight / 2 - 100);
      containerRef.current.scrollTop = Math.max(0, scrollPos);
    }
    hasScrolledRef.current = true;
  }, []);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startTime), day));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startDate = new Date(event.startTime);
    const startHour = getHours(startDate);
    const startMinutes = getMinutes(startDate);
    const durationMinutes = differenceInMinutes(new Date(event.endTime), startDate);

    const top = ((startHour - 8) * HOUR_HEIGHT) + ((startMinutes / 60) * HOUR_HEIGHT);
    // Use resizing duration if available
    const displayDuration = resizingEvent?.id === event.id ? resizingEvent.newDuration : durationMinutes;
    const height = (displayDuration / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 34) };
  };

  const dayLayouts = useMemo(() => {
    const layouts: Record<string, ReturnType<typeof getEventLayout>> = {};
    days.forEach(day => {
      const dayEvents = getEventsForDay(day);
      layouts[day.toISOString()] = getEventLayout(dayEvents);
    });
    return layouts;
  }, [events, days]);

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    if (userRole === 'interviewer') return;
    setDraggedEvent(event);
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    if (draggedEvent && userRole !== 'interviewer') {
      const newDate = setHours(day, hour);
      // Call onReschedule with the updated startTime - this will trigger auto-save
      onReschedule({ ...draggedEvent, startTime: newDate.toISOString() });
    }
    setDraggedEvent(null);
  };

  // Resize Handling
  const handleResizeStart = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (userRole === 'interviewer') return;

    setResizingEvent({
      id: event.id,
      originalDuration: event.duration,
      startY: e.clientY,
      newDuration: event.duration
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingEvent) return;

      const deltaY = e.clientY - resizingEvent.startY;
      // Calculate minutes based on pixels (HOUR_HEIGHT = 60 mins)
      const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60);
      // Snap to 15 minute increments
      const snappedDelta = Math.round(deltaMinutes / 15) * 15;

      const newDuration = Math.max(15, resizingEvent.originalDuration + snappedDelta);
      setResizingEvent(prev => prev ? { ...prev, newDuration } : null);
    };

    const handleMouseUp = () => {
      if (!resizingEvent) return;

      if (resizingEvent.newDuration !== resizingEvent.originalDuration) {
        const eventToUpdate = events.find((ev: CalendarEvent) => ev.id === resizingEvent.id);
        if (eventToUpdate) {
          // Update event with new duration - onReschedule will handle the backend update
          onReschedule({ ...eventToUpdate, duration: resizingEvent.newDuration });
        }
      }
      setResizingEvent(null);
    };

    if (resizingEvent) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingEvent, events, onReschedule]);

  return (
    <div className="bg-background/40 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-240px)]">
      {/* Day Headers */}
      <div className="overflow-x-auto custom-scrollbar flex-1 flex flex-col">
        <div className="min-w-[600px] grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/40 bg-muted/20 flex-none z-10 sticky top-0 backdrop-blur-sm">
          <div className="py-4 border-r border-border/30" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'py-3 text-center border-r border-border/30 last:border-r-0',
                isToday(day) ? 'bg-primary/5' : '',
                isWeekend(day) ? 'bg-muted/10' : ''
              )}
            >
              <div className={cn(
                "text-xs font-medium uppercase mb-1 tracking-wider",
                isToday(day) ? "text-primary" : "text-muted-foreground"
              )}>
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-xl font-semibold inline-flex items-center justify-center w-8 h-8 rounded-full transition-all',
                  isToday(day)
                    ? 'bg-primary text-primary-foreground shadow-md scale-110'
                    : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[600px] min-h-full pt-4">
            {/* Hour Labels */}
            <div className="border-r border-border/30 bg-background/50 backdrop-blur-sm sticky left-0 z-20">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="relative h-[64px]"
                >
                  <span className="absolute -top-2.5 right-3 text-xs font-medium text-muted-foreground/60">
                    {format(setHours(new Date(), hour), 'h a')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day);
              const isDayToday = isToday(day);
              const layouts = dayLayouts[day.toISOString()] || {};

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative border-r border-border/30 last:border-r-0 min-h-full group',
                    isDayToday ? 'bg-primary/[0.01]' : '',
                    isWeekend(day) ? 'bg-muted/[0.05]' : ''
                  )}
                >
                  {/* Hour Slots */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-[64px] border-b border-dashed border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                      onMouseEnter={() => setHoveredSlot({ day, hour })}
                      onMouseLeave={() => setHoveredSlot(null)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, hour)}
                      onClick={() => onEmptySlotClick(setHours(day, hour))}
                    />
                  ))}

                  {/* Ghost Event */}
                  {hoveredSlot && isSameDay(hoveredSlot.day, day) && userRole !== 'interviewer' && (
                    <div
                      className="absolute left-1 right-1 bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none z-0 backdrop-blur-[1px]"
                      style={{
                        top: `${((hoveredSlot.hour - 8) * HOUR_HEIGHT)}px`,
                        height: `${HOUR_HEIGHT}px`
                      }}
                    >
                      <div className="p-2 text-xs text-primary font-medium flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        <span>Schedule</span>
                      </div>
                    </div>
                  )}

                  {/* Current Time Indicator (Live) */}
                  {isDayToday && (
                    <motion.div
                      className="absolute w-full flex items-center z-30 pointer-events-none"
                      initial={false}
                      animate={{
                        top: `${((getHours(now) - 8) * HOUR_HEIGHT) + ((getMinutes(now) / 60) * HOUR_HEIGHT)}px`
                      }}
                      transition={{ type: "spring", stiffness: 50, damping: 20 }}
                    >
                      <div className="relative -ml-1.5 flex items-center justify-center">
                        <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)] ring-2 ring-background z-10" />
                        <div className="absolute w-3 h-3 bg-primary rounded-full animate-ping opacity-75" />
                      </div>
                      <div className="h-[2px] bg-primary w-full shadow-[0_0_4px_rgba(var(--primary),0.4)] opacity-80" />
                    </motion.div>
                  )}

                  {/* Events */}
                  <AnimatePresence>
                    {dayEvents.map((event, eventIndex) => {
                      const { top, height } = getEventPosition(event);
                      const layout = layouts[event.id] || { left: 0, width: 1 };
                      const stageStyle = stageColors[event.stage] || stageColors.received;

                      return (
                        <Popover
                          key={event.id}
                          open={selectedEvent?.id === event.id}
                          onOpenChange={(open) => setSelectedEvent(open ? event : null)}
                        >
                          <HoverCard openDelay={300}>
                            <HoverCardTrigger asChild>
                              <PopoverTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20, delay: eventIndex * 0.05 + dayIndex * 0.02 }}
                                  draggable={userRole !== 'interviewer'}
                                  onDragStart={(e) => handleDragStart(e as any, event)}
                                  className={cn(
                                    'absolute rounded-lg border-l-4 px-2 py-1.5 cursor-pointer transition-all duration-300 group',
                                    'shadow-sm hover:shadow-lg hover:-translate-y-0.5 z-10',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                                    stageStyle,
                                    draggedEvent?.id === event.id && 'opacity-50 scale-95'
                                  )}
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    left: `${layout.left * 100}%`,
                                    width: `${layout.width * 100}%`,
                                    maxWidth: '100%'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                  }}
                                >
                                  <div className="font-semibold text-xs leading-tight truncate">
                                    {event.candidateName}
                                  </div>
                                  {height > 40 && (
                                    <div className="text-[11px] opacity-80 truncate mt-0.5 font-medium">
                                      {event.role}
                                    </div>
                                  )}
                                  {height > 55 && (
                                    <div className="text-[10px] opacity-70 truncate mt-0.5">
                                      {format(new Date(event.startTime), 'h:mm a')}
                                    </div>
                                  )}

                                  {/* Quick Actions (Hover Only) */}
                                  <div className="absolute top-1 right-1 overflow-hidden pointer-events-none">
                                    <AnimatePresence>
                                      {event.meetingLink && (
                                        <motion.div
                                          initial={{ x: 20, opacity: 0 }}
                                          whileHover={{ x: 0, opacity: 1 }}
                                          className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-auto"
                                        >
                                          <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-6 w-6 rounded-full shadow-md bg-background/90 hover:bg-background border border-border/50"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(event.meetingLink, '_blank');
                                            }}
                                          >
                                            <Video className="h-3 w-3 text-primary" />
                                          </Button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              </PopoverTrigger>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80 p-0 overflow-hidden shadow-xl border-none" align="start" side="right">
                              <div className={cn("p-3 border-l-4", stageStyle, "bg-opacity-50")}>
                                <div className="font-semibold text-sm">{event.candidateName}</div>
                                <div className="text-xs opacity-90">{event.role}</div>
                              </div>
                              <div className="p-3 bg-background text-sm space-y-2">
                                <div className="flex justify-between text-muted-foreground text-xs">
                                  <span>{format(new Date(event.startTime), 'MMM d, yyyy')}</span>
                                  <span>{format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {event.interviewerInitials}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{event.interviewerName}</span>
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>

                          {/* Resize Handle */}
                          {userRole !== 'interviewer' && (
                            <div
                              className="absolute bottom-0 h-1.5 cursor-ns-resize hover:bg-black/10 z-20"
                              style={{
                                left: `${layout.left * 100}%`,
                                width: `${layout.width * 100}%`,
                                top: `${top + height - 6}px`
                              }}
                              onMouseDown={(e) => handleResizeStart(e, event)}
                            />
                          )}
                          <PopoverContent className="p-0 w-auto border-none shadow-xl" align="start" sideOffset={5}>
                            <CalendarEventPopover
                              event={event}
                              userRole={userRole}
                              onClose={() => setSelectedEvent(null)}
                              onReschedule={onManualReschedule || onReschedule}
                              onCancel={onCancel}
                              onComplete={onComplete}
                              onAddNote={onAddNote}
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
