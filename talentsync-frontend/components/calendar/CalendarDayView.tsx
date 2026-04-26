import { useMemo, useState, useEffect, useRef } from 'react';
import {
  format,
  isSameDay,
  setHours,
  getHours,
  getMinutes,
  differenceInMinutes,
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

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  userRole: UserRole;
  onEmptySlotClick: (date: Date) => void;
  onReschedule: (event: CalendarEvent) => void;
  onCancel: (event: CalendarEvent) => void;
  onComplete?: (event: CalendarEvent) => void;
  onAddNote?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const HOUR_HEIGHT = 80;


const stageColors: Record<string, string> = {
  received: 'bg-slate-500/15 border-slate-500/20 backdrop-blur-sm hover:bg-slate-500/25 shadow-sm',
  screening: 'bg-blue-500/15 border-blue-500/20 backdrop-blur-sm hover:bg-blue-500/25 shadow-sm',
  'interview-1': 'bg-indigo-500/15 border-indigo-500/20 backdrop-blur-sm hover:bg-indigo-500/25 shadow-sm',
  'interview-2': 'bg-violet-500/15 border-violet-500/20 backdrop-blur-sm hover:bg-violet-500/25 shadow-sm',
  'hr-round': 'bg-amber-500/15 border-amber-500/20 backdrop-blur-sm hover:bg-amber-500/25 shadow-sm',
  offer: 'bg-emerald-500/15 border-emerald-500/20 backdrop-blur-sm hover:bg-emerald-500/25 shadow-sm',
};

const statusBadgeColors: Record<string, string> = {
  scheduled: 'bg-primary/10 text-primary border border-primary/20',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  cancelled: 'bg-muted text-muted-foreground border border-border',
  'no-show': 'bg-destructive/10 text-destructive border border-destructive/20',
  'pending-feedback': 'bg-amber-100 text-amber-700 border border-amber-200',
};

export function CalendarDayView({
  currentDate,
  events,
  userRole,
  onEmptySlotClick,
  onReschedule,
  onCancel,
  onComplete,
  onAddNote,
}: CalendarDayViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Update "Now" every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (!containerRef.current || hasScrolledRef.current) return;

    const currentHour = getHours(new Date());
    if (currentHour >= 8 && currentHour <= 19) {
      const scrollPos = (currentHour - 8) * HOUR_HEIGHT - (containerRef.current.clientHeight / 2 - 100);
      containerRef.current.scrollTop = Math.max(0, scrollPos);
    }
    hasScrolledRef.current = true;
  }, []);

  const dayEvents = useMemo(() => {
    return events.filter((event) => isSameDay(new Date(event.startTime), currentDate));
  }, [events, currentDate]);

  const layoutMap = useMemo(() => getEventLayout(dayEvents), [dayEvents]);

  const getEventPosition = (event: CalendarEvent) => {
    const startDate = new Date(event.startTime);
    const startHour = getHours(startDate);
    const startMinutes = getMinutes(startDate);
    const durationMinutes = differenceInMinutes(new Date(event.endTime), startDate);

    const top = ((startHour - 8) * HOUR_HEIGHT) + ((startMinutes / 60) * HOUR_HEIGHT);
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 50) };
  };

  return (
    <div className="bg-background/40 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-[700px]">
      {/* Day Header */}
      <div className="py-4 px-6 border-b border-border/40 bg-muted/20 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {dayEvents.length} interview{dayEvents.length !== 1 ? 's' : ''} scheduled
        </p>
      </div>

      {/* Timeline */}
      <div
        ref={containerRef}
        className="overflow-auto flex-1 scroll-smooth"
      >
        <div className="grid grid-cols-[80px_1fr] min-w-[600px]">
          {/* Hour Labels */}
          <div className="border-r border-border/30 bg-background/50 backdrop-blur-sm sticky left-0 z-20">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] text-sm text-muted-foreground/60 text-right pr-4 pt-4 font-medium"
              >
                {format(setHours(new Date(), hour), 'h:mm a')}
              </div>
            ))}
          </div>

          {/* Event Column */}
          <div className="relative group">
            {/* Hour Slots */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[80px] border-b border-dashed border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                onMouseEnter={() => setHoveredSlot(hour)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => onEmptySlotClick(setHours(currentDate, hour))}
              />
            ))}

            {/* Ghost Event */}
            {hoveredSlot && userRole !== 'interviewer' && (
              <div
                className="absolute left-2 right-2 bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none z-0 backdrop-blur-[1px]"
                style={{
                  top: `${((hoveredSlot - 8) * HOUR_HEIGHT)}px`,
                  height: `${HOUR_HEIGHT}px`
                }}
              >
                <div className="p-3 text-sm text-primary font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  <span>Click to Schedule</span>
                </div>
              </div>
            )}

            {/* Current Time Indicator based on 'now' */}
            {isSameDay(now, currentDate) && (
              <motion.div
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                initial={false}
                animate={{
                  top: `${((getHours(now) - 8) * HOUR_HEIGHT) + ((getMinutes(now) / 60) * HOUR_HEIGHT)}px`
                }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
              >
                <div className="relative -ml-[5px] flex items-center justify-center">
                  <div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)] ring-2 ring-background z-10" />
                  <div className="absolute w-3 h-3 bg-primary rounded-full animate-ping opacity-75" />
                </div>
                <div className="h-[2px] bg-primary w-full shadow-[0_0_4px_rgba(var(--primary),0.4)] opacity-80" />
              </motion.div>
            )}

            {/* Events */}
            <AnimatePresence>
              {dayEvents.map((event, index) => {
                const { top, height } = getEventPosition(event);
                const layout = layoutMap[event.id] || { left: 0, width: 1 };
                const stageColor = stageColors[event.stage] || stageColors.received;
                const statusColor = statusBadgeColors[event.status] || statusBadgeColors.scheduled;

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
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20, delay: index * 0.05 }}
                            className={cn(
                              'absolute p-3 rounded-xl border-l-4 shadow-sm cursor-pointer transition-all duration-300 group',
                              'hover:shadow-lg hover:-translate-y-0.5 z-10',
                              'focus:outline-none focus:ring-2 focus:ring-primary/50',
                              stageColor
                            )}
                            style={{
                              top: `${top}px`,
                              minHeight: `${height}px`,
                              left: `calc(${layout.left * 100}% + 8px)`,
                              width: `calc(${layout.width * 100}% - 16px)`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-foreground text-sm">
                                    {format(new Date(event.startTime), 'h:mm')} -{' '}
                                    {format(new Date(event.endTime), 'h:mm')}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide',
                                      statusColor
                                    )}
                                  >
                                    {event.status.replace('-', ' ')}
                                  </span>
                                </div>
                                <h3 className="font-medium text-foreground truncate text-base">{event.candidateName}</h3>
                                <p className="text-sm text-muted-foreground truncate">{event.role}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border flex items-center justify-center shadow-sm">
                                  <span className="text-xs font-medium">{event.interviewerInitials}</span>
                                </div>
                              </div>
                            </div>
                            {height > 80 && (
                              <div className="mt-2 text-sm text-muted-foreground truncate font-medium opacity-80">
                                Interviewer: {event.interviewerName}
                              </div>
                            )}

                            {/* Quick Actions (Hover Only) */}
                            <div className="absolute top-2 right-2 overflow-hidden pointer-events-none">
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
                                      className="h-7 w-7 rounded-full shadow-md bg-background/90 hover:bg-background border border-border/50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(event.meetingLink, '_blank');
                                      }}
                                    >
                                      <Video className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        </PopoverTrigger>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80 p-0 overflow-hidden shadow-xl border-none" align="start" side="right">
                        <div className={cn("p-4 border-l-4", stageColor, "bg-opacity-50")}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-base">{event.candidateName}</div>
                              <div className="text-sm opacity-90">{event.role}</div>
                            </div>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase", statusColor)}>
                              {event.status}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-background text-sm space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-muted-foreground text-xs">
                            <div>
                              <span className="block font-medium text-foreground">Date</span>
                              {format(new Date(event.startTime), 'MMM d, yyyy')}
                            </div>
                            <div>
                              <span className="block font-medium text-foreground">Time</span>
                              {format(new Date(event.startTime), 'h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {event.interviewerInitials}
                            </div>
                            <div>
                              <div className="text-xs font-medium">Interviewer</div>
                              <div className="text-sm text-muted-foreground">{event.interviewerName}</div>
                            </div>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
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
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
