'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    Send,
    FileText,
    Zap,
    Settings,
    Mail,
    MessageSquare,
    Smartphone,
    TrendingUp,
    Clock,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    Plus
} from 'lucide-react';
import { useStats, useChannels } from '@/lib/hooks/useCommunication';
import {
    AreaChart,
    Area,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock data for sparklines (since API only gives totals)
const generateSparklineData = (baseValue: number, trend: 'up' | 'down' | 'neutral') => {
    const data = [];
    let currentValue = baseValue * 0.7; // Start slightly lower
    for (let i = 0; i < 7; i++) {
        const volatility = baseValue * 0.1;
        const change = (Math.random() * volatility) - (volatility / 2);

        if (trend === 'up') currentValue += (volatility * 0.5);
        if (trend === 'down') currentValue -= (volatility * 0.5);

        currentValue += change;
        if (currentValue < 0) currentValue = 0;

        data.push({ value: Math.round(currentValue) });
    }
    // Ensure the last value matches roughly the functionality implies current state
    return data;
};

const quickActions = [
    { label: 'Send Message', href: '/communication/messages?action=compose', icon: Send, color: 'text-blue-500', bg: 'bg-blue-50', hover: 'hover:bg-blue-100' },
    { label: 'Create Template', href: '/communication/templates?action=new', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50', hover: 'hover:bg-purple-100' },
    { label: 'New Automation', href: '/communication/automations?action=new', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', hover: 'hover:bg-amber-100' },
    { label: 'Configure Channels', href: '/communication/channels', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-50', hover: 'hover:bg-slate-100' },
];

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
const CHANNEL_COLORS = {
    email: '#3b82f6',
    whatsapp: '#22c55e',
    sms: '#8b5cf6'
};

const channelIcons = {
    email: Mail,
    whatsapp: MessageSquare,
    sms: Smartphone,
};

export default function CommunicationOverviewPage() {
    const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useStats();
    const { data: channels, isLoading: channelsLoading } = useChannels();

    const isLoading = statsLoading || channelsLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-8">
                <div className="h-20 w-1/3 bg-slate-100 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-slate-100 rounded-xl animate-pulse" />
                    <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
                </div>
            </div>
        );
    }

    if (statsError) {
        return (
            <div className="p-6 flex items-center justify-center h-[80vh]">
                <div className="text-center max-w-md mx-auto">
                    <div className="bg-red-50 p-4 rounded-full inline-block mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to load dashboard</h3>
                    <p className="text-slate-500 mb-6">{(statsError as Error).message}</p>
                    <Button onClick={() => refetchStats()} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // Prepare data for charts
    const totalSent = stats?.totalSent || 0;
    const totalPending = stats?.totalPending || 0;
    const totalFailed = stats?.totalFailed || 0;

    const channelData = [
        { name: 'Email', value: stats?.byChannel?.email || 0, color: CHANNEL_COLORS.email },
        { name: 'WhatsApp', value: stats?.byChannel?.whatsapp || 0, color: CHANNEL_COLORS.whatsapp },
        { name: 'SMS', value: stats?.byChannel?.sms || 0, color: CHANNEL_COLORS.sms },
    ].filter(item => item.value > 0);

    const statCards = [
        {
            label: 'Total Sent',
            value: totalSent,
            icon: Send,
            trend: '+12.5%',
            trendUp: true,
            color: 'text-blue-600',
            chartData: generateSparklineData(totalSent, 'up'),
            chartColor: '#3b82f6'
        },
        {
            label: 'Pending',
            value: totalPending,
            icon: Clock,
            trend: '-5.2%',
            trendUp: false, // Good that pending is down
            color: 'text-amber-600',
            chartData: generateSparklineData(totalPending, 'down'),
            chartColor: '#f59e0b'
        },
        {
            label: 'Delivery Rate',
            value: totalSent > 0 ? `${Math.round(((totalSent - totalFailed) / totalSent) * 100)}%` : '0%',
            icon: CheckCircle2,
            trend: '+2.1%',
            trendUp: true,
            color: 'text-green-600',
            chartData: generateSparklineData(98, 'up'),
            chartColor: '#22c55e'
        },
        {
            label: 'Failed',
            value: totalFailed,
            icon: AlertCircle,
            trend: '-1.5%',
            trendUp: false, // Good that failed is down
            color: 'text-red-600',
            chartData: generateSparklineData(totalFailed, 'down'),
            chartColor: '#ef4444'
        },
    ];

    return (
        <div className="p-4 md:p-8 space-y-8 pb-24 h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Communication Overview</h1>
                    <p className="text-slate-500">Monitor your messaging performance and channel health.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <Button asChild variant="outline" className="gap-2 justify-center">
                        <Link href="/communication/channels">
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>
                    </Button>
                    <Button asChild className="gap-2 justify-center">
                        <Link href="/communication/messages?action=compose">
                            <Plus className="w-4 h-4" />
                            New Message
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {quickActions.map((action) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        className={cn(
                            "flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border border-slate-200 transition-all duration-200",
                            "hover:shadow-md hover:border-blue-200 bg-white group min-w-0"
                        )}
                    >
                        <div className={cn("p-2 md:p-2.5 rounded-lg transition-colors duration-200 shrink-0", action.bg, action.hover)}>
                            <action.icon className={cn("w-4 h-4 md:w-5 md:h-5", action.color)} />
                        </div>
                        <span className="font-medium text-slate-700 group-hover:text-slate-900 text-xs md:text-sm truncate">{action.label}</span>
                    </Link>
                ))}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                                        <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                                    </div>
                                    <div className={cn("p-2 rounded-lg bg-opacity-10", stat.color.replace('text-', 'bg-'))}>
                                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                                    </div>
                                </div>
                                <div className="flex items-end justify-between h-12">
                                    <div className="flex flex-col justify-end pb-1">
                                        <Badge variant={stat.trendUp ? 'default' : 'secondary'} className={cn(
                                            "gap-1 font-normal",
                                            stat.trendUp ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        )}>
                                            <TrendingUp className={cn("w-3 h-3", !stat.trendUp && "rotate-180")} />
                                            {stat.trend}
                                        </Badge>
                                    </div>
                                    <div className="w-24 h-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stat.chartData}>
                                                <defs>
                                                    <linearGradient id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={stat.chartColor} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={stat.chartColor} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke={stat.chartColor}
                                                    fillOpacity={1}
                                                    fill={`url(#gradient-${i})`}
                                                    strokeWidth={2}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Activity Feed */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Latest messages sent to candidates</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/communication/messages" className="text-blue-600 gap-1">
                                    View All <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {(stats?.recentActivity || []).length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">No recent activity</div>
                                ) : (
                                    (stats?.recentActivity || []).slice(0, 5).map((activity, i) => {
                                        const Icon = channelIcons[activity.channel?.toLowerCase() as keyof typeof channelIcons] || Mail;
                                        const isSent = activity.status === 'SENT' || activity.status === 'DELIVERED';

                                        return (
                                            <div key={activity.id} className="flex items-center gap-4 group">
                                                <div className="relative">
                                                    <Avatar className="h-10 w-10 border border-slate-200">
                                                        <AvatarFallback className="bg-slate-50 text-slate-600 font-medium">
                                                            {activity.recipientEmail?.substring(0, 2).toUpperCase() || 'UN'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-100 shadow-sm">
                                                        <div className="bg-slate-100 p-1 rounded-full">
                                                            <Icon className="w-3 h-3 text-slate-600" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <p className="text-sm font-medium text-slate-900 truncate pr-2">
                                                            {activity.subject || activity.recipientEmail || 'Message'}
                                                        </p>
                                                        <span className="text-xs text-slate-400 whitespace-nowrap">
                                                            {activity.createdAt ? new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className={cn(
                                                            "text-[10px] h-5 px-1.5 font-normal",
                                                            isSent ? "bg-green-50 text-green-700 border-green-200" :
                                                                activity.status === 'FAILED' ? "bg-red-50 text-red-700 border-red-200" :
                                                                    "bg-slate-50 text-slate-600 border-slate-200"
                                                        )}>
                                                            {activity.status}
                                                        </Badge>
                                                        <span className="text-xs text-slate-500 truncate">
                                                            To: {activity.recipientEmail || activity.recipientPhone || 'Unknown'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Channel Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Channel Status</CardTitle>
                            <CardDescription>Real-time status of your communication channels</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {['EMAIL', 'WHATSAPP', 'SMS'].map((type) => {
                                    const channelConfig = channels?.find(c => c.channel === type);
                                    const isConfigured = !!channelConfig;
                                    const isActive = channelConfig?.isActive;
                                    const Icon = channelIcons[type.toLowerCase() as keyof typeof channelIcons] || Mail;

                                    return (
                                        <div key={type} className="flex flex-col p-4 border border-slate-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                                                        isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                        {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </div>
                                            <h4 className="font-semibold text-slate-900 mb-1 capitalize">{type.toLowerCase()}</h4>
                                            <p className="text-xs text-slate-500 mb-4 h-8 text-ellipsis overflow-hidden">
                                                {isConfigured ? 'Connected via ' + (channelConfig?.provider || 'default provider') : 'Not configured'}
                                            </p>
                                            <Button variant="outline" size="sm" className="mt-auto w-full text-xs" asChild>
                                                <Link href={`/communication/channels?type=${type.toLowerCase()}`}>
                                                    {isConfigured ? 'Manage' : 'Connect'}
                                                </Link>
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (1/3) */}
                <div className="space-y-8">
                    {/* Channel Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Channel Usage</CardTitle>
                            <CardDescription>Distribution of messages sent</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px] w-full relative">
                                {channelData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={channelData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {channelData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value, name) => [value, name]}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                        No data available
                                    </div>
                                )}
                                {/* Center Text */}
                                {channelData.length > 0 && (
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center">
                                        <div className="text-2xl font-bold text-slate-900">{totalSent}</div>
                                        <div className="text-xs text-slate-500 font-medium">Messages</div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 mt-4">
                                {channelData.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-600">{item.name}</span>
                                        </div>
                                        <span className="font-medium text-slate-900">
                                            {Math.round((item.value / totalSent) * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Automation Stats Preview (Placeholder for now) */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <Zap className="w-8 h-8 mb-4 opacity-90" />
                            <h3 className="text-lg font-bold mb-2">Automate your workflow</h3>
                            <p className="text-indigo-100 text-sm mb-6 max-w-[240px]">
                                Save time by setting up automated triggers for interview reminders and finding scheduling conflicts.
                            </p>
                            <Button size="sm" variant="secondary" className="text-indigo-600 hover:text-indigo-700 border-0 bg-white" asChild>
                                <Link href="/communication/automations">
                                    Explore Automations
                                </Link>
                            </Button>
                        </div>

                        {/* Decorative elements */}
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 right-10 w-24 h-24 bg-purple-400 opacity-20 rounded-full blur-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
