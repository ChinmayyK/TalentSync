"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Settings2, ExternalLink, Trash2, Wifi, Loader2 } from "lucide-react";
import { client } from "@/lib/api/client";

// Provider configurations
const PROVIDERS = [
    {
        id: "INDEED",
        name: "Indeed",
        icon: "📋",
        color: "bg-blue-500",
        description: "Post jobs to Indeed job board",
        fields: [
            { key: "apiKey", label: "API Key", type: "password", required: true },
            { key: "employerId", label: "Employer ID", type: "text", required: true },
        ],
    },
    {
        id: "LINKEDIN",
        name: "LinkedIn",
        icon: "💼",
        color: "bg-blue-700",
        description: "Post jobs to LinkedIn Jobs",
        fields: [
            { key: "clientId", label: "Client ID", type: "text", required: true },
            { key: "clientSecret", label: "Client Secret", type: "password", required: true },
            { key: "accessToken", label: "Access Token", type: "password", required: true },
            { key: "employerId", label: "Company URN", type: "text", required: true },
        ],
    },
    {
        id: "GLASSDOOR",
        name: "Glassdoor",
        icon: "🚪",
        color: "bg-green-600",
        description: "Post jobs to Glassdoor",
        fields: [
            { key: "apiKey", label: "Partner API Key", type: "password", required: true },
            { key: "employerId", label: "Employer ID", type: "text", required: true },
        ],
    },
    {
        id: "ZIPRECRUITER",
        name: "ZipRecruiter",
        icon: "⚡",
        color: "bg-orange-500",
        description: "Post jobs to ZipRecruiter",
        fields: [
            { key: "apiKey", label: "API Key", type: "password", required: true },
            { key: "employerId", label: "Employer ID", type: "text", required: true },
        ],
    },
];

interface ProviderStatus {
    provider: string;
    name: string;
    configured: boolean;
}

export default function JobBoardsTab() {
    const [providers, setProviders] = useState<ProviderStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [configureOpen, setConfigureOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [testingProvider, setTestingProvider] = useState<string | null>(null);

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        setLoading(true);
        try {
            const response = await client.get<ProviderStatus[]>("/api/v1/job-boards/providers");
            setProviders(response as ProviderStatus[]);
        } catch (error) {
            console.error("Failed to load providers:", error);
            // Fallback to default unconfigured state
            setProviders(PROVIDERS.map(p => ({ provider: p.id, name: p.name, configured: false })));
        }
        setLoading(false);
    };

    const openConfigureDialog = (providerId: string) => {
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (provider) {
            setSelectedProvider(provider);
            setCredentials({});
            setConfigureOpen(true);
        }
    };

    const handleSaveCredentials = async () => {
        if (!selectedProvider) return;

        setSaving(true);
        try {
            await client.post("/api/v1/job-boards/credentials", {
                provider: selectedProvider.id,
                ...credentials,
            });
            toast.success(`${selectedProvider.name} credentials saved successfully`);
            setConfigureOpen(false);
            loadProviders();
        } catch (error: any) {
            toast.error(error.message || "Failed to save credentials");
        }
        setSaving(false);
    };

    const handleDeleteCredentials = async (providerId: string) => {
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;

        try {
            await client.delete(`/api/v1/job-boards/credentials/${providerId}`);
            toast.success(`${provider.name} credentials removed`);
            loadProviders();
        } catch (error: any) {
            toast.error(error.message || "Failed to remove credentials");
        }
    };

    const handleTestConnection = async (providerId: string) => {
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (!provider) return;

        setTestingProvider(providerId);
        try {
            const response = await client.post<{ success: boolean; message: string }>(
                `/api/v1/job-boards/test-connection/${providerId}`
            );
            const result = response as { success: boolean; message: string };
            if (result.success) {
                toast.success(result.message || `${provider.name} connected successfully`);
            } else {
                toast.error(result.message || `${provider.name} connection failed`);
            }
        } catch (error: any) {
            toast.error(error.message || "Connection test failed");
        }
        setTestingProvider(null);
    };

    const getProviderConfig = (id: string) => PROVIDERS.find(p => p.id === id);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold text-foreground">Job Board Integrations</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure API credentials for external job boards to post your job openings.
                </p>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((status) => {
                    const config = getProviderConfig(status.provider);
                    if (!config) return null;

                    return (
                        <Card key={status.provider} className="relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${config.color}`} />
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{config.icon}</span>
                                        <div>
                                            <CardTitle className="text-base">{config.name}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {config.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant={status.configured ? "default" : "secondary"}>
                                        {status.configured ? (
                                            <><Check className="w-3 h-3 mr-1" /> Connected</>
                                        ) : (
                                            <><X className="w-3 h-3 mr-1" /> Not Configured</>
                                        )}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openConfigureDialog(status.provider)}
                                    >
                                        <Settings2 className="w-4 h-4 mr-1" />
                                        {status.configured ? "Update" : "Configure"}
                                    </Button>
                                    {status.configured && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTestConnection(status.provider)}
                                                disabled={testingProvider === status.provider}
                                            >
                                                {testingProvider === status.provider ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Wifi className="w-4 h-4 mr-1" />
                                                )}
                                                Test
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteCredentials(status.provider)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Configure Dialog */}
            <Dialog open={configureOpen} onOpenChange={setConfigureOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedProvider?.icon} Configure {selectedProvider?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Enter your API credentials to connect to {selectedProvider?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {selectedProvider?.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={field.key}>
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                <Input
                                    id={field.key}
                                    type={field.type}
                                    placeholder={`Enter ${field.label.toLowerCase()}`}
                                    value={credentials[field.key] || ""}
                                    onChange={(e) =>
                                        setCredentials({ ...credentials, [field.key]: e.target.value })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setConfigureOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCredentials} disabled={saving}>
                            {saving ? "Saving..." : "Save Credentials"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Help Section */}
            <div className="bg-muted/50 rounded-lg p-4 mt-6">
                <h3 className="text-sm font-medium text-foreground mb-2">Need help getting API credentials?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <a
                        href="https://developer.indeed.com/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Indeed Developer Portal
                    </a>
                    <a
                        href="https://learn.microsoft.com/en-us/linkedin/talent"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> LinkedIn Talent Solutions
                    </a>
                    <a
                        href="https://www.glassdoor.com/partner"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Glassdoor Partner Program
                    </a>
                    <a
                        href="https://www.ziprecruiter.com/employers/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> ZipRecruiter API
                    </a>
                </div>
            </div>
        </div>
    );
}
