'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateOffer } from '@/hooks/use-offers';
import { OfferForm } from '@/components/offers/OfferForm';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { client } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

function NewOfferContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const candidateId = searchParams.get('candidateId');
    const createMutation = useCreateOffer();

    const [candidateName, setCandidateName] = useState<string>('');
    const [loading, setLoading] = useState(!!candidateId);

    useEffect(() => {
        if (candidateId) {
            client.get<{ name: string }>(`/candidates/${candidateId}`)
                .then(data => setCandidateName(data.name))
                .catch(() => setCandidateName(''))
                .finally(() => setLoading(false));
        }
    }, [candidateId]);

    const handleSubmit = async (data: any) => {
        await createMutation.mutateAsync(data);
        router.push('/others/offers');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading candidate details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Header Bar */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.back()}
                                className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 h-10 w-10"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Create New Offer
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Prepare a compensation offer for a candidate
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <OfferForm
                        candidateId={candidateId || undefined}
                        candidateName={candidateName || undefined}
                        onSubmit={handleSubmit}
                        isSubmitting={createMutation.isPending}
                    />
                </motion.div>
            </div>
        </div>
    );
}

export default function NewOfferPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading...</p>
                    </div>
                </div>
            }
        >
            <NewOfferContent />
        </Suspense>
    );
}
