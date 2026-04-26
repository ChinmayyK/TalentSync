'use client';

import { useState } from 'react';
import { runManualSubmission, ManualSubmissionResult } from '@/lib/api/submissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

export default function ManualSubmissionsPage() {
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ManualSubmissionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunSubmission = async () => {
        setLoading(true);
        setError(null);
        setShowConfirmDialog(false);

        try {
            const response = await runManualSubmission();
            setResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold">Manually Run Submissions</h1>
                <p className="text-muted-foreground mt-1">
                    Trigger the automatic interview submission workflow for today&apos;s eligible interviews
                </p>
            </div>

            {/* Results Banner */}
            {result && (
                <Alert className={result.failures.length > 0 ? 'border-orange-500 bg-orange-50' : 'border-green-500 bg-green-50'}>
                    {result.failures.length > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                    ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <AlertTitle className={result.failures.length > 0 ? 'text-orange-800' : 'text-green-800'}>
                        {result.failures.length > 0 ? 'Submission Completed with Issues' : 'Submission Completed Successfully'}
                    </AlertTitle>
                    <AlertDescription className={result.failures.length > 0 ? 'text-orange-700' : 'text-green-700'}>
                        <div className="mt-2 space-y-1">
                            <p><strong>Run ID:</strong> {result.runId}</p>
                            <p><strong>Total Scanned:</strong> {result.totalScanned} interviews</p>
                            <p><strong>Successfully Submitted:</strong> {result.submitted}</p>
                            <p><strong>Skipped:</strong> {result.skipped}</p>
                            {result.failures.length > 0 && (
                                <div className="mt-2">
                                    <p className="font-medium text-red-600">Failures ({result.failures.length}):</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {result.failures.slice(0, 5).map((f, i) => (
                                            <li key={i}>Interview {f.interviewId}: {f.reason}</li>
                                        ))}
                                        {result.failures.length > 5 && (
                                            <li>...and {result.failures.length - 5} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Error Banner */}
            {error && (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Submission Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Important Notice Card */}
            <Card className="border-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-600" />
                        Important Notice
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        By proceeding, you are about to activate the <em className="font-medium text-foreground">automatic submission workflow</em>.
                        This system has been designed with strict rules to ensure accuracy, compliance, and efficiency.
                        To avoid unintended submissions, it is essential that you carefully review and understand the conditions outlined below:
                    </p>

                    {/* Eligibility Rules */}
                    <div className="space-y-3 mt-4">
                        <ol className="list-decimal list-inside space-y-4 text-sm">
                            <li>
                                Only those Interviews whose current status is marked as
                                <span className="text-red-600 font-semibold"> &quot;not submitted&quot;</span> will be included in the process.
                                Any interviews already submitted will be excluded to prevent duplication.
                            </li>
                            <li>
                                Interviews that have been cancelled — regardless of stage or reason — will be
                                <span className="text-red-600 font-semibold"> permanently excluded</span> from this submission cycle and
                                <span className="text-red-600 font-semibold"> will not</span> be processed.
                            </li>
                            <li>
                                The workflow will strictly process Candidates who have been explicitly marked as
                                <span className="text-green-600 font-semibold"> Approved</span>. Any candidates still under review,
                                pending approval, or marked as rejected will be ignored.
                            </li>
                            <li className="text-red-600">
                                <span className="font-semibold">The system will only capture and submit Interviews — scheduled specifically for today&apos;s date.</span> Future-dated Interviews,
                                including those planned for tomorrow or later,
                                <span className="font-semibold"> will not be considered part of this submission run</span>.
                            </li>
                            <li>
                                Any Interview with Pending Approvals will
                                <span className="text-red-600 font-semibold"> NOT</span> be submitted.
                            </li>
                        </ol>
                    </div>
                </CardContent>
            </Card>

            {/* Action Button */}
            <div className="flex justify-center pt-4">
                <Button
                    size="lg"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                        </>
                    ) : (
                        'Run Automatic Submission'
                    )}
                </Button>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Confirm Manual Submission
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-3 pt-4">
                                <p>
                                    This action will submit all eligible interviews scheduled for <strong>today</strong>.
                                </p>
                                <p className="text-orange-600 font-medium">
                                    This action cannot be undone.
                                </p>
                                <p className="text-muted-foreground text-sm">
                                    Ineligible interviews will be skipped automatically based on the eligibility rules.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRunSubmission}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Confirm &amp; Run
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
