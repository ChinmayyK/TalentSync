'use client';

import { useState } from 'react';
import { Loader2, Users, ArrowRightCircle } from 'lucide-react';
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

const STAGE_OPTIONS = [
    { value: 'applied', label: 'Applied' },
    { value: 'screening', label: 'Screening' },
    { value: 'interview', label: 'Interview' },
    { value: 'technical', label: 'Technical' },
    { value: 'offer', label: 'Offer' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' },
];

interface BulkChangeStageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    candidateIds: string[];
    onStageChange: (candidateIds: string[], newStage: string, note?: string) => Promise<void>;
}

export function BulkChangeStageModal({
    open,
    onOpenChange,
    candidateIds,
    onStageChange,
}: BulkChangeStageModalProps) {
    const [selectedStage, setSelectedStage] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedStage) {
            toast.error('Please select a stage');
            return;
        }

        setIsSubmitting(true);
        try {
            await onStageChange(candidateIds, selectedStage, note || undefined);
            toast.success(`Updated ${candidateIds.length} candidate(s) to "${stageLabels[selectedStage] || selectedStage}"`);
            handleClose();
        } catch (error) {
            console.error('Failed to bulk update stages:', error);
            toast.error('Failed to update stages. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedStage('');
        setNote('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightCircle className="h-5 w-5 text-primary" />
                        Bulk Change Stage
                    </DialogTitle>
                    <DialogDescription>
                        Update the hiring stage for{' '}
                        <span className="font-semibold text-foreground">{candidateIds.length}</span>{' '}
                        selected candidate{candidateIds.length !== 1 ? 's' : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Selected Count Badge */}
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                            {candidateIds.length} candidate{candidateIds.length !== 1 ? 's' : ''} selected
                        </span>
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
                        <p className="text-xs text-muted-foreground">
                            This note will be added to each candidate's history
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedStage}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <ArrowRightCircle className="h-4 w-4 mr-2" />
                                Update {candidateIds.length} Candidate{candidateIds.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
