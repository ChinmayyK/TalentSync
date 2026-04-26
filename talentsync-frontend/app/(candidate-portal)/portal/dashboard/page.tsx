'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalProfile, usePortalInterviews, usePortalDocuments, usePortalAuth, usePortalUpload } from '@/lib/hooks/usePortal';
import { getPortalToken } from '@/lib/api/portal';
import {
    Calendar,
    FileText,
    Upload,
    Clock,
    MapPin,
    Video,
    Loader2,
    LogOut,
    Download,
    CheckCircle2,
    AlertCircle,
    Briefcase,
    Check,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function PortalDashboardPage() {
    const router = useRouter();
    const { isAuthenticated, logout } = usePortalAuth();
    const { data: profile, isLoading: profileLoading } = usePortalProfile();
    const { data: interviews, isLoading: interviewsLoading } = usePortalInterviews();
    const { data: documents, isLoading: documentsLoading } = usePortalDocuments();
    const uploadMutation = usePortalUpload();
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!getPortalToken()) {
            router.push('/');
        }
    }, [router]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                await uploadMutation.mutateAsync(file);
                setUploadSuccess(true);
                // Reset success state after 3 seconds
                setTimeout(() => setUploadSuccess(false), 3000);
            } catch (error) {
                // Error handling is done by mutation
            }
        }
        // Reset input
        event.target.value = '';
    };

    const handleDownload = async (downloadUrl: string, filename: string) => {
        try {
            const response = await fetch(downloadUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    if (!isAuthenticated || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const stageColors: Record<string, string> = {
        'APPLIED': 'bg-gray-100 text-gray-800',
        'SCREENING': 'bg-blue-100 text-blue-800',
        'PHONE_SCREEN': 'bg-cyan-100 text-cyan-800',
        'INTERVIEW': 'bg-purple-100 text-purple-800',
        'TECHNICAL': 'bg-indigo-100 text-indigo-800',
        'ONSITE': 'bg-violet-100 text-violet-800',
        'OFFER': 'bg-green-100 text-green-800',
        'HIRED': 'bg-emerald-100 text-emerald-800',
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {profile?.companyLogoUrl ? (
                            <img
                                src={profile.companyLogoUrl}
                                alt={profile.companyName}
                                className="h-10 w-auto"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                    {profile?.companyName?.charAt(0) || 'L'}
                                </span>
                            </div>
                        )}
                        <span className="text-lg font-semibold text-gray-900">
                            {profile?.companyName || 'Candidate Portal'}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome, {profile?.name?.split(' ')[0]}!
                    </h1>
                    <p className="text-gray-600">
                        Track your application progress and manage your documents.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Application Status Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Application Status</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-500">Position</label>
                                <p className="text-lg font-medium text-gray-900">
                                    {profile?.roleTitle || 'Not specified'}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500">Current Stage</label>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stageColors[profile?.stage || ''] || 'bg-gray-100 text-gray-800'}`}>
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                        {profile?.stage?.replace(/_/g, ' ') || 'Applied'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500">Applied On</label>
                                <p className="text-gray-900">
                                    {profile?.createdAt
                                        ? format(parseISO(profile.createdAt), 'MMMM d, yyyy')
                                        : 'Unknown'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Interviews Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Upcoming Interviews</h2>
                        </div>

                        {interviewsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : interviews && interviews.length > 0 ? (
                            <div className="space-y-4">
                                {interviews.map((interview) => (
                                    <div
                                        key={interview.id}
                                        className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {interview.stage.replace(/_/g, ' ')} Interview
                                                </p>
                                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4" />
                                                    <span>
                                                        {format(parseISO(interview.date), 'MMM d, yyyy')} at{' '}
                                                        {format(parseISO(interview.date), 'h:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {interview.durationMins} minutes • {interview.interviewerNames.join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                        {interview.meetingLink && (
                                            <a
                                                href={interview.meetingLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                <Video className="w-4 h-4" />
                                                Join Meeting
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No upcoming interviews scheduled</p>
                            </div>
                        )}
                    </div>

                    {/* Documents Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-green-600" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Your Documents</h2>
                            </div>

                            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${uploadSuccess
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}>
                                {uploadMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : uploadSuccess ? (
                                    <span className="relative flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                                            <Check className="w-3.5 h-3.5 text-green-500 animate-[scale-in_0.2s_ease-out]" />
                                        </span>
                                        <span>Uploaded!</span>
                                    </span>
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {!uploadSuccess && !uploadMutation.isPending && 'Upload Document'}
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploadMutation.isPending || uploadSuccess}
                                />
                            </label>
                        </div>

                        {documentsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : documents && documents.length > 0 ? (
                            <div className="divide-y divide-gray-100">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{doc.filename}</p>
                                                <p className="text-sm text-gray-500">
                                                    {doc.size ? `${Math.round(doc.size / 1024)} KB` : 'Unknown size'} •
                                                    Uploaded {format(parseISO(doc.createdAt), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        {doc.downloadUrl && (
                                            <button
                                                onClick={() => handleDownload(doc.downloadUrl!, doc.filename)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No documents uploaded yet</p>
                                <p className="text-sm text-gray-400 mt-1">Upload your resume, certificates, or other relevant documents</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
