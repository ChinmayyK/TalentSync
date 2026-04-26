"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";
import {
    Mail,
    RefreshCw,
    Check,
    X,
    UserPlus,
    FileText,
    Clock,
    AlertCircle,
    ChevronRight,
    Inbox,
    Loader2,
    Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
    useResumeInboxes,
    useInboxEmails,
    useProcessEmail,
    useSkipEmail,
    useCreateCandidateFromEmail,
    usePollInbox,
    InboxEmail,
} from "@/lib/hooks/useResumeInbox";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    PENDING: { label: "Pending", variant: "outline", icon: <Clock className="h-3 w-3" /> },
    PROCESSING: { label: "Processing", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    PARSED: { label: "Parsed", variant: "default", icon: <FileText className="h-3 w-3" /> },
    CANDIDATE_CREATED: { label: "Created", variant: "default", icon: <Check className="h-3 w-3" /> },
    SKIPPED: { label: "Skipped", variant: "secondary", icon: <X className="h-3 w-3" /> },
    FAILED: { label: "Failed", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
    NO_RESUME: { label: "No Resume", variant: "outline", icon: <Mail className="h-3 w-3" /> },
};

export default function ResumeInboxPage() {
    const [selectedInboxId, setSelectedInboxId] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const { data: inboxes, isLoading: inboxesLoading } = useResumeInboxes();
    const { data: emailsData, isLoading: emailsLoading, refetch } = useInboxEmails({
        inboxId: selectedInboxId !== "all" ? selectedInboxId : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        perPage: 50,
    });

    const processEmail = useProcessEmail();
    const skipEmail = useSkipEmail();
    const createCandidate = useCreateCandidateFromEmail();
    const pollInbox = usePollInbox();

    const emails = emailsData?.data || [];

    const handleProcess = async (email: InboxEmail) => {
        try {
            await processEmail.mutateAsync(email.id);
            toast.success("Email processed successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to process email");
        }
    };

    const handleSkip = async (email: InboxEmail) => {
        try {
            await skipEmail.mutateAsync(email.id);
            toast.success("Email skipped");
        } catch (error: any) {
            toast.error(error.message || "Failed to skip email");
        }
    };

    const handleCreateCandidate = async (email: InboxEmail) => {
        try {
            const result = await createCandidate.mutateAsync(email.id);
            toast.success("Candidate created successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to create candidate");
        }
    };

    const handlePoll = async () => {
        if (selectedInboxId === "all") {
            // Poll all inboxes
            for (const inbox of inboxes || []) {
                try {
                    await pollInbox.mutateAsync(inbox.id);
                } catch (e) {
                    // Continue with others
                }
            }
            toast.success("All inboxes polled");
        } else {
            try {
                const result = await pollInbox.mutateAsync(selectedInboxId);
                toast.success(`Found ${result.emailsFound} emails`);
            } catch (error: any) {
                toast.error(error.message || "Failed to poll inbox");
            }
        }
        refetch();
    };

    const openDetail = (email: InboxEmail) => {
        setSelectedEmail(email);
        setDetailOpen(true);
    };

    if (inboxesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <motion.div
                initial="initial"
                animate="animate"
                variants={staggerContainer}
                className="space-y-6"
            >
                {/* Header */}
                <motion.div variants={fadeInUp} className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Resume Inbox</h1>
                        <p className="text-muted-foreground mt-1">
                            Process incoming emails with resume attachments
                        </p>
                    </div>
                    <Button onClick={handlePoll} disabled={pollInbox.isPending}>
                        {pollInbox.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Check for New Emails
                    </Button>
                </motion.div>

                {/* Filters */}
                <motion.div variants={staggerItem} className="flex gap-4 flex-wrap">
                    <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Inbox" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Inboxes</SelectItem>
                            {(inboxes || []).map((inbox) => (
                                <SelectItem key={inbox.id} value={inbox.id}>
                                    {inbox.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PARSED">Parsed</SelectItem>
                            <SelectItem value="CANDIDATE_CREATED">Created</SelectItem>
                            <SelectItem value="SKIPPED">Skipped</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                            <SelectItem value="NO_RESUME">No Resume</SelectItem>
                        </SelectContent>
                    </Select>

                    {emailsData?.meta && (
                        <div className="flex items-center text-sm text-muted-foreground ml-auto">
                            Showing {emails.length} of {emailsData.meta.total} emails
                        </div>
                    )}
                </motion.div>

                {/* Email Table */}
                <motion.div variants={staggerItem}>
                    {emails.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No emails found</p>
                                <Button variant="outline" onClick={handlePoll} className="mt-4">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Check for New Emails
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>From</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Attachment</TableHead>
                                        <TableHead>Received</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {emails.map((email) => {
                                        const status = STATUS_BADGES[email.status] || STATUS_BADGES.PENDING;
                                        return (
                                            <TableRow key={email.id}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{email.fromName || email.fromAddress}</div>
                                                        {email.fromName && (
                                                            <div className="text-xs text-muted-foreground">{email.fromAddress}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-[300px] truncate">{email.subject}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {email.attachmentFilename ? (
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                            <span className="truncate max-w-[150px]">{email.attachmentFilename}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">None</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={status.variant} className="gap-1">
                                                        {status.icon}
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openDetail(email)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        {email.status === "PENDING" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleProcess(email)}
                                                                    disabled={processEmail.isPending}
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleSkip(email)}
                                                                    disabled={skipEmail.isPending}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}

                                                        {email.status === "PARSED" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleCreateCandidate(email)}
                                                                disabled={createCandidate.isPending}
                                                            >
                                                                <UserPlus className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </motion.div>

                {/* Email Detail Dialog */}
                <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Email Details</DialogTitle>
                            <DialogDescription>
                                {selectedEmail?.subject}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedEmail && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="font-medium">From</label>
                                        <p className="text-muted-foreground">
                                            {selectedEmail.fromName || selectedEmail.fromAddress}
                                            {selectedEmail.fromName && (
                                                <span className="block text-xs">{selectedEmail.fromAddress}</span>
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="font-medium">Received</label>
                                        <p className="text-muted-foreground">
                                            {new Date(selectedEmail.receivedAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="font-medium">Attachment</label>
                                        <p className="text-muted-foreground">
                                            {selectedEmail.attachmentFilename || "None"}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="font-medium">Status</label>
                                        <div className="mt-1">
                                            <Badge variant={STATUS_BADGES[selectedEmail.status]?.variant || "outline"}>
                                                {STATUS_BADGES[selectedEmail.status]?.label || selectedEmail.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {selectedEmail.bodyPreview && (
                                    <div>
                                        <label className="font-medium text-sm">Email Preview</label>
                                        <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {selectedEmail.bodyPreview}
                                        </div>
                                    </div>
                                )}

                                {selectedEmail.parsedData && (
                                    <div>
                                        <label className="font-medium text-sm">Parsed Data</label>
                                        <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                                            <pre className="whitespace-pre-wrap text-xs">
                                                {JSON.stringify(selectedEmail.parsedData, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {selectedEmail.errorMessage && (
                                    <div className="p-3 bg-destructive/10 rounded-lg">
                                        <label className="font-medium text-sm text-destructive">Error</label>
                                        <p className="text-sm text-destructive mt-1">{selectedEmail.errorMessage}</p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    {selectedEmail.status === "PENDING" && (
                                        <>
                                            <Button
                                                variant="outline"
                                                onClick={() => handleSkip(selectedEmail)}
                                                disabled={skipEmail.isPending}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Skip
                                            </Button>
                                            <Button
                                                onClick={() => handleProcess(selectedEmail)}
                                                disabled={processEmail.isPending}
                                            >
                                                <FileText className="h-4 w-4 mr-2" />
                                                Parse Resume
                                            </Button>
                                        </>
                                    )}

                                    {selectedEmail.status === "PARSED" && (
                                        <Button
                                            onClick={() => handleCreateCandidate(selectedEmail)}
                                            disabled={createCandidate.isPending}
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Create Candidate
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        </div>
    );
}
