'use client';

import { use } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Mail,
    MessageSquare,
    Clock,
    CheckCircle,
    AlertCircle,
    Send,
    Eye,
    RefreshCw,
    User,
    Calendar
} from 'lucide-react';
import { useMessageDetail, useRetryMessage } from '@/lib/hooks/useCommunication';
import type { Channel, MessageStatus } from '@/lib/api/communication';

const statusConfig: Record<MessageStatus, { color: string; bgColor: string; icon: any; label: string }> = {
    PENDING: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock, label: 'Pending' },
    QUEUED: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Clock, label: 'Queued' },
    SENT: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Send, label: 'Sent' },
    DELIVERED: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle, label: 'Delivered' },
    READ: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Eye, label: 'Read' },
    FAILED: { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle, label: 'Failed' },
    BOUNCED: { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle, label: 'Bounced' },
};

const channelIcon: Record<Channel, any> = {
    EMAIL: Mail,
    WHATSAPP: MessageSquare,
    SMS: MessageSquare,
};

interface MessageDetailPageProps {
    params: Promise<{ id: string }>;
}

export default function MessageDetailPage({ params }: MessageDetailPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data: message, isLoading, error, refetch } = useMessageDetail(id);
    const retryMutation = useRetryMessage();

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-32 bg-slate-200 rounded" />
                    <div className="h-64 bg-slate-200 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !message) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                    <h3 className="font-semibold text-red-900">Message not found</h3>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const status = statusConfig[message.status];
    const ChannelIcon = channelIcon[message.channel];

    // Build timeline events
    const timeline = [
        { label: 'Created', time: message.createdAt, icon: Clock, active: true },
        { label: 'Sent', time: message.sentAt, icon: Send, active: !!message.sentAt },
        { label: 'Delivered', time: message.deliveredAt, icon: CheckCircle, active: !!message.deliveredAt },
        { label: 'Read', time: message.readAt, icon: Eye, active: !!message.readAt },
    ];

    if (message.status === 'FAILED' || message.status === 'BOUNCED') {
        timeline.push({ label: 'Failed', time: message.failedAt, icon: AlertCircle, active: true });
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">Message Details</h1>
                    <p className="text-slate-600 text-sm">{message.id}</p>
                </div>
                {(message.status === 'FAILED' || message.status === 'BOUNCED') && (
                    <button
                        onClick={() => retryMutation.mutate(message.id)}
                        disabled={retryMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                        Retry
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${status.bgColor}`}>
                                    <status.icon className={`w-5 h-5 ${status.color}`} />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{status.label}</p>
                                    <p className="text-sm text-slate-500">
                                        {message.retryCount > 0 ? `${message.retryCount} retry attempts` : 'No retries'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ChannelIcon className="w-5 h-5 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700">{message.channel}</span>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="flex items-center justify-between mt-6 px-4">
                            {timeline.filter(t => t.active || t.label === 'Created').map((event, index, arr) => (
                                <div key={event.label} className="flex items-center">
                                    <div className={`flex flex-col items-center ${event.active ? '' : 'opacity-40'}`}>
                                        <div className={`p-2 rounded-full ${event.active ? 'bg-green-100' : 'bg-slate-100'}`}>
                                            <event.icon className={`w-4 h-4 ${event.active ? 'text-green-600' : 'text-slate-400'}`} />
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">{event.label}</p>
                                        {event.time && (
                                            <p className="text-xs text-slate-400">{new Date(event.time).toLocaleTimeString()}</p>
                                        )}
                                    </div>
                                    {index < arr.length - 1 && (
                                        <div className={`w-16 h-0.5 mx-2 ${event.active ? 'bg-green-300' : 'bg-slate-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Message Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                    >
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Message Content</h2>

                        {message.subject && (
                            <div className="mb-4">
                                <p className="text-sm font-medium text-slate-600">Subject</p>
                                <p className="text-slate-900">{message.subject}</p>
                            </div>
                        )}

                        <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Body</p>
                            <div
                                className="p-4 bg-slate-50 rounded-lg border border-slate-200 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.body) }}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Recipient Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                    >
                        <h3 className="font-semibold text-slate-900 mb-4">Recipient</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4 text-slate-400" />
                                <div>
                                    <p className="text-sm text-slate-600">Type</p>
                                    <p className="text-slate-900">{message.recipientType}</p>
                                </div>
                            </div>
                            {message.recipientEmail && (
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-sm text-slate-600">Email</p>
                                        <p className="text-slate-900">{message.recipientEmail}</p>
                                    </div>
                                </div>
                            )}
                            {message.recipientPhone && (
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-sm text-slate-600">Phone</p>
                                        <p className="text-slate-900">{message.recipientPhone}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Metadata */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-xl border border-slate-200 p-5"
                    >
                        <h3 className="font-semibold text-slate-900 mb-4">Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">External ID</span>
                                <span className="text-slate-900 font-mono text-xs truncate max-w-[150px]">
                                    {message.externalId || '-'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Created</span>
                                <span className="text-slate-900">{new Date(message.createdAt).toLocaleString()}</span>
                            </div>
                            {message.sentAt && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Sent</span>
                                    <span className="text-slate-900">{new Date(message.sentAt).toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        {message.metadata && Object.keys(message.metadata).length > 0 && (
                            <details className="mt-4">
                                <summary className="text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800">
                                    Provider Metadata
                                </summary>
                                <pre className="mt-2 p-3 bg-slate-50 rounded text-xs overflow-auto">
                                    {JSON.stringify(message.metadata, null, 2)}
                                </pre>
                            </details>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
