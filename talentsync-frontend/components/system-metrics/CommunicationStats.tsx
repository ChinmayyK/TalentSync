"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from "recharts";
import { Mail, MessageSquare, Phone, CheckCircle, XCircle } from "lucide-react";
import type { CommunicationMetrics } from "@/types/system-metrics";

interface CommunicationStatsProps {
    data?: CommunicationMetrics;
    isLoading?: boolean;
}

const CHANNEL_COLORS = {
    email: "#3b82f6",
    whatsapp: "#22c55e",
    sms: "#a855f7",
};

const CHANNEL_ICONS = {
    email: Mail,
    whatsapp: MessageSquare,
    sms: Phone,
};

export function CommunicationStats({ data, isLoading }: CommunicationStatsProps) {
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-32" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[200px] w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const pieData = data ? [
        { name: "Email", value: data.channelBreakdown.email, color: CHANNEL_COLORS.email },
        { name: "WhatsApp", value: data.channelBreakdown.whatsapp, color: CHANNEL_COLORS.whatsapp },
        { name: "SMS", value: data.channelBreakdown.sms, color: CHANNEL_COLORS.sms },
    ].filter(d => d.value > 0) : [];

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Messages Today
                        </CardTitle>
                        <Mail className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.messagesToday ?? 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Success Rate
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {data?.successRate?.toFixed(1) ?? 0}%
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Failed Messages
                        </CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(data?.failedCount ?? 0) > 0 ? "text-red-600" : ""}`}>
                            {data?.failedCount ?? 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Channel Breakdown Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Channel Breakdown</CardTitle>
                        <CardDescription>Messages by channel today</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "hsl(var(--popover))",
                                                border: "1px solid hsl(var(--border))",
                                                borderRadius: "8px",
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No message data available
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Templates */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Templates</CardTitle>
                        <CardDescription>Most used templates (30 days)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.topTemplates && data.topTemplates.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Template</TableHead>
                                        <TableHead className="text-right">Usage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.topTemplates.map((template, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">
                                                {template.templateName}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="secondary">
                                                    {template.usageCount}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No template usage data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Failures */}
            {data?.recentFailures && data.recentFailures.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600">Recent Failures</CardTitle>
                        <CardDescription>Last 10 failed messages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Channel</TableHead>
                                    <TableHead>Recipient</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Failed At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recentFailures.map((failure) => {
                                    const ChannelIcon = CHANNEL_ICONS[failure.channel.toLowerCase() as keyof typeof CHANNEL_ICONS] || Mail;
                                    return (
                                        <TableRow key={failure.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <ChannelIcon className="h-4 w-4" />
                                                    {failure.channel}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {failure.recipientEmail || failure.recipientPhone || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="destructive">{failure.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {failure.failedAt
                                                    ? new Date(failure.failedAt).toLocaleString()
                                                    : "-"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
