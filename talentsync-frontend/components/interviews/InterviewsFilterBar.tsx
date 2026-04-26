import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CalendarFilters } from '@/types/calendar';
import { InterviewStage, InterviewStatus } from '@/types/interview';

interface InterviewsFilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filters: CalendarFilters & { status: InterviewStatus | 'all' };
    onFilterChange: (key: string, value: string) => void;
    interviewers: { id: string; name: string }[];
    onClearFilters: () => void;
}

export function InterviewsFilterBar({
    searchQuery,
    onSearchChange,
    filters,
    onFilterChange,
    interviewers,
    onClearFilters,
}: InterviewsFilterBarProps) {
    const hasActiveFilters =
        searchQuery ||
        filters.stage !== 'all' ||
        filters.status !== 'all' ||
        filters.interviewerId !== 'all';

    return (
        <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by candidate or interviewer..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 bg-background w-full"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:flex flex-wrap gap-3 items-center w-full lg:w-auto">
                <Select
                    value={filters.stage}
                    onValueChange={(value) => onFilterChange('stage', value)}
                >
                    <SelectTrigger className="w-full sm:w-[160px] bg-background">
                        <SelectValue placeholder="Stage" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="screening">Screening</SelectItem>
                        <SelectItem value="interview-1">First Round</SelectItem>
                        <SelectItem value="interview-2">Second Round</SelectItem>
                        <SelectItem value="hr-round">HR Round</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={filters.status}
                    onValueChange={(value) => onFilterChange('status', value)}
                >
                    <SelectTrigger className="w-full sm:w-[160px] bg-background">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no-show">No Show</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={filters.interviewerId}
                    onValueChange={(value) => onFilterChange('interviewerId', value)}
                >
                    <SelectTrigger className="w-full sm:w-[180px] bg-background">
                        <SelectValue placeholder="Interviewer" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Interviewers</SelectItem>
                        {interviewers.map((interviewer) => (
                            <SelectItem key={interviewer.id} value={interviewer.id}>
                                {interviewer.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
