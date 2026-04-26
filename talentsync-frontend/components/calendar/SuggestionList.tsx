'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Star, Info, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SlotSuggestion } from '@/lib/api/calendar';

interface SuggestionListProps {
    suggestions: SlotSuggestion[];
    isLoading?: boolean;
    onSelect?: (suggestion: SlotSuggestion) => void;
    selectedSlot?: { start: string; end: string } | null;
}

function getScoreColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
}

function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'outline' {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
}

export function SuggestionList({
    suggestions,
    isLoading,
    onSelect,
    selectedSlot,
}: SuggestionListProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-10 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Finding best times...</span>
                </CardContent>
            </Card>
        );
    }

    if (!suggestions || suggestions.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    No available slots found for the selected criteria.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Suggested Time Slots
                </CardTitle>
                <CardDescription>
                    {suggestions.length} options ranked by availability and preferences
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {suggestions.map((suggestion, index) => {
                    const startDate = new Date(suggestion.start);
                    const endDate = new Date(suggestion.end);
                    const isSelected = selectedSlot?.start === suggestion.start && selectedSlot?.end === suggestion.end;
                    const isExpanded = expandedIndex === index;

                    return (
                        <Collapsible
                            key={index}
                            open={isExpanded}
                            onOpenChange={() => setExpandedIndex(isExpanded ? null : index)}
                        >
                            <div
                                className={cn(
                                    'border rounded-lg p-4 transition-colors',
                                    isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:border-primary/50',
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {format(startDate, 'EEE, MMM d')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score and Badge */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant={getScoreBadgeVariant(suggestion.score)}>
                                                Score: {suggestion.score}
                                            </Badge>
                                            <div className="flex-1 h-2 bg-muted rounded-full max-w-[100px]">
                                                <div
                                                    className={cn('h-full rounded-full', getScoreColor(suggestion.score))}
                                                    style={{ width: `${suggestion.score}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant={isSelected ? 'default' : 'outline'}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(suggestion);
                                            }}
                                        >
                                            {isSelected ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Selected
                                                </>
                                            ) : (
                                                'Select'
                                            )}
                                        </Button>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>
                                    </div>
                                </div>

                                <CollapsibleContent className="mt-4 pt-4 border-t">
                                    <div className="space-y-3">
                                        {/* Reasons */}
                                        <div>
                                            <div className="text-sm font-medium mb-2 flex items-center gap-1">
                                                <Info className="h-4 w-4" />
                                                Why this time?
                                            </div>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                {suggestion.reasons.map((reason, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                                                        {reason}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* User Availability */}
                                        <div>
                                            <div className="text-sm font-medium mb-2">
                                                Interviewer Availability
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(suggestion.userAvailability).map(([userId, available]) => (
                                                    <Badge
                                                        key={userId}
                                                        variant={available ? 'default' : 'secondary'}
                                                        className={cn(
                                                            available
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                                        )}
                                                    >
                                                        {available ? '✓' : '✗'} User {userId.slice(-4)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleContent>
                            </div>
                        </Collapsible>
                    );
                })}
            </CardContent>
        </Card>
    );
}
