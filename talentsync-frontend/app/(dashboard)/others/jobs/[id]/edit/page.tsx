'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useJob, useUpdateJob } from '@/hooks/use-jobs';
import { JobForm } from '@/components/jobs/JobForm';
import { ArrowLeft, Loader2, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations';

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { data: job, isLoading } = useJob(id);
    const updateMutation = useUpdateJob();

    const handleSubmit = async (data: any) => {
        await updateMutation.mutateAsync({ id, dto: data });
        router.push(`/others/jobs/${id}`);
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
                <motion.div variants={fadeInUp} className="space-y-4">
                    <Link href={`/others/jobs/${id}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Job
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Job</h1>
                        <p className="text-muted-foreground mt-1">
                            Update the details of "{job.title}"
                        </p>
                    </div>
                </motion.div>

                {/* Form */}
                <motion.div variants={fadeInUp}>
                    <JobForm job={job} onSubmit={handleSubmit} isSubmitting={updateMutation.isPending} />
                </motion.div>
            </motion.div>
        </div>
    );
}
