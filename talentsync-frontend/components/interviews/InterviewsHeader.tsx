import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InterviewsHeaderProps {
    onScheduleClick: () => void;
}

export function InterviewsHeader({ onScheduleClick }: InterviewsHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Interviews</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage and track all interview sessions
                </p>
            </div>
            <Button onClick={onScheduleClick} className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                Schedule Interview
            </Button>
        </div>
    );
}
