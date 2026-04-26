"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarView, CalendarFilters, CalendarEvent } from '@/types/calendar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView';
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView';
import { CalendarDayView } from '@/components/calendar/CalendarDayView';
import { ScheduleInterviewModal } from '@/components/scheduling/ScheduleInterviewModal';
import { BulkScheduleModal } from '@/components/scheduling/BulkScheduleModal';
import { useSlots, useCancelSlot, useRescheduleSlot, calendarKeys } from '@/lib/hooks/useCalendar';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import {
    format,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addDays,
    addWeeks,
    addMonths,
    subDays,
    subWeeks,
    subMonths,
} from 'date-fns';
import { slotsToCalendarEvents, getCalendarDateRange, interviewsToCalendarEvents } from '@/lib/calendar-utils';
import { getInterviews } from '@/lib/api/interviews';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { getUsers } from '@/lib/api/users';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addHours } from 'date-fns';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

// Mock current user
const CURRENT_USER = {
    id: 'user-1',
    role: 'admin' as any, // Changed to any to match original userRole type
};

export default function Calendar() {
    const { activeTenantId, tenants, isAuthenticated, isLoading: authLoading } = useAuth();
    const activeTenant = tenants.find(t => t.id === activeTenantId);
    const userRole = (activeTenant?.role?.toLowerCase() as any) || 'recruiter';
    const queryClient = useQueryClient();
    const router = useRouter();

    const [view, setView] = useState<CalendarView>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filters, setFilters] = useState<CalendarFilters>({
        interviewerId: 'all',
        stage: 'all',
        status: 'all',
        role: 'all',
    });
    const [isCreateSlotOpen, setIsCreateSlotOpen] = useState(false);
    const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);
    const [selectedSlotDate, setSelectedSlotDate] = useState<Date | undefined>(undefined);
    const [rescheduleEvent, setRescheduleEvent] = useState<CalendarEvent | null>(null);
    const [cancelEvent, setCancelEvent] = useState<CalendarEvent | null>(null);
    const [rescheduleDateTime, setRescheduleDateTime] = useState('');
    const [interviewers, setInterviewers] = useState<{ id: string; name: string }[]>([]);

    // Load interviewers from API on mount
    useEffect(() => {
        getUsers({ role: 'INTERVIEWER' })
            .then((res) => {
                const mapped = (res.data || []).map((u: any) => ({ id: u.id, name: u.name }));
                setInterviewers(mapped);
            })
            .catch((err) => console.error('Failed to load interviewers:', err));
    }, []);

    // Calculate date range for the current view
    const dateRange = useMemo(() => getCalendarDateRange(currentDate, view), [currentDate, view]);

    // Fetch slots from API
    const {
        data: slotsData,
        isLoading: slotsLoading,
        error: slotsError,
    } = useSlots({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
    }, isAuthenticated && !authLoading);

    // Fetch interviews from API
    const {
        data: interviewsData,
        isLoading: interviewsLoading,
        error: interviewsError,
    } = useQuery({
        queryKey: ['interviews', 'calendar', dateRange.start.toISOString(), dateRange.end.toISOString()],
        queryFn: () => getInterviews({
            from: dateRange.start.toISOString(),
            to: dateRange.end.toISOString(),
        }),
        enabled: isAuthenticated && !authLoading, // Wait for auth to be ready
    });

    // Include auth loading in overall loading state
    const isLoading = authLoading || slotsLoading || interviewsLoading;
    const error = slotsError || interviewsError;

    // Cancel and reschedule mutations
    const cancelSlotMutation = useCancelSlot();
    const rescheduleSlotMutation = useRescheduleSlot();

    // Transform slots and interviews to calendar events and apply filters
    const filteredEvents = useMemo(() => {
        // Get events from interviews first
        const interviewEvents = interviewsData?.data ? interviewsToCalendarEvents(interviewsData.data) : [];
        const interviewIds = new Set(interviewEvents.map(e => e.id));

        // Get events from slots, filtering out those that are linked to loaded interviews
        // This prevents duplicates where both the Slot and the Interview appear
        const slotEvents = slotsData?.items
            ? slotsToCalendarEvents(
                slotsData.items.filter(slot =>
                    // Keep slot if it's not linked to an interview OR if the linked interview isn't loaded
                    !slot.interviewId || !interviewIds.has(slot.interviewId)
                )
            )
            : [];

        // Merge events
        const mergedEvents = [
            ...interviewEvents,
            ...slotEvents,
        ];

        return mergedEvents.filter((event) => {
            if (filters.interviewerId !== 'all' && event.interviewerId !== filters.interviewerId) {
                return false;
            }
            if (filters.stage !== 'all' && event.stage !== filters.stage) {
                return false;
            }
            if (filters.status !== 'all' && event.status !== filters.status) {
                return false;
            }
            if (filters.role !== 'all' && !event.role?.toLowerCase().includes(filters.role.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [slotsData, interviewsData, filters]);

    const handleEmptySlotClick = (date: Date) => {
        if (userRole === 'interviewer') return;
        setSelectedSlotDate(date);
        setIsCreateSlotOpen(true);
    };

    const handleScheduleClick = () => {
        setSelectedSlotDate(undefined);
        setIsCreateSlotOpen(true);
    };

    // Date Navigation Logic
    const handleNavigate = (direction: 'prev' | 'next') => {
        switch (view) {
            case 'day':
                setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
                break;
            case 'week':
                setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
                break;
            case 'month':
                setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
                break;
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                (document.activeElement as HTMLElement).isContentEditable
            ) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 't':
                    setCurrentDate(new Date());
                    break;
                case 'w':
                    setView('week');
                    break;
                case 'm':
                    setView('month');
                    break;
                case 'd':
                    setView('day');
                    break;
                case 'arrowright':
                    handleNavigate('next');
                    break;
                case 'arrowleft':
                    handleNavigate('prev');
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, currentDate]); // Re-bind when view/date changes to capture correct closure state

    // Called from DnD/Resize with modified event data - auto-save
    const handleReschedule = async (event: CalendarEvent) => {
        // For DnD/Resize operations, event already has the new startTime or duration
        // Call API directly to update
        try {
            const newStartAt = new Date(event.startTime);
            const duration = event.duration;
            const newEndAt = new Date(newStartAt.getTime() + duration * 60000);

            // Route based on event source
            if (event.source === 'interview') {
                // Use interview reschedule API
                const { rescheduleInterview } = await import('@/lib/api/interviews');
                await rescheduleInterview(event.id, {
                    newDate: newStartAt.toISOString(),
                    reason: 'Updated via calendar',
                });
            } else {
                // Use slot reschedule API
                await rescheduleSlotMutation.mutateAsync({
                    id: event.id,
                    data: {
                        newStartAt: newStartAt.toISOString(),
                        newEndAt: newEndAt.toISOString(),
                        reason: 'Updated via calendar',
                    },
                });
            }

            // Invalidate interview queries to ensure data consistency
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });

            toast({
                title: 'Interview Updated',
                description: `Interview with ${event.candidateName} has been updated.`,
            });
        } catch (err: any) {
            toast({
                title: 'Update Failed',
                description: err.message || 'Could not update the interview.',
                variant: 'destructive',
            });
        }
    };

    // For manual reschedule via button click - opens dialog
    const handleManualReschedule = (event: CalendarEvent) => {
        setRescheduleEvent(event);
        const currentStart = new Date(event.startTime);
        const suggestedStart = addHours(currentStart, 1);
        setRescheduleDateTime(format(suggestedStart, "yyyy-MM-dd'T'HH:mm"));
    };

    const handleConfirmReschedule = async () => {
        if (!rescheduleEvent || !rescheduleDateTime) return;

        try {
            const newStartAt = new Date(rescheduleDateTime);
            const duration = rescheduleEvent.duration; // in minutes
            const newEndAt = new Date(newStartAt.getTime() + duration * 60000);

            // Route based on event source
            if (rescheduleEvent.source === 'interview') {
                // Use interview reschedule API
                const { rescheduleInterview } = await import('@/lib/api/interviews');
                await rescheduleInterview(rescheduleEvent.id, {
                    newDate: newStartAt.toISOString(),
                    reason: 'Rescheduled by organizer',
                });
            } else {
                // Use slot reschedule API
                await rescheduleSlotMutation.mutateAsync({
                    id: rescheduleEvent.id,
                    data: {
                        newStartAt: newStartAt.toISOString(),
                        newEndAt: newEndAt.toISOString(),
                        reason: 'Rescheduled by organizer',
                    },
                });
            }

            // Invalidate interview queries
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });

            toast({
                title: 'Interview Rescheduled',
                description: `Interview with ${rescheduleEvent.candidateName} has been rescheduled to ${format(newStartAt, 'PPp')}.`,
            });
            setRescheduleEvent(null);
            setRescheduleDateTime('');
        } catch (err: any) {
            toast({
                title: 'Reschedule Failed',
                description: err.message || 'Could not reschedule the interview.',
                variant: 'destructive',
            });
        }
    };

    const handleCancel = (event: CalendarEvent) => {
        setCancelEvent(event);
    };

    const handleComplete = async (event: CalendarEvent) => {
        try {
            // Import and call complete API
            const { completeInterview } = await import('@/lib/api/interviews');
            await completeInterview(event.id);
            // Invalidate queries to refresh calendar
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
            toast({
                title: 'Interview Completed',
                description: `Interview with ${event.candidateName} marked as complete.`,
            });
        } catch (err: any) {
            toast({
                title: 'Failed to Complete',
                description: err.message || 'Could not mark interview as complete.',
                variant: 'destructive',
            });
        }
    };

    const handleAddNote = (event: CalendarEvent) => {
        // Navigate to interview details page where notes can be added
        router.push(`/interviews/${event.id}`);
    };

    const handleConfirmCancel = async () => {
        if (!cancelEvent) return;

        try {
            // Route based on event source
            if (cancelEvent.source === 'interview') {
                // Use interview cancel API
                const { cancelInterview } = await import('@/lib/api/interviews');
                await cancelInterview(cancelEvent.id);
            } else {
                // Use slot cancel API
                await cancelSlotMutation.mutateAsync(cancelEvent.id);
            }

            // Invalidate both queries
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });

            toast({
                title: 'Interview Cancelled',
                description: `Interview with ${cancelEvent.candidateName} has been cancelled.`,
            });
            setCancelEvent(null);
        } catch (err: any) {
            toast({
                title: 'Cancel Failed',
                description: err.message || 'Could not cancel the interview.',
                variant: 'destructive',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="px-8 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-8 py-6">
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                    <h2 className="font-semibold">Failed to load calendar</h2>
                    <p className="text-sm mt-1">{(error as any)?.message || 'Please try again later.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-4 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
            <motion.div
                className="flex flex-col flex-1 h-full space-y-2 overflow-hidden"
                initial="initial"
                animate="animate"
                variants={staggerContainer}
            >
                <div className="space-y-6">
                    <motion.div variants={fadeInUp}>
                        <CalendarHeader
                            view={view}
                            currentDate={currentDate}
                            filters={filters}
                            userRole={userRole}
                            interviewers={interviewers}
                            onViewChange={setView}
                            onDateChange={setCurrentDate}
                            onFiltersChange={setFilters}
                            onScheduleClick={handleScheduleClick}
                            onBulkScheduleClick={() => setIsBulkScheduleOpen(true)}
                        />
                    </motion.div>

                    {view === 'month' && (
                        <CalendarMonthView
                            currentDate={currentDate}
                            events={filteredEvents}
                            userRole={userRole}
                            onEmptySlotClick={handleEmptySlotClick}
                            onReschedule={handleReschedule}
                            onCancel={handleCancel}
                            onComplete={handleComplete}
                            onAddNote={handleAddNote}
                        />
                    )}

                    {view === 'week' && (
                        <CalendarWeekView
                            currentDate={currentDate}
                            events={filteredEvents}
                            userRole={userRole}
                            onEmptySlotClick={handleEmptySlotClick}
                            onReschedule={handleReschedule}
                            onManualReschedule={handleManualReschedule}
                            onCancel={handleCancel}
                            onComplete={handleComplete}
                            onAddNote={handleAddNote}
                        />
                    )}

                    {view === 'day' && (
                        <CalendarDayView
                            currentDate={currentDate}
                            events={filteredEvents}
                            userRole={userRole}
                            onEmptySlotClick={handleEmptySlotClick}
                            onReschedule={handleReschedule}
                            onCancel={handleCancel}
                            onComplete={handleComplete}
                            onAddNote={handleAddNote}
                        />
                    )}

                    <ScheduleInterviewModal
                        open={isCreateSlotOpen}
                        onOpenChange={setIsCreateSlotOpen}
                        initialDate={selectedSlotDate}
                        onSuccess={() => {
                            // Invalidate calendar and interview queries to refetch and show new interview
                            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
                            queryClient.invalidateQueries({ queryKey: ['interviews'] });
                            toast({ title: 'Interview Scheduled', description: 'The interview has been created and is now visible on the calendar.' });
                        }}
                    />

                    <BulkScheduleModal
                        open={isBulkScheduleOpen}
                        onOpenChange={setIsBulkScheduleOpen}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
                            queryClient.invalidateQueries({ queryKey: ['interviews'] });
                            toast({ title: 'Bulk Scheduling Complete', description: 'Interviews have been scheduled and are now visible on the calendar.' });
                        }}
                    />

                    {/* Reschedule Dialog */}
                    <AlertDialog open={!!rescheduleEvent} onOpenChange={() => setRescheduleEvent(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reschedule Interview</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Reschedule the interview with{' '}
                                    <strong>{rescheduleEvent?.candidateName}</strong>.
                                    Select a new date and time below.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4">
                                <Label htmlFor="reschedule-datetime">New Date & Time</Label>
                                <Input
                                    id="reschedule-datetime"
                                    type="datetime-local"
                                    value={rescheduleDateTime}
                                    onChange={(e) => setRescheduleDateTime(e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleConfirmReschedule}
                                    disabled={!rescheduleDateTime || rescheduleSlotMutation.isPending}
                                >
                                    {rescheduleSlotMutation.isPending ? 'Rescheduling...' : 'Confirm'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Cancel Confirmation Dialog */}
                    <AlertDialog open={!!cancelEvent} onOpenChange={() => setCancelEvent(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Interview</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to cancel the interview with{' '}
                                    <strong>{cancelEvent?.candidateName}</strong>? This action cannot be undone and all
                                    participants will be notified.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Keep Interview</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleConfirmCancel}
                                    disabled={cancelSlotMutation.isPending}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {cancelSlotMutation.isPending ? 'Cancelling...' : 'Cancel Interview'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </motion.div>
        </div>
    );
}
