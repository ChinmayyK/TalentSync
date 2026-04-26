"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    Mail,
    Plus,
    Trash2,
    Settings2,
    Wifi,
    Loader2,
    RefreshCw,
    Inbox,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { client } from "@/lib/api/client";

interface ResumeInbox {
    id: string;
    name: string;
    email: string;
    imapHost: string;
    imapPort: number;
    imapUser: string;
    useTls: boolean;
    enabled: boolean;
    pollInterval: number;
    autoProcess: boolean;
    autoCreate: boolean;
    defaultJobId?: string;
    defaultJob?: { id: string; title: string };
    lastPolledAt?: string;
    _count?: { emails: number };
}

interface Job {
    id: string;
    title: string;
}

const DEFAULT_INBOX: Partial<ResumeInbox> = {
    name: "",
    email: "",
    imapHost: "",
    imapPort: 993,
    imapUser: "",
    useTls: true,
    enabled: true,
    pollInterval: 5,
    autoProcess: false,
    autoCreate: false,
};

export default function ResumeInboxTab() {
    const [inboxes, setInboxes] = useState<ResumeInbox[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInbox, setEditingInbox] = useState<Partial<ResumeInbox> | null>(null);
    const [imapPassword, setImapPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [polling, setPolling] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [inboxesRes, jobsRes] = await Promise.all([
                client.get<ResumeInbox[]>("/api/v1/resume-inbox/inboxes"),
                client.get<Job[]>("/api/v1/jobs"),
            ]);
            setInboxes(inboxesRes as ResumeInbox[]);
            setJobs((jobsRes as any)?.data || jobsRes || []);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load resume inboxes");
        }
        setLoading(false);
    };

    const handleCreateNew = () => {
        setEditingInbox({ ...DEFAULT_INBOX });
        setImapPassword("");
        setDialogOpen(true);
    };

    const handleEdit = (inbox: ResumeInbox) => {
        setEditingInbox({ ...inbox });
        setImapPassword("");
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!editingInbox) return;

        setSaving(true);
        try {
            const payload = {
                ...editingInbox,
                ...(imapPassword ? { imapPassword } : {}),
            };

            if (editingInbox.id) {
                await client.put(`/api/v1/resume-inbox/inboxes/${editingInbox.id}`, payload);
                toast.success("Inbox updated successfully");
            } else {
                if (!imapPassword) {
                    toast.error("IMAP password is required for new inbox");
                    setSaving(false);
                    return;
                }
                await client.post("/api/v1/resume-inbox/inboxes", payload);
                toast.success("Inbox created successfully");
            }

            setDialogOpen(false);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to save inbox");
        }
        setSaving(false);
    };

    const handleDelete = async (inbox: ResumeInbox) => {
        if (!confirm(`Delete inbox "${inbox.name}"?`)) return;

        try {
            await client.delete(`/api/v1/resume-inbox/inboxes/${inbox.id}`);
            toast.success("Inbox deleted");
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete inbox");
        }
    };

    const handleTestConnection = async () => {
        if (!editingInbox) return;

        setTesting(true);
        try {
            let result;
            if (editingInbox.id && !imapPassword) {
                // Test existing inbox
                result = await client.post(`/api/v1/resume-inbox/inboxes/${editingInbox.id}/test`);
            } else {
                // Test with provided credentials
                result = await client.post("/api/v1/resume-inbox/test-connection", {
                    ...editingInbox,
                    imapPassword: imapPassword || editingInbox.id ? undefined : "",
                });
            }

            const res = result as { success: boolean; message: string };
            if (res.success) {
                toast.success(res.message || "Connection successful!");
            } else {
                toast.error(res.message || "Connection failed");
            }
        } catch (error: any) {
            toast.error(error.message || "Connection test failed");
        }
        setTesting(false);
    };

    const handlePoll = async (inbox: ResumeInbox) => {
        setPolling(inbox.id);
        try {
            const result = await client.post(`/api/v1/resume-inbox/inboxes/${inbox.id}/poll`);
            const res = result as { emailsFound: number; created: number; errors: number };
            toast.success(`Found ${res.emailsFound} emails, imported ${res.created}`);
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Polling failed");
        }
        setPolling(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Resume Inboxes</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure email inboxes to automatically capture resumes
                    </p>
                </div>
                <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Inbox
                </Button>
            </div>

            {inboxes.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">No resume inboxes configured</p>
                        <Button onClick={handleCreateNew} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Inbox
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {inboxes.map((inbox) => (
                        <Card key={inbox.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{inbox.name}</CardTitle>
                                            <CardDescription>{inbox.email}</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {inbox.enabled ? (
                                            <Badge variant="default" className="bg-green-600">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Disabled
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>
                                            {inbox._count?.emails || 0} emails
                                        </span>
                                        {inbox.lastPolledAt && (
                                            <span>
                                                Last polled: {new Date(inbox.lastPolledAt).toLocaleString()}
                                            </span>
                                        )}
                                        {inbox.autoProcess && (
                                            <Badge variant="outline">Auto-parse</Badge>
                                        )}
                                        {inbox.autoCreate && (
                                            <Badge variant="outline">Auto-create</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePoll(inbox)}
                                            disabled={polling === inbox.id || !inbox.enabled}
                                        >
                                            {polling === inbox.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(inbox)}
                                        >
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(inbox)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingInbox?.id ? "Edit" : "Create"} Resume Inbox
                        </DialogTitle>
                        <DialogDescription>
                            Configure an email inbox to capture resumes automatically
                        </DialogDescription>
                    </DialogHeader>

                    {editingInbox && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Inbox Name</Label>
                                    <Input
                                        value={editingInbox.name || ""}
                                        onChange={(e) =>
                                            setEditingInbox({ ...editingInbox, name: e.target.value })
                                        }
                                        placeholder="Careers Inbox"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        value={editingInbox.email || ""}
                                        onChange={(e) =>
                                            setEditingInbox({ ...editingInbox, email: e.target.value })
                                        }
                                        placeholder="careers@company.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>IMAP Host</Label>
                                    <Input
                                        value={editingInbox.imapHost || ""}
                                        onChange={(e) =>
                                            setEditingInbox({ ...editingInbox, imapHost: e.target.value })
                                        }
                                        placeholder="imap.gmail.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>IMAP Port</Label>
                                    <Input
                                        type="number"
                                        value={editingInbox.imapPort || 993}
                                        onChange={(e) =>
                                            setEditingInbox({
                                                ...editingInbox,
                                                imapPort: parseInt(e.target.value) || 993,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>IMAP Username</Label>
                                    <Input
                                        value={editingInbox.imapUser || ""}
                                        onChange={(e) =>
                                            setEditingInbox({ ...editingInbox, imapUser: e.target.value })
                                        }
                                        placeholder="careers@company.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>IMAP Password {editingInbox.id && "(leave blank to keep)"}</Label>
                                    <Input
                                        type="password"
                                        value={imapPassword}
                                        onChange={(e) => setImapPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingInbox.useTls}
                                        onCheckedChange={(checked) =>
                                            setEditingInbox({ ...editingInbox, useTls: checked })
                                        }
                                    />
                                    <Label>Use TLS</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={editingInbox.enabled}
                                        onCheckedChange={(checked) =>
                                            setEditingInbox({ ...editingInbox, enabled: checked })
                                        }
                                    />
                                    <Label>Enabled</Label>
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-4">
                                <h4 className="font-medium">Automation Settings</h4>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={editingInbox.autoProcess}
                                            onCheckedChange={(checked) =>
                                                setEditingInbox({ ...editingInbox, autoProcess: checked })
                                            }
                                        />
                                        <Label>Auto-parse resumes</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={editingInbox.autoCreate}
                                            onCheckedChange={(checked) =>
                                                setEditingInbox({ ...editingInbox, autoCreate: checked })
                                            }
                                        />
                                        <Label>Auto-create candidates</Label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Default Job (optional)</Label>
                                    <Select
                                        value={editingInbox.defaultJobId || "none"}
                                        onValueChange={(value) =>
                                            setEditingInbox({
                                                ...editingInbox,
                                                defaultJobId: value === "none" ? undefined : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a job" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No default job</SelectItem>
                                            {jobs.map((job) => (
                                                <SelectItem key={job.id} value={job.id}>
                                                    {job.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Poll Interval (minutes)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="60"
                                        value={editingInbox.pollInterval || 5}
                                        onChange={(e) =>
                                            setEditingInbox({
                                                ...editingInbox,
                                                pollInterval: parseInt(e.target.value) || 5,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                            {testing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Wifi className="h-4 w-4 mr-2" />
                            )}
                            Test Connection
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingInbox?.id ? "Update" : "Create"} Inbox
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
