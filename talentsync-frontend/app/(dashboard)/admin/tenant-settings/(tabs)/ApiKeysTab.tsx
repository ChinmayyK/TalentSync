"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, MoreHorizontal, Key } from "lucide-react";
import { toast } from "sonner";
import { tenantApi, APIKey } from "@/lib/api/tenant";

export default function ApiKeysTab() {
    const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [createKeyOpen, setCreateKeyOpen] = useState(false);
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [newKeyScopes, setNewKeyScopes] = useState<
        ("read" | "write" | "admin")[]
    >(["read"]);
    const [newKeyExpiry, setNewKeyExpiry] = useState<
        "30d" | "90d" | "1yr" | "never"
    >("never");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadAPIKeys();
    }, []);

    const loadAPIKeys = async () => {
        setLoading(true);
        const data = await tenantApi.getAPIKeys();
        setAPIKeys(data);
        setLoading(false);
    };

    const handleCreateAPIKey = async () => {
        setProcessing(true);
        await tenantApi.createAPIKey(newKeyLabel, newKeyScopes, newKeyExpiry);
        await loadAPIKeys();
        setCreateKeyOpen(false);
        setNewKeyLabel("");
        setNewKeyScopes(["read"]);
        setNewKeyExpiry("never");
        setProcessing(false);
    };

    const handleRevokeAPIKey = async (id: string) => {
        setProcessing(true);
        await tenantApi.revokeAPIKey(id);
        await loadAPIKeys();
        setProcessing(false);
    };

    const toggleScope = (scope: "read" | "write" | "admin") => {
        if (newKeyScopes.includes(scope)) {
            setNewKeyScopes(newKeyScopes.filter((s) => s !== scope));
        } else {
            setNewKeyScopes([...newKeyScopes, scope]);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create API Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                            <DialogDescription>
                                Generate a new API key for external integrations.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Label</Label>
                                <Input
                                    placeholder="e.g. Production Server"
                                    value={newKeyLabel}
                                    onChange={(e) => setNewKeyLabel(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Scopes</Label>
                                <div className="flex gap-4">
                                    {(["read", "write", "admin"] as const).map(
                                        (scope) => (
                                            <div
                                                key={scope}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={`scope-${scope}`}
                                                    checked={newKeyScopes.includes(scope)}
                                                    onCheckedChange={() => toggleScope(scope)}
                                                />
                                                <Label
                                                    htmlFor={`scope-${scope}`}
                                                    className="capitalize"
                                                >
                                                    {scope}
                                                </Label>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Expiration</Label>
                                <Select
                                    value={newKeyExpiry}
                                    onValueChange={(val: any) => setNewKeyExpiry(val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="30d">30 Days</SelectItem>
                                        <SelectItem value="90d">90 Days</SelectItem>
                                        <SelectItem value="1yr">1 Year</SelectItem>
                                        <SelectItem value="never">Never</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setCreateKeyOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateAPIKey}
                                disabled={processing}
                            >
                                Create Key
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {apiKeys.length === 0 ? (
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-12 text-center">
                    <Key className="w-12 h-12 mx-auto text-muted-foreground opacity-40 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">
                        No API Keys
                    </h3>
                    <p className="text-muted-foreground mt-1">
                        Create an API key to get started with integrations.
                    </p>
                </div>
            ) : (
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#F7F9FC] border-b border-[#E5E7EB]">
                            <TableRow>
                                <TableHead className="font-semibold">Label</TableHead>
                                <TableHead className="font-semibold">Key Preview</TableHead>
                                <TableHead className="font-semibold">Scopes</TableHead>
                                <TableHead className="font-semibold">Last Used</TableHead>
                                <TableHead className="font-semibold">Expires</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {apiKeys.map((key) => (
                                <TableRow
                                    key={key.id}
                                    className="border-b border-[#E5E7EB] hover:bg-[#F7F9FC]"
                                >
                                    <TableCell className="font-medium">
                                        {key.label}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                {key.key}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(key.key);
                                                    toast.success("Copied to clipboard");
                                                }}
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                            {key.scopes.map((scope) => (
                                                <Badge key={scope} variant="secondary">
                                                    {scope}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {key.lastUsedAt
                                            ? formatDate(key.lastUsedAt)
                                            : "Never"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {key.expiresAt
                                            ? formatDate(key.expiresAt)
                                            : "Never"}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Regenerate</DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleRevokeAPIKey(key.id)}
                                                    className="text-destructive"
                                                >
                                                    Revoke
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
