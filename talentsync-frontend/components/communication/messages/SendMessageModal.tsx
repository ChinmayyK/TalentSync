'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSendMessage, useTemplates } from '@/lib/hooks/useCommunication';
import type { Channel, RecipientType } from '@/lib/api/communication';
import { Loader2, Send } from 'lucide-react';

interface SendMessageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultRecipient?: { type: RecipientType; id: string; email?: string; phone?: string };
}

export function SendMessageModal({ open, onOpenChange, defaultRecipient }: SendMessageModalProps) {
    const [channel, setChannel] = useState<Channel>('EMAIL');
    const [recipientType, setRecipientType] = useState<RecipientType>(defaultRecipient?.type || 'EXTERNAL');
    const [recipientId, setRecipientId] = useState(defaultRecipient?.id || '');
    const [templateId, setTemplateId] = useState<string>('__none__');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const sendMutation = useSendMessage();
    const { data: templates } = useTemplates(channel);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        await sendMutation.mutateAsync({
            channel,
            recipientType,
            recipientId,
            templateId: templateId === '__none__' ? undefined : templateId,
            subject: channel === 'EMAIL' ? subject : undefined,
            body,
        });

        onOpenChange(false);
        resetForm();
    };

    const resetForm = () => {
        setChannel('EMAIL');
        setRecipientType('EXTERNAL');
        setRecipientId('');
        setTemplateId('__none__');
        setSubject('');
        setBody('');
    };

    const handleTemplateChange = (id: string) => {
        setTemplateId(id);
        if (id === '__none__') {
            setSubject('');
            setBody('');
            return;
        }
        const template = templates?.find(t => t.id === id);
        if (template) {
            setSubject(template.subject || '');
            setBody(template.body);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-[600px] sm:h-auto sm:rounded-lg">
                <DialogHeader>
                    <DialogTitle>Compose Message</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Channel */}
                    <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EMAIL">Email</SelectItem>
                                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                <SelectItem value="SMS">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Recipient Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Recipient Type</Label>
                            <Select value={recipientType} onValueChange={(v) => setRecipientType(v as RecipientType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CANDIDATE">Candidate</SelectItem>
                                    <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="EXTERNAL">External (Email/Phone)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{recipientType === 'EXTERNAL' ? (channel === 'EMAIL' ? 'Email Address' : 'Phone Number') : 'Recipient ID'}</Label>
                            <Input
                                value={recipientId}
                                onChange={(e) => setRecipientId(e.target.value)}
                                placeholder={recipientType === 'EXTERNAL'
                                    ? (channel === 'EMAIL' ? 'email@example.com' : '+1234567890')
                                    : 'Enter ID'
                                }
                                required
                            />
                        </div>
                    </div>

                    {/* Template */}
                    <div className="space-y-2">
                        <Label>Template (Optional)</Label>
                        <Select value={templateId} onValueChange={handleTemplateChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template or compose custom" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Custom Message</SelectItem>
                                {templates?.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Subject (Email only) */}
                    {channel === 'EMAIL' && (
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Email subject"
                                required={channel === 'EMAIL'}
                            />
                        </div>
                    )}

                    {/* Body */}
                    <div className="space-y-2">
                        <Label>Message Body</Label>
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Enter your message..."
                            rows={6}
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={sendMutation.isPending}>
                            {sendMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Message
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
