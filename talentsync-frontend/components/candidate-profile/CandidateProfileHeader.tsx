import { ArrowLeft, Calendar, Mail, MessageSquare, Smartphone, MoreHorizontal, Edit, RefreshCw, Trash2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InterviewStage } from '@/types/interview';
import { UserRole } from '@/types/candidate';

interface CandidateProfileHeaderProps {
  candidateName: string;
  stage: InterviewStage;
  userRole: UserRole;
  onScheduleInterview: () => void;
  onSendEmail: () => void;
  onSendWhatsApp: () => void;
  onSendSMS: () => void;
  onAddNote: () => void;
  onEditCandidate: () => void;
  onChangeStage: () => void;
  onDeleteCandidate: () => void;
}

const stageLabels: Record<string, string> = {
  received: 'Received',
  screening: 'Screening',
  'interview-1': 'Interview 1',
  'interview-2': 'Interview 2',
  'hr-round': 'HR Round',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

const stageColors: Record<string, string> = {
  received: 'bg-muted text-muted-foreground',
  screening: 'bg-amber-500/10 text-amber-600',
  'interview-1': 'bg-primary/10 text-primary',
  'interview-2': 'bg-primary/10 text-primary',
  'hr-round': 'bg-purple-500/10 text-purple-600',
  offer: 'bg-emerald-500/10 text-emerald-600',
  hired: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-600',
};

export function CandidateProfileHeader({
  candidateName,
  stage,
  userRole,
  onScheduleInterview,
  onSendEmail,
  onSendWhatsApp,
  onSendSMS,
  onAddNote,
  onEditCandidate,
  onChangeStage,
  onDeleteCandidate,
}: CandidateProfileHeaderProps) {
  const router = useRouter();
  const canEdit = userRole !== 'interviewer';

  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Back to Interviews</TooltipContent>
            </Tooltip>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{candidateName}</h1>
              <Badge
                variant="secondary"
                className={`mt-1 ${stageColors[stage] || 'bg-muted text-muted-foreground'}`}
              >
                {stageLabels[stage] || stage}
              </Badge>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onScheduleInterview} className="gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="hidden sm:inline">Schedule Interview</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="sm:hidden">Schedule Interview</TooltipContent>
                </Tooltip>

                {/* Contact Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="hidden sm:inline">Contact</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={onSendEmail}>
                      <Mail className="mr-2 h-4 w-4 text-blue-600" />
                      Send Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSendWhatsApp}>
                      <WhatsAppIcon className="mr-2 h-4 w-4 text-green-600" />
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onSendSMS}>
                      <Smartphone className="mr-2 h-4 w-4 text-purple-600" />
                      Send SMS
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" onClick={onAddNote} className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Note</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden">Add Note</TooltipContent>
            </Tooltip>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onEditCandidate}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Candidate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onChangeStage}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Stage
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDeleteCandidate}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Candidate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

