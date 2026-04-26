'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useAutomation, useUpdateAutomation, useCreateAutomation, useTemplates } from '@/lib/hooks/useCommunication';
import type { Channel, AutomationTrigger } from '@/lib/api/communication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AutomationEditorPageProps {
    params: Promise<{ id: string }>;
}

const triggers: { value: AutomationTrigger; label: string }[] = [
    { value: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled' },
    { value: 'INTERVIEW_REMINDER_24H', label: '24h Before Interview' },
    { value: 'INTERVIEW_REMINDER_1H', label: '1h Before Interview' },
    { value: 'INTERVIEW_RESCHEDULED', label: 'Interview Rescheduled' },
    { value: 'INTERVIEW_CANCELLED', label: 'Interview Cancelled' },
    { value: 'INTERVIEW_COMPLETED', label: 'Interview Completed' },
    { value: 'FEEDBACK_SUBMITTED', label: 'Feedback Submitted' },
    { value: 'CANDIDATE_STAGE_CHANGED', label: 'Stage Changed' },
    { value: 'OFFER_EXTENDED', label: 'Offer Extended' },
];

export default function AutomationEditorPage({ params }: AutomationEditorPageProps) {
    const { id } = use(params);
    const isNew = id === 'new';
    const router = useRouter();

    const [name, setName] = useState('');
    const [trigger, setTrigger] = useState<AutomationTrigger>('INTERVIEW_SCHEDULED');
    const [channel, setChannel] = useState<Channel>('EMAIL');
    const [templateId, setTemplateId] = useState('');
    const [delay, setDelay] = useState(0);

    const { data: automation, isLoading } = useAutomation(isNew ? '' : id);
    const { data: templates } = useTemplates(channel);
    const updateMutation = useUpdateAutomation();
    const createMutation = useCreateAutomation();

    useEffect(() => {
        if (automation) {
            setName(automation.name);
            setTrigger(automation.trigger);
            setChannel(automation.channel);
            setTemplateId(automation.templateId);
            setDelay(automation.delay);
        }
    }, [automation]);

    const handleSave = async () => {
        if (isNew) {
            await createMutation.mutateAsync({
                name,
                trigger,
                channel,
                templateId,
                delay,
            });
        } else {
            await updateMutation.mutateAsync({
                id,
                data: {
                    name,
                    templateId,
                    delay,
                },
            });
        }
        router.push('/communication/automations');
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
                        {isNew ? 'Create Automation Rule' : 'Edit Automation Rule'}
                    </h1>
                </div>
                <Button onClick={handleSave} disabled={isSaving || !templateId}>
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                </Button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl"
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>Rule Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Send interview confirmation"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Trigger Event</Label>
                        <Select value={trigger} onValueChange={(v) => setTrigger(v as AutomationTrigger)} disabled={!isNew}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {triggers.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select value={channel} onValueChange={(v) => { setChannel(v as Channel); setTemplateId(''); }} disabled={!isNew}>
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
                        <Label>Template</Label>
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                                {templates?.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Delay (minutes)</Label>
                        <Input
                            type="number"
                            value={delay}
                            onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
                            min={0}
                        />
                        <p className="text-xs text-slate-500">
                            0 = send immediately, positive = after event, negative = before event
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
