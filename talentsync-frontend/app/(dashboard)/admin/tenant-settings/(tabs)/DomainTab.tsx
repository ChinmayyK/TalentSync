"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Clock, Copy } from "lucide-react";
import { toast } from "sonner";
import { DomainSettings, tenantApi } from "@/lib/api/tenant";

export default function DomainTab() {
    const [domain, setDomain] = useState<DomainSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifyDomainOpen, setVerifyDomainOpen] = useState(false);
    const [verifyDomainValue, setVerifyDomainValue] = useState("");
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        loadDomainSettings();
    }, []);

    const loadDomainSettings = async () => {
        setLoading(true);
        const data = await tenantApi.getDomainSettings();
        setDomain(data);
        setLoading(false);
    };

    const handleVerifyDomain = async () => {
        setVerifying(true);
        await tenantApi.verifyDomain(verifyDomainValue);
        setVerifyDomainOpen(false);
        setVerifyDomainValue("");
        await loadDomainSettings();
        setVerifying(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!domain) return null;

    return (
        <div className="space-y-6">
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                    Domain Configuration
                </h3>
                <div className="space-y-6">
                    <div>
                        <Label>Subdomain</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-muted-foreground">https://</span>
                            <Input
                                value={domain.subdomain}
                                readOnly
                                className="flex-1"
                            />
                            <span className="text-muted-foreground">.app.com</span>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <Label>Custom Domain</Label>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={domain.customDomain}
                                    readOnly
                                    className="flex-1"
                                />
                                <Badge
                                    className={
                                        domain.customDomainVerified
                                            ? "bg-green-100 text-green-800"
                                            : "bg-yellow-100 text-yellow-800"
                                    }
                                >
                                    {domain.customDomainVerified ? (
                                        <Check className="w-3 h-3 mr-1" />
                                    ) : (
                                        <Clock className="w-3 h-3 mr-1" />
                                    )}
                                    {domain.customDomainVerified
                                        ? "Verified"
                                        : "Pending"}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                SSL Status:{" "}
                                {domain.customDomainSSLStatus === "verified" && (
                                    <span className="text-green-600">✓ Verified</span>
                                )}
                                {domain.customDomainSSLStatus === "pending" && (
                                    <span className="text-yellow-600">⏳ Pending</span>
                                )}
                                {domain.customDomainSSLStatus === "error" && (
                                    <span className="text-red-600">✗ Error</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <Label>Webhook Callback URL</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                value={domain.webhookCallbackURL}
                                readOnly
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(
                                        domain.webhookCallbackURL,
                                    );
                                    toast.success("Copied to clipboard");
                                }}
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <Dialog
                        open={verifyDomainOpen}
                        onOpenChange={setVerifyDomainOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={domain.customDomainVerified}
                            >
                                {domain.customDomainVerified
                                    ? "Domain Verified"
                                    : "Verify Domain"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Verify Domain</DialogTitle>
                                <DialogDescription>
                                    Add the following TXT record to your domain's DNS
                                    configuration to verify ownership.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="bg-gray-100 p-4 rounded text-sm font-mono">
                                    <p>Type: TXT</p>
                                    <p>Name: _acme-challenge.{domain.customDomain}</p>
                                    <p>
                                        Value: {Math.random().toString(36).substr(2, 32)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setVerifyDomainOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleVerifyDomain}
                                    disabled={verifying}
                                    className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
                                >
                                    Verify
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}
