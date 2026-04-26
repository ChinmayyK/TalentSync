"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { InterviewHeader } from '@/components/interview-details/InterviewHeader';
import { InterviewInfoCard } from '@/components/interview-details/InterviewInfoCard';
import { TimelineCard } from '@/components/interview-details/TimelineCard';
import { FeedbackCard } from '@/components/interview-details/FeedbackCard';
import { CandidateSnapshot } from '@/components/interview-details/CandidateSnapshot';
import { NotesSection } from '@/components/interview-details/NotesSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    mockInterviewDetails,
    mockTimeline,
    mockFeedback,
    mockFeedbackPending,
    mockCandidate,
    mockNotes,
    currentUserRole,
} from '@/lib/interview-details-mock';
import {
    InterviewDetails as InterviewDetailsType,
    TimelineEvent,
    FeedbackSummary,
    CandidateDetails,
    InterviewNote,
} from '@/types/interview-details';
import { InterviewStage } from '@/types/interview';
import { getInterview } from '@/lib/api/interviews';
import { fadeInUp, fadeInRight, staggerContainer, staggerItem } from '@/lib/animations';

export default function InterviewDetails() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { toast } = useToast();

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isTimelineLoading, setIsTimelineLoading] = useState(true);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);
    const [isCandidateLoading, setIsCandidateLoading] = useState(true);
    const [isNotesLoading, setIsNotesLoading] = useState(true);

    // Data states
    const [interview, setInterview] = useState<InterviewDetailsType | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
    const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
    const [notes, setNotes] = useState<InterviewNote[]>([]);

    // Map API response to InterviewDetails type
    const mapApiToDetails = (apiData: any): InterviewDetailsType => {
        return {
            id: apiData.id,
            candidateId: apiData.candidateId || '',
            candidateName: apiData.candidateName || 'Unknown',
            candidateEmail: apiData.candidateEmail || '',
            candidatePhone: apiData.candidatePhone || '',
            role: apiData.roleTitle || apiData.stage || '',
            date: apiData.date,
            startTime: apiData.startTime || '09:00',
            endTime: apiData.endTime || '10:00',
            duration: apiData.durationMins || 60,
            interviewMode: apiData.type === 'in_person' ? 'offline' : apiData.type === 'phone' ? 'phone' : 'online',
            location: apiData.location,
            meetingLink: apiData.meetingLink,
            status: apiData.status || 'scheduled',
            stage: apiData.stage || 'screening',
            interviewers: (apiData.interviewers || []).map((i: any) => ({
                id: i.id,
                name: i.name,
                email: i.email || '',
                role: i.role || 'Interviewer',
                avatarUrl: i.avatar,
            })),
            tenantId: apiData.tenantId || '',
            createdAt: apiData.createdAt || new Date().toISOString(),
            updatedAt: apiData.updatedAt || new Date().toISOString(),
        };
    };

    const loadData = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);

        try {
            // Fetch real interview data from API
            const apiData = await getInterview(id);
            const interviewDetails = mapApiToDetails(apiData);

            setInterview(interviewDetails);

            // Map candidate from interview data
            if (apiData.candidateId) {
                setCandidate({
                    id: apiData.candidateId,
                    name: apiData.candidateName || 'Unknown',
                    email: apiData.candidateEmail || '',
                    phone: apiData.candidatePhone || '',
                    appliedRole: apiData.roleTitle || '',
                    currentStage: (apiData.stage || 'screening') as InterviewStage,
                    appliedDate: apiData.createdAt || new Date().toISOString(),
                    previousInterviews: [],
                });
                setIsCandidateLoading(false);
            } else {
                setCandidate(mockCandidate);
                setIsCandidateLoading(false);
            }

            // Use mock data for timeline, feedback, notes until APIs exist
            setTimeline(mockTimeline);
            setIsTimelineLoading(false);

            setFeedback(interviewDetails.status === 'completed' ? mockFeedback : mockFeedbackPending);
            setIsFeedbackLoading(false);

            setNotes(mockNotes);
            setIsNotesLoading(false);
        } catch (error) {
            console.error('Failed to fetch interview:', error);

            // Fall back to mock data on error
            setInterview(mockInterviewDetails);
            setTimeline(mockTimeline);
            setFeedback(mockInterviewDetails.status === 'completed' ? mockFeedback : mockFeedbackPending);
            setCandidate(mockCandidate);
            setNotes(mockNotes);

            setIsTimelineLoading(false);
            setIsFeedbackLoading(false);
            setIsCandidateLoading(false);
            setIsNotesLoading(false);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleReschedule = () => {
        toast({ title: 'Reschedule', description: 'Opening reschedule dialog...' });
    };

    const handleSendReminder = () => {
        toast({ title: 'Reminder Sent', description: 'Notification sent to all participants.' });
    };

    const handleCancel = () => {
        toast({
            title: 'Cancel Interview',
            description: 'Are you sure? This action cannot be undone.',
            variant: 'destructive',
        });
    };

    const handleEditDetails = () => {
        toast({ title: 'Edit Details', description: 'Opening edit dialog...' });
    };

    const handleViewProfile = () => {
        router.push(`/candidates/${candidate?.id}`);
        toast({ title: 'View Profile', description: 'Navigating to candidate profile...' });
    };

    const handleAddNote = async (content: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const newNote: InterviewNote = {
            id: `n${notes.length + 1}`,
            content,
            authorId: 'current-user',
            authorName: 'Current User',
            createdAt: new Date().toISOString(),
        };

        setNotes([newNote, ...notes]);
        toast({ title: 'Note Added', description: 'Your note has been saved.' });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[hsl(var(--background))]">
                {/* Header Skeleton */}
                <div className="bg-background border-b border-border">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-9 w-32" />
                                <Skeleton className="h-6 w-40" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-10 w-28" />
                                <Skeleton className="h-10 w-32" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton className="h-96 rounded-xl" />
                            <Skeleton className="h-64 rounded-xl" />
                        </div>
                        <div>
                            <Skeleton className="h-[500px] rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!interview) {
        return (
            <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground">Interview not found</h2>
                    <p className="text-sm text-muted-foreground mt-1">The interview you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full">
            <motion.main
                initial="initial"
                animate="animate"
                variants={staggerContainer}
            >
                {/* Header */}
                <motion.div variants={fadeInUp}>
                    <InterviewHeader
                        status={interview.status}
                        userRole={currentUserRole}
                        onReschedule={handleReschedule}
                        onSendReminder={handleSendReminder}
                        onCancel={handleCancel}
                    />
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    {/* Left Column */}
                    <motion.div variants={staggerItem} className="lg:col-span-2 space-y-6">
                        <InterviewInfoCard
                            interview={interview}
                            userRole={currentUserRole}
                            onEdit={handleEditDetails}
                        />

                        <TimelineCard
                            events={timeline}
                            isLoading={isTimelineLoading}
                        />

                        <FeedbackCard
                            feedback={feedback || { overallRating: 0, recommendation: 'pending', feedbackEntries: [] }}
                            isLoading={isFeedbackLoading}
                        />

                        {/* Notes Section - Full width on mobile, bottom of left col on desktop */}
                        <div className="lg:hidden">
                            {candidate && (
                                <CandidateSnapshot
                                    candidate={candidate}
                                    isLoading={isCandidateLoading}
                                    onViewProfile={handleViewProfile}
                                />
                            )}
                        </div>

                        <NotesSection
                            notes={notes}
                            userRole={currentUserRole}
                            isLoading={isNotesLoading}
                            onAddNote={handleAddNote}
                        />
                    </motion.div>

                    {/* Right Sidebar - Hidden on mobile, shown above notes section */}
                    <motion.div variants={fadeInRight} className="hidden lg:block space-y-6">
                        {candidate && (
                            <CandidateSnapshot
                                candidate={candidate}
                                isLoading={isCandidateLoading}
                                onViewProfile={handleViewProfile}
                            />
                        )}
                    </motion.div>
                </div>
            </motion.main>
        </div>
    );
}
