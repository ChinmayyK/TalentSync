import { MoreHorizontal, Eye, CalendarClock, Ban, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarEvent } from '@/types/calendar';

interface InterviewRowActionsProps {
    event: CalendarEvent;
    onAction: (action: string, event: CalendarEvent) => void;
    disabled?: boolean;
}

export function InterviewRowActions({ event, onAction, disabled }: InterviewRowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={() => onAction('view', event)}>
                    <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                    View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('reschedule', event)}>
                    <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
                    Reschedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('reminder', event)}>
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    Send Reminder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('complete', event)}>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    Mark Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('cancel', event)} className="text-destructive focus:text-destructive">
                    <Ban className="mr-2 h-4 w-4" />
                    Cancel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('no-show', event)} className="text-destructive focus:text-destructive">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Mark No-Show
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
