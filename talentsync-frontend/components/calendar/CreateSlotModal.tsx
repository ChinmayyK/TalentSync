'use client';

import { useState } from 'react';
import { format, addMinutes, setHours, setMinutes, startOfDay, addDays } from 'date-fns';
import { Calendar, Clock, Users, Loader2, Plus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateSlot, useGenerateSlots } from '@/lib/hooks/useCalendar';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateSlotModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDate?: Date;
    onSuccess?: () => void;
}

type CreationMode = 'single' | 'generate';

const DURATION_OPTIONS = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
    [0, 30].map((m) => {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return { value: time, label: time };
    })
).flat();

export function CreateSlotModal({
    open,
    onOpenChange,
    initialDate,
    onSuccess,
}: CreateSlotModalProps) {
    const [mode, setMode] = useState<CreationMode>('single');

    // Single slot fields
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date());
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState(60);

    // Generate slots fields
    const [startDateRange, setStartDateRange] = useState<Date | undefined>(new Date());
    const [endDateRange, setEndDateRange] = useState<Date | undefined>(addDays(new Date(), 7));

    const createSlotMutation = useCreateSlot();
    const generateSlotsMutation = useGenerateSlots();

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const handleSubmit = async () => {
        try {
            if (mode === 'single' && selectedDate) {
                const [hours, mins] = startTime.split(':').map(Number);
                const startAt = setMinutes(setHours(startOfDay(selectedDate), hours), mins);
                const endAt = addMinutes(startAt, duration);

                await createSlotMutation.mutateAsync({
                    participants: [], // Will be filled when booking
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                    timezone,
                });

                toast({
                    title: 'Slot Created',
                    description: `Available slot created for ${format(startAt, 'PPp')}`,
                });
            } else if (mode === 'generate' && startDateRange && endDateRange) {
                // For generate, we need at least one user (current user)
                // In a real implementation, you'd have a user selector
                const slots = await generateSlotsMutation.mutateAsync({
                    userIds: [], // Backend will use current user if empty
                    startRange: startDateRange.toISOString(),
                    endRange: endDateRange.toISOString(),
                    slotDurationMins: duration,
                    timezone,
                });

                toast({
                    title: 'Slots Generated',
                    description: `Created ${slots.length} available slots`,
                });
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (err: any) {
            toast({
                title: 'Failed to create slot',
                description: err.message || 'Please try again',
                variant: 'destructive',
            });
        }
    };

    const isSubmitting = createSlotMutation.isPending || generateSlotsMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-[500px] sm:h-auto sm:rounded-lg flex flex-col sm:block gap-0 sm:gap-4 p-0 sm:p-6">
                <DialogHeader className="p-6 sm:p-0 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Create Available Slot
                    </DialogTitle>
                    <DialogDescription>
                        Create available time slots for interviews. Candidates can book these slots.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 px-6 py-2 flex-1 overflow-y-auto sm:p-0 sm:overflow-visible">
                    {/* Mode Selector */}
                    <div className="flex gap-2">
                        <Button
                            variant={mode === 'single' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setMode('single')}
                            className="flex-1"
                        >
                            Single Slot
                        </Button>
                        <Button
                            variant={mode === 'generate' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setMode('generate')}
                            className="flex-1"
                        >
                            Generate Multiple
                        </Button>
                    </div>

                    {mode === 'single' ? (
                        <>
                            {/* Date Picker */}
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-full justify-start text-left font-normal',
                                                !selectedDate && 'text-muted-foreground'
                                            )}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarPicker
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={setSelectedDate}
                                            initialFocus
                                            disabled={(date) => date < startOfDay(new Date())}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Time Picker */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Select value={startTime} onValueChange={setStartTime}>
                                        <SelectTrigger>
                                            <Clock className="mr-2 h-4 w-4" />
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
                                </div>

                                <div className="space-y-2">
                                    <Label>Duration</Label>
                                    <Select
                                        value={duration.toString()}
                                        onValueChange={(v) => setDuration(Number(v))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATION_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value.toString()}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Date Range for Generate */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !startDateRange && 'text-muted-foreground'
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {startDateRange ? format(startDateRange, 'PP') : 'Start'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarPicker
                                                mode="single"
                                                selected={startDateRange}
                                                onSelect={setStartDateRange}
                                                initialFocus
                                                disabled={(date) => date < startOfDay(new Date())}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full justify-start text-left font-normal',
                                                    !endDateRange && 'text-muted-foreground'
                                                )}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {endDateRange ? format(endDateRange, 'PP') : 'End'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarPicker
                                                mode="single"
                                                selected={endDateRange}
                                                onSelect={setEndDateRange}
                                                initialFocus
                                                disabled={(date) => !startDateRange ? false : date < startDateRange}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Slot Duration</Label>
                                <Select
                                    value={duration.toString()}
                                    onValueChange={(v) => setDuration(Number(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DURATION_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value.toString()}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                                <p>
                                    Slots will be generated based on your working hours settings.
                                    Make sure you have configured your availability first.
                                </p>
                            </div>
                        </>
                    )}

                    {/* Timezone */}
                    <div className="text-sm text-muted-foreground">
                        Timezone: {timezone}
                    </div>
                </div>

                <DialogFooter className="p-6 sm:p-0 border-t sm:border-0 flex-shrink-0 bg-background">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (mode === 'single' && !selectedDate)}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : mode === 'single' ? (
                            'Create Slot'
                        ) : (
                            'Generate Slots'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
