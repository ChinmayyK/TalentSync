"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Check, AlertCircle } from "lucide-react";
import { tenantApi, EmailSettings } from "@/lib/api/tenant";

export default function EmailTab() {
    const [email, setEmail] = useState<EmailSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [testEmailOpen, setTestEmailOpen] = useState(false);
    const [testEmailValue, setTestEmailValue] = useState("");
    const [sendingTest, setSendingTest] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadEmailSettings();
    }, []);

    const loadEmailSettings = async () => {
        setLoading(true);
        const data = await tenantApi.getEmailSettings();
        setEmail(data);
        setLoading(false);
    };

    const handleSaveEmail = async () => {
        if (!email) return;
        setSaving(true);
        await tenantApi.updateEmailSettings(email);
        setSaving(false);
    };

    const handleTestEmail = async () => {
        setSendingTest(true);
        await tenantApi.testEmailSettings(testEmailValue);
        setTestEmailOpen(false);
        setTestEmailValue("");
        setSendingTest(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!email) return null;

    return (
        <div className="space-y-6">
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        SMTP Configuration
                    </h3>
                    <div className="flex items-center gap-2">
                        {email.configured ? (
                            <span className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                                <Check className="w-4 h-4 mr-1" /> Configured
                            </span>
                        ) : (
                            <span className="flex items-center text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                <AlertCircle className="w-4 h-4 mr-1" /> Not Configured
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                            id="smtpHost"
                            value={email.smtpHost}
                            onChange={(e) =>
                                setEmail({ ...email, smtpHost: e.target.value })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                            id="smtpPort"
                            type="number"
                            value={email.smtpPort}
                            onChange={(e) =>
                                setEmail({
                                    ...email,
                                    smtpPort: parseInt(e.target.value),
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="smtpUsername">Username</Label>
                        <Input
                            id="smtpUsername"
                            value={email.smtpUsername}
                            onChange={(e) =>
                                setEmail({ ...email, smtpUsername: e.target.value })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="smtpPassword">Password</Label>
                        <Input
                            id="smtpPassword"
                            type="password"
                            value={email.smtpPassword}
                            onChange={(e) =>
                                setEmail({ ...email, smtpPassword: e.target.value })
                            }
                            className="mt-1"
                        />
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="fromEmail">From Email</Label>
                        <Input
                            id="fromEmail"
                            value={email.fromEmail}
                            onChange={(e) =>
                                setEmail({ ...email, fromEmail: e.target.value })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="replyToEmail">Reply-To Email</Label>
                        <Input
                            id="replyToEmail"
                            value={email.replyToEmail}
                            onChange={(e) =>
                                setEmail({ ...email, replyToEmail: e.target.value })
                            }
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end mt-6">
                    <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Test Configuration</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Send Test Email</DialogTitle>
                                <DialogDescription>
                                    Enter an email address to receive a test message.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={testEmailValue}
                                        onChange={(e) => setTestEmailValue(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setTestEmailOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleTestEmail} disabled={sendingTest}>
                                    Send Test
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={handleSaveEmail} disabled={saving}>
                        Save Configuration
                    </Button>
                </div>
            </div>
        </div>
    );
}
