import { MoreHorizontal, User, Calendar, ArrowRightCircle, Mail, Smartphone, Trash2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CandidateListItem } from '@/types/candidate-list';
import { UserRole } from '@/types/navigation';

interface CandidateRowMenuProps {
  candidate: CandidateListItem;
  userRole: UserRole;
  onViewProfile: (candidate: CandidateListItem) => void;
  onScheduleInterview: (candidate: CandidateListItem) => void;
  onChangeStage: (candidate: CandidateListItem) => void;
  onSendEmail: (candidate: CandidateListItem) => void;
  onSendWhatsApp: (candidate: CandidateListItem) => void;
  onSendSMS: (candidate: CandidateListItem) => void;
  onDelete: (candidate: CandidateListItem) => void;
}

export function CandidateRowMenu({
  candidate,
  userRole,
  onViewProfile,
  onScheduleInterview,
  onChangeStage,
  onSendEmail,
  onSendWhatsApp,
  onSendSMS,
  onDelete,
}: CandidateRowMenuProps) {
  const canEdit = userRole !== 'interviewer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover">
        <DropdownMenuItem onClick={() => onViewProfile(candidate)}>
          <User className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuItem onClick={() => onScheduleInterview(candidate)}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Interview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeStage(candidate)}>
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              Change Stage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Mail className="mr-2 h-4 w-4" />
                Contact
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                <DropdownMenuItem onClick={() => onSendEmail(candidate)}>
                  <Mail className="mr-2 h-4 w-4 text-blue-600" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSendWhatsApp(candidate)}>
                  <WhatsAppIcon className="mr-2 h-4 w-4 text-green-600" />
                  WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSendSMS(candidate)}>
                  <Smartphone className="mr-2 h-4 w-4 text-purple-600" />
                  Send SMS
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(candidate)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

