'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    getPendingApprovals,
    approveRequest,
    rejectRequest,
    bulkApprove,
    bulkReject,
    getApprovalStats,
    approveAllPendingAndMissed,
    ApprovalRequest,
    ApprovalStats,
} from '@/lib/api/approvals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { CandidateDetailSidebar } from './CandidateDetailSidebar';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

const STATUS_CONFIG = {
    PENDING: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
    APPROVED: { color: 'bg-green-500', icon: CheckCircle, label: 'Approved' },
    REJECTED: { color: 'bg-red-500', icon: XCircle, label: 'Rejected' },
};

export default function PendingApprovalsPage() {
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [stats, setStats] = useState<ApprovalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject'; ids: string[] } | null>(null);
    const [bulkApproveAllDialog, setBulkApproveAllDialog] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Sidebar state
    const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [approvalsData, statsData] = await Promise.all([
                getPendingApprovals({ page, limit: perPage }),
                getApprovalStats(),
            ]);
            setApprovals(approvalsData.items);
            setStats(statsData);
            setTotalPages(approvalsData.pagination.totalPages);
            setTotalItems(approvalsData.pagination.total);
        } catch (error) {
            console.error('Failed to fetch approvals:', error);
        } finally {
            setLoading(false);
        }
    }, [page, perPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(approvals.map((a) => a.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleRowClick = (approval: ApprovalRequest, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
            target.closest('input[type="checkbox"]') ||
            target.closest('button') ||
            target.closest('[data-no-sidebar]')
        ) {
            return;
        }
        setSelectedApproval(approval);
        setSidebarOpen(true);
    };

    const handleAction = async () => {
        if (!actionDialog) return;
        setActionLoading(true);

        try {
            if (actionDialog.ids.length === 1) {
                if (actionDialog.type === 'approve') {
                    await approveRequest(actionDialog.ids[0], { remarks });
                } else {
                    await rejectRequest(actionDialog.ids[0], { remarks });
                }
            } else {
                if (actionDialog.type === 'approve') {
                    await bulkApprove({ ids: actionDialog.ids, remarks });
                } else {
                    await bulkReject({ ids: actionDialog.ids, remarks });
                }
            }

            setActionDialog(null);
            setRemarks('');
            setSelectedIds(new Set());
            await fetchData();
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleApproveAll = async () => {
        setActionLoading(true);
        try {
            await approveAllPendingAndMissed(remarks);
            setBulkApproveAllDialog(false);
            setRemarks('');
            await fetchData();
        } catch (error) {
            console.error('Bulk approve all failed:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSidebarClose = () => {
        setSidebarOpen(false);
        setSelectedApproval(null);
    };

    const handlePerPageChange = (value: string) => {
        setPerPage(Number(value));
        setPage(1);
    };

    if (loading && approvals.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Pending Approvals</h1>
                    <p className="text-muted-foreground">
                        Review and approve candidate submissions
                    </p>
                </div>
                <div className="flex gap-2">
                    {stats && (stats.pending > 0 || stats.missed > 0) && (
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setBulkApproveAllDialog(true)}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve All Pending & Missed
                        </Button>
                    )}
                    {selectedIds.size > 0 && (
                        <>
                            <Button
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => setActionDialog({ type: 'approve', ids: Array.from(selectedIds) })}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve ({selectedIds.size})
                            </Button>
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => setActionDialog({ type: 'reject', ids: Array.from(selectedIds) })}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject ({selectedIds.size})
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                Missed
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.missed}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Approved
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Rejected
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === approvals.length && approvals.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="rounded"
                                    />
                                </TableHead>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Candidate ID</TableHead>
                                <TableHead>Interview ID</TableHead>
                                <TableHead>Interview Date</TableHead>
                                <TableHead>Approval Status</TableHead>
                                <TableHead>Submission Status</TableHead>
                                <TableHead>Recruiter</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approvals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                        No pending approvals
                                    </TableCell>
                                </TableRow>
                            ) : (
                                approvals.map((approval) => {
                                    const statusConfig = STATUS_CONFIG[approval.approvalStatus];
                                    const candidateName = [approval.candidateFirstName, approval.candidateLastName]
                                        .filter(Boolean)
                                        .join(' ') || '-';
                                    return (
                                        <TableRow
                                            key={approval.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={(e) => handleRowClick(approval, e)}
                                        >
                                            <TableCell data-no-sidebar>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(approval.id)}
                                                    onChange={(e) => handleSelectOne(approval.id, e.target.checked)}
                                                    className="rounded"
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{candidateName}</TableCell>
                                            <TableCell className="font-mono text-xs">{approval.candidateId || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{approval.interviewId || '-'}</TableCell>
                                            <TableCell>{formatDate(approval.interviewDate)}</TableCell>
                                            <TableCell>
                                                <Badge className={`${statusConfig.color} text-white`}>
                                                    {statusConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{approval.submissionStatus || '-'}</TableCell>
                                            <TableCell>{approval.recruiterName || '-'}</TableCell>
                                            <TableCell data-no-sidebar>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 border-green-600 hover:bg-green-50 h-7 px-2"
                                                        onClick={() => setActionDialog({ type: 'approve', ids: [approval.id] })}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-600 hover:bg-red-50 h-7 px-2"
                                                        onClick={() => setActionDialog({ type: 'reject', ids: [approval.id] })}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Enhanced Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="hidden sm:inline">Show</span>
                    <select
                        value={perPage}
                        onChange={(e) => handlePerPageChange(e.target.value)}
                        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="hidden sm:inline">per page</span>
                    <span className="text-xs sm:text-sm">
                        ({totalItems} total)
                    </span>
                </div>

                {totalPages > 1 && (
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
                                <PaginationLink isActive>{page} / {totalPages}</PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    aria-disabled={page >= totalPages}
                                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            {/* Action Dialog */}
            <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionDialog?.type === 'approve' ? 'Approve' : 'Reject'} {actionDialog?.ids.length === 1 ? 'Request' : `${actionDialog?.ids.length} Requests`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="remarks">Remarks (optional)</Label>
                            <Textarea
                                id="remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add any notes..."
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setActionDialog(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAction}
                                disabled={actionLoading}
                                className={actionDialog?.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                {actionLoading ? 'Processing...' : actionDialog?.type === 'approve' ? 'Approve' : 'Reject'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Approve All Dialog */}
            <Dialog open={bulkApproveAllDialog} onOpenChange={setBulkApproveAllDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Bulk Approval Confirmation
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-sm text-orange-800">
                                Are you sure you want to approve <strong>all pending and missed requests</strong>?
                            </p>
                            <p className="text-sm text-orange-700 mt-2">
                                This action will approve <strong>{stats?.pending || 0} pending</strong> and <strong>{stats?.missed || 0} missed</strong> items at once and cannot be undone.
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="bulk-remarks">Remarks (optional)</Label>
                            <Textarea
                                id="bulk-remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add any notes for audit trail..."
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setBulkApproveAllDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApproveAll}
                                disabled={actionLoading}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {actionLoading ? 'Processing...' : 'Approve All'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Candidate Detail Sidebar */}
            <CandidateDetailSidebar
                approval={selectedApproval}
                isOpen={sidebarOpen}
                onClose={handleSidebarClose}
                onActionComplete={fetchData}
            />
        </div>
    );
}
