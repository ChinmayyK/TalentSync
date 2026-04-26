"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Plus } from "lucide-react";
import { tenantApi, SecuritySettings } from "@/lib/api/tenant";

export default function SecurityTab() {
    const [security, setSecurity] = useState<SecuritySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [ipAllowlistOpen, setIPAllowlistOpen] = useState(false);
    const [newIP, setNewIP] = useState("");
    const [newIPDesc, setNewIPDesc] = useState("");
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadSecuritySettings();
    }, []);

    const loadSecuritySettings = async () => {
        setLoading(true);
        const data = await tenantApi.getSecuritySettings();
        setSecurity(data);
        setLoading(false);
    };

    const handleAddIPToAllowlist = async () => {
        setProcessing(true);
        const newEntry = await tenantApi.addIPToAllowlist(newIP, newIPDesc);
        if (security) {
            setSecurity({
                ...security,
                ipAllowlist: [...security.ipAllowlist, newEntry],
            });
        }
        setIPAllowlistOpen(false);
        setNewIP("");
        setNewIPDesc("");
        setProcessing(false);
    };

    const handleRemoveIP = async (id: string) => {
        setProcessing(true);
        await tenantApi.removeIPFromAllowlist(id);
        if (security) {
            setSecurity({
                ...security,
                ipAllowlist: security.ipAllowlist.filter((ip) => ip.id !== id),
            });
        }
        setProcessing(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!security) return null;

    return (
        <div className="space-y-6">
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                    Access Control
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded">
                        <div>
                            <Label className="text-base">Two-Factor Authentication</Label>
                            <p className="text-sm text-muted-foreground">
                                Require 2FA for all user accounts
                            </p>
                        </div>
                        <Checkbox
                            checked={security.enable2FA}
                            onCheckedChange={(checked) =>
                                setSecurity({
                                    ...security,
                                    enable2FA: checked as boolean,
                                })
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#F7F9FC] rounded">
                        <div>
                            <Label className="text-base">Session Timeout</Label>
                            <p className="text-sm text-muted-foreground">
                                Auto-logout inactive users
                            </p>
                        </div>
                        <Select
                            value={security.sessionTimeout}
                            onValueChange={(val: any) =>
                                setSecurity({ ...security, sessionTimeout: val })
                            }
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="15m">15 Minutes</SelectItem>
                                <SelectItem value="30m">30 Minutes</SelectItem>
                                <SelectItem value="1h">1 Hour</SelectItem>
                                <SelectItem value="4h">4 Hours</SelectItem>
                                <SelectItem value="24h">24 Hours</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        IP Allowlist
                    </h3>
                    <Dialog
                        open={ipAllowlistOpen}
                        onOpenChange={setIPAllowlistOpen}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add IP
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add IP Address</DialogTitle>
                                <DialogDescription>
                                    Allow access from this IP address or range (CIDR).
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>IP Address / CIDR</Label>
                                    <Input
                                        placeholder="e.g. 192.168.1.1 or 10.0.0.0/24"
                                        value={newIP}
                                        onChange={(e) => setNewIP(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        placeholder="e.g. HQ Office"
                                        value={newIPDesc}
                                        onChange={(e) => setNewIPDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setIPAllowlistOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleAddIPToAllowlist} disabled={processing}>
                                    Add
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-md border border-[#E5E7EB]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Added</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {security.ipAllowlist.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center text-muted-foreground py-6"
                                    >
                                        No IP restrictions configured
                                    </TableCell>
                                </TableRow>
                            ) : (
                                security.ipAllowlist.map((ip) => (
                                    <TableRow key={ip.id}>
                                        <TableCell className="font-mono">{ip.ip}</TableCell>
                                        <TableCell>{ip.description}</TableCell>
                                        <TableCell>
                                            {new Date(ip.addedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveIP(ip.id)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
