'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Clock, Mail, Calendar, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    createScheduledReport,
    getScheduledReports,
    deleteScheduledReport,
    toggleScheduledReport,
    CreateScheduledReportDto,
    ReportType,
    ScheduleFrequency,
    ScheduledReport
} from '@/lib/api/reports';

interface ScheduleReportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
    { value: 'overview', label: 'Overview Report' },
    { value: 'funnel', label: 'Candidate Funnel' },
    { value: 'time-to-hire', label: 'Time to Hire' },
    { value: 'interviewer-load', label: 'Interviewer Load' },
    { value: 'source-performance', label: 'Source Performance' },
];

const FREQUENCIES: { value: ScheduleFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export function ScheduleReportModal({ open, onOpenChange }: ScheduleReportModalProps) {
    const queryClient = useQueryClient();

    const [reportType, setReportType] = useState<ReportType>('overview');
    const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly');
    const [time, setTime] = useState('09:00');
    const [dayOfWeek, setDayOfWeek] = useState<number>(1);
    const [dayOfMonth, setDayOfMonth] = useState<number>(1);
    const [recipients, setRecipients] = useState<string[]>([]);
    const [newRecipient, setNewRecipient] = useState('');
    const [name, setName] = useState('');

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['scheduled-reports'],
        queryFn: getScheduledReports,
        enabled: open,
    });

    const createMutation = useMutation({
        mutationFn: createScheduledReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
            toast.success('Report scheduled successfully');
            resetForm();
        },
        onError: () => {
            toast.error('Failed to schedule report');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteScheduledReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
            toast.success('Schedule deleted');
        },
    });

    const toggleMutation = useMutation({
        mutationFn: toggleScheduledReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
        },
    });

    const resetForm = () => {
        setReportType('overview');
        setFrequency('weekly');
        setTime('09:00');
        setDayOfWeek(1);
        setDayOfMonth(1);
        setRecipients([]);
        setNewRecipient('');
        setName('');
    };

    const addRecipient = () => {
        if (newRecipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient)) {
            if (!recipients.includes(newRecipient)) {
                setRecipients([...recipients, newRecipient]);
            }
            setNewRecipient('');
        } else {
            toast.error('Please enter a valid email address');
        }
    };

    const removeRecipient = (email: string) => {
        setRecipients(recipients.filter(r => r !== email));
    };

    const handleSubmit = () => {
        if (recipients.length === 0) {
            toast.error('Please add at least one recipient');
            return;
        }

        const dto: CreateScheduledReportDto = {
            reportType,
            frequency,
            time,
            recipients,
            name: name || undefined,
            dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
            dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        };

        createMutation.mutate(dto);
    };

    const formatNextRun = (date?: string) => {
        if (!date) return 'Not scheduled';
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-screen h-[100dvh] max-w-none md:max-w-2xl md:h-auto md:max-h-[85vh] md:rounded-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Scheduled Reports
                    </DialogTitle>
                    <DialogDescription>
                        Configure automatic report delivery via email
                    </DialogDescription>
                </DialogHeader>

                {/* Existing Schedules */}
                {schedules.length > 0 && (
                    <div className="space-y-3 mb-6">
                        <Label className="text-sm font-medium">Active Schedules</Label>
                        <div className="space-y-2">
                            {schedules.map((schedule: ScheduledReport) => (
                                <div
                                    key={schedule.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${schedule.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium truncate">
                                                {schedule.name || schedule.reportType}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {schedule.frequency}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {schedule.time}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                {schedule.recipients.length} recipient(s)
                                            </span>
                                            <span>Next: {formatNextRun(schedule.nextRunAt)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleMutation.mutate(schedule.id)}
                                        >
                                            {schedule.isActive ? 'Pause' : 'Resume'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteMutation.mutate(schedule.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Create New Schedule Form */}
                <div className="space-y-4 border-t pt-4">
                    <Label className="text-sm font-medium">Create New Schedule</Label>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Schedule Name (optional)</Label>
                            <Input
                                id="name"
                                placeholder="Weekly Funnel Report"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Report Type</Label>
                            <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {REPORT_TYPES.map(rt => (
                                        <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select value={frequency} onValueChange={(v: ScheduleFrequency) => setFrequency(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FREQUENCIES.map(f => (
                                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {frequency === 'weekly' && (
                            <div className="space-y-2">
                                <Label>Day of Week</Label>
                                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS_OF_WEEK.map(d => (
                                            <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {frequency === 'monthly' && (
                            <div className="space-y-2">
                                <Label>Day of Month</Label>
                                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                                            <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Recipients</Label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="email@example.com"
                                value={newRecipient}
                                onChange={(e) => setNewRecipient(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                            />
                            <Button type="button" variant="outline" onClick={addRecipient}>
                                Add
                            </Button>
                        </div>
                        {recipients.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {recipients.map(email => (
                                    <Badge key={email} variant="secondary" className="pl-2 pr-1 py-1">
                                        {email}
                                        <button
                                            onClick={() => removeRecipient(email)}
                                            className="ml-1 hover:bg-muted rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Schedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
