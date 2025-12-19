'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Link2, Loader2, Mail, MessageSquare, Phone, CheckCircle, XCircle } from 'lucide-react';
import { useBulkSendPortalLinks } from '@/lib/hooks/useCandidates';
import { toast } from '@/hooks/use-toast';

interface BulkSendPortalLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    candidateIds: string[];
    onSuccess?: () => void;
}

type Channel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export function BulkSendPortalLinkModal({
    open,
    onOpenChange,
    candidateIds,
    onSuccess,
}: BulkSendPortalLinkModalProps) {
    const [channel, setChannel] = useState<Channel>('EMAIL');
    const bulkSendMutation = useBulkSendPortalLinks();

    const channelIcons = {
        EMAIL: <Mail className="h-4 w-4" />,
        WHATSAPP: <MessageSquare className="h-4 w-4" />,
        SMS: <Phone className="h-4 w-4" />,
    };

    const channelLabels = {
        EMAIL: 'Email',
        WHATSAPP: 'WhatsApp',
        SMS: 'SMS',
    };

    const handleSend = async () => {
        try {
            const result = await bulkSendMutation.mutateAsync({
                candidateIds,
                channel,
            });

            toast({
                title: 'Portal Links Queued',
                description: `Sending portal links to ${result.count} candidates via ${channelLabels[channel]}.`,
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            toast({
                title: 'Failed to Send',
                description: error.message || 'An error occurred while sending portal links.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Send Portal Links
                    </DialogTitle>
                    <DialogDescription>
                        Send document upload links to {candidateIds.length} selected candidate{candidateIds.length !== 1 ? 's' : ''}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel">Delivery Channel</Label>
                        <Select value={channel} onValueChange={(value) => setChannel(value as Channel)}>
                            <SelectTrigger id="channel">
                                <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EMAIL">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        Email
                                    </div>
                                </SelectItem>
                                <SelectItem value="WHATSAPP">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        WhatsApp
                                    </div>
                                </SelectItem>
                                <SelectItem value="SMS">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        SMS
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p>Portal links will be generated and sent to each candidate.</p>
                        <p className="mt-1">Links expire in 7 days.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={bulkSendMutation.isPending}>
                        {bulkSendMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                {channelIcons[channel]}
                                <span className="ml-2">Send to {candidateIds.length} Candidate{candidateIds.length !== 1 ? 's' : ''}</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

