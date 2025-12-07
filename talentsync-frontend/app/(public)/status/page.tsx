'use client';

import { useEffect, useState } from 'react';
import {
    getSystemStatus,
    getComponents,
    getComponentUptime,
    getIncidentsByDate,
    SystemStatus,
    ComponentWithStatus,
    UptimeData,
    Incident,
} from '@/lib/api/system-status';

// Status color mapping
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    OPERATIONAL: { bg: 'bg-green-500', text: 'text-green-500', label: 'Operational' },
    DEGRADED: { bg: 'bg-yellow-500', text: 'text-yellow-500', label: 'Degraded' },
    PARTIAL_OUTAGE: { bg: 'bg-orange-500', text: 'text-orange-500', label: 'Partial Outage' },
    MAJOR_OUTAGE: { bg: 'bg-red-500', text: 'text-red-500', label: 'Major Outage' },
    MAINTENANCE: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Maintenance' },
};

function getStatusInfo(status: string) {
    return STATUS_COLORS[status] || STATUS_COLORS.OPERATIONAL;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// Uptime bar component
function UptimeBar({ uptimeData }: { uptimeData: UptimeData }) {
    if (!uptimeData.dailyData || uptimeData.dailyData.length === 0) {
        return (
            <div className="flex gap-0.5 h-8">
                {Array.from({ length: 90 }).map((_, i) => (
                    <div key={i} className="flex-1 bg-gray-700 rounded-sm min-w-[2px]" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-0.5 h-8">
            {uptimeData.dailyData.map((day, i) => {
                const statusInfo = getStatusInfo(day.status);
                return (
                    <div
                        key={i}
                        className={`flex-1 ${statusInfo.bg} rounded-sm min-w-[2px] transition-all hover:opacity-80`}
                        title={`${day.date}: ${day.uptimePercentage.toFixed(1)}% uptime`}
                    />
                );
            })}
        </div>
    );
}

// Component card
function ComponentCard({ component, uptimeData }: { component: ComponentWithStatus; uptimeData?: UptimeData }) {
    const statusInfo = getStatusInfo(component.currentStatus);

    return (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{component.name}</h3>
                    <span className="text-gray-500 cursor-help" title={component.description || ''}>
                        ?
                    </span>
                </div>
                <span className={`${statusInfo.text} font-medium text-sm`}>{statusInfo.label}</span>
            </div>

            {uptimeData && <UptimeBar uptimeData={uptimeData} />}

            <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>90 days ago</span>
                <span>{uptimeData ? `${uptimeData.uptimePercentage.toFixed(2)}% uptime` : '-'}</span>
                <span>Today</span>
            </div>
        </div>
    );
}

// Incident card
function IncidentCard({ incident }: { incident: Incident }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const statusInfo = getStatusInfo(
        incident.status === 'RESOLVED' ? 'OPERATIONAL' : 'MAJOR_OUTAGE'
    );

    return (
        <div className="border-l-4 border-gray-700 pl-4 py-2">
            <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <h4 className="font-medium text-white">{incident.title}</h4>
                    <p className="text-sm text-gray-400">
                        {incident.components.map((c) => c.name).join(', ')}
                    </p>
                </div>
                <div className="text-right">
                    <span className={`text-xs ${statusInfo.text}`}>
                        {incident.status.replace('_', ' ')}
                    </span>
                    <p className="text-xs text-gray-500">
                        {formatTimeAgo(incident.startedAt)}
                    </p>
                </div>
            </div>

            {isExpanded && incident.updates && incident.updates.length > 0 && (
                <div className="mt-3 pl-4 border-l border-gray-700 space-y-2">
                    {incident.updates.map((update) => (
                        <div key={update.id} className="text-sm">
                            <span className="text-gray-400">{formatTimeAgo(update.createdAt)}</span>
                            <span className="mx-2 text-gray-600">·</span>
                            <span className="text-gray-300">{update.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Main status page component
export default function StatusPage() {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [components, setComponents] = useState<ComponentWithStatus[]>([]);
    const [uptimeDataMap, setUptimeDataMap] = useState<Record<string, UptimeData>>({});
    const [incidentsByDate, setIncidentsByDate] = useState<Record<string, Incident[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                const [statusData, componentsData, incidentsData] = await Promise.all([
                    getSystemStatus(),
                    getComponents(),
                    getIncidentsByDate(7),
                ]);

                setStatus(statusData);
                setComponents(componentsData);
                setIncidentsByDate(incidentsData);

                // Fetch uptime data for each component
                const uptimePromises = componentsData.map((c) =>
                    getComponentUptime(c.id, '90d').then((data) => ({ id: c.id, data }))
                );

                const uptimeResults = await Promise.all(uptimePromises);
                const uptimeMap: Record<string, UptimeData> = {};
                for (const result of uptimeResults) {
                    uptimeMap[result.id] = result.data;
                }
                setUptimeDataMap(uptimeMap);
            } catch (err) {
                console.error('Failed to fetch status data:', err);
                setError('Failed to load system status');
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        // Refresh every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const overallStatusInfo = getStatusInfo(status?.status || 'OPERATIONAL');

    // Sort dates for incidents display
    const sortedDates = Object.keys(incidentsByDate).sort((a, b) => b.localeCompare(a));

    return (
        <div className="min-h-screen bg-gray-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-white mb-2">About This Site</h1>
                    <p className="text-gray-400">Welcome To TalentSync Application&apos;s Status Page</p>
                    <p className="text-gray-500 text-sm">
                        Here You Can Track The Uptime Of The Application
                    </p>
                </div>

                {/* Overall Status Banner */}
                <div className={`rounded-lg p-6 mb-8 ${status?.status === 'OPERATIONAL'
                        ? 'bg-green-900/20 border border-green-800'
                        : status?.status === 'DEGRADED'
                            ? 'bg-yellow-900/20 border border-yellow-800'
                            : 'bg-red-900/20 border border-red-800'
                    }`}>
                    <div className="flex items-center justify-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${overallStatusInfo.bg}`}></div>
                        <h2 className={`text-xl font-semibold ${overallStatusInfo.text}`}>
                            {status?.status === 'OPERATIONAL'
                                ? 'All Systems Operational'
                                : status?.status === 'DEGRADED'
                                    ? 'Some Systems Experiencing Issues'
                                    : 'System Outage Detected'}
                        </h2>
                    </div>
                    {status && (
                        <p className="text-center text-gray-400 text-sm mt-2">
                            Overall uptime: {status.uptimePercentage}%
                        </p>
                    )}
                </div>

                {/* Uptime period selector */}
                <div className="flex justify-end mb-4">
                    <p className="text-sm text-gray-400">
                        Uptime over the past 90 days.{' '}
                        <a href="#" className="text-blue-400 hover:underline">
                            View historical uptime.
                        </a>
                    </p>
                </div>

                {/* Components */}
                <div className="space-y-4 mb-12">
                    {components.map((component) => (
                        <ComponentCard
                            key={component.id}
                            component={component}
                            uptimeData={uptimeDataMap[component.id]}
                        />
                    ))}
                </div>

                {/* Past Incidents */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-white mb-6">Past Incidents</h2>

                    <div className="space-y-8">
                        {sortedDates.map((date) => {
                            const incidents = incidentsByDate[date] || [];
                            const formattedDate = formatDate(date);
                            const isToday = date === new Date().toISOString().split('T')[0];

                            return (
                                <div key={date}>
                                    <h3 className="text-lg font-semibold text-white mb-3">
                                        {formattedDate}
                                    </h3>
                                    {incidents.length > 0 ? (
                                        <div className="space-y-3">
                                            {incidents.map((incident) => (
                                                <IncidentCard key={incident.id} incident={incident} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">
                                            {isToday ? 'No incidents reported today.' : 'No incidents reported.'}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-16 text-center text-gray-500 text-sm">
                    <p>Last updated: {status?.timestamp ? new Date(status.timestamp).toLocaleString() : '-'}</p>
                </div>
            </div>
        </div>
    );
}
