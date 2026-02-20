"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Building2, Users, Calendar, Mail, HardDrive } from "lucide-react";
import type { TenantUsageMetrics } from "@/types/system-metrics";

interface TenantUsageTableProps {
    data?: TenantUsageMetrics[];
    isLoading?: boolean;
}

type SortField = "tenantName" | "candidates" | "interviews" | "messageVolume30d" | "storageUsedMb";

export function TenantUsageTable({ data, isLoading }: TenantUsageTableProps) {
    const [sortField, setSortField] = useState<SortField>("candidates");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    const sortedData = data ? [...data].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
            return sortDirection === "asc"
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        return sortDirection === "asc"
            ? (aValue as number) - (bValue as number)
            : (bValue as number) - (aValue as number);
    }) : [];

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tenant Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tenant Usage</CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No tenant data available
                </CardContent>
            </Card>
        );
    }

    const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <Button
            variant="ghost"
            onClick={() => handleSort(field)}
            className="h-auto p-0 font-medium hover:bg-transparent"
        >
            {children}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    );

    // Calculate totals
    const totals = sortedData.reduce(
        (acc, tenant) => ({
            candidates: acc.candidates + tenant.candidates,
            interviews: acc.interviews + tenant.interviews,
            messageVolume30d: acc.messageVolume30d + tenant.messageVolume30d,
            storageUsedMb: acc.storageUsedMb + tenant.storageUsedMb,
        }),
        { candidates: 0, interviews: 0, messageVolume30d: 0, storageUsedMb: 0 }
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Tenant Usage
                </CardTitle>
                <CardDescription>
                    Resource consumption per tenant
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <SortableHeader field="tenantName">Tenant</SortableHeader>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortableHeader field="candidates">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        Candidates
                                    </span>
                                </SortableHeader>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortableHeader field="interviews">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        Interviews
                                    </span>
                                </SortableHeader>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortableHeader field="messageVolume30d">
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-4 w-4" />
                                        Messages (30d)
                                    </span>
                                </SortableHeader>
                            </TableHead>
                            <TableHead className="text-right">
                                <SortableHeader field="storageUsedMb">
                                    <span className="flex items-center gap-1">
                                        <HardDrive className="h-4 w-4" />
                                        Storage
                                    </span>
                                </SortableHeader>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.map((tenant) => (
                            <TableRow key={tenant.tenantId}>
                                <TableCell className="font-medium">
                                    {tenant.tenantName}
                                </TableCell>
                                <TableCell className="text-right">
                                    {tenant.candidates.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    {tenant.interviews.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    {tenant.messageVolume30d.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    {tenant.storageUsedMb.toFixed(2)} MB
                                </TableCell>
                            </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>Total ({sortedData.length} tenants)</TableCell>
                            <TableCell className="text-right">
                                {totals.candidates.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                {totals.interviews.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                {totals.messageVolume30d.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                {totals.storageUsedMb.toFixed(2)} MB
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
