'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Plus,
    Zap,
    ToggleLeft,
    ToggleRight,
    Edit,
    Trash2,
    Mail,
    MessageSquare,
    Clock,
    Calendar,
    FileText,
    RefreshCw,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useAutomations, useToggleAutomation, useDeleteAutomation } from '@/lib/hooks/useCommunication';
import type { Channel, AutomationRule } from '@/lib/api/communication';

const triggerLabels: Record<string, { label: string; description: string }> = {
    INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', description: 'When a new interview is scheduled' },
    INTERVIEW_REMINDER_24H: { label: '24h Before Interview', description: 'Reminder 24 hours before' },
    INTERVIEW_REMINDER_1H: { label: '1h Before Interview', description: 'Reminder 1 hour before' },
    INTERVIEW_RESCHEDULED: { label: 'Interview Rescheduled', description: 'When an interview is moved' },
    INTERVIEW_CANCELLED: { label: 'Interview Cancelled', description: 'When an interview is cancelled' },
    INTERVIEW_COMPLETED: { label: 'Interview Completed', description: 'When interview is done' },
    FEEDBACK_SUBMITTED: { label: 'Feedback Submitted', description: 'When interviewer submits feedback' },
    CANDIDATE_STAGE_CHANGED: { label: 'Stage Changed', description: 'When candidate moves stages' },
    OFFER_EXTENDED: { label: 'Offer Extended', description: 'When offer is made' },
};

const channelIcon: Record<Channel, any> = {
    EMAIL: Mail,
    WHATSAPP: MessageSquare,
    SMS: MessageSquare,
};

function AutomationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showNew = searchParams.get('action') === 'new';

    const { data: rules, isLoading, error, refetch } = useAutomations();
    const toggleMutation = useToggleAutomation();
    const deleteMutation = useDeleteAutomation();

    const handleToggle = async (id: string) => {
        await toggleMutation.mutateAsync(id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this automation rule?')) return;
        await deleteMutation.mutateAsync(id);
    };

    const formatDelay = (minutes: number) => {
        if (minutes === 0) return 'Immediately';
        if (minutes < 0) return `${Math.abs(minutes)}m before`;
        if (minutes < 60) return `${minutes}m after`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h after`;
        return `${Math.floor(minutes / 1440)}d after`;
    };

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                    <h3 className="font-semibold text-red-900">Failed to load automation rules</h3>
                    <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Automation Rules</h1>
                    <p className="text-slate-600">Configure automatic messaging based on events</p>
                </div>
                <button
                    onClick={() => router.push('/communication/automations/new')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Rule
                </button>
            </div>

            {/* Rules List */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                    Loading automation rules...
                </div>
            ) : !rules || rules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Zap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-700">No automation rules configured</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Create rules to automatically send messages when events occur
                    </p>
                    <button
                        onClick={() => router.push('/communication/automations/new')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Create Your First Rule
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule, index) => {
                        const trigger = triggerLabels[rule.trigger] || { label: rule.trigger, description: '' };
                        const ChannelIcon = channelIcon[rule.channel];

                        return (
                            <motion.div
                                key={rule.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white rounded-xl border p-5 ${rule.isActive ? 'border-green-200' : 'border-slate-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        {/* Toggle */}
                                        <button
                                            onClick={() => handleToggle(rule.id)}
                                            disabled={toggleMutation.isPending}
                                            className={`transition-colors ${rule.isActive ? 'text-green-500' : 'text-slate-400'
                                                }`}
                                        >
                                            {rule.isActive ? (
                                                <ToggleRight className="w-8 h-8" />
                                            ) : (
                                                <ToggleLeft className="w-8 h-8" />
                                            )}
                                        </button>

                                        {/* Info */}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${rule.isActive
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {rule.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {trigger.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Rule details */}
                                        <div className="flex items-center gap-6 text-sm text-slate-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {trigger.label}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <ChannelIcon className="w-4 h-4" />
                                                {rule.channel}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {formatDelay(rule.delay)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-4 h-4" />
                                                {rule.template?.name || 'Unknown template'}
                                            </div>
                                        </div>

                                        {/* Buttons */}
                                        <div className="flex gap-1 ml-4 border-l border-slate-200 pl-4">
                                            <button
                                                onClick={() => router.push(`/communication/automations/${rule.id}`)}
                                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Available Triggers Info */}
            <div className="mt-8 bg-slate-50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Triggers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(triggerLabels).map(([key, { label, description }]) => (
                        <div key={key} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                            <Zap className="w-5 h-5 text-amber-500 mt-0.5" />
                            <div>
                                <p className="font-medium text-slate-900">{label}</p>
                                <p className="text-sm text-slate-600">{description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function AutomationsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <AutomationsContent />
        </Suspense>
    );
}

