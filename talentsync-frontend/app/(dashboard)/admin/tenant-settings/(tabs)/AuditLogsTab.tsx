"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import { tenantApi, AuditLog } from "@/lib/api/tenant";

export default function AuditLogsTab() {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditSearch, setAuditSearch] = useState("");
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const loadAuditLogs = async () => {
        setLoading(true);
        const data = await tenantApi.getAuditLogs();
        setAuditLogs(data);
        setLoading(false);
    };

    const handleExportAuditLogs = async () => {
        setExporting(true);
        await tenantApi.exportAuditLogsCSV();
        setExporting(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-96 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-4 flex justify-between items-center gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={handleExportAuditLogs}
                    disabled={exporting}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {auditLogs.length === 0 ? (
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-12 text-center">
                    <p className="text-muted-foreground">No audit logs</p>
                </div>
            ) : (
                <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] overflow-hidden">
                    <Table>
                        <TableHeader className="bg-[#F7F9FC] border-b border-[#E5E7EB]">
                            <TableRow>
                                <TableHead className="font-semibold">Timestamp</TableHead>
                                <TableHead className="font-semibold">User</TableHead>
                                <TableHead className="font-semibold">Action</TableHead>
                                <TableHead className="font-semibold">IP Address</TableHead>
                                <TableHead className="font-semibold">Severity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs.map((log) => (
                                <TableRow
                                    key={log.id}
                                    className="border-b border-[#E5E7EB] hover:bg-[#F7F9FC]"
                                >
                                    <TableCell className="text-sm">
                                        {formatDate(log.timestamp)}
                                    </TableCell>
                                    <TableCell className="text-sm">{log.user}</TableCell>
                                    <TableCell className="text-sm">{log.action}</TableCell>
                                    <TableCell className="text-sm font-mono">
                                        {log.ipAddress}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={
                                                log.severity === "info"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : log.severity === "warning"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-red-100 text-red-800"
                                            }
                                        >
                                            {log.severity.charAt(0).toUpperCase() +
                                                log.severity.slice(1)}
                                        </Badge>
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
