'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJob, usePublishJob, useCloseJob, useDeleteJob } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Rocket,
    XCircle,
    Trash2,
    MapPin,
    Building2,
    Calendar,
    DollarSign,
    Users,
    Clock,
    Briefcase,
    Loader2,
    FileText,
    CheckCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';
import { JobStatus, LocationType, EmploymentType } from '@/lib/api/jobs';
import { useState } from 'react';

const statusColors: Record<JobStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    OPEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ON_HOLD: 'bg-amber-100 text-amber-700 border-amber-200',
    CLOSED: 'bg-blue-100 text-blue-700 border-blue-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const locationTypeLabels: Record<LocationType, string> = {
    ONSITE: 'On-site',
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
};

const employmentTypeLabels: Record<EmploymentType, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    INTERNSHIP: 'Internship',
    TEMPORARY: 'Temporary',
    FREELANCE: 'Freelance',
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: job, isLoading } = useJob(id);
    const publishMutation = usePublishJob();
    const closeMutation = useCloseJob();
    const deleteMutation = useDeleteJob();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = () => {
        deleteMutation.mutate(id, {
            onSuccess: () => router.push('/others/jobs'),
        });
    };

    const formatSalary = () => {
        if (!job?.salaryMin && !job?.salaryMax) return null;
        const currency = job.salaryCurrency || 'USD';
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        });
        if (job.salaryMin && job.salaryMax) {
            return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
        }
        return job.salaryMin ? `From ${formatter.format(job.salaryMin)}` : `Up to ${formatter.format(job.salaryMax!)}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Briefcase className="h-12 w-12 text-muted-foreground opacity-40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Job not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/others/jobs">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Jobs
                    </Link>
                </Button>
            </div>
        );
    }

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
                    <Link href="/others/jobs" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Jobs
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">{job.title}</h1>
                                <Badge className={statusColors[job.status]} variant="outline">
                                    {job.status.replace('_', ' ')}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                                {job.department && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="h-4 w-4" />
                                        {job.department}
                                    </span>
                                )}
                                {job.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4" />
                                        {job.location}
                                        {job.locationType && ` (${locationTypeLabels[job.locationType]})`}
                                    </span>
                                )}
                                {job.employmentType && (
                                    <span className="flex items-center gap-1.5">
                                        <Briefcase className="h-4 w-4" />
                                        {employmentTypeLabels[job.employmentType]}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline">
                                <Link href={`/others/jobs/${id}/edit`}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                </Link>
                            </Button>
                            {job.status === 'DRAFT' && (
                                <Button
                                    onClick={() => publishMutation.mutate(id)}
                                    disabled={publishMutation.isPending}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {publishMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Rocket className="h-4 w-4 mr-2" />
                                    )}
                                    Publish
                                </Button>
                            )}
                            {(job.status === 'OPEN' || job.status === 'ON_HOLD') && (
                                <Button
                                    variant="outline"
                                    onClick={() => closeMutation.mutate(id)}
                                    disabled={closeMutation.isPending}
                                >
                                    {closeMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <XCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Close Job
                                </Button>
                            )}
                            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Job</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to delete this job? This action cannot be undone.
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
                    </div>
                </motion.div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <motion.div variants={staggerItem} className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Job Description
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: job.description }}
                                />
                            </CardContent>
                        </Card>

                        {/* Requirements */}
                        {job.requirements && (
                            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5" />
                                        Requirements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="prose prose-sm max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: job.requirements }}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                                <CardHeader>
                                    <CardTitle>Required Skills</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {job.skills.map((skill) => (
                                            <Badge key={skill} variant="secondary">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Benefits */}
                        {job.benefits && job.benefits.length > 0 && (
                            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                                <CardHeader>
                                    <CardTitle>Benefits</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        {job.benefits.map((benefit) => (
                                            <li key={benefit}>{benefit}</li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>

                    {/* Sidebar */}
                    <motion.div variants={staggerItem} className="space-y-6">
                        {/* Quick Stats */}
                        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                            <CardHeader>
                                <CardTitle>Overview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Applications
                                    </span>
                                    <span className="font-semibold">{job._count?.applications || 0}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        Openings
                                    </span>
                                    <span className="font-semibold">{job.openings || 1}</span>
                                </div>
                                {formatSalary() && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Salary
                                            </span>
                                            <span className="font-semibold">{formatSalary()}</span>
                                        </div>
                                    </>
                                )}
                                {job.closingDate && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Closes
                                            </span>
                                            <span className="font-semibold">
                                                {new Date(job.closingDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Created
                                    </span>
                                    <span className="font-semibold">
                                        {new Date(job.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {job.publishedAt && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Rocket className="h-4 w-4" />
                                                Published
                                            </span>
                                            <span className="font-semibold">
                                                {new Date(job.publishedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tags */}
                        {job.tags && job.tags.length > 0 && (
                            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
                                <CardHeader>
                                    <CardTitle>Tags</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {job.tags.map((tag) => (
                                            <Badge key={tag} variant="outline">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}

