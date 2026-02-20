"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CandidateListHeader, ViewType } from '@/components/candidates/CandidateListHeader';
import { CandidateFilters } from '@/components/candidates/CandidateFilters';
import { CandidateTable } from '@/components/candidates/CandidateTable';
import { CandidateBoard } from '@/components/candidates/CandidateBoard';
import { SendMessageDialog, MessageChannel } from '@/components/candidates/SendMessageDialog';
import { ScheduleInterviewModal } from '@/components/scheduling/ScheduleInterviewModal';
import { AddCandidateModal } from '@/components/candidates/AddCandidateModal';
import { UploadCandidatesModal } from '@/components/candidates/UploadCandidatesModal';
import { ChangeStageModal } from '@/components/candidates/ChangeStageModal';
import { CandidateListFilters, CandidateBulkAction, CandidateListItem } from '@/types/candidate-list';
import { currentUserRole } from '@/lib/navigation-mock-data';
import { toast } from '@/hooks/use-toast';
import { useCandidates, useDeleteCandidate, useUpdateCandidate } from '@/lib/hooks/useCandidates';
import { InterviewStage } from '@/types/interview';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { QuickActionsToolbar, QUICK_ACTIONS } from '@/components/ui/quick-actions-toolbar';
import { Mail, MessageSquare, Calendar, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function Candidates() {
    const [filters, setFilters] = useState<CandidateListFilters>({
        search: '',
        role: '',
        stage: 'all',
        source: 'all',
        recruiterId: 'all',
        experienceMin: null,
        experienceMax: null,
        dateAddedFrom: null,
        dateAddedTo: null,
    });
    const [view, setView] = useState<ViewType>('list');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const [isUploadCandidatesOpen, setIsUploadCandidatesOpen] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<CandidateListItem | null>(null);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const deleteCandidateMutation = useDeleteCandidate();
    const updateCandidateMutation = useUpdateCandidate();

    // Change Stage modal state
    const [stageModalOpen, setStageModalOpen] = useState(false);
    const [stageModalCandidate, setStageModalCandidate] = useState<CandidateListItem | null>(null);

    // Message dialog state
    const [messageDialogOpen, setMessageDialogOpen] = useState(false);
    const [messageCandidate, setMessageCandidate] = useState<CandidateListItem | null>(null);
    const [messageChannel, setMessageChannel] = useState<MessageChannel>('EMAIL');

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number | 'all'>(25);

    // Bulk delete loading state (separate from deleteCandidateMutation)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Query client for cache invalidation
    const queryClient = useQueryClient();

    // Listen for sync-complete event from integrations page
    useEffect(() => {
        const handleSyncComplete = () => {
            // Invalidate and refetch candidates when sync completes
            queryClient.invalidateQueries({ queryKey: ['candidates'] });
        };

        window.addEventListener('sync-complete', handleSyncComplete);
        return () => window.removeEventListener('sync-complete', handleSyncComplete);
    }, [queryClient]);

    // Use real API data with pagination
    // For board view, fetch all candidates; for list view, use pagination
    const isShowingAll = view === 'board' || perPage === 'all';
    const { data: candidatesData, isLoading } = useCandidates({
        page: isShowingAll ? 1 : page,
        perPage: isShowingAll ? 10000 : perPage, // Fetch all for board view
        q: filters.search || undefined,
        searchMode: filters.searchMode || 'simple',
        role: filters.role || undefined,
        stage: filters.stage !== 'all' ? filters.stage : undefined,
        source: filters.source !== 'all' ? filters.source : undefined,
        recruiterId: filters.recruiterId !== 'all' ? filters.recruiterId : undefined,
        dateFrom: filters.dateAddedFrom ? new Date(filters.dateAddedFrom).toISOString() : undefined,
        dateTo: filters.dateAddedTo ? new Date(filters.dateAddedTo).toISOString() : undefined,
    });

    // Type for API candidate response
    interface ApiCandidate {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        roleTitle?: string;
        stage?: string;
        source?: string;
        createdById?: string;
        updatedAt?: string;
        createdAt: string;
        tags?: string[];
        tenantId: string;
    }

    // Normalize backend stage (uppercase like 'APPLIED') to frontend format ('applied')
    const normalizeStage = (backendStage?: string): InterviewStage => {
        if (!backendStage) return 'applied';
        const stage = backendStage.toLowerCase().replace(/_/g, '-');
        // Map common backend formats
        const stageMap: Record<string, InterviewStage> = {
            'applied': 'applied',
            'screening': 'screening',
            'phone-screen': 'screening',
            'phone_screen': 'screening',
            'interview': 'interview-1',
            'interview-1': 'interview-1',
            'interview_1': 'interview-1',
            'interview-2': 'interview-2',
            'interview_2': 'interview-2',
            'hr-round': 'hr-round',
            'hr_round': 'hr-round',
            'hr': 'hr-round',
            'offer': 'offer',
            'hired': 'offer',
            'rejected': 'applied', // fallback
        };
        return stageMap[stage] || 'applied';
    };

    // Map API candidates to CandidateListItem format
    const candidates: CandidateListItem[] = useMemo(() => {
        if (!candidatesData?.data) return [];
        return candidatesData.data.map((c: ApiCandidate) => ({
            id: c.id,
            name: c.name,
            email: c.email || '',
            phone: c.phone || '',
            role: c.roleTitle || '',
            stage: normalizeStage(c.stage),
            source: c.source || 'Unknown',
            recruiterName: 'Unassigned',
            recruiterId: c.createdById || '',
            lastActivity: c.updatedAt || c.createdAt,
            lastActivityType: 'created' as const,
            dateAdded: c.createdAt,
            skills: c.tags || [],
            experienceYears: 0,
            tenantId: c.tenantId,
        }));
    }, [candidatesData]);

    // Client-side mapping is enough, no extra filtering needed
    const filteredCandidates = candidates;


    const handleAddCandidate = () => {
        setIsAddCandidateOpen(true);
    };

    const handleUploadSpreadsheet = () => {
        setIsUploadCandidatesOpen(true);
    };

    const handleUploadResume = () => {
        toast({
            title: 'Upload Resume',
            description: 'Resume upload modal would open here.',
        });
    };

    const handleChangeStage = (candidate: CandidateListItem) => {
        setStageModalCandidate(candidate);
        setStageModalOpen(true);
    };

    const handleStageChangeConfirm = async (candidateId: string, newStage: string, note?: string) => {
        await updateCandidateMutation.mutateAsync({ id: candidateId, data: { stage: newStage } });
        // Note would be saved separately if needed
        setStageModalOpen(false);
        setStageModalCandidate(null);
    };

    const handleScheduleInterview = (candidate: CandidateListItem) => {
        setIsScheduleModalOpen(true);
    };

    const handleSendEmail = (candidate: CandidateListItem) => {
        setMessageCandidate(candidate);
        setMessageChannel('EMAIL');
        setMessageDialogOpen(true);
    };

    const handleSendWhatsApp = (candidate: CandidateListItem) => {
        setMessageCandidate(candidate);
        setMessageChannel('WHATSAPP');
        setMessageDialogOpen(true);
    };

    const handleSendSMS = (candidate: CandidateListItem) => {
        setMessageCandidate(candidate);
        setMessageChannel('SMS');
        setMessageDialogOpen(true);
    };

    const handleDelete = (candidate: CandidateListItem) => {
        setDeleteCandidate(candidate);
    };

    const handleConfirmDelete = () => {
        if (deleteCandidate) {
            deleteCandidateMutation.mutate(deleteCandidate.id, {
                onSuccess: () => {
                    toast({
                        title: 'Candidate Deleted',
                        description: `${deleteCandidate.name} has been removed.`,
                    });
                    setDeleteCandidate(null);
                },
                onError: (error) => {
                    toast({
                        title: 'Delete Failed',
                        description: 'Failed to delete candidate.',
                        variant: 'destructive',
                    });
                }
            });
        }
    };

    const handleBulkAction = (action: CandidateBulkAction | string) => {
        const count = selectedIds.length;

        // Get selected candidates for bulk operations
        const selectedCandidates = candidates.filter(c => selectedIds.includes(c.id));

        switch (action) {
            case 'change-stage':
                toast({
                    title: 'Bulk Change Stage',
                    description: `Change stage for ${count} candidates.`,
                });
                break;
            case 'email':
            case 'send-email':
                // Open message dialog for bulk email
                if (selectedCandidates.length > 0) {
                    setMessageCandidate(selectedCandidates[0]);
                    setMessageChannel('EMAIL');
                    setMessageDialogOpen(true);
                    toast({
                        title: 'Bulk Email',
                        description: `Composing email for ${count} candidate(s).`,
                    });
                }
                break;
            case 'schedule':
                // Open schedule modal for bulk scheduling
                setIsScheduleModalOpen(true);
                toast({
                    title: 'Schedule Interviews',
                    description: `Opening scheduler for ${count} candidate(s).`,
                });
                break;
            case 'sms':
                if (selectedCandidates.length > 0) {
                    setMessageCandidate(selectedCandidates[0]);
                    setMessageChannel('SMS');
                    setMessageDialogOpen(true);
                    toast({
                        title: 'Bulk SMS',
                        description: `Composing SMS for ${count} candidate(s).`,
                    });
                }
                break;
            case 'add-tag':
                toast({
                    title: 'Bulk Add Tag',
                    description: `Add tag to ${count} candidates.`,
                });
                break;
            case 'assign-recruiter':
                toast({
                    title: 'Bulk Assign Recruiter',
                    description: `Assign recruiter to ${count} candidates.`,
                });
                break;
            case 'delete':
                setShowBulkDeleteDialog(true);
                break;
        }
    };

    const confirmBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all(selectedIds.map(id => deleteCandidateMutation.mutateAsync(id)));
            toast({
                title: 'Bulk Delete',
                description: `Deleted ${selectedIds.length} candidates.`,
                variant: 'destructive',
            });
            setSelectedIds([]);
        } catch (error) {
            toast({
                title: 'Bulk Delete Failed',
                description: 'Failed to delete some candidates.',
                variant: 'destructive',
            });
        } finally {
            setIsBulkDeleting(false);
        }
        setShowBulkDeleteDialog(false);
    };

    const handleStageChange = (candidateId: string, newStage: InterviewStage) => {
        updateCandidateMutation.mutate(
            { id: candidateId, data: { stage: newStage } },
            {
                onSuccess: () => {
                    toast({
                        title: 'Stage Updated',
                        description: `Candidate moved to ${newStage.replace('-', ' ')}.`,
                    });
                },
                onError: () => {
                    toast({
                        title: 'Update Failed',
                        description: 'Failed to update candidate stage.',
                        variant: 'destructive',
                    });
                }
            }
        );
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center gap-6 p-8"
                >
                    {/* Animated Logo/Spinner */}
                    <div className="relative">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                className="h-10 w-10 border-3 border-primary/30 border-t-primary rounded-full"
                            />
                        </div>
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -inset-2 rounded-full bg-primary/10 -z-10"
                        />
                    </div>

                    {/* Loading Text */}
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-semibold text-foreground">Loading Candidates</h2>
                        <p className="text-sm text-muted-foreground">Please wait while we fetch your data...</p>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0.8, opacity: 0.3 }}
                                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 1, 0.3] }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                }}
                                className="h-3 w-3 rounded-full bg-primary"
                            />
                        ))}
                    </div>
                </motion.div>
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
                <motion.div variants={fadeInUp} className="space-y-6">
                    <CandidateListHeader
                        userRole={currentUserRole}
                        view={view}
                        onViewChange={setView}
                        onAddCandidate={handleAddCandidate}
                        onUploadSpreadsheet={handleUploadSpreadsheet}
                        onUploadResume={handleUploadResume}
                    />

                    <CandidateFilters filters={filters} onFiltersChange={setFilters} />

                    {/* Empty State */}
                    {filteredCandidates.length === 0 && !isLoading && (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No candidates found</h3>
                            <p className="text-slate-500 mb-4">Try adjusting your filters or add a new candidate to get started.</p>
                        </div>
                    )}

                    {filteredCandidates.length > 0 && view === 'list' ? (
                        <CandidateTable
                            candidates={filteredCandidates}
                            selectedIds={selectedIds}
                            userRole={currentUserRole}
                            onSelectionChange={setSelectedIds}
                            onChangeStage={handleChangeStage}
                            onScheduleInterview={handleScheduleInterview}
                            onSendEmail={handleSendEmail}
                            onSendWhatsApp={handleSendWhatsApp}
                            onSendSMS={handleSendSMS}
                            onDelete={handleDelete}
                            onUpdateCandidate={async (id, updates) => {
                                await updateCandidateMutation.mutateAsync({ id, data: updates as any });
                            }}
                        />
                    ) : (
                        <div className="h-[calc(100vh-280px)]">
                            <CandidateBoard
                                candidates={filteredCandidates}
                                onStageChange={handleStageChange}
                                onCandidateClick={(c) => {
                                    // Could open a detail modal or side panel
                                    toast({ title: "View Candidate", description: c.name });
                                }}
                            />
                        </div>
                    )}

                    {/* Pagination Controls */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="hidden sm:inline">Show</span>
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setPerPage(val === 'all' ? 'all' : Number(val));
                                    setPage(1);
                                }}
                                className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="all">All</option>
                            </select>
                            <span className="hidden sm:inline">per page</span>
                            {candidatesData?.meta && (
                                <span className="text-xs sm:text-sm">
                                    ({candidatesData.meta.total} total)
                                </span>
                            )}
                        </div>

                        {candidatesData?.meta && candidatesData.meta.lastPage > 1 && perPage !== 'all' && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            aria-disabled={page <= 1}
                                            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink isActive>{page} / {candidatesData.meta.lastPage}</PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setPage(p => Math.min(candidatesData.meta.lastPage, p + 1))}
                                            aria-disabled={page >= candidatesData.meta.lastPage}
                                            className={page >= candidatesData.meta.lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>

                    <QuickActionsToolbar
                        selectedCount={selectedIds.length}
                        primaryActions={[
                            {
                                id: 'email',
                                label: 'Email',
                                icon: <Mail className="h-4 w-4" />,
                                onClick: () => handleBulkAction('email'),
                            },
                            {
                                id: 'schedule',
                                label: 'Schedule',
                                icon: <Calendar className="h-4 w-4" />,
                                onClick: () => handleBulkAction('schedule'),
                            },
                            {
                                id: 'delete',
                                label: 'Delete',
                                icon: <Trash2 className="h-4 w-4" />,
                                variant: 'destructive',
                                onClick: () => handleBulkAction('delete'),
                            },
                        ]}
                        secondaryActions={[
                            {
                                id: 'sms',
                                label: 'Send SMS',
                                icon: <MessageSquare className="h-4 w-4" />,
                                onClick: () => handleBulkAction('sms'),
                            },
                        ]}
                        onClearSelection={() => setSelectedIds([])}
                    />

                    <ScheduleInterviewModal
                        open={isScheduleModalOpen}
                        onOpenChange={setIsScheduleModalOpen}
                    />

                    {/* Delete Confirmation */}
                    <AlertDialog open={!!deleteCandidate} onOpenChange={() => setDeleteCandidate(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete <strong>{deleteCandidate?.name}</strong>? This action
                                    moves the candidate to the recycle bin.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleConfirmDelete}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {deleteCandidateMutation.isPending ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Bulk Delete Confirmation */}
                    <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Bulk Delete Candidates</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete <strong>{selectedIds.length}</strong> candidates? This action
                                    moves them to the recycle bin.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={confirmBulkDelete}
                                    disabled={isBulkDeleting}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    {isBulkDeleting ? 'Deleting...' : 'Delete All'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Send Message Dialog */}
                    {messageCandidate && (
                        <SendMessageDialog
                            open={messageDialogOpen}
                            onOpenChange={setMessageDialogOpen}
                            recipientId={messageCandidate.id}
                            recipientName={messageCandidate.name}
                            recipientEmail={messageCandidate.email}
                            recipientPhone={messageCandidate.phone}
                            defaultChannel={messageChannel}
                        />
                    )}

                    <AddCandidateModal
                        open={isAddCandidateOpen}
                        onOpenChange={setIsAddCandidateOpen}
                    />

                    <UploadCandidatesModal
                        open={isUploadCandidatesOpen}
                        onOpenChange={setIsUploadCandidatesOpen}
                    />

                    {/* Change Stage Modal */}
                    {stageModalCandidate && (
                        <ChangeStageModal
                            open={stageModalOpen}
                            onOpenChange={setStageModalOpen}
                            candidateId={stageModalCandidate.id}
                            candidateName={stageModalCandidate.name}
                            currentStage={stageModalCandidate.stage}
                            onStageChange={handleStageChangeConfirm}
                        />
                    )}
                </motion.div>
            </motion.main>
        </div>
    );
}

