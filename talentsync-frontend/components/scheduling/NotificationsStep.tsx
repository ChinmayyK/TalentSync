import { useState } from 'react';
import { Mail, MessageSquare, Users, FileText, ChevronDown, Edit3, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';

// Pre-made email templates
const EMAIL_TEMPLATES = {
  professional: {
    name: 'Professional',
    candidateSubject: 'Interview Invitation - {{role}} at {{company}}',
    candidateBody: `Dear {{candidateName}},

We are pleased to inform you that your application for the {{role}} position has progressed to the interview stage.

Interview Details:
• Date: {{date}}
• Time: {{time}}
• Duration: {{duration}}
• Mode: {{mode}}
{{meetingDetails}}

Please confirm your availability by replying to this email. If you need to reschedule, kindly let us know at least 24 hours in advance.

Best regards,
{{recruiterName}}
{{company}}`,
    interviewerSubject: 'Interview Scheduled - {{candidateName}} for {{role}}',
    interviewerBody: `Hi {{interviewerName}},

You have been scheduled to interview {{candidateName}} for the {{role}} position.

Interview Details:
• Date: {{date}}
• Time: {{time}}
• Duration: {{duration}}
• Mode: {{mode}}
{{meetingDetails}}

Candidate Profile:
• Current Stage: {{stage}}
• Resume: {{resumeLink}}

{{notes}}

Thank you for your time.

Best regards,
TalentSync Scheduling System`,
  },
  friendly: {
    name: 'Friendly & Casual',
    candidateSubject: 'Great news! Your interview for {{role}} is scheduled 🎉',
    candidateBody: `Hi {{candidateName}}! 👋

Great news! We loved your application and would like to chat with you about the {{role}} position.

Here are the details:
📅 {{date}} at {{time}}
⏱️ {{duration}}
{{modeEmoji}} {{mode}}
{{meetingDetails}}

Looking forward to meeting you!

Cheers,
{{recruiterName}}`,
    interviewerSubject: 'Interview Alert: {{candidateName}} - {{role}}',
    interviewerBody: `Hey {{interviewerName}}! 👋

Quick heads up - you have an interview scheduled.

Candidate: {{candidateName}}
Role: {{role}}
When: {{date}} at {{time}} ({{duration}})
{{meetingDetails}}

{{notes}}

Good luck! 🍀`,
  },
  minimal: {
    name: 'Minimal',
    candidateSubject: 'Interview: {{role}} - {{date}}',
    candidateBody: `{{candidateName}},

Your interview is scheduled:
• {{date}} at {{time}}
• {{mode}}
{{meetingDetails}}

Please confirm your attendance.

{{recruiterName}}`,
    interviewerSubject: 'Interview: {{candidateName}} - {{date}}',
    interviewerBody: `{{interviewerName}},

Interview scheduled:
• Candidate: {{candidateName}}
• Role: {{role}}
• When: {{date}} at {{time}}
{{meetingDetails}}

{{notes}}`,
  },
};

type TemplateKey = keyof typeof EMAIL_TEMPLATES;

interface NotificationsStepProps {
  emailCandidate: boolean;
  onEmailCandidateChange: (value: boolean) => void;
  emailInterviewers: boolean;
  onEmailInterviewersChange: (value: boolean) => void;
  smsReminder: boolean;
  onSmsReminderChange: (value: boolean) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  // New props for email content
  candidateEmailSubject?: string;
  onCandidateEmailSubjectChange?: (value: string) => void;
  candidateEmailBody?: string;
  onCandidateEmailBodyChange?: (value: string) => void;
  interviewerEmailSubject?: string;
  onInterviewerEmailSubjectChange?: (value: string) => void;
  interviewerEmailBody?: string;
  onInterviewerEmailBodyChange?: (value: string) => void;
}

export function NotificationsStep({
  emailCandidate,
  onEmailCandidateChange,
  emailInterviewers,
  onEmailInterviewersChange,
  smsReminder,
  onSmsReminderChange,
  notes,
  onNotesChange,
  candidateEmailSubject = EMAIL_TEMPLATES.professional.candidateSubject,
  onCandidateEmailSubjectChange,
  candidateEmailBody = EMAIL_TEMPLATES.professional.candidateBody,
  onCandidateEmailBodyChange,
  interviewerEmailSubject = EMAIL_TEMPLATES.professional.interviewerSubject,
  onInterviewerEmailSubjectChange,
  interviewerEmailBody = EMAIL_TEMPLATES.professional.interviewerBody,
  onInterviewerEmailBodyChange,
}: NotificationsStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('professional');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editingCandidateEmail, setEditingCandidateEmail] = useState(false);
  const [editingInterviewerEmail, setEditingInterviewerEmail] = useState(false);

  // Local state for editing (if parent doesn't provide handlers)
  const [localCandidateSubject, setLocalCandidateSubject] = useState(candidateEmailSubject);
  const [localCandidateBody, setLocalCandidateBody] = useState(candidateEmailBody);
  const [localInterviewerSubject, setLocalInterviewerSubject] = useState(interviewerEmailSubject);
  const [localInterviewerBody, setLocalInterviewerBody] = useState(interviewerEmailBody);

  const handleTemplateSelect = (template: TemplateKey) => {
    setSelectedTemplate(template);
    const t = EMAIL_TEMPLATES[template];

    // Update candidate email
    setLocalCandidateSubject(t.candidateSubject);
    setLocalCandidateBody(t.candidateBody);
    onCandidateEmailSubjectChange?.(t.candidateSubject);
    onCandidateEmailBodyChange?.(t.candidateBody);

    // Update interviewer email
    setLocalInterviewerSubject(t.interviewerSubject);
    setLocalInterviewerBody(t.interviewerBody);
    onInterviewerEmailSubjectChange?.(t.interviewerSubject);
    onInterviewerEmailBodyChange?.(t.interviewerBody);

    setIsCustomizing(false);
  };

  const handleCandidateSubjectChange = (value: string) => {
    setLocalCandidateSubject(value);
    onCandidateEmailSubjectChange?.(value);
    setIsCustomizing(true);
  };

  const handleCandidateBodyChange = (value: string) => {
    setLocalCandidateBody(value);
    onCandidateEmailBodyChange?.(value);
    setIsCustomizing(true);
  };

  const handleInterviewerSubjectChange = (value: string) => {
    setLocalInterviewerSubject(value);
    onInterviewerEmailSubjectChange?.(value);
    setIsCustomizing(true);
  };

  const handleInterviewerBodyChange = (value: string) => {
    setLocalInterviewerBody(value);
    onInterviewerEmailBodyChange?.(value);
    setIsCustomizing(true);
  };

  return (
    <div className="space-y-6">
      {/* Notification Toggles */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Notification Settings</Label>

        <div className="space-y-3">
          {/* Email Candidate */}
          <div
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border transition-colors',
              emailCandidate ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                emailCandidate ? 'bg-primary/10' : 'bg-secondary'
              )}>
                <Mail className={cn('h-4 w-4', emailCandidate ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Email Candidate</p>
                <p className="text-xs text-muted-foreground">Send interview invitation to candidate</p>
              </div>
            </div>
            <Switch
              checked={emailCandidate}
              onCheckedChange={onEmailCandidateChange}
              aria-label="Email candidate"
            />
          </div>

          {/* Email Interviewers */}
          <div
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border transition-colors',
              emailInterviewers ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                emailInterviewers ? 'bg-primary/10' : 'bg-secondary'
              )}>
                <Users className={cn('h-4 w-4', emailInterviewers ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Email Interviewers</p>
                <p className="text-xs text-muted-foreground">Notify interviewers about the session</p>
              </div>
            </div>
            <Switch
              checked={emailInterviewers}
              onCheckedChange={onEmailInterviewersChange}
              aria-label="Email interviewers"
            />
          </div>

          {/* SMS Reminder */}
          <div
            className={cn(
              'flex items-center justify-between p-4 rounded-lg border transition-colors',
              smsReminder ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center',
                smsReminder ? 'bg-primary/10' : 'bg-secondary'
              )}>
                <MessageSquare className={cn('h-4 w-4', smsReminder ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">SMS Reminder</p>
                <p className="text-xs text-muted-foreground">Send reminder 1 hour before interview</p>
              </div>
            </div>
            <Switch
              checked={smsReminder}
              onCheckedChange={onSmsReminderChange}
              aria-label="SMS reminder"
            />
          </div>
        </div>
      </div>

      {/* Email Template Selection & Editor */}
      {(emailCandidate || emailInterviewers) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Email Template</Label>
              {isCustomizing && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Customized
                </span>
              )}
            </div>

            {/* Template Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {EMAIL_TEMPLATES[selectedTemplate].name}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Choose Template</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(EMAIL_TEMPLATES) as TemplateKey[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleTemplateSelect(key)}
                    className={cn(selectedTemplate === key && 'bg-primary/10')}
                  >
                    {EMAIL_TEMPLATES[key].name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Candidate Email Editor */}
          {emailCandidate && (
            <Collapsible open={editingCandidateEmail} onOpenChange={setEditingCandidateEmail}>
              <div className="rounded-lg border border-border overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Candidate Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        editingCandidateEmail && "rotate-180"
                      )} />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <div className="p-3 border-t border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                  <p className="text-sm font-medium text-foreground truncate">{localCandidateSubject}</p>
                </div>

                <CollapsibleContent>
                  <div className="p-4 space-y-4 border-t border-border bg-background">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Subject Line</Label>
                      <Input
                        value={localCandidateSubject}
                        onChange={(e) => handleCandidateSubjectChange(e.target.value)}
                        placeholder="Email subject..."
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Email Body</Label>
                      <Textarea
                        value={localCandidateBody}
                        onChange={(e) => handleCandidateBodyChange(e.target.value)}
                        placeholder="Email content..."
                        className="min-h-[200px] text-sm font-mono resize-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground">Variables:</span>
                      {['{{candidateName}}', '{{role}}', '{{date}}', '{{time}}', '{{duration}}', '{{mode}}'].map((v) => (
                        <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded text-primary">
                          {v}
                        </code>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Interviewer Email Editor */}
          {emailInterviewers && (
            <Collapsible open={editingInterviewerEmail} onOpenChange={setEditingInterviewerEmail}>
              <div className="rounded-lg border border-border overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Interviewer Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        editingInterviewerEmail && "rotate-180"
                      )} />
                    </div>
                  </button>
                </CollapsibleTrigger>

                <div className="p-3 border-t border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                  <p className="text-sm font-medium text-foreground truncate">{localInterviewerSubject}</p>
                </div>

                <CollapsibleContent>
                  <div className="p-4 space-y-4 border-t border-border bg-background">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Subject Line</Label>
                      <Input
                        value={localInterviewerSubject}
                        onChange={(e) => handleInterviewerSubjectChange(e.target.value)}
                        placeholder="Email subject..."
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Email Body</Label>
                      <Textarea
                        value={localInterviewerBody}
                        onChange={(e) => handleInterviewerBodyChange(e.target.value)}
                        placeholder="Email content..."
                        className="min-h-[200px] text-sm font-mono resize-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-muted-foreground">Variables:</span>
                      {['{{interviewerName}}', '{{candidateName}}', '{{role}}', '{{date}}', '{{time}}'].map((v) => (
                        <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded text-primary">
                          {v}
                        </code>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Internal Notes</Label>
        <Textarea
          placeholder="Add any notes for the interview panel (not shared with candidate)..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="min-h-[100px] bg-background resize-none"
        />
        <p className="text-xs text-muted-foreground">
          These notes will be visible to interviewers only
        </p>
      </div>
    </div>
  );
}
