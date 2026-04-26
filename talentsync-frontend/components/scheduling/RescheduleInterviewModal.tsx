"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { rescheduleInterview } from '@/lib/api/interviews';
import { Loader2 } from 'lucide-react';

interface RescheduleInterviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    interviewId: string;
    onSuccess?: () => void;
}

export function RescheduleInterviewModal({
    open,
    onOpenChange,
    interviewId,
    onSuccess,
}: RescheduleInterviewModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [newDuration, setNewDuration] = useState(60);
    const [reason, setReason] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDate) {
            toast({
                title: 'Date Required',
                description: 'Please select a new date for the interview.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await rescheduleInterview(interviewId, {
                newDate: newDate,
                newStartTime: newTime || undefined,
                reason: reason || undefined,
            });

            toast({
                title: 'Interview Rescheduled',
                description: 'The interview has been rescheduled successfully.',
            });

            onOpenChange(false);
            onSuccess?.();

            // Reset form
            setNewDate('');
            setNewTime('');
            setNewDuration(60);
            setReason('');
        } catch (error: any) {
            toast({
                title: 'Reschedule Failed',
                description: error.message || 'Failed to reschedule interview',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reschedule Interview</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newDate">New Date *</Label>
                        <Input
                            id="newDate"
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newTime">New Time</Label>
                        <Input
                            id="newTime"
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newDuration">Duration (minutes)</Label>
                        <Input
                            id="newDuration"
                            type="number"
                            min={15}
                            max={240}
                            step={15}
                            value={newDuration}
                            onChange={(e) => setNewDuration(parseInt(e.target.value) || 60)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason (optional)</Label>
                        <Textarea
                            id="reason"
                            placeholder="Why is the interview being rescheduled?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Rescheduling...
                                </>
                            ) : (
                                'Reschedule'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
