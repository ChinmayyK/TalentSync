'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Mail,
    MessageSquare,
    Smartphone,
    CheckCircle,
    XCircle,
    SaveIcon,
    TestTube,
    RefreshCw,
    AlertCircle,
    Loader2,
    Eye,
    EyeOff,
    Settings
} from 'lucide-react';
import { useChannels, useUpdateChannel, useTestChannel } from '@/lib/hooks/useCommunication';
import type { Channel, ChannelConfig } from '@/lib/api/communication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const channelConfig: Record<Channel, { icon: any; label: string; color: string }> = {
    EMAIL: { icon: Mail, label: 'Email (SMTP)', color: 'bg-blue-500' },
    WHATSAPP: { icon: MessageSquare, label: 'WhatsApp', color: 'bg-green-500' },
    SMS: { icon: Smartphone, label: 'SMS (Twilio)', color: 'bg-purple-500' },
};

interface ChannelFormData {
    EMAIL: { host: string; port: string; username: string; password: string; fromAddress: string };
    WHATSAPP: { businessId: string; phoneNumberId: string; accessToken: string };
    SMS: { accountSid: string; authToken: string; fromNumber: string };
}

export default function ChannelsPage() {
    const [editChannel, setEditChannel] = useState<Channel | null>(null);
    const [formData, setFormData] = useState<Partial<ChannelFormData[Channel]>>({});
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    const { data: channels, isLoading, error, refetch } = useChannels();
    const updateMutation = useUpdateChannel();
    const testMutation = useTestChannel();

    const getChannelData = (channel: Channel): ChannelConfig | undefined => {
        return channels?.find(c => c.channel === channel);
    };

    const handleEdit = (channel: Channel) => {
        const config = getChannelData(channel);
        if (config) {
            setFormData(config.credentials || {});
        } else {
            setFormData({});
        }
        setEditChannel(channel);
    };

    const handleSave = async () => {
        if (!editChannel) return;
        await updateMutation.mutateAsync({
            channel: editChannel,
            data: { credentials: formData },
        });
        setEditChannel(null);
    };

    const handleTest = async (channel: Channel) => {
        await testMutation.mutateAsync(channel);
    };

    const togglePasswordVisibility = (field: string) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                    <h3 className="font-semibold text-red-900">Failed to load channel configurations</h3>
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
                    <h1 className="text-2xl font-bold text-slate-900">Channel Configuration</h1>
                    <p className="text-slate-600">Configure your messaging providers</p>
                </div>
                <button onClick={() => refetch()} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Channel Cards */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                    Loading channels...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {(['EMAIL', 'WHATSAPP', 'SMS'] as Channel[]).map((channel, index) => {
                        const config = channelConfig[channel];
                        const data = getChannelData(channel);
                        const Icon = config.icon;

                        return (
                            <motion.div
                                key={channel}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`bg-white rounded-xl border-2 p-5 ${data?.isVerified ? 'border-green-200' : 'border-slate-200'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${config.color} text-white`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{config.label}</h3>
                                            <p className="text-sm text-slate-500">
                                                {data ? 'Configured' : 'Not configured'}
                                            </p>
                                        </div>
                                    </div>
                                    {data?.isVerified ? (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="text-xs font-medium">Verified</span>
                                        </div>
                                    ) : data ? (
                                        <div className="flex items-center gap-1 text-amber-600">
                                            <XCircle className="w-5 h-5" />
                                            <span className="text-xs font-medium">Unverified</span>
                                        </div>
                                    ) : null}
                                </div>

                                {data?.lastTestedAt && (
                                    <p className="text-xs text-slate-500 mb-4">
                                        Last tested: {new Date(data.lastTestedAt).toLocaleString()}
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleEdit(channel)}
                                    >
                                        <Settings className="w-4 h-4 mr-1" />
                                        Configure
                                    </Button>
                                    {data && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleTest(channel)}
                                            disabled={testMutation.isPending}
                                        >
                                            {testMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <TestTube className="w-4 h-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Setup Instructions */}
            <div className="bg-slate-50 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Setup Instructions</h2>
                <div className="space-y-4 text-sm">
                    <div>
                        <h4 className="font-medium text-slate-900">Email (SMTP)</h4>
                        <p className="text-slate-600">
                            For local development, use MailHog: <code className="bg-slate-200 px-1 rounded">docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog</code>
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-900">WhatsApp</h4>
                        <p className="text-slate-600">
                            Register for WhatsApp Business API at Meta for Developers. Currently using mock provider.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-900">SMS</h4>
                        <p className="text-slate-600">
                            Create a Twilio account at twilio.com. Currently using mock provider.
                        </p>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={editChannel !== null} onOpenChange={() => setEditChannel(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Configure {editChannel && channelConfig[editChannel].label}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {editChannel === 'EMAIL' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SMTP Host</Label>
                                        <Input
                                            value={(formData as any).host || ''}
                                            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                            placeholder="smtp.example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Port</Label>
                                        <Input
                                            value={(formData as any).port || ''}
                                            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                            placeholder="587"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input
                                        value={(formData as any).username || ''}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="smtp-username"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword.password ? 'text' : 'password'}
                                            value={(formData as any).password || ''}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('password')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        >
                                            {showPassword.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>From Address</Label>
                                    <Input
                                        value={(formData as any).fromAddress || ''}
                                        onChange={(e) => setFormData({ ...formData, fromAddress: e.target.value })}
                                        placeholder="noreply@example.com"
                                    />
                                </div>
                            </>
                        )}

                        {editChannel === 'WHATSAPP' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Business ID</Label>
                                    <Input
                                        value={(formData as any).businessId || ''}
                                        onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                                        placeholder="123456789"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number ID</Label>
                                    <Input
                                        value={(formData as any).phoneNumberId || ''}
                                        onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                                        placeholder="123456789"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Access Token</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword.token ? 'text' : 'password'}
                                            value={(formData as any).accessToken || ''}
                                            onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('token')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        >
                                            {showPassword.token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {editChannel === 'SMS' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Account SID</Label>
                                    <Input
                                        value={(formData as any).accountSid || ''}
                                        onChange={(e) => setFormData({ ...formData, accountSid: e.target.value })}
                                        placeholder="ACxxxxxxxxxxxxxxxx"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Auth Token</Label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword.authToken ? 'text' : 'password'}
                                            value={(formData as any).authToken || ''}
                                            onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => togglePasswordVisibility('authToken')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        >
                                            {showPassword.authToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>From Number</Label>
                                    <Input
                                        value={(formData as any).fromNumber || ''}
                                        onChange={(e) => setFormData({ ...formData, fromNumber: e.target.value })}
                                        placeholder="+1234567890"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditChannel(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <SaveIcon className="w-4 h-4 mr-2" />
                            )}
                            Save Configuration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
