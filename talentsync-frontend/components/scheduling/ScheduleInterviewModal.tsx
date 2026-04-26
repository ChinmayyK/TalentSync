import { useState, useEffect } from 'react';
import { X, Check, ChevronRight, Users, FileText, Bell, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CandidateSelector } from './CandidateSelector';
import { InterviewDetailsForm } from './InterviewDetailsForm';
import { NotificationsStep } from './NotificationsStep';
import { durationOptions } from '@/lib/scheduling-mock-data';
import { toast } from '@/hooks/use-toast';
import { listCandidates } from '@/lib/api/candidates';
import { getUsers } from '@/lib/api/users';
import { createInterview } from '@/lib/api/interviews';
import { Candidate, Interviewer, TimeSlot } from '@/types/scheduling';

// Max lengths for text fields
const MAX_NOTES_LENGTH = 2000;
const MAX_EMAIL_SUBJECT_LENGTH = 200;
const MAX_EMAIL_BODY_LENGTH = 10000;

interface ScheduleInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialDate?: Date;
}

type Step = 1 | 2 | 3;

const steps = [
  { id: 1 as const, label: 'Select Candidates', icon: Users },
  { id: 2 as const, label: 'Interview Details', icon: FileText },
  { id: 3 as const, label: 'Notifications', icon: Bell },
];

// Generate time slots for the day
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (const minute of ['00', '30']) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        available: true,
        recommended: hour === 10 || hour === 14,
      });
    }
  }
  return slots;
};

export function ScheduleInterviewModal({ open, onOpenChange, onSuccess, initialDate }: ScheduleInterviewModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data from API
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const timeSlots = generateTimeSlots();

  // Step 1: Candidates
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Step 2: Interview Details
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  const [interviewMode, setInterviewMode] = useState<'online' | 'offline' | 'phone'>('online');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // Step 3: Notifications
  const [emailCandidate, setEmailCandidate] = useState(true);
  const [emailInterviewers, setEmailInterviewers] = useState(true);
  const [smsReminder, setSmsReminder] = useState(false);
  const [notes, setNotes] = useState('');

  // Custom Email State
  const [candidateEmailSubject, setCandidateEmailSubject] = useState('');
  const [candidateEmailBody, setCandidateEmailBody] = useState('');
  const [interviewerEmailSubject, setInterviewerEmailSubject] = useState('');
  const [interviewerEmailBody, setInterviewerEmailBody] = useState('');

  // Load real data when modal opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);

      Promise.all([
        listCandidates(undefined, { perPage: 100 }),
        getUsers({ role: 'INTERVIEWER' }),
      ])
        .then(([candidatesRes, usersRes]: [any, any]) => {
          // Map backend candidates to scheduling Candidate type
          const mappedCandidates: Candidate[] = (candidatesRes.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            role: c.roleTitle || c.roleApplied || c.position || 'Unknown Role',
            stage: c.stage || 'applied',
            hasResume: !!c.resumeUrl,
            priorInterviews: c.interviewCount || 0,
            appliedDate: c.createdAt,
            // Interview scheduling conflict fields
            hasActiveInterview: c.hasActiveInterview || false,
            activeInterviewId: c.activeInterviewId,
            activeInterviewDate: c.activeInterviewDate,
          }));
          setCandidates(mappedCandidates);

          // Map backend users to Interviewer type
          const mappedInterviewers: Interviewer[] = (usersRes.data || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            department: 'Hiring Team',
            availability: 'available',
          }));
          setInterviewers(mappedInterviewers);
        })
        .catch((err) => {
          toast({
            title: 'Error Loading Data',
            description: err instanceof Error ? err.message : 'Failed to load candidates and interviewers',
            variant: 'destructive',
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  // Update selectedDate when initialDate changes (when modal opens from calendar click)
  useEffect(() => {
    if (open && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [open, initialDate]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCurrentStep(1);
        setSelectedCandidateIds([]);
        setSelectedInterviewerIds([]);
        setInterviewMode('online');
        setSelectedDate(undefined);
        setSelectedTime('');
        setDuration(60);
        setLocation('');
        setMeetingLink('');
        setEmailCandidate(true);
        setEmailInterviewers(true);
        setSmsReminder(false);
        setNotes('');
        setCandidateEmailSubject('');
        setCandidateEmailBody('');
        setInterviewerEmailSubject('');
        setInterviewerEmailBody('');
      }, 200);
    }
  }, [open]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedCandidateIds.length > 0;
      case 2:
        return selectedInterviewerIds.length > 0 && selectedDate && selectedTime;
      case 3:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Create an interview for each selected candidate
      const interviewPromises = selectedCandidateIds.map((candidateId) =>
        createInterview({
          candidateId,
          date: selectedDate?.toISOString().split('T')[0] || '',
          startTime: selectedTime,
          durationMins: duration,
          stage: 'SCREENING',
          type: interviewMode === 'online' ? 'VIDEO' : interviewMode === 'phone' ? 'PHONE' : 'IN_PERSON',
          location: interviewMode === 'offline' ? location : undefined,
          meetingLink: interviewMode === 'online' ? meetingLink : undefined,
          interviewerIds: selectedInterviewerIds,
          notes,
          candidateEmailSubject: emailCandidate ? candidateEmailSubject : undefined,
          candidateEmailBody: emailCandidate ? candidateEmailBody : undefined,
          interviewerEmailSubject: emailInterviewers ? interviewerEmailSubject : undefined,
          interviewerEmailBody: emailInterviewers ? interviewerEmailBody : undefined,
        })
      );

      await Promise.all(interviewPromises);

      toast({
        title: 'Interview Scheduled',
        description: `Successfully scheduled ${selectedCandidateIds.length} interview(s)`,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const errorReason = error?.reason || '';

      // Check for candidate already has interview error
      if (errorMessage.toLowerCase().includes('already has a scheduled interview') ||
        errorReason === 'INTERVIEW_ALREADY_SCHEDULED') {
        toast({
          title: 'Candidate Already Scheduled',
          description: 'This candidate already has an upcoming interview. Cancel or complete it before scheduling a new one.',
          variant: 'destructive',
        });
      }
      // Check for interviewer time conflict error
      else if (errorMessage.toLowerCase().includes('conflict')) {
        toast({
          title: 'Scheduling Conflict',
          description: 'One or more interviewers are not available at this time. Please choose a different time slot or select different interviewers.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Scheduling Failed',
          description: errorMessage || 'Failed to schedule interview. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-screen h-[100dvh] max-w-none md:max-w-4xl md:h-[85vh] md:max-h-[720px] p-0 gap-0 overflow-hidden bg-background [&>button:last-child]:hidden"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Schedule Interview</DialogTitle>

        <div className="flex h-full min-h-0 flex-col md:flex-row">
          {/* Sidebar Stepper - Hidden on mobile, more compact */}
          <div className="hidden md:flex w-56 flex-shrink-0 bg-gradient-to-b from-muted/60 to-muted/30 backdrop-blur-md border-r border-border/50 p-5 flex-col">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground tracking-tight">Schedule Interview</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Set up a new interview session</p>
            </div>

            <nav className="flex-1 space-y-1" aria-label="Progress">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="relative">
                    <button
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                      disabled={!isCompleted && !isActive}
                      className={cn(
                        'w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20',
                        isActive && 'bg-primary/10 border border-primary/30 shadow-sm',
                        isCompleted && 'hover:bg-accent/50 cursor-pointer',
                        !isActive && !isCompleted && 'opacity-40'
                      )}
                    >
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                          isActive && 'bg-primary text-primary-foreground shadow-sm',
                          isCompleted && 'bg-primary/20 text-primary',
                          !isActive && !isCompleted && 'bg-muted text-muted-foreground border border-border/50'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[13px] font-medium truncate leading-tight',
                          isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {step.label}
                        </p>
                      </div>
                      {isCompleted && (
                        <span className="text-[10px] text-muted-foreground">✓</span>
                      )}
                    </button>

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "absolute left-[1.125rem] top-[2.75rem] w-0.5 h-2 rounded-full transition-colors",
                        isCompleted ? "bg-primary/30" : "bg-border"
                      )} />
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Progress summary */}
            <div className="pt-4 border-t border-border/50 mt-auto space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{currentStep}/3</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Press <kbd className="px-1 py-0.5 bg-secondary rounded text-[9px] font-mono">?</kbd> for shortcuts
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <div className="flex items-center gap-3 md:hidden mb-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 w-8 rounded-full transition-all",
                          currentStep > i ? "bg-primary" : currentStep === i ? "bg-primary" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">Step {currentStep} of 3</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {steps.find((s) => s.id === currentStep)?.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentStep === 1 && 'Choose one or more candidates for this interview'}
                  {currentStep === 2 && 'Configure interview details and timing'}
                  {currentStep === 3 && 'Set up notifications and add notes'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Step Content */}
            <div className={cn(
              "flex-1 p-6 relative min-h-0",
              currentStep === 1 ? "overflow-hidden flex flex-col" : "overflow-y-auto"
            )}>
              {currentStep === 1 && (
                <CandidateSelector
                  candidates={candidates}
                  selectedIds={selectedCandidateIds}
                  onSelectionChange={setSelectedCandidateIds}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 2 && (
                <InterviewDetailsForm
                  interviewers={interviewers}
                  timeSlots={timeSlots}
                  selectedInterviewerIds={selectedInterviewerIds}
                  onInterviewerChange={setSelectedInterviewerIds}
                  interviewMode={interviewMode}
                  onModeChange={setInterviewMode}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  selectedTime={selectedTime}
                  onTimeChange={setSelectedTime}
                  duration={duration}
                  onDurationChange={setDuration}
                  location={location}
                  onLocationChange={setLocation}
                  meetingLink={meetingLink}
                  onMeetingLinkChange={setMeetingLink}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 3 && (
                <NotificationsStep
                  emailCandidate={emailCandidate}
                  onEmailCandidateChange={setEmailCandidate}
                  emailInterviewers={emailInterviewers}
                  onEmailInterviewersChange={setEmailInterviewers}
                  smsReminder={smsReminder}
                  onSmsReminderChange={setSmsReminder}
                  notes={notes}
                  onNotesChange={setNotes}
                  candidateEmailSubject={candidateEmailSubject}
                  onCandidateEmailSubjectChange={setCandidateEmailSubject}
                  candidateEmailBody={candidateEmailBody}
                  onCandidateEmailBodyChange={setCandidateEmailBody}
                  interviewerEmailSubject={interviewerEmailSubject}
                  onInterviewerEmailSubjectChange={setInterviewerEmailSubject}
                  interviewerEmailBody={interviewerEmailBody}
                  onInterviewerEmailBodyChange={setInterviewerEmailBody}
                />
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-t border-border bg-background flex-shrink-0 gap-3 sm:gap-0">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                {currentStep > 1 && (
                  <Button variant="ghost" onClick={handleBack} className="flex-1 sm:flex-none">
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                  Cancel
                </Button>

                {currentStep < 3 ? (
                  <Button onClick={handleNext} disabled={!canProceed()} className="flex-1 sm:flex-none gap-2">
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none gap-2 min-w-[140px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Schedule
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
