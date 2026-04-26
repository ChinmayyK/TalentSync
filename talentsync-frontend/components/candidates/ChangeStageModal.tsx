'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { stageLabels, stageColors } from '@/lib/candidate-constants';

// Normalize stage keys to lowercase for consistent display
const STAGE_OPTIONS = [
    { value: 'applied', label: 'Applied' },
    { value: 'screening', label: 'Screening' },
    { value: 'interview', label: 'Interview' },
    { value: 'technical', label: 'Technical' },
    { value: 'offer', label: 'Offer' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
];

interface ChangeStageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    candidateId: string;
    candidateName: string;
    currentStage: string;
    onStageChange: (candidateId: string, newStage: string, note?: string) => Promise<void>;
}

export function ChangeStageModal({
    open,
    onOpenChange,
    candidateId,
    candidateName,
    currentStage,
    onStageChange,
}: ChangeStageModalProps) {
    const [selectedStage, setSelectedStage] = useState(currentStage?.toLowerCase() || 'applied');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (selectedStage === currentStage?.toLowerCase()) {
            toast.info('Stage is the same, no changes made');
            onOpenChange(false);
            return;
        }

        setIsSubmitting(true);
        try {
            await onStageChange(candidateId, selectedStage, note || undefined);
            toast.success(`Stage changed to "${stageLabels[selectedStage] || selectedStage}"`);
            setNote('');
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to change stage:', error);
            toast.error('Failed to change stage. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedStage(currentStage?.toLowerCase() || 'applied');
        setNote('');
        onOpenChange(false);
    };

    const currentStageLabel = stageLabels[currentStage] || stageLabels[currentStage?.toLowerCase()] || currentStage;
    const currentStageColor = stageColors[currentStage] || stageColors[currentStage?.toLowerCase()] || '';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change Stage</DialogTitle>
                    <DialogDescription>
                        Update the hiring stage for <span className="font-semibold">{candidateName}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Current Stage */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Current Stage</Label>
                        <Badge className={currentStageColor || 'bg-muted'}>
                            {currentStageLabel}
                        </Badge>
                    </div>

                    {/* New Stage Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="stage">New Stage</Label>
                        <Select value={selectedStage} onValueChange={setSelectedStage}>
                            <SelectTrigger id="stage">
                                <SelectValue placeholder="Select new stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {STAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="secondary"
                                                className={`text-xs ${stageColors[option.value] || ''}`}
                                            >
                                                {option.label}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Optional Note */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Note (optional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Add a note about this stage change..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                            </>
                        ) : (
                            'Confirm'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
