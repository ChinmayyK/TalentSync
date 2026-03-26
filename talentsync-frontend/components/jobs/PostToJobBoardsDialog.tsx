"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { client } from "@/lib/api/client";

// Provider configurations
const PROVIDERS = [
    { id: "INDEED", name: "Indeed", icon: "📋", color: "text-blue-600" },
    { id: "LINKEDIN", name: "LinkedIn", icon: "💼", color: "text-blue-700" },
    { id: "GLASSDOOR", name: "Glassdoor", icon: "🚪", color: "text-green-600" },
    { id: "ZIPRECRUITER", name: "ZipRecruiter", icon: "⚡", color: "text-orange-500" },
];

interface ProviderStatus {
    provider: string;
    name: string;
    configured: boolean;
}

interface PostingResult {
    provider: string;
    success: boolean;
    postingId?: string;
    externalId?: string;
    externalUrl?: string;
    error?: string;
}

interface BatchPostResponse {
    total: number;
    successful: number;
    failed: number;
    results: PostingResult[];
}

interface PostToJobBoardsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    job: {
        id: string;
        title: string;
        description?: string;
    };
    onSuccess?: () => void;
}

export function PostToJobBoardsDialog({
    open,
    onOpenChange,
    job,
    onSuccess,
}: PostToJobBoardsDialogProps) {
    const [providers, setProviders] = useState<ProviderStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
    const [customTitle, setCustomTitle] = useState(job.title);
    const [posting, setPosting] = useState(false);
    const [results, setResults] = useState<PostingResult[] | null>(null);

    useEffect(() => {
        if (open) {
            loadProviders();
            setCustomTitle(job.title);
            setResults(null);
            setSelectedProviders(new Set());
        }
    }, [open, job.title]);

    const loadProviders = async () => {
        setLoading(true);
        try {
            const response = await client.get<ProviderStatus[]>("/api/v1/job-boards/providers");
            const data = response as ProviderStatus[];
            setProviders(data);

            // Auto-select configured providers
            const configured = new Set(
                data.filter(p => p.configured).map(p => p.provider)
            );
            setSelectedProviders(configured);
        } catch (error) {
            console.error("Failed to load providers:", error);
            setProviders([]);
        }
        setLoading(false);
    };

    const toggleProvider = (providerId: string) => {
        const newSet = new Set(selectedProviders);
        if (newSet.has(providerId)) {
            newSet.delete(providerId);
        } else {
            newSet.add(providerId);
        }
        setSelectedProviders(newSet);
    };

    const handlePost = async () => {
        if (selectedProviders.size === 0) {
            toast.error("Please select at least one job board");
            return;
        }

        setPosting(true);
        try {
            const response = await client.post<BatchPostResponse>("/api/v1/job-boards/batch-post", {
                jobId: job.id,
                providers: Array.from(selectedProviders),
                customTitle: customTitle !== job.title ? customTitle : undefined,
            });

            const result = response as BatchPostResponse;
            setResults(result.results);

            if (result.successful > 0) {
                toast.success(`Posted to ${result.successful} of ${result.total} job boards`);
            }
            if (result.failed > 0) {
                toast.error(`Failed to post to ${result.failed} job boards`);
            }

            if (result.failed === 0) {
                onSuccess?.();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to post to job boards");
        }
        setPosting(false);
    };

    const configuredProviders = providers.filter(p => p.configured);
    const unconfiguredProviders = providers.filter(p => !p.configured);

    const getProviderConfig = (id: string) => PROVIDERS.find(p => p.id === id);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Post to Job Boards
                    </DialogTitle>
                    <DialogDescription>
                        Select job boards to post "{job.title}" to external platforms.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : results ? (
                    // Results view
                    <div className="space-y-4 py-4">
                        <h4 className="font-medium">Posting Results</h4>
                        <div className="space-y-2">
                            {results.map((result) => {
                                const config = getProviderConfig(result.provider);
                                return (
                                    <div
                                        key={result.provider}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${result.success
                                                ? "bg-green-50 border-green-200"
                                                : "bg-red-50 border-red-200"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>{config?.icon}</span>
                                            <span className="font-medium">{config?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {result.success ? (
                                                <>
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    {result.externalUrl && (
                                                        <a
                                                            href={result.externalUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            View
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <X className="w-4 h-4 text-red-600" />
                                                    <span className="text-xs text-red-600">
                                                        {result.error || "Failed"}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}>Done</Button>
                        </DialogFooter>
                    </div>
                ) : (
                    // Selection view
                    <>
                        <div className="space-y-4 py-4">
                            {/* Custom Title */}
                            <div className="space-y-2">
                                <Label htmlFor="customTitle">Job Title</Label>
                                <Input
                                    id="customTitle"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    placeholder="Job title for external posting"
                                />
                            </div>

                            {/* Configured Providers */}
                            {configuredProviders.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Select Job Boards</Label>
                                    <div className="grid gap-2">
                                        {configuredProviders.map((provider) => {
                                            const config = getProviderConfig(provider.provider);
                                            return (
                                                <div
                                                    key={provider.provider}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedProviders.has(provider.provider)
                                                            ? "bg-primary/10 border-primary/50"
                                                            : "bg-muted/30 border-border hover:bg-muted/50"
                                                        }`}
                                                    onClick={() => toggleProvider(provider.provider)}
                                                >
                                                    <Checkbox
                                                        checked={selectedProviders.has(provider.provider)}
                                                        onCheckedChange={() => toggleProvider(provider.provider)}
                                                    />
                                                    <span className="text-xl">{config?.icon}</span>
                                                    <span className="font-medium">{config?.name}</span>
                                                    <Badge variant="secondary" className="ml-auto">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Ready
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Unconfigured Providers */}
                            {unconfiguredProviders.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">
                                        Not Configured
                                    </Label>
                                    <div className="grid gap-2">
                                        {unconfiguredProviders.map((provider) => {
                                            const config = getProviderConfig(provider.provider);
                                            return (
                                                <div
                                                    key={provider.provider}
                                                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/10 border-border/50 opacity-60"
                                                >
                                                    <Checkbox disabled checked={false} />
                                                    <span className="text-xl grayscale">{config?.icon}</span>
                                                    <span className="font-medium text-muted-foreground">
                                                        {config?.name}
                                                    </span>
                                                    <Badge variant="outline" className="ml-auto text-xs">
                                                        <AlertCircle className="w-3 h-3 mr-1" />
                                                        Setup Required
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Configure credentials in Admin → Tenant Settings → Job Boards
                                    </p>
                                </div>
                            )}

                            {configuredProviders.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No job boards configured</p>
                                    <p className="text-xs mt-1">
                                        Go to Admin → Tenant Settings → Job Boards to add credentials
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePost}
                                disabled={posting || selectedProviders.size === 0}
                            >
                                {posting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Post to {selectedProviders.size} Board{selectedProviders.size !== 1 ? "s" : ""}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

