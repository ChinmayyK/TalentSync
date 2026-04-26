'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOffers, useOfferStats, useSendOffer, useWithdrawOffer, useDeleteOffer } from '@/hooks/use-offers';
import { Offer, OfferStatus } from '@/lib/api/offers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Plus,
    Search,
    MoreHorizontal,
    FileText,
    CheckCircle,
    XCircle,
    Clock,
    Send,
    Eye,
    Trash2,
    DollarSign,
    TrendingUp,
    Ban,
    Filter,
    Loader2,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

const statusColors: Record<OfferStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-blue-100 text-blue-700 border-blue-200',
    SENT: 'bg-purple-100 text-purple-700 border-purple-200',
    VIEWED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    ACCEPTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    DECLINED: 'bg-red-100 text-red-700 border-red-200',
    EXPIRED: 'bg-gray-100 text-gray-700 border-gray-200',
    WITHDRAWN: 'bg-orange-100 text-orange-700 border-orange-200',
    COUNTERED: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const statusIcons: Record<OfferStatus, React.ReactNode> = {
    DRAFT: <FileText className="h-3.5 w-3.5" />,
    PENDING_APPROVAL: <Clock className="h-3.5 w-3.5" />,
    APPROVED: <CheckCircle className="h-3.5 w-3.5" />,
    SENT: <Send className="h-3.5 w-3.5" />,
    VIEWED: <Eye className="h-3.5 w-3.5" />,
    ACCEPTED: <CheckCircle className="h-3.5 w-3.5" />,
    DECLINED: <XCircle className="h-3.5 w-3.5" />,
    EXPIRED: <Clock className="h-3.5 w-3.5" />,
    WITHDRAWN: <Ban className="h-3.5 w-3.5" />,
    COUNTERED: <TrendingUp className="h-3.5 w-3.5" />,
};

type StatCardProps = {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    description?: string;
};

function StatCard({ title, value, icon: Icon, color, description }: StatCardProps) {
    return (
        <Card className="bg-card/60 backdrop-blur-sm border-border/50 overflow-hidden relative group">
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500", color.replace('text-', 'bg-'))} />
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm", color.replace('text-', 'bg-').replace('600', '100'))}>
                        <Icon className={cn("h-6 w-6", color)} />
                    </div>
                    <div>
                        <p className="text-3xl font-bold tracking-tight">{value}</p>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function OffersPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<OfferStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [deleteOfferId, setDeleteOfferId] = useState<string | null>(null);

    const { data: offersData, isLoading } = useOffers({
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: 20,
    });
    const { data: stats } = useOfferStats();
    const sendMutation = useSendOffer();
    const withdrawMutation = useWithdrawOffer();
    const deleteMutation = useDeleteOffer();

    const handleDelete = () => {
        if (deleteOfferId) {
            deleteMutation.mutate(deleteOfferId, {
                onSuccess: () => setDeleteOfferId(null),
            });
        }
    };

    const formatSalary = (offer: Offer) => {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: offer.currency || 'USD',
            maximumFractionDigits: 0,
        });
        return formatter.format(Number(offer.salary));
    };

    return (
        <div className="container mx-auto px-6 py-8 min-h-screen bg-transparent space-y-8 max-w-[1600px]">
            <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="space-y-8"
            >
                {/* Header */}
                <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Offers</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            Manage candidate offers, track approvals, and monitor acceptance rates.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search offers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 w-[250px] bg-background/50 backdrop-blur-sm border-muted transition-all focus:w-[300px]"
                            />
                        </div>
                        <Select value={(!['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].includes(statusFilter)) ? statusFilter : undefined} onValueChange={(v) => setStatusFilter(v as OfferStatus)}>
                            <SelectTrigger className={cn("w-[40px] px-0 flex justify-center bg-background/50 backdrop-blur-sm border-muted", !['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].includes(statusFilter) && "text-primary border-primary")}>
                                <Filter className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                                <SelectItem value="VIEWED">Viewed</SelectItem>
                                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                                <SelectItem value="EXPIRED">Expired</SelectItem>
                                <SelectItem value="COUNTERED">Countered</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all h-9 px-4 text-sm font-medium">
                            <Link href="/others/offers/new">
                                <Plus className="h-5 w-5 mr-2" />
                                Create Offer
                            </Link>
                        </Button>
                    </div>
                </motion.div>

                {/* Stats Cards */}
                <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    <StatCard title="Total Offers" value={stats?.total || 0} icon={FileText} color="text-blue-600" />
                    <StatCard title="Sent" value={stats?.sent || 0} icon={Send} color="text-purple-600" />
                    <StatCard title="Accepted" value={stats?.accepted || 0} icon={CheckCircle} color="text-emerald-600" />
                    <StatCard title="Acceptance Rate" value={`${stats?.acceptanceRate || 0}%`} icon={TrendingUp} color="text-green-600" />
                </motion.div>

                {/* Filters & Content */}
                <motion.div variants={staggerItem} className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-1 rounded-xl">
                        <Tabs
                            value={['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].includes(statusFilter) ? statusFilter : 'ALL'}
                            onValueChange={(v) => setStatusFilter(v as any)}
                            className="w-full md:w-auto"
                        >
                            <TabsList className="bg-transparent p-0 gap-1 h-auto flex-wrap">
                                {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'DECLINED'].map((tab) => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2 h-9 transition-all"
                                    >
                                        {tab === 'ALL' ? 'All Offers' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>

                    <Card className="bg-card/60 backdrop-blur-sm border-border/50 overflow-hidden shadow-sm">
                        {isLoading ? (
                            <PageLoader message="Loading offers..." size="md" />
                        ) : !offersData?.data?.length ? (
                            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground bg-gradient-to-b from-transparent to-muted/20">
                                <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                                    <FileText className="h-10 w-10 opacity-50" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground mb-2">No offers found</h3>
                                <p className="text-sm max-w-sm text-center mb-8">
                                    {statusFilter !== 'ALL'
                                        ? `There are no offers with status "${statusFilter}". Try changing the filter.`
                                        : "Get started by creating your first offer letter to send to a candidate."}
                                </p>
                                <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                                    <Link href="/others/offers/new">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First Offer
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-transparent border-b border-border/50">
                                            <TableHead className="font-semibold h-11">Candidate</TableHead>
                                            <TableHead className="font-semibold h-11">Position</TableHead>
                                            <TableHead className="font-semibold h-11">Salary</TableHead>
                                            <TableHead className="font-semibold h-11">Status</TableHead>
                                            <TableHead className="font-semibold h-11">Sent Date</TableHead>
                                            <TableHead className="w-12 h-11"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {offersData.data.map((offer) => (
                                            <TableRow key={offer.id} className="hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0 group">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary flex items-center justify-center text-sm font-bold">
                                                            {offer.candidate?.name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{offer.candidate?.name || 'Unknown'}</p>
                                                            <p className="text-xs text-muted-foreground">{offer.candidate?.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{offer.position || offer.job?.title || '—'}</span>
                                                        {offer.department && (
                                                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                                                                <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                                                                {offer.department}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-1.5 font-medium tabular-nums text-sm bg-muted/30 px-2 py-1 rounded w-fit">
                                                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {formatSalary(offer)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge className={cn("gap-1.5 py-1 pr-3 pl-2 shadow-none font-medium border", statusColors[offer.status])} variant="outline">
                                                        {statusIcons[offer.status]}
                                                        {offer.status.charAt(0) + offer.status.slice(1).toLowerCase().replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4 text-sm text-muted-foreground">
                                                    {offer.sentAt
                                                        ? new Date(offer.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                        : <span className="text-muted-foreground/30">—</span>
                                                    }
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={`/others/offers/${offer.id}`} className="cursor-pointer">
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View Details
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            {(offer.status === 'DRAFT' || offer.status === 'APPROVED') && (
                                                                <DropdownMenuItem
                                                                    onClick={() => sendMutation.mutate(offer.id)}
                                                                    disabled={sendMutation.isPending}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Send className="h-4 w-4 mr-2" />
                                                                    Send to Candidate
                                                                </DropdownMenuItem>
                                                            )}
                                                            {!['ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'].includes(offer.status) && (
                                                                <DropdownMenuItem
                                                                    onClick={() => withdrawMutation.mutate(offer.id)}
                                                                    disabled={withdrawMutation.isPending}
                                                                    className="text-orange-600 focus:text-orange-700 focus:bg-orange-50 cursor-pointer"
                                                                >
                                                                    <Ban className="h-4 w-4 mr-2" />
                                                                    Withdraw Offer
                                                                </DropdownMenuItem>
                                                            )}
                                                            {offer.status === 'DRAFT' && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteOfferId(offer.id)}
                                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Delete Draft
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {offersData.meta.totalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
                                        <p className="text-sm text-muted-foreground">
                                            Showing <span className="font-medium text-foreground">{(page - 1) * 20 + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * 20, offersData.meta.total)}</span> of <span className="font-medium text-foreground">{offersData.meta.total}</span> offers
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="h-8"
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(p => Math.min(offersData.meta.totalPages, p + 1))}
                                                disabled={page === offersData.meta.totalPages}
                                                className="h-8"
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                </motion.div>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteOfferId} onOpenChange={() => setDeleteOfferId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Offer Draft</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this draft offer? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete Offer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
