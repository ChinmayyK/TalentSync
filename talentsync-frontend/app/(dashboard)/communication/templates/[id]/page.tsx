'use client';

import { useState, useEffect, use } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import { useTemplate, useUpdateTemplate, useCreateTemplate, usePreviewTemplate } from '@/lib/hooks/useCommunication';
import type { Channel, TemplateCategory } from '@/lib/api/communication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TemplateEditorPageProps {
    params: Promise<{ id: string }>;
}

const categories: { value: TemplateCategory; label: string }[] = [
    { value: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
    { value: 'INTERVIEW_REMINDER', label: 'Interview Reminder' },
    { value: 'INTERVIEW_RESCHEDULED', label: 'Interview Rescheduled' },
    { value: 'INTERVIEW_CANCELLED', label: 'Interview Cancelled' },
    { value: 'FEEDBACK_REQUEST', label: 'Feedback Request' },
    { value: 'OFFER_LETTER', label: 'Offer Letter' },
    { value: 'WELCOME', label: 'Welcome' },
    { value: 'CUSTOM', label: 'Custom' },
];

export default function TemplateEditorPage({ params }: TemplateEditorPageProps) {
    const { id } = use(params);
    const isNew = id === 'new';
    const router = useRouter();

    const [name, setName] = useState('');
    const [channel, setChannel] = useState<Channel>('EMAIL');
    const [category, setCategory] = useState<TemplateCategory>('CUSTOM');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null);

    const { data: template, isLoading } = useTemplate(isNew ? '' : id);
    const updateMutation = useUpdateTemplate();
    const createMutation = useCreateTemplate();
    const previewMutation = usePreviewTemplate();

    useEffect(() => {
        if (template) {
            setName(template.name);
            setChannel(template.channel);
            setCategory(template.category);
            setSubject(template.subject || '');
            setBody(template.body);
        }
    }, [template]);

    const handleSave = async () => {
        if (isNew) {
            await createMutation.mutateAsync({
                name,
                channel,
                category,
                subject: channel === 'EMAIL' ? subject : undefined,
                body,
            });
        } else {
            await updateMutation.mutateAsync({
                id,
                data: {
                    name,
                    subject: channel === 'EMAIL' ? subject : undefined,
                    body,
                },
            });
        }
        router.push('/communication/templates');
    };

    const handlePreview = async () => {
        if (isNew) {
            // For new templates, just show raw content
            setPreviewContent({ subject, body });
            setPreviewOpen(true);
        } else {
            const result = await previewMutation.mutateAsync({
                id,
                context: {
                    candidateName: 'John Doe',
                    interviewDate: '2024-01-15',
                    interviewTime: '10:00 AM',
                    companyName: 'Acme Inc',
                },
            });
            setPreviewContent(result);
            setPreviewOpen(true);
        }
    };

    const isSaving = updateMutation.isPending || createMutation.isPending;

    if (!isNew && isLoading) {
        return (
            <div className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isNew ? 'Create Template' : 'Edit Template'}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePreview}>
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 p-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Interview Confirmation"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select value={channel} onValueChange={(v) => setChannel(v as Channel)} disabled={!isNew}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EMAIL">Email</SelectItem>
                                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                <SelectItem value="SMS">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)} disabled={!isNew}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {channel === 'EMAIL' && (
                    <div className="space-y-2 mb-6">
                        <Label>Subject</Label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject line"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Enter your message template..."
                        rows={12}
                        className="font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                        Use {'{{variableName}}'} for dynamic content. Available: candidateName, interviewDate, interviewTime, companyName
                    </p>
                </div>
            </motion.div>

            {/* Preview Modal */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Template Preview</DialogTitle>
                    </DialogHeader>
                    {previewContent?.subject && (
                        <div className="mb-4">
                            <Label>Subject</Label>
                            <p className="text-slate-900 mt-1">{previewContent.subject}</p>
                        </div>
                    )}
                    <div>
                        <Label>Body</Label>
                        <div
                            className="mt-2 p-4 bg-slate-50 rounded-lg border prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewContent?.body || '') }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
