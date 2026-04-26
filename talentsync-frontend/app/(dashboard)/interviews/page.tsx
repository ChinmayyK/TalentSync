"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { InterviewsHeader } from '@/components/interviews/InterviewsHeader';
import { InterviewsFilterBar } from '@/components/interviews/InterviewsFilterBar';
import { InterviewsTable } from '@/components/interviews/InterviewsTable';
import { ScheduleInterviewModal } from '@/components/scheduling/ScheduleInterviewModal';
import { CalendarEvent, CalendarFilters } from '@/types/calendar';
import { InterviewStatus, InterviewStage } from '@/types/interview';
import { toast } from '@/hooks/use-toast';
import { getInterviews } from '@/lib/api/interviews';
import { useInterviewers } from '@/lib/hooks/useInterviews';
import { Skeleton } from '@/components/ui/skeleton';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

export default function InterviewsPage() {
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<CalendarFilters & { status: InterviewStatus | 'all' }>({
        interviewerId: 'all',
        stage: 'all',
        status: 'all',
        role: 'all',
    });

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { data: interviewersData } = useInterviewers();

    const loadInterviews = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getInterviews({ perPage: 100 });

            // Map API response to CalendarEvent format
            const mappedEvents: CalendarEvent[] = response.data.map((interview) => {
                const interviewerName = interview.interviewers?.[0]?.name || 'Unassigned';
                const initials = interviewerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                return {
                    id: interview.id,
                    candidateId: interview.candidateId,
                    candidateName: interview.candidateName || 'Unknown',
                    interviewerId: interview.interviewers?.[0]?.id || '',
                    interviewerName,
                    interviewerInitials: initials,
                    role: interview.roleTitle || '',
                    stage: interview.stage as InterviewStage,
                    status: interview.status as InterviewStatus,
                    startTime: interview.date,
                    endTime: interview.date,
                    duration: interview.durationMins || 60,
                    mode: (interview.type === 'in_person' ? 'in-person' : interview.type === 'phone' ? 'phone' : 'video') as CalendarEvent['mode'],
                    meetingLink: interview.meetingLink,
                    location: interview.location,
                    tenantId: interview.tenantId,
                };
            });

            if (mappedEvents.length > 0) {
                setEvents(mappedEvents);
            }
        } catch (error) {
            console.warn('Failed to load interviews, using mock data:', error);
            // Keep mock data on error
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInterviews();
    }, [loadInterviews]);

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            // Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    event.candidateName.toLowerCase().includes(query) ||
                    event.interviewerName.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Filters
            if (filters.interviewerId !== 'all' && event.interviewerId !== filters.interviewerId) return false;
            if (filters.stage !== 'all' && event.stage !== filters.stage) return false;
            if (filters.status !== 'all' && event.status !== filters.status) return false;

            return true;
        });
    }, [events, searchQuery, filters]);

    const handleAction = (action: string, event: CalendarEvent) => {
        toast({
            title: `Action: ${action}`,
            description: `Performed ${action} on interview with ${event.candidateName}`,
        });
    };

    const handleBulkAction = (action: string, eventIds: string[]) => {
        toast({
            title: `Bulk Action: ${action}`,
            description: `Performed ${action} on ${eventIds.length} interviews`,
        });
    };

    if (isLoading) {
        return (
            <div className="px-8 py-6 h-full space-y-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full space-y-6 md:space-y-8">
            <motion.main
                initial="initial"
                animate="animate"
                variants={staggerContainer}
            >
                <motion.div variants={fadeInUp}>
                    <InterviewsHeader onScheduleClick={() => setIsScheduleModalOpen(true)} />
                </motion.div>

                <motion.div variants={staggerItem} className="space-y-6">
                    <InterviewsFilterBar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filters={filters}
                        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
                        interviewers={interviewersData?.map(i => ({ id: i.id, name: i.name })) || []}
                        onClearFilters={() => {
                            setSearchQuery('');
                            setFilters({ interviewerId: 'all', stage: 'all', status: 'all', role: 'all' });
                        }}
                    />

                    <InterviewsTable
                        events={filteredEvents}
                        userRole="admin"
                        onAction={handleAction}
                        onBulkAction={handleBulkAction}
                    />
                </motion.div>

                <ScheduleInterviewModal
                    open={isScheduleModalOpen}
                    onOpenChange={setIsScheduleModalOpen}
                    onSuccess={() => loadInterviews()}
                />
            </motion.main>
        </div>
    );
}

