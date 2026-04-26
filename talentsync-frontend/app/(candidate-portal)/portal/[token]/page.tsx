'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePortalValidation } from '@/lib/hooks/usePortal';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function PortalTokenPage() {
    const router = useRouter();
    const params = useParams();
    const validation = usePortalValidation();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const token = params.token as string;

    useEffect(() => {
        if (!token) return;

        async function validateToken() {
            try {
                const result = await validation.mutateAsync(token);

                if (result.valid) {
                    setStatus('success');
                    // Redirect to portal dashboard after a brief success message
                    setTimeout(() => {
                        router.push('/portal/dashboard');
                    }, 1500);
                } else {
                    setStatus('error');
                    setErrorMessage(result.message || 'Invalid or expired link');
                }
            } catch (error: any) {
                setStatus('error');
                setErrorMessage(error.message || 'Failed to validate access link');
            }
        }

        validateToken();
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                                Verifying Access
                            </h1>
                            <p className="text-gray-600">
                                Please wait while we verify your access link...
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                                Access Verified
                            </h1>
                            <p className="text-gray-600">
                                Redirecting you to your portal...
                            </p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                                Access Denied
                            </h1>
                            <p className="text-gray-600 mb-6">
                                {errorMessage}
                            </p>
                            <p className="text-sm text-gray-500">
                                If you believe this is an error, please contact the company that sent you this link.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
