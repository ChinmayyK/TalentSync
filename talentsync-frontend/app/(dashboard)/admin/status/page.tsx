'use client';

import { useEffect, useState, useCallback } from 'react';
import {
    getComponents,
    getIncidents,
    runHealthChecks,
    createIncident,
    updateIncident,
    addIncidentUpdate,
    overrideComponentStatus,
    clearComponentOverride,
    ComponentWithStatus,
    Incident,
    CreateIncidentDto,
} from '@/lib/api/system-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, AlertTriangle, CheckCircle, XCircle, AlertCircle, Wrench } from 'lucide-react';

// Status color mapping
const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    OPERATIONAL: { color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" />, label: 'Operational' },
    DEGRADED: { color: 'bg-yellow-500', icon: <AlertCircle className="w-4 h-4" />, label: 'Degraded' },
    PARTIAL_OUTAGE: { color: 'bg-orange-500', icon: <AlertTriangle className="w-4 h-4" />, label: 'Partial Outage' },
    MAJOR_OUTAGE: { color: 'bg-red-500', icon: <XCircle className="w-4 h-4" />, label: 'Major Outage' },
    MAINTENANCE: { color: 'bg-blue-500', icon: <Wrench className="w-4 h-4" />, label: 'Maintenance' },
};

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
    MINOR: { color: 'bg-yellow-500', label: 'Minor' },
    MAJOR: { color: 'bg-orange-500', label: 'Major' },
    CRITICAL: { color: 'bg-red-500', label: 'Critical' },
};

const INCIDENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    INVESTIGATING: { color: 'bg-red-500', label: 'Investigating' },
    IDENTIFIED: { color: 'bg-orange-500', label: 'Identified' },
    MONITORING: { color: 'bg-yellow-500', label: 'Monitoring' },
    RESOLVED: { color: 'bg-green-500', label: 'Resolved' },
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
}

// Create Incident Dialog
function CreateIncidentDialog({
    components,
    onCreated,
}: {
    components: ComponentWithStatus[];
    onCreated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<CreateIncidentDto>({
        title: '',
        severity: 'MINOR',
        componentIds: [],
        impactLevel: 'DEGRADED',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.message || form.componentIds.length === 0) return;

        setLoading(true);
        try {
            await createIncident(form);
            setOpen(false);
            setForm({
                title: '',
                severity: 'MINOR',
                componentIds: [],
                impactLevel: 'DEGRADED',
                message: '',
            });
            onCreated();
        } catch (error) {
            console.error('Failed to create incident:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Incident
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Incident</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Brief description of the incident"
                        />
                    </div>

                    <div>
                        <Label htmlFor="severity">Severity</Label>
                        <Select
                            value={form.severity}
                            onValueChange={(value) => setForm({ ...form, severity: value as 'MINOR' | 'MAJOR' | 'CRITICAL' })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MINOR">Minor</SelectItem>
                                <SelectItem value="MAJOR">Major</SelectItem>
                                <SelectItem value="CRITICAL">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Affected Components</Label>
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                            {components.map((component) => (
                                <label key={component.id} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.componentIds.includes(component.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setForm({ ...form, componentIds: [...form.componentIds, component.id] });
                                            } else {
                                                setForm({
                                                    ...form,
                                                    componentIds: form.componentIds.filter((id) => id !== component.id),
                                                });
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{component.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="impactLevel">Impact Level</Label>
                        <Select
                            value={form.impactLevel}
                            onValueChange={(value) => setForm({ ...form, impactLevel: value as 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DEGRADED">Degraded</SelectItem>
                                <SelectItem value="PARTIAL_OUTAGE">Partial Outage</SelectItem>
                                <SelectItem value="MAJOR_OUTAGE">Major Outage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="message">Initial Message</Label>
                        <Textarea
                            id="message"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="Describe what is happening..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Incident'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Add Update Dialog
function AddUpdateDialog({
    incident,
    onUpdated,
}: {
    incident: Incident;
    onUpdated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED'>(incident.status);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message) return;

        setLoading(true);
        try {
            await addIncidentUpdate(incident.id, { status, message });
            setOpen(false);
            setMessage('');
            onUpdated();
        } catch (error) {
            console.error('Failed to add update:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    Add Update
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Incident Update</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                                <SelectItem value="IDENTIFIED">Identified</SelectItem>
                                <SelectItem value="MONITORING">Monitoring</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Update message..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Update'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Component Status Override
function ComponentStatusOverride({
    component,
    onUpdated,
}: {
    component: ComponentWithStatus;
    onUpdated: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleOverride = async (status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE') => {
        setLoading(true);
        try {
            await overrideComponentStatus(component.id, status);
            onUpdated();
        } catch (error) {
            console.error('Failed to override status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        setLoading(true);
        try {
            await clearComponentOverride(component.id);
            onUpdated();
        } catch (error) {
            console.error('Failed to clear override:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Select
            value={component.currentStatus}
            onValueChange={(v) => handleOverride(v as 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'MAJOR_OUTAGE' | 'MAINTENANCE')}
            disabled={loading}
        >
            <SelectTrigger className="w-40">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="DEGRADED">Degraded</SelectItem>
                <SelectItem value="PARTIAL_OUTAGE">Partial Outage</SelectItem>
                <SelectItem value="MAJOR_OUTAGE">Major Outage</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
        </Select>
    );
}

export default function AdminStatusPage() {
    const [components, setComponents] = useState<ComponentWithStatus[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningChecks, setRunningChecks] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [componentsData, incidentsData] = await Promise.all([
                getComponents(),
                getIncidents(30),
            ]);
            setComponents(componentsData);
            setIncidents(incidentsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRunChecks = async () => {
        setRunningChecks(true);
        try {
            await runHealthChecks();
            await fetchData();
        } catch (error) {
            console.error('Failed to run health checks:', error);
        } finally {
            setRunningChecks(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const activeIncident = incidents.filter((i) => i.status !== 'RESOLVED');
    const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED');

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">System Status Management</h1>
                    <p className="text-muted-foreground">
                        Monitor and manage system health, create incidents, and override component statuses.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleRunChecks} disabled={runningChecks}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${runningChecks ? 'animate-spin' : ''}`} />
                        {runningChecks ? 'Running...' : 'Run Health Checks'}
                    </Button>
                    <CreateIncidentDialog components={components} onCreated={fetchData} />
                </div>
            </div>

            {/* Components */}
            <Card>
                <CardHeader>
                    <CardTitle>Components</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {components.map((component) => {
                            const statusConfig = STATUS_CONFIG[component.currentStatus] || STATUS_CONFIG.OPERATIONAL;
                            return (
                                <div
                                    key={component.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full text-white ${statusConfig.color}`}>
                                            {statusConfig.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{component.name}</h3>
                                            <p className="text-sm text-muted-foreground">{component.description}</p>
                                            {component.lastCheckedAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    Last checked: {formatDate(component.lastCheckedAt)}
                                                    {component.lastLatencyMs && ` (${component.lastLatencyMs}ms)`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <ComponentStatusOverride component={component} onUpdated={fetchData} />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Active Incidents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Active Incidents
                        {activeIncident.length > 0 && (
                            <Badge variant="destructive">{activeIncident.length}</Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeIncident.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No active incidents
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {activeIncident.map((incident) => {
                                const severityConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.MINOR;
                                const statusConfig = INCIDENT_STATUS_CONFIG[incident.status] || INCIDENT_STATUS_CONFIG.INVESTIGATING;
                                return (
                                    <div key={incident.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-medium">{incident.title}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge className={severityConfig.color}>{severityConfig.label}</Badge>
                                                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                                                </div>
                                            </div>
                                            <AddUpdateDialog incident={incident} onUpdated={fetchData} />
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Affected: {incident.components.map((c) => c.name).join(', ')}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Started: {formatDate(incident.startedAt)}
                                        </p>
                                        {incident.updates && incident.updates.length > 0 && (
                                            <div className="mt-3 pl-4 border-l-2 border-muted">
                                                {incident.updates.slice(0, 3).map((update) => (
                                                    <div key={update.id} className="text-sm mb-2">
                                                        <span className="text-muted-foreground">
                                                            {formatDate(update.createdAt)}
                                                        </span>
                                                        <span className="mx-2">·</span>
                                                        <span>{update.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Resolved Incidents */}
            <Card>
                <CardHeader>
                    <CardTitle>Recently Resolved</CardTitle>
                </CardHeader>
                <CardContent>
                    {resolvedIncidents.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                            No recent resolved incidents
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {resolvedIncidents.slice(0, 10).map((incident) => (
                                <div
                                    key={incident.id}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                    <div>
                                        <h4 className="font-medium">{incident.title}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {incident.components.map((c) => c.name).join(', ')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                            Resolved
                                        </Badge>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {incident.resolvedAt && formatDate(incident.resolvedAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
