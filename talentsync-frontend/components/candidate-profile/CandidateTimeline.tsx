'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import {
    ArrowRight,
    FileText,
    MessageSquare,
    Calendar,
    Mail,
    Phone,
    MessageCircle,
    Upload,
    UserPlus,
    Clock,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getCandidateTimeline, TimelineEvent } from '@/lib/api/candidates';
import { getAuthToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface CandidateTimelineProps {
    candidateId: string;
}

const eventIcons: Record<TimelineEvent['type'], React.ElementType> = {
    STAGE_CHANGE: ArrowRight,
    NOTE_ADDED: MessageSquare,
    INTERVIEW_SCHEDULED: Calendar,
    INTERVIEW_COMPLETED: Calendar,
    EMAIL_SENT: Mail,
    SMS_SENT: Phone,
    WHATSAPP_SENT: MessageCircle,
    DOCUMENT_UPLOADED: Upload,
    CANDIDATE_CREATED: UserPlus,
};

const eventColors: Record<TimelineEvent['type'], string> = {
    STAGE_CHANGE: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    NOTE_ADDED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    INTERVIEW_SCHEDULED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    INTERVIEW_COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/20',
    EMAIL_SENT: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    SMS_SENT: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    WHATSAPP_SENT: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    DOCUMENT_UPLOADED: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    CANDIDATE_CREATED: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
};

const lineColors: Record<TimelineEvent['type'], string> = {
    STAGE_CHANGE: 'bg-purple-500',
    NOTE_ADDED: 'bg-blue-500',
    INTERVIEW_SCHEDULED: 'bg-amber-500',
    INTERVIEW_COMPLETED: 'bg-green-500',
    EMAIL_SENT: 'bg-cyan-500',
    SMS_SENT: 'bg-pink-500',
    WHATSAPP_SENT: 'bg-emerald-500',
    DOCUMENT_UPLOADED: 'bg-orange-500',
    CANDIDATE_CREATED: 'bg-indigo-500',
};

function formatDateGroup(dateStr: string): string {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yyyy');
}

function groupEventsByDate(events: TimelineEvent[]): Map<string, TimelineEvent[]> {
    const groups = new Map<string, TimelineEvent[]>();

    for (const event of events) {
        const date = parseISO(event.timestamp);
        const dateKey = format(date, 'yyyy-MM-dd');

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(event);
    }

    return groups;
}

interface TimelineEventItemProps {
    event: TimelineEvent;
    isLast: boolean;
}

function TimelineEventItem({ event, isLast }: TimelineEventItemProps) {
    const [expanded, setExpanded] = useState(false);
    const Icon = eventIcons[event.type];
    const colorClasses = eventColors[event.type];
    const lineColor = lineColors[event.type];
    const date = parseISO(event.timestamp);

    const hasExpandableContent = event.type === 'NOTE_ADDED' && event.description && event.description.length > 50;

    return (
        <div className="flex gap-4 relative">
            {/* Timeline line */}
            {!isLast && (
                <div
                    className={cn(
                        "absolute left-[19px] top-10 w-0.5 h-[calc(100%-16px)]",
                        lineColor,
                        "opacity-20"
                    )}
                />
            )}

            {/* Icon */}
            <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                colorClasses
            )}>
                <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{event.title}</p>
                        {event.description && (
                            <p className={cn(
                                "text-sm text-muted-foreground mt-0.5",
                                !expanded && hasExpandableContent && "line-clamp-1"
                            )}>
                                {event.description}
                            </p>
                        )}
                        {event.actor && (
                            <p className="text-xs text-muted-foreground mt-1">
                                by <span className="font-medium">{event.actor.name}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(date, 'hh:mm a')}
                        </span>
                        {hasExpandableContent && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? (
                                    <>
                                        <ChevronUp className="w-3 h-3 mr-1" />
                                        Less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-3 h-3 mr-1" />
                                        More
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CandidateTimeline({ candidateId }: CandidateTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTimeline() {
            setIsLoading(true);
            setError(null);

            try {
                const token = getAuthToken();
                if (!token) {
                    setError('Please log in to view timeline');
                    return;
                }

                const data = await getCandidateTimeline(candidateId, token);
                setEvents(data);
            } catch (err) {
                console.error('Failed to fetch timeline:', err);
                setError('Failed to load timeline');
            } finally {
                setIsLoading(false);
            }
        }

        fetchTimeline();
    }, [candidateId]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5" />
                        Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5" />
                        Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (events.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5" />
                        Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                </CardContent>
            </Card>
        );
    }

    const groupedEvents = groupEventsByDate(events);

    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5" />
                        Timeline
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                        {events.length} events
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-6"
                >
                    {Array.from(groupedEvents.entries()).map(([dateKey, dateEvents], groupIndex) => (
                        <div key={dateKey}>
                            {/* Date Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="text-sm font-semibold text-foreground">
                                    {formatDateGroup(dateEvents[0].timestamp)}
                                </div>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Events */}
                            <div className="pl-2">
                                {dateEvents.map((event, eventIndex) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: (groupIndex * dateEvents.length + eventIndex) * 0.03 }}
                                    >
                                        <TimelineEventItem
                                            event={event}
                                            isLast={eventIndex === dateEvents.length - 1 && groupIndex === groupedEvents.size - 1}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </CardContent>
        </Card>
    );
}
