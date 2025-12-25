'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useJobs, useJobStats, usePublishJob, useCloseJob, useDeleteJob } from '@/hooks/use-jobs';
import { Job, JobStatus, LocationType } from '@/lib/api/jobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    Plus,
    Search,
    MoreHorizontal,
    Briefcase,
    Users,
    Clock,
    CheckCircle,
    FileText,
    Eye,
    Pencil,
    Rocket,
    XCircle,
    Trash2,
    Loader2,
    ExternalLink,
    Star,
    ChevronDown,
    Filter,
    Import,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const statusColors: Record<JobStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    OPEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ON_HOLD: 'bg-amber-100 text-amber-700 border-amber-200',
    CLOSED: 'bg-blue-100 text-blue-700 border-blue-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const filterOptions = [
    { label: 'Posting Title', value: 'postingTitle' },
    { label: 'To-Dos', value: 'todos' },
    { label: 'Notes', value: 'notes' },
    { label: 'Job Opening ID', value: 'jobId' },
    { label: 'Date Opened', value: 'dateOpened' },
    { label: 'City', value: 'city' },
    { label: 'Salary', value: 'salary' },
    { label: 'Client Name', value: 'clientName' },
    { label: 'Number of associated candidates', value: 'candidates' },
    { label: 'Last Activity Time', value: 'lastActivity' },
    { label: 'Account Manager', value: 'accountManager' },
    { label: 'Actual Revenue', value: 'revenue' },
    { label: 'Assigned Recruiter(s)', value: 'recruiters' },
    { label: 'Associated Tags', value: 'tags' },
    { label: 'Contact Name', value: 'contactName' },
    { label: 'Country', value: 'country' },
    { label: 'Created By', value: 'createdBy' },
    { label: 'Created Time', value: 'createdTime' },
];

export default function JobsPage() {
    const { isLoading: isAuthLoading, isAuthenticated } = useAuth();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<JobStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterSearch, setFilterSearch] = useState('');

    // Only fetch jobs when auth is confirmed and user is authenticated
    const canFetch = !isAuthLoading && isAuthenticated;
    const { data: jobsData, isLoading, isError } = useJobs({
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 20,
    }, { enabled: canFetch });
    const { data: stats } = useJobStats({ enabled: canFetch });
    const publishMutation = usePublishJob();
    const closeMutation = useCloseJob();
    const deleteMutation = useDeleteJob();

    const handleDelete = () => {
        if (deleteJobId) {
            deleteMutation.mutate(deleteJobId, {
                onSuccess: () => setDeleteJobId(null),
            });
        }
    };

    const formatSalary = (job: Job) => {
        if (!job.salaryMin && !job.salaryMax) return '—';
        const currency = job.salaryCurrency || 'INR';
        if (job.salaryMin && job.salaryMax) {
            return `${(job.salaryMin / 100000).toFixed(1)} to ${(job.salaryMax / 100000).toFixed(1)} LPA`;
        }
        return job.salaryMin ? `From ${(job.salaryMin / 100000).toFixed(1)} LPA` : `Up to ${(job.salaryMax! / 100000).toFixed(1)} LPA`;
    };

    const toggleSelectAll = () => {
        if (jobsData?.data) {
            if (selectedIds.size === jobsData.data.length) {
                setSelectedIds(new Set());
            } else {
                setSelectedIds(new Set(jobsData.data.map(j => j.id)));
            }
        }
    };

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const filteredFilterOptions = filterOptions.filter(f =>
        f.label.toLowerCase().includes(filterSearch.toLowerCase())
    );

    // Show loader while checking authentication
    if (isAuthLoading) {
        return (
            <div className="flex bg-background h-[calc(100vh-64px)] w-full items-center justify-center">
                <PageLoader message="Checking authentication..." size="lg" />
            </div>
        );
    }

    // Show loader while fetching jobs (only if we can fetch)
    if (canFetch && isLoading) {
        return (
            <div className="flex bg-background h-[calc(100vh-64px)] w-full items-center justify-center">
                <PageLoader message="Loading job openings..." size="lg" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-background">
            {/* Left Filter Sidebar */}
            <div className="w-[220px] border-r border-border/50 bg-card/30 shrink-0">
                <div className="p-3 border-b border-border/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Filter Job Openings By
                        </span>
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <Input
                        placeholder="Search filters..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="h-7 text-xs"
                    />
                </div>
                <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
                    {filteredFilterOptions.map((filter) => (
                        <div
                            key={filter.value}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm border-b border-border/30"
                        >
                            <Checkbox className="h-3.5 w-3.5" />
                            <span className="text-muted-foreground">{filter.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
                    <div className="flex items-center gap-3">
                        <Select value="all-territories" onValueChange={() => { }}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                <SelectValue placeholder="All Territories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-territories">All Territories</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JobStatus | 'ALL')}>
                            <SelectTrigger className="h-8 w-[160px] text-xs">
                                <SelectValue placeholder="All Job Openings" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Job Openings</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Import
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            <Link href="/others/jobs/new">
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add Job Opening
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto relative">
                    {isError ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-500">
                            <XCircle className="h-10 w-10 mb-2" />
                            <p>Failed to load jobs. Please try again.</p>
                        </div>
                    ) : !jobsData?.data?.length ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Briefcase className="h-12 w-12 mb-4 opacity-40" />
                            <p className="text-lg font-medium">No job openings found</p>
                            <p className="text-sm">Create your first job posting to get started</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/others/jobs/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Job Opening
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/30 sticky top-0">
                                <TableRow className="border-b border-border/50">
                                    <TableHead className="w-[50px] border-r border-border/50 text-center">
                                        <Checkbox
                                            checked={selectedIds.size === jobsData.data.length && jobsData.data.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                            className="h-3.5 w-3.5"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[40px] border-r border-border/50"></TableHead>
                                    <TableHead className="w-[40px] border-r border-border/50"></TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50">JOB OPENING ID</TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50">DATE OPENED ▼</TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50">POSTING TITLE</TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50">CITY</TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50">SALARY</TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50">CLIENT NAME</TableHead>
                                    <TableHead className="font-bold text-xs border-r border-border/50 text-center">CANDIDATES</TableHead>
                                    <TableHead className="font-bold text-xs">LAST ACTIVITY</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobsData.data.map((job, index) => (
                                    <motion.tr
                                        key={job.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.02 }}
                                        className={`group border-b border-border/50 transition-all duration-200 ${selectedIds.has(job.id)
                                            ? 'bg-primary/10'
                                            : index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                                            } hover:bg-blue-500/10`}
                                    >
                                        <TableCell className="py-2 border-r border-border/50 text-center">
                                            <Checkbox
                                                className="h-3.5 w-3.5"
                                                checked={selectedIds.has(job.id)}
                                                onCheckedChange={() => toggleSelectOne(job.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-center">
                                            <Star className="h-4 w-4 text-muted-foreground/40 hover:text-yellow-500 cursor-pointer" />
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-center">
                                            <ExternalLink className="h-4 w-4 text-muted-foreground/40 hover:text-primary cursor-pointer" />
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-sm font-mono text-muted-foreground">
                                            ZR_{job.id.slice(0, 4).toUpperCase()}_JOB
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-sm text-muted-foreground">
                                            {job.publishedAt
                                                ? new Date(job.publishedAt).toLocaleDateString('en-GB')
                                                : new Date(job.createdAt).toLocaleDateString('en-GB')}
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50">
                                            <Link
                                                href={`/others/jobs/${job.id}`}
                                                className="text-primary hover:underline font-medium text-sm"
                                            >
                                                {job.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-sm">
                                            {job.city || job.location || '—'}
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-sm">
                                            {formatSalary(job)}
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50">
                                            <Link
                                                href="#"
                                                className="text-primary hover:underline text-sm"
                                            >
                                                {job.clientName || '—'}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50 text-center text-sm font-medium">
                                            {job._count?.applications || 0}
                                        </TableCell>
                                        <TableCell className="py-2 text-sm text-muted-foreground">
                                            {job.lastActivityAt
                                                ? new Date(job.lastActivityAt).toLocaleDateString('en-GB')
                                                : job.updatedAt
                                                    ? new Date(job.updatedAt).toLocaleDateString('en-GB')
                                                    : '—'}
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Footer with pagination */}
                {jobsData?.data && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-card/50 text-xs text-muted-foreground">
                        <span>Total Count: {jobsData.meta.total}</span>
                        <div className="flex items-center gap-4">
                            <Select defaultValue="100">
                                <SelectTrigger className="h-7 w-[150px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 Records Per Page</SelectItem>
                                    <SelectItem value="50">50 Records Per Page</SelectItem>
                                    <SelectItem value="100">100 Records Per Page</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    &lt;
                                </Button>
                                <span>1 to {Math.min(100, jobsData.meta.total)}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= jobsData.meta.totalPages}
                                >
                                    &gt;
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteJobId} onOpenChange={() => setDeleteJobId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Job</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this job? This action cannot be undone.
                            All associated applications will also be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
