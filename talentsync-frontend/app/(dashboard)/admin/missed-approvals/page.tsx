'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    getMissedApprovals,
    approveRequest,
    rejectRequest,
    ApprovalRequest,
} from '@/lib/api/approvals';
import { Card, CardContent } from '@/components/ui/card';
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
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { MissedApprovalSidebar } from './MissedApprovalSidebar';
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

function getDaysOverdue(dateStr: string | null): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG = {
    PENDING: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
    APPROVED: { color: 'bg-green-500', icon: CheckCircle, label: 'Approved' },
    REJECTED: { color: 'bg-red-500', icon: XCircle, label: 'Rejected' },
};

export default function MissedApprovalsPage() {
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject'; id: string } | null>(null);
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Sidebar state
    const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getMissedApprovals({ page, limit: perPage });
            setApprovals(data.items);
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.total);
        } catch (error) {
            console.error('Failed to fetch missed approvals:', error);
        } finally {
            setLoading(false);
        }
    }, [page, perPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRowClick = (approval: ApprovalRequest, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[data-no-sidebar]')) {
            return;
        }
        setSelectedApproval(approval);
        setSidebarOpen(true);
    };

    const handleAction = async () => {
        if (!actionDialog) return;
        setActionLoading(true);

        try {
            if (actionDialog.type === 'approve') {
                await approveRequest(actionDialog.id, { remarks });
            } else {
                await rejectRequest(actionDialog.id, { remarks });
            }

            setActionDialog(null);
            setRemarks('');
            await fetchData();
        } catch (error) {
            console.error('Action failed:', error);
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
            <div>
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-muted-foreground" />
                    <h1 className="text-2xl font-bold">Missed Approvals</h1>
                </div>
                <p className="text-muted-foreground mt-1">
                    Submissions where the interview date has passed without approval action
                </p>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Candidate ID</TableHead>
                                <TableHead>Interview ID</TableHead>
                                <TableHead>Interview Date</TableHead>
                                <TableHead>Days Overdue</TableHead>
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
                                        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                                        No missed approvals
                                    </TableCell>
                                </TableRow>
                            ) : (
                                approvals.map((approval) => {
                                    const daysOverdue = getDaysOverdue(approval.interviewDate);
                                    const statusConfig = STATUS_CONFIG[approval.approvalStatus];
                                    const candidateName = [approval.candidateFirstName, approval.candidateLastName]
                                        .filter(Boolean)
                                        .join(' ') || '-';

                                    // Color escalation for days overdue
                                    let overdueColor = 'text-yellow-600 border-yellow-500';
                                    if (daysOverdue > 7) overdueColor = 'text-red-600 border-red-500';
                                    else if (daysOverdue > 3) overdueColor = 'text-orange-600 border-orange-500';

                                    return (
                                        <TableRow
                                            key={approval.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={(e) => handleRowClick(approval, e)}
                                        >
                                            <TableCell className="font-medium">{candidateName}</TableCell>
                                            <TableCell className="font-mono text-xs">{approval.candidateId || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{approval.interviewId || '-'}</TableCell>
                                            <TableCell>{formatDate(approval.interviewDate)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={overdueColor}>
                                                    {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                                                </Badge>
                                            </TableCell>
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
                                                        onClick={() => setActionDialog({ type: 'approve', id: approval.id })}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 border-red-600 hover:bg-red-50 h-7 px-2"
                                                        onClick={() => setActionDialog({ type: 'reject', id: approval.id })}
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
                            {actionDialog?.type === 'approve' ? 'Approve' : 'Reject'} Request
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

            {/* Missed Approval Detail Sidebar */}
            <MissedApprovalSidebar
                approval={selectedApproval}
                isOpen={sidebarOpen}
                onClose={handleSidebarClose}
                onActionComplete={fetchData}
            />
        </div>
    );
}
