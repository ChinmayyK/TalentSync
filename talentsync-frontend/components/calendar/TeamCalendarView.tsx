'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isWithinInterval, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTeamAvailability } from '@/lib/hooks/useCalendar';
import { cn } from '@/lib/utils';

interface TeamCalendarViewProps {
    userIds: string[];
    onSlotSelect?: (start: Date, end: Date) => void;
    slotDurationMins?: number;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
const DAYS = 7;

export function TeamCalendarView({
    userIds,
    onSlotSelect,
    slotDurationMins = 60,
}: TeamCalendarViewProps) {
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

    const weekEnd = addDays(weekStart, 6);
    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
        [weekStart]
    );

    const { data: teamAvailability, isLoading, error } = useTeamAvailability(
        userIds,
        weekStart.toISOString(),
        addDays(weekEnd, 1).toISOString(),
        slotDurationMins,
    );

    const goToPreviousWeek = () => setWeekStart(prev => subWeeks(prev, 1));
    const goToNextWeek = () => setWeekStart(prev => addWeeks(prev, 1));
    const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    // Check if a time slot is available (in common slots)
    const isSlotAvailable = (day: Date, hour: number): boolean => {
        if (!teamAvailability?.commonSlots) return false;

        const slotStart = new Date(day);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMins);

        return teamAvailability.commonSlots.some(slot => {
            const commonStart = parseISO(slot.start);
            const commonEnd = parseISO(slot.end);
            return slotStart >= commonStart && slotEnd <= commonEnd;
        });
    };

    // Get user-specific availability for a slot
    const getUserAvailability = (day: Date, hour: number): Record<string, boolean> => {
        if (!teamAvailability?.userAvailability) return {};

        const slotStart = new Date(day);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMins);

        const result: Record<string, boolean> = {};

        for (const user of teamAvailability.userAvailability) {
            const isAvailable = user.intervals.some(interval => {
                const intervalStart = parseISO(interval.start);
                const intervalEnd = parseISO(interval.end);
                return slotStart >= intervalStart && slotEnd <= intervalEnd;
            });
            result[user.userId] = isAvailable;
        }

        return result;
    };

    const handleSlotClick = (day: Date, hour: number) => {
        if (!isSlotAvailable(day, hour)) return;

        const start = new Date(day);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + slotDurationMins);

        onSlotSelect?.(start, end);
    };

    if (error) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-destructive">
                    Failed to load team availability
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Team Calendar
                        </CardTitle>
                        <CardDescription>
                            View availability for {userIds.length} team member{userIds.length !== 1 ? 's' : ''}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                    {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[600px]">
                            {/* Header - Days */}
                            <div className="grid grid-cols-8 border-b">
                                <div className="p-2 text-sm text-muted-foreground" />
                                {weekDays.map((day, i) => (
                                    <div key={i} className="p-2 text-center border-l">
                                        <div className="text-xs text-muted-foreground">
                                            {format(day, 'EEE')}
                                        </div>
                                        <div className="text-sm font-medium">
                                            {format(day, 'd')}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Time slots */}
                            {HOURS.map(hour => (
                                <div key={hour} className="grid grid-cols-8 border-b">
                                    <div className="p-2 text-xs text-muted-foreground text-right pr-3">
                                        {hour}:00
                                    </div>
                                    {weekDays.map((day, dayIndex) => {
                                        const available = isSlotAvailable(day, hour);
                                        const userAvail = getUserAvailability(day, hour);
                                        const availableCount = Object.values(userAvail).filter(Boolean).length;
                                        const totalUsers = userIds.length;

                                        return (
                                            <div
                                                key={dayIndex}
                                                onClick={() => handleSlotClick(day, hour)}
                                                className={cn(
                                                    'p-1 border-l min-h-[48px] relative group',
                                                    available
                                                        ? 'bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 cursor-pointer'
                                                        : availableCount > 0
                                                            ? 'bg-yellow-50 dark:bg-yellow-950'
                                                            : 'bg-gray-50 dark:bg-gray-900',
                                                )}
                                            >
                                                {available ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                    >
                                                        All Free
                                                    </Badge>
                                                ) : availableCount > 0 ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                                    >
                                                        {availableCount}/{totalUsers}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded border" />
                        <span>All available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900 rounded border" />
                        <span>Partial</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded border" />
                        <span>Unavailable</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
