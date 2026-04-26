'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useWorkingHours, useSetWorkingHours } from '@/lib/hooks/useCalendar';
import { WeeklyPattern } from '@/lib/api/calendar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
    { dow: 0, label: 'Sunday', short: 'Sun' },
    { dow: 1, label: 'Monday', short: 'Mon' },
    { dow: 2, label: 'Tuesday', short: 'Tue' },
    { dow: 3, label: 'Wednesday', short: 'Wed' },
    { dow: 4, label: 'Thursday', short: 'Thu' },
    { dow: 5, label: 'Friday', short: 'Fri' },
    { dow: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
    [0, 30].map((m) => {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return { value: time, label: time };
    })
).flat();

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

export function WorkingHoursSettings() {
    const { data: workingHours, isLoading } = useWorkingHours();
    const setWorkingHoursMutation = useSetWorkingHours();

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Initialize schedule state
    const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(() => {
        const initial: Record<number, DaySchedule> = {};
        DAYS_OF_WEEK.forEach((day) => {
            initial[day.dow] = {
                enabled: DEFAULT_WORKING_DAYS.includes(day.dow),
                start: DEFAULT_START,
                end: DEFAULT_END,
            };
        });
        return initial;
    });

    // Load existing working hours
    useEffect(() => {
        if (workingHours?.weekly) {
            const weekly = workingHours.weekly as WeeklyPattern[];
            const newSchedule: Record<number, DaySchedule> = {};

            DAYS_OF_WEEK.forEach((day) => {
                const pattern = weekly.find((p) => p.dow === day.dow);
                newSchedule[day.dow] = {
                    enabled: !!pattern,
                    start: pattern?.start || DEFAULT_START,
                    end: pattern?.end || DEFAULT_END,
                };
            });

            setSchedule(newSchedule);
        }
    }, [workingHours]);

    const handleDayToggle = (dow: number, enabled: boolean) => {
        setSchedule((prev) => ({
            ...prev,
            [dow]: { ...prev[dow], enabled },
        }));
    };

    const handleTimeChange = (dow: number, field: 'start' | 'end', value: string) => {
        setSchedule((prev) => ({
            ...prev,
            [dow]: { ...prev[dow], [field]: value },
        }));
    };

    const handleSave = async () => {
        try {
            const weekly: WeeklyPattern[] = [];

            Object.entries(schedule).forEach(([dow, daySchedule]) => {
                if (daySchedule.enabled) {
                    weekly.push({
                        dow: parseInt(dow),
                        start: daySchedule.start,
                        end: daySchedule.end,
                    });
                }
            });

            await setWorkingHoursMutation.mutateAsync({
                weekly,
                timezone,
            });

            toast({
                title: 'Working Hours Saved',
                description: 'Your availability has been updated.',
            });
        } catch (err: any) {
            toast({
                title: 'Failed to save',
                description: err.message || 'Please try again',
                variant: 'destructive',
            });
        }
    };

    const handleApplyToAll = (start: string, end: string) => {
        setSchedule((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((dow) => {
                if (updated[parseInt(dow)].enabled) {
                    updated[parseInt(dow)] = {
                        ...updated[parseInt(dow)],
                        start,
                        end,
                    };
                }
            });
            return updated;
        });
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-10 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Working Hours
                </CardTitle>
                <CardDescription>
                    Set your availability for interview scheduling. These hours will be used
                    when generating available time slots.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Timezone */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Timezone</span>
                    <span className="text-sm text-muted-foreground">{timezone}</span>
                </div>

                {/* Quick Apply */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Quick apply:</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyToAll('09:00', '17:00')}
                    >
                        9-5
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyToAll('08:00', '18:00')}
                    >
                        8-6
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyToAll('10:00', '19:00')}
                    >
                        10-7
                    </Button>
                </div>

                {/* Day Schedule */}
                <div className="space-y-3">
                    {DAYS_OF_WEEK.map((day) => {
                        const daySchedule = schedule[day.dow];
                        const isWeekend = day.dow === 0 || day.dow === 6;

                        return (
                            <div
                                key={day.dow}
                                className={cn(
                                    'flex items-center gap-4 p-3 rounded-lg border',
                                    daySchedule.enabled ? 'bg-background' : 'bg-muted/50',
                                    isWeekend && 'border-dashed'
                                )}
                            >
                                <div className="w-24 flex items-center gap-2">
                                    <Switch
                                        checked={daySchedule.enabled}
                                        onCheckedChange={(checked) => handleDayToggle(day.dow, checked)}
                                    />
                                    <span
                                        className={cn(
                                            'text-sm font-medium',
                                            !daySchedule.enabled && 'text-muted-foreground'
                                        )}
                                    >
                                        {day.short}
                                    </span>
                                </div>

                                {daySchedule.enabled ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <Select
                                            value={daySchedule.start}
                                            onValueChange={(v) => handleTimeChange(day.dow, 'start', v)}
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {TIME_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <span className="text-muted-foreground">to</span>

                                        <Select
                                            value={daySchedule.end}
                                            onValueChange={(v) => handleTimeChange(day.dow, 'end', v)}
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {TIME_OPTIONS.filter((opt) => opt.value > daySchedule.start).map(
                                                    (opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Not available</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={setWorkingHoursMutation.isPending}
                    >
                        {setWorkingHoursMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Working Hours
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
