'use client';

import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Smartphone, Send, Loader2, FileText, ChevronDown } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { sendMessage, getTemplates, Channel, MessageTemplate } from '@/lib/api/communication';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Message body limits by channel
const MAX_BODY_LENGTH: Record<MessageChannel, number> = {
    EMAIL: 50000,
    WHATSAPP: 4096,
    SMS: 1600,
};

export type MessageChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

interface SendMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipientId: string;
    recipientName: string;
    recipientEmail?: string;
    recipientPhone?: string;
    defaultChannel?: MessageChannel;
}

const channelConfig: Record<MessageChannel, { icon: React.ElementType; label: string; color: string }> = {
    EMAIL: { icon: Mail, label: 'Email', color: 'text-blue-600' },
    WHATSAPP: { icon: WhatsAppIcon, label: 'WhatsApp', color: 'text-green-600' },
    SMS: { icon: Smartphone, label: 'SMS', color: 'text-purple-600' },
};

// Category colors for badges
const categoryColors: Record<string, string> = {
    INTERVIEW: 'bg-blue-100 text-blue-700',
    OFFER: 'bg-green-100 text-green-700',
    REJECTION: 'bg-red-100 text-red-700',
    FOLLOW_UP: 'bg-amber-100 text-amber-700',
    GENERAL: 'bg-slate-100 text-slate-700',
};

export function SendMessageDialog({
    open,
    onOpenChange,
    recipientId,
    recipientName,
    recipientEmail,
    recipientPhone,
    defaultChannel = 'EMAIL',
}: SendMessageDialogProps) {
    const [channel, setChannel] = useState<MessageChannel>(defaultChannel);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [showTemplates, setShowTemplates] = useState(true);

    // Fetch templates when channel changes
    useEffect(() => {
        if (open) {
            setLoadingTemplates(true);
            getTemplates(channel as Channel)
                .then(setTemplates)
                .catch(() => setTemplates([]))
                .finally(() => setLoadingTemplates(false));
        }
    }, [channel, open]);

    const handleTemplateSelect = (template: MessageTemplate) => {
        setSelectedTemplateId(template.id);
        setSubject(template.subject || '');
        // Replace template variables with placeholders
        let processedBody = template.body;
        processedBody = processedBody.replace(/\{\{candidate\.name\}\}/g, recipientName);
        processedBody = processedBody.replace(/\{\{candidate\.email\}\}/g, recipientEmail || '');
        setBody(processedBody);
        setShowTemplates(false);
    };

    const handleSend = async () => {
        if (!body.trim()) {
            toast.error('Please enter a message');
            return;
        }

        if (channel === 'EMAIL' && !subject.trim()) {
            toast.error('Please enter a subject for the email');
            return;
        }

        const maxLength = MAX_BODY_LENGTH[channel];
        if (body.length > maxLength) {
            toast.error(`Message too long. Maximum ${maxLength.toLocaleString()} characters for ${channelConfig[channel].label}.`);
            return;
        }

        if (channel === 'EMAIL' && !recipientEmail) {
            toast.error('Recipient does not have an email address');
            return;
        }

        if ((channel === 'WHATSAPP' || channel === 'SMS') && !recipientPhone) {
            toast.error('Recipient does not have a phone number');
            return;
        }

        setIsSending(true);
        try {
            await sendMessage({
                channel: channel as Channel,
                recipientType: 'CANDIDATE',
                recipientId,
                subject: channel === 'EMAIL' ? subject : undefined,
                body,
                templateId: selectedTemplateId || undefined,
            });
            toast.success(`${channelConfig[channel].label} sent successfully!`);
            onOpenChange(false);
            setSubject('');
            setBody('');
            setSelectedTemplateId('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const resetForm = () => {
        setSubject('');
        setBody('');
        setSelectedTemplateId('');
        setShowTemplates(true);
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) resetForm();
            onOpenChange(newOpen);
        }}>
            <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Send className="h-5 w-5" />
                        Send Message to {recipientName}
                    </DialogTitle>
                    <DialogDescription>
                        Choose a template or compose a custom message.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Channel Tabs */}
                    <Tabs value={channel} onValueChange={(v) => {
                        setChannel(v as MessageChannel);
                        setShowTemplates(true);
                        setSelectedTemplateId('');
                    }}>
                        <TabsList className="grid grid-cols-3 w-full">
                            {(['EMAIL', 'WHATSAPP', 'SMS'] as MessageChannel[]).map((ch) => {
                                const config = channelConfig[ch];
                                const Icon = config.icon;
                                const disabled =
                                    (ch === 'EMAIL' && !recipientEmail) ||
                                    ((ch === 'WHATSAPP' || ch === 'SMS') && !recipientPhone);
                                return (
                                    <TabsTrigger
                                        key={ch}
                                        value={ch}
                                        disabled={disabled}
                                        className="gap-2"
                                    >
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                        {config.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        <TabsContent value="EMAIL" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email-to">To</Label>
                                <Input
                                    id="email-to"
                                    value={recipientEmail || 'No email available'}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="WHATSAPP" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="wa-to">To</Label>
                                <Input
                                    id="wa-to"
                                    value={recipientPhone || 'No phone number available'}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="SMS" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="sms-to">To</Label>
                                <Input
                                    id="sms-to"
                                    value={recipientPhone || 'No phone number available'}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Template Selection */}
                    {showTemplates && templates.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Choose a Template
                                </Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowTemplates(false)}
                                    className="text-xs"
                                >
                                    Skip & Write Custom
                                </Button>
                            </div>
                            <ScrollArea className="h-[200px] rounded-lg border border-border">
                                {loadingTemplates ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-2">
                                        {templates.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => handleTemplateSelect(template)}
                                                className={cn(
                                                    "w-full p-3 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-accent/50",
                                                    selectedTemplateId === template.id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border bg-background"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-foreground truncate">
                                                            {template.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                            {template.subject || template.body.substring(0, 80)}...
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn("text-[10px] shrink-0", categoryColors[template.category] || categoryColors.GENERAL)}
                                                    >
                                                        {template.category.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {/* Show selected template or compose form */}
                    {(!showTemplates || templates.length === 0) && (
                        <>
                            {templates.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowTemplates(true)}
                                    className="w-full gap-2"
                                >
                                    <FileText className="h-4 w-4" />
                                    Choose from Templates
                                </Button>
                            )}

                            {channel === 'EMAIL' && (
                                <div className="space-y-2">
                                    <Label htmlFor="email-subject">Subject</Label>
                                    <Input
                                        id="email-subject"
                                        placeholder="Enter subject..."
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Message Body */}
                            <div className="space-y-2">
                                <Label htmlFor="message-body">Message</Label>
                                <Textarea
                                    id="message-body"
                                    placeholder="Type your message here..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={6}
                                    className="resize-none"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>
                                        {selectedTemplateId && (
                                            <span className="text-primary">Using template • </span>
                                        )}
                                        Variables: {`{{candidate.name}}`}, {`{{candidate.email}}`}
                                    </span>
                                    <span className={body.length > MAX_BODY_LENGTH[channel] ? 'text-red-500' : ''}>
                                        {body.length.toLocaleString()} / {MAX_BODY_LENGTH[channel].toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={isSending || !body.trim() || (showTemplates && templates.length > 0)}
                        className="gap-2"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Send {channelConfig[channel].label}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
