'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOffer, useSendOffer, useWithdrawOffer, useDeleteOffer } from '@/hooks/use-offers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    ArrowLeft,
    Pencil,
    Send,
    Ban,
    Trash2,
    DollarSign,
    Calendar,
    Building2,
    MapPin,
    User,
    Clock,
    FileText,
    CheckCircle,
    XCircle,
    Loader2,
    Mail,
    Phone,
    Briefcase,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { OfferStatus } from '@/lib/api/offers';
import { useState } from 'react';

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

const salaryTypeLabels = {
    ANNUAL: 'per year',
    MONTHLY: 'per month',
    WEEKLY: 'per week',
    HOURLY: 'per hour',
};

export default function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: offer, isLoading } = useOffer(id);
    const sendMutation = useSendOffer();
    const withdrawMutation = useWithdrawOffer();
    const deleteMutation = useDeleteOffer();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = () => {
        deleteMutation.mutate(id, {
            onSuccess: () => router.push('/others/offers'),
        });
    };

    const formatSalary = () => {
        if (!offer) return '';
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: offer.currency || 'USD',
            maximumFractionDigits: 0,
        });
        return `${formatter.format(Number(offer.salary))} ${salaryTypeLabels[offer.salaryType]}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!offer) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <FileText className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Offer not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/others/offers">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Offers
                    </Link>
                </Button>
            </div>
        );
    }

    const canSend = offer.status === 'DRAFT' || offer.status === 'APPROVED';
    const canWithdraw = !['ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'].includes(offer.status);
    const canDelete = offer.status === 'DRAFT';

    return (
        <div className="min-h-screen bg-transparent">
            <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="space-y-6"
            >
                {/* Header */}
                <motion.div variants={fadeInUp} className="flex flex-col gap-4">
                    <Link href="/others/offers" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Offers
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Offer for {offer.candidate?.name || 'Candidate'}
                                </h1>
                                <Badge className={statusColors[offer.status]} variant="outline">
                                    {offer.status.replace('_', ' ')}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground">
                                {offer.position || offer.job?.title || 'Position'} • {formatSalary()}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {canSend && (
                                <Button
                                    onClick={() => sendMutation.mutate(id)}
                                    disabled={sendMutation.isPending}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {sendMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Send Offer
                                </Button>
                            )}
                            {canWithdraw && (
                                <Button
                                    variant="outline"
                                    onClick={() => withdrawMutation.mutate(id)}
                                    disabled={withdrawMutation.isPending}
                                >
                                    {withdrawMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Ban className="h-4 w-4 mr-2" />
                                    )}
                                    Withdraw
                                </Button>
                            )}
                            {canDelete && (
                                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Offer</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete this offer?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-destructive text-destructive-foreground"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <motion.div variants={staggerItem} className="lg:col-span-2 space-y-6">
                        {/* Compensation */}
                        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Compensation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Base Salary</p>
                                        <p className="text-2xl font-bold">{formatSalary()}</p>
                                    </div>
                                    {offer.bonus && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Bonus</p>
                                            <p className="text-xl font-semibold">
                                                {new Intl.NumberFormat('en-US', {
                                                    style: 'currency',
                                                    currency: offer.currency || 'USD',
                                                    maximumFractionDigits: 0,
                                                }).format(Number(offer.bonus))}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {offer.equity && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Equity</p>
                                        <p className="font-medium">{offer.equity}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Position Details */}
                        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Briefcase className="h-5 w-5" />
                                    Position Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                {offer.position && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Position</p>
                                        <p className="font-medium">{offer.position}</p>
                                    </div>
                                )}
                                {offer.department && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Department</p>
                                        <p className="font-medium">{offer.department}</p>
                                    </div>
                                )}
                                {offer.reportingTo && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Reports To</p>
                                        <p className="font-medium">{offer.reportingTo}</p>
                                    </div>
                                )}
                                {offer.workLocation && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Location</p>
                                        <p className="font-medium">{offer.workLocation}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Notes */}
                        {offer.notes && (
                            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                                <CardHeader>
                                    <CardTitle>Internal Notes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-wrap">{offer.notes}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Decline Reason */}
                        {offer.status === 'DECLINED' && offer.declineReason && (
                            <Card className="bg-red-50 border-red-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-red-700">
                                        <XCircle className="h-5 w-5" />
                                        Decline Reason
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-red-700">{offer.declineReason}</p>
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>

                    {/* Sidebar */}
                    <motion.div variants={staggerItem} className="space-y-6">
                        {/* Candidate Info */}
                        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Candidate
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="font-semibold text-lg">{offer.candidate?.name}</p>
                                {offer.candidate?.email && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        {offer.candidate.email}
                                    </div>
                                )}
                                {offer.candidate?.phone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        {offer.candidate.phone}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Timeline */}
                        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Timeline
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {offer.startDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Start Date</span>
                                        <span className="font-medium">
                                            {new Date(offer.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {offer.expiryDate && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Expires</span>
                                        <span className="font-medium">
                                            {new Date(offer.expiryDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Created</span>
                                    <span className="font-medium">
                                        {new Date(offer.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {offer.sentAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Sent</span>
                                        <span className="font-medium">
                                            {new Date(offer.sentAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {offer.viewedAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Viewed</span>
                                        <span className="font-medium">
                                            {new Date(offer.viewedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                                {offer.respondedAt && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Responded</span>
                                        <span className="font-medium">
                                            {new Date(offer.respondedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
