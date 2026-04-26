'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Calendar, Users, Clock, AlertTriangle, Info, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useCandidates, Candidate } from '@/lib/hooks/useCandidates';
import { useBulkSchedule, useInterviewers } from '@/lib/hooks/useInterviews';

const DURATIONS = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
];

// New explicit bulk modes
type BulkMode = 'SEQUENTIAL' | 'GROUP';

interface BulkScheduleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    preSelectedCandidateIds?: string[];
}

// Result display component
interface ScheduleResultProps {
    result: {
        scheduled: number;
        skipped: number;
        created: Array<{ candidateId: string; interviewId: string; scheduledAt: string }>;
        skippedCandidates: Array<{ candidateId: string; reason: string }>;
    };
    candidates: Candidate[];
    onClose: () => void;
}

function ScheduleResult({ result, candidates, onClose }: ScheduleResultProps) {
    const getCandidateName = (id: string) => {
        const candidate = candidates.find(c => c.id === id);
        return candidate?.name || id;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4 justify-center py-4">
                <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{result.scheduled}</div>
                    <div className="text-sm text-muted-foreground">Scheduled</div>
                </div>
                {result.skipped > 0 && (
                    <div className="text-center">
                        <div className="text-3xl font-bold text-amber-600">{result.skipped}</div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                    </div>
                )}
            </div>

            {result.created.length > 0 && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Successfully Scheduled
                    </Label>
                    <ScrollArea className="h-[120px] border rounded-lg p-2">
                        {result.created.map((item) => (
                            <div key={item.interviewId} className="flex items-center justify-between p-2 border-b last:border-0">
                                <span className="font-medium">{getCandidateName(item.candidateId)}</span>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(item.scheduledAt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            )}

            {result.skippedCandidates.length > 0 && (
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-amber-600">
                        <XCircle className="h-4 w-4" />
                        Skipped Candidates
                    </Label>
                    <ScrollArea className="h-[120px] border rounded-lg p-2">
                        {result.skippedCandidates.map((item) => (
                            <div key={item.candidateId} className="flex items-center justify-between p-2 border-b last:border-0">
                                <span className="font-medium">{getCandidateName(item.candidateId)}</span>
                                <span className="text-sm text-red-500">{item.reason}</span>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            )}

            <Button onClick={onClose} className="w-full">
                Done
            </Button>
        </div>
    );
}

export function BulkScheduleModal({
    open,
    onOpenChange,
    onSuccess,
    preSelectedCandidateIds = [],
}: BulkScheduleModalProps) {
    const [step, setStep] = useState<'config' | 'confirm' | 'result'>('config');
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(preSelectedCandidateIds);
    const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
    const [duration, setDuration] = useState(30);
    const [bulkMode, setBulkMode] = useState<BulkMode>('SEQUENTIAL'); // Default to SEQUENTIAL
    const [startTime, setStartTime] = useState('');
    const [stage, setStage] = useState('Interview');
    const [candidateSearch, setCandidateSearch] = useState('');
    const [scheduleResult, setScheduleResult] = useState<any>(null);

    const { data: candidatesData, isLoading: loadingCandidates } = useCandidates({ perPage: 100 });
    const { data: interviewersData, isLoading: loadingInterviewers } = useInterviewers();
    const bulkSchedule = useBulkSchedule();

    const candidates = candidatesData?.data || [];
    const interviewers = interviewersData || [];

    // Filter candidates based on search
    const filteredCandidates = useMemo(() => {
        if (!candidateSearch.trim()) return candidates;
        const searchLower = candidateSearch.toLowerCase();
        return candidates.filter((c: Candidate) =>
            c.name?.toLowerCase().includes(searchLower) ||
            c.email?.toLowerCase().includes(searchLower) ||
            c.stage?.toLowerCase().includes(searchLower)
        );
    }, [candidates, candidateSearch]);

    useEffect(() => {
        if (preSelectedCandidateIds.length > 0) {
            setSelectedCandidateIds(preSelectedCandidateIds);
        }
    }, [preSelectedCandidateIds]);

    // Reset when modal opens
    useEffect(() => {
        if (open) {
            setStep('config');
            setScheduleResult(null);
        }
    }, [open]);

    const toggleCandidate = (id: string) => {
        setSelectedCandidateIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const toggleInterviewer = (id: string) => {
        setSelectedInterviewerIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAllCandidates = () => {
        setSelectedCandidateIds(prev => {
            const filteredIds = filteredCandidates.map((c: Candidate) => c.id);
            const newSelection = new Set([...prev, ...filteredIds]);
            return Array.from(newSelection);
        });
    };

    const clearCandidates = () => {
        setSelectedCandidateIds([]);
    };

    const handleProceedToConfirm = () => {
        if (selectedCandidateIds.length === 0) {
            toast.error('Please select at least one candidate');
            return;
        }
        if (selectedInterviewerIds.length === 0) {
            toast.error('Please select at least one interviewer');
            return;
        }
        if (!startTime) {
            toast.error('Please select a start time');
            return;
        }
        setStep('confirm');
    };

    const handleSchedule = async () => {
        try {
            const result = await bulkSchedule.mutateAsync({
                candidateIds: selectedCandidateIds,
                interviewerIds: selectedInterviewerIds,
                durationMins: duration,
                bulkMode,
                startTime: new Date(startTime).toISOString(),
                stage,
            });

            setScheduleResult(result);
            setStep('result');

            if (result.scheduled > 0) {
                toast.success(`Scheduled ${result.scheduled} interview${result.scheduled > 1 ? 's' : ''} successfully`);
            }
            if (result.skipped > 0) {
                toast.warning(`${result.skipped} candidate${result.skipped > 1 ? 's' : ''} skipped`);
            }

            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to schedule interviews');
        }
    };

    const handleClose = () => {
        setSelectedCandidateIds([]);
        setSelectedInterviewerIds([]);
        setDuration(30);
        setBulkMode('SEQUENTIAL');
        setStartTime('');
        setStep('config');
        setScheduleResult(null);
        onOpenChange(false);
    };

    const isValid = selectedCandidateIds.length > 0 && selectedInterviewerIds.length > 0 && startTime;

    // Calculate total time for SEQUENTIAL mode
    const totalTimeMinutes = bulkMode === 'SEQUENTIAL' ? selectedCandidateIds.length * duration : duration;
    const endTime = startTime ? new Date(new Date(startTime).getTime() + totalTimeMinutes * 60000) : null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-[800px] sm:h-auto sm:max-h-[90vh] sm:rounded-lg overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Bulk Schedule Interviews
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'config' && 'Configure bulk scheduling options'}
                        {step === 'confirm' && 'Review and confirm your selection'}
                        {step === 'result' && 'Scheduling complete'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto space-y-6 py-4">
                    {step === 'config' && (
                        <>
                            {/* Bulk Mode Selection - PROMINENT */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Scheduling Mode</Label>
                                <RadioGroup value={bulkMode} onValueChange={(v) => setBulkMode(v as BulkMode)}>
                                    <div
                                        className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${bulkMode === 'SEQUENTIAL' ? 'border-primary bg-primary/5' : 'border-muted hover:bg-accent'}`}
                                        onClick={() => setBulkMode('SEQUENTIAL')}
                                    >
                                        <RadioGroupItem value="SEQUENTIAL" id="sequential" className="mt-1" />
                                        <div className="flex-1">
                                            <Label htmlFor="sequential" className="cursor-pointer font-semibold text-base">
                                                Sequential Interviews
                                                <Badge variant="outline" className="ml-2">Recommended</Badge>
                                            </Label>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Each candidate gets their own interview slot, scheduled one after another.
                                                Great for individual assessments.
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${bulkMode === 'GROUP' ? 'border-primary bg-primary/5' : 'border-muted hover:bg-accent'}`}
                                        onClick={() => setBulkMode('GROUP')}
                                    >
                                        <RadioGroupItem value="GROUP" id="group" className="mt-1" />
                                        <div className="flex-1">
                                            <Label htmlFor="group" className="cursor-pointer font-semibold text-base">
                                                Group Interview
                                            </Label>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                All candidates share the same interview slot. Good for group discussions or panels.
                                            </p>
                                            {bulkMode === 'GROUP' && (
                                                <Alert variant="destructive" className="mt-3">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <AlertDescription>
                                                        All {selectedCandidateIds.length || 'selected'} candidates will share the same interview slot.
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Candidates Selection */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Candidates ({selectedCandidateIds.length} selected)
                                    </Label>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={selectAllCandidates}>
                                            Select All
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={clearCandidates}>
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search candidates..."
                                        value={candidateSearch}
                                        onChange={(e) => setCandidateSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <ScrollArea className="h-[120px] border rounded-lg p-2">
                                    {loadingCandidates ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : filteredCandidates.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            {candidateSearch ? 'No candidates match your search' : 'No candidates found'}
                                        </p>
                                    ) : (
                                        <div className="space-y-1">
                                            {filteredCandidates.map((candidate: Candidate) => (
                                                <div
                                                    key={candidate.id}
                                                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                                                    onClick={() => toggleCandidate(candidate.id)}
                                                >
                                                    <Checkbox
                                                        checked={selectedCandidateIds.includes(candidate.id)}
                                                        onCheckedChange={() => toggleCandidate(candidate.id)}
                                                    />
                                                    <span className="flex-1 truncate">{candidate.name}</span>
                                                    <Badge variant="outline" className="text-xs">{candidate.stage}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>

                            {/* Interviewers Selection */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Interviewers ({selectedInterviewerIds.length} selected)
                                </Label>
                                <ScrollArea className="h-[100px] border rounded-lg p-2">
                                    {loadingInterviewers ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : interviewers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No interviewers found
                                        </p>
                                    ) : (
                                        <div className="space-y-1">
                                            {interviewers.map((interviewer: any) => (
                                                <div
                                                    key={interviewer.id}
                                                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                                                    onClick={() => toggleInterviewer(interviewer.id)}
                                                >
                                                    <Checkbox
                                                        checked={selectedInterviewerIds.includes(interviewer.id)}
                                                        onCheckedChange={() => toggleInterviewer(interviewer.id)}
                                                    />
                                                    <span className="flex-1">{interviewer.name}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {interviewer.email}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>

                            {/* Time Settings */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Start Time
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration</Label>
                                    <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DURATIONS.map((d) => (
                                                <SelectItem key={d.value} value={String(d.value)}>
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Stage</Label>
                                    <Select value={stage} onValueChange={setStage}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Screening">Screening</SelectItem>
                                            <SelectItem value="Interview">Interview</SelectItem>
                                            <SelectItem value="Technical">Technical</SelectItem>
                                            <SelectItem value="Final">Final Round</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'confirm' && (
                        <div className="space-y-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Confirm Bulk Schedule</AlertTitle>
                                <AlertDescription>
                                    Please review the details before scheduling.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                    <div className="text-sm text-muted-foreground">Mode</div>
                                    <div className="font-semibold flex items-center gap-2">
                                        {bulkMode === 'SEQUENTIAL' ? 'Sequential Interviews' : 'Group Interview'}
                                        {bulkMode === 'GROUP' && <Badge variant="destructive">Same Slot</Badge>}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Candidates</div>
                                    <div className="font-semibold">{selectedCandidateIds.length}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Interviewers</div>
                                    <div className="font-semibold">{selectedInterviewerIds.length}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Duration per Interview</div>
                                    <div className="font-semibold">{duration} minutes</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Start Time</div>
                                    <div className="font-semibold">{new Date(startTime).toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">End Time</div>
                                    <div className="font-semibold">{endTime?.toLocaleString()}</div>
                                </div>
                                {bulkMode === 'SEQUENTIAL' && (
                                    <div className="col-span-2">
                                        <div className="text-sm text-muted-foreground">Total Block</div>
                                        <div className="font-semibold">{totalTimeMinutes} minutes ({(totalTimeMinutes / 60).toFixed(1)} hours)</div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Selected Candidates</Label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedCandidateIds.map(id => {
                                        const candidate = candidates.find((c: Candidate) => c.id === id);
                                        return (
                                            <Badge key={id} variant="secondary">
                                                {candidate?.name || id}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>

                            {bulkMode === 'GROUP' && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Group Interview Warning</AlertTitle>
                                    <AlertDescription>
                                        All {selectedCandidateIds.length} candidates will be scheduled for the SAME interview slot at {new Date(startTime).toLocaleString()}.
                                        This is typically used for group discussions or panel interviews.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    {step === 'result' && scheduleResult && (
                        <ScheduleResult
                            result={scheduleResult}
                            candidates={candidates}
                            onClose={handleClose}
                        />
                    )}
                </div>

                {step !== 'result' && (
                    <DialogFooter className="gap-2">
                        {step === 'confirm' && (
                            <Button variant="outline" onClick={() => setStep('config')}>
                                Back
                            </Button>
                        )}
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        {step === 'config' && (
                            <Button onClick={handleProceedToConfirm} disabled={!isValid}>
                                Review & Confirm
                            </Button>
                        )}
                        {step === 'confirm' && (
                            <Button onClick={handleSchedule} disabled={bulkSchedule.isPending}>
                                {bulkSchedule.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Scheduling...
                                    </>
                                ) : (
                                    `Schedule ${selectedCandidateIds.length} Interview${selectedCandidateIds.length > 1 ? 's' : ''}`
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
