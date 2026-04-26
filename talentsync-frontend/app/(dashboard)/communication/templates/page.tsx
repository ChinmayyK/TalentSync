'use client';

import { useState, Suspense } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Plus,
    Search,
    FileText,
    Mail,
    MessageSquare,
    Edit,
    Trash2,
    Copy,
    Eye,
    X,
    RefreshCw,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useTemplates, useDeleteTemplate, useDuplicateTemplate, usePreviewTemplate } from '@/lib/hooks/useCommunication';
import type { Channel, MessageTemplate } from '@/lib/api/communication';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const channelIcon: Record<Channel, any> = {
    EMAIL: Mail,
    WHATSAPP: MessageSquare,
    SMS: MessageSquare,
};

const categoryLabels: Record<string, string> = {
    INTERVIEW_SCHEDULED: 'Interview Scheduled',
    INTERVIEW_REMINDER: 'Interview Reminder',
    INTERVIEW_RESCHEDULED: 'Interview Rescheduled',
    INTERVIEW_CANCELLED: 'Interview Cancelled',
    FEEDBACK_REQUEST: 'Feedback Request',
    OFFER_LETTER: 'Offer Letter',
    WELCOME: 'Welcome',
    CUSTOM: 'Custom',
};

function TemplatesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const showNew = searchParams.get('action') === 'new';

    const [searchQuery, setSearchQuery] = useState('');
    const [channelFilter, setChannelFilter] = useState<Channel | undefined>(undefined);
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null);

    // Duplicate dialog state
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
    const [duplicateTemplateId, setDuplicateTemplateId] = useState<string | null>(null);
    const [duplicateName, setDuplicateName] = useState('');

    const { data: templates, isLoading, error, refetch } = useTemplates(channelFilter);
    const deleteMutation = useDeleteTemplate();
    const duplicateMutation = useDuplicateTemplate();
    const previewMutation = usePreviewTemplate();

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        await deleteMutation.mutateAsync(id);
    };

    const openDuplicateDialog = (id: string) => {
        setDuplicateTemplateId(id);
        setDuplicateName('');
        setDuplicateDialogOpen(true);
    };

    const handleDuplicate = async () => {
        if (!duplicateTemplateId || !duplicateName.trim()) return;
        await duplicateMutation.mutateAsync({ id: duplicateTemplateId, name: duplicateName.trim() });
        setDuplicateDialogOpen(false);
        setDuplicateTemplateId(null);
        setDuplicateName('');
    };

    const handlePreview = async (template: MessageTemplate) => {
        setSelectedTemplate(template);
        try {
            const result = await previewMutation.mutateAsync({
                id: template.id,
                context: {
                    candidateName: 'John Doe',
                    interviewDate: '2024-01-15',
                    interviewTime: '10:00 AM',
                    companyName: 'Acme Inc',
                },
            });
            setPreviewContent(result);
            setPreviewOpen(true);
        } catch {
            // Error handled by hook
        }
    };

    const filteredTemplates = (templates || []).filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedByCategory = filteredTemplates.reduce((acc, template) => {
        const cat = template.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(template);
        return acc;
    }, {} as Record<string, MessageTemplate[]>);

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                    <h3 className="font-semibold text-red-900">Failed to load templates</h3>
                    <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
                    <p className="text-slate-600">Create and manage reusable message templates</p>
                </div>
                <button
                    onClick={() => router.push('/communication/templates/new')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    <Plus className="w-4 h-4" />
                    Create Template
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {([undefined, 'EMAIL', 'WHATSAPP', 'SMS'] as (Channel | undefined)[]).map((ch) => (
                            <button
                                key={ch || 'all'}
                                onClick={() => setChannelFilter(ch)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none ${channelFilter === ch
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {ch || 'All'}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => refetch()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg hidden sm:block">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Templates by Category */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                    Loading templates...
                </div>
            ) : Object.keys(groupedByCategory).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-700">No templates found</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first template to get started</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedByCategory).map(([category, categoryTemplates]) => (
                        <div key={category}>
                            <h2 className="text-lg font-semibold text-slate-900 mb-3">
                                {categoryLabels[category] || category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryTemplates.map((template, index) => {
                                    const ChannelIcon = channelIcon[template.channel];
                                    return (
                                        <motion.div
                                            key={template.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-slate-100 rounded-lg">
                                                        <ChannelIcon className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-slate-900">{template.name}</h3>
                                                        <p className="text-xs text-slate-500">{template.channel}</p>
                                                    </div>
                                                </div>
                                                {template.isSystem && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                        System
                                                    </span>
                                                )}
                                            </div>

                                            {template.subject && (
                                                <p className="text-sm text-slate-600 mb-2 line-clamp-1">
                                                    <strong>Subject:</strong> {template.subject}
                                                </p>
                                            )}

                                            <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                                                {template.body.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                            </p>

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <span className="text-xs text-slate-400">
                                                    v{template.version} • {new Date(template.updatedAt).toLocaleDateString()}
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handlePreview(template)}
                                                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                                        title="Preview"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openDuplicateDialog(template.id)}
                                                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                                        title="Duplicate"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    {!template.isSystem && (
                                                        <>
                                                            <button
                                                                onClick={() => router.push(`/communication/templates/${template.id}`)}
                                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(template.id)}
                                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Template Preview</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedTemplate && (
                            <div>
                                <p className="text-sm text-slate-600 mb-1">Template: {selectedTemplate.name}</p>
                            </div>
                        )}
                        {previewContent?.subject && (
                            <div>
                                <label className="text-sm font-medium text-slate-600">Subject</label>
                                <p className="text-slate-900 mt-1">{previewContent.subject}</p>
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-slate-600">Body</label>
                            <div
                                className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent?.body || '') }}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Duplicate Template Dialog */}
            <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Duplicate Template</DialogTitle>
                        <DialogDescription>
                            Enter a name for the duplicated template.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="duplicate-name" className="text-sm font-medium">
                            Template Name
                        </Label>
                        <Input
                            id="duplicate-name"
                            value={duplicateName}
                            onChange={(e) => setDuplicateName(e.target.value)}
                            placeholder="Enter template name..."
                            className="mt-2"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && duplicateName.trim()) {
                                    handleDuplicate();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDuplicate}
                            disabled={!duplicateName.trim() || duplicateMutation.isPending}
                        >
                            {duplicateMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Duplicating...</>
                            ) : (
                                'Duplicate'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function TemplatesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <TemplatesContent />
        </Suspense>
    );
}
