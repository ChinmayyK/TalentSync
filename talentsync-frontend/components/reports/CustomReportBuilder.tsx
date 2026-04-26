"use client";

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Users,
    Calendar,
    Clock,
    Target,
    FileText,
    Download,
    Save,
    Play,
    GripVertical,
    X,
    Plus,
    Settings2
} from 'lucide-react';

// Available data sources/metrics
const DATA_SOURCES = [
    { id: 'candidates', label: 'Candidates', icon: Users, description: 'Candidate pipeline data' },
    { id: 'interviews', label: 'Interviews', icon: Calendar, description: 'Interview scheduling data' },
    { id: 'time_to_hire', label: 'Time to Hire', icon: Clock, description: 'Hiring duration metrics' },
    { id: 'source_performance', label: 'Source Performance', icon: Target, description: 'Recruitment source analytics' },
    { id: 'interviewer_load', label: 'Interviewer Load', icon: Users, description: 'Interviewer workload data' },
    { id: 'stage_metrics', label: 'Stage Metrics', icon: TrendingUp, description: 'Pipeline stage analytics' },
];

// Available visualizations
const VISUALIZATIONS = [
    { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { id: 'line', label: 'Line Chart', icon: TrendingUp },
    { id: 'pie', label: 'Pie Chart', icon: PieChart },
    { id: 'table', label: 'Data Table', icon: FileText },
    { id: 'kpi', label: 'KPI Card', icon: Target },
];

// Available filters
const FILTERS = [
    { id: 'date_range', label: 'Date Range', type: 'daterange' },
    { id: 'stage', label: 'Pipeline Stage', type: 'select' },
    { id: 'source', label: 'Source', type: 'select' },
    { id: 'recruiter', label: 'Recruiter', type: 'select' },
    { id: 'role', label: 'Role/Position', type: 'select' },
];

interface ReportWidget {
    id: string;
    dataSource: string;
    visualization: string;
    title: string;
    filters: string[];
}

interface CustomReportBuilderProps {
    onClose?: () => void;
    onSave?: (config: ReportConfig) => void;
}

interface ReportConfig {
    name: string;
    description: string;
    widgets: ReportWidget[];
    globalFilters: string[];
}

export function CustomReportBuilder({ onClose, onSave }: CustomReportBuilderProps) {
    const [reportName, setReportName] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [widgets, setWidgets] = useState<ReportWidget[]>([]);
    const [globalFilters, setGlobalFilters] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('design');
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Add a new widget
    const addWidget = useCallback((dataSource: string) => {
        const newWidget: ReportWidget = {
            id: `widget-${Date.now()}`,
            dataSource,
            visualization: 'bar',
            title: DATA_SOURCES.find(d => d.id === dataSource)?.label || 'New Widget',
            filters: [],
        };
        setWidgets(prev => [...prev, newWidget]);
        toast.success('Widget added to report');
    }, []);

    // Remove a widget
    const removeWidget = useCallback((widgetId: string) => {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
    }, []);

    // Update widget configuration
    const updateWidget = useCallback((widgetId: string, updates: Partial<ReportWidget>) => {
        setWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, ...updates } : w
        ));
    }, []);

    // Toggle global filter
    const toggleFilter = useCallback((filterId: string) => {
        setGlobalFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(f => f !== filterId)
                : [...prev, filterId]
        );
    }, []);

    // Save report configuration
    const handleSave = useCallback(() => {
        if (!reportName.trim()) {
            toast.error('Please enter a report name');
            return;
        }
        if (widgets.length === 0) {
            toast.error('Please add at least one widget');
            return;
        }

        const config: ReportConfig = {
            name: reportName,
            description: reportDescription,
            widgets,
            globalFilters,
        };

        onSave?.(config);
        toast.success('Report saved successfully');
    }, [reportName, reportDescription, widgets, globalFilters, onSave]);

    // Run/preview report
    const handlePreview = useCallback(() => {
        setIsPreviewMode(true);
        setActiveTab('preview');
        toast.info('Generating preview...');
    }, []);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                    <Settings2 className="h-6 w-6 text-primary" />
                    <div>
                        <h2 className="text-lg font-semibold">Custom Report Builder</h2>
                        <p className="text-sm text-muted-foreground">Design your own analytics dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePreview}>
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Report
                    </Button>
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="border-b px-4">
                    <TabsList>
                        <TabsTrigger value="design">Design</TabsTrigger>
                        <TabsTrigger value="data">Data Sources</TabsTrigger>
                        <TabsTrigger value="filters">Filters</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {/* Design Tab */}
                    <TabsContent value="design" className="mt-0 space-y-6">
                        {/* Report Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Report Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="report-name">Report Name</Label>
                                    <Input
                                        id="report-name"
                                        placeholder="e.g., Weekly Hiring Summary"
                                        value={reportName}
                                        onChange={(e) => setReportName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="report-desc">Description (optional)</Label>
                                    <Input
                                        id="report-desc"
                                        placeholder="Brief description of this report"
                                        value={reportDescription}
                                        onChange={(e) => setReportDescription(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Widgets */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Report Widgets</CardTitle>
                                    <CardDescription>Drag to reorder, click to configure</CardDescription>
                                </div>
                                <Badge variant="secondary">{widgets.length} widgets</Badge>
                            </CardHeader>
                            <CardContent>
                                {widgets.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No widgets added yet</p>
                                        <p className="text-sm">Go to Data Sources tab to add widgets</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <AnimatePresence>
                                            {widgets.map((widget, index) => (
                                                <motion.div
                                                    key={widget.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -100 }}
                                                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                                                >
                                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                                    <div className="flex-1 min-w-0">
                                                        <Input
                                                            value={widget.title}
                                                            onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                                                            className="h-8 text-sm font-medium"
                                                        />
                                                    </div>
                                                    <Select
                                                        value={widget.visualization}
                                                        onValueChange={(v) => updateWidget(widget.id, { visualization: v })}
                                                    >
                                                        <SelectTrigger className="w-32 h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {VISUALIZATIONS.map((viz) => (
                                                                <SelectItem key={viz.id} value={viz.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <viz.icon className="h-4 w-4" />
                                                                        {viz.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => removeWidget(widget.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Data Sources Tab */}
                    <TabsContent value="data" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {DATA_SOURCES.map((source) => {
                                const Icon = source.icon;
                                const isAdded = widgets.some(w => w.dataSource === source.id);
                                return (
                                    <Card
                                        key={source.id}
                                        className={`cursor-pointer transition-all hover:shadow-md ${isAdded ? 'ring-2 ring-primary' : ''}`}
                                        onClick={() => addWidget(source.id)}
                                    >
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2 rounded-lg bg-primary/10">
                                                    <Icon className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium flex items-center gap-2">
                                                        {source.label}
                                                        {isAdded && <Badge variant="secondary" className="text-xs">Added</Badge>}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
                                                </div>
                                                <Button size="icon" variant="ghost">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </TabsContent>

                    {/* Filters Tab */}
                    <TabsContent value="filters" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Global Filters</CardTitle>
                                <CardDescription>These filters will apply to all widgets in the report</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {FILTERS.map((filter) => (
                                        <div key={filter.id} className="flex items-center space-x-3">
                                            <Checkbox
                                                id={filter.id}
                                                checked={globalFilters.includes(filter.id)}
                                                onCheckedChange={() => toggleFilter(filter.id)}
                                            />
                                            <Label htmlFor={filter.id} className="cursor-pointer">
                                                {filter.label}
                                            </Label>
                                            <Badge variant="outline" className="text-xs">{filter.type}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="mt-0">
                        {widgets.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">No widgets to preview</p>
                                <p className="text-sm">Add some data sources to see your report</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    <h3 className="font-semibold text-lg">{reportName || 'Untitled Report'}</h3>
                                    {reportDescription && (
                                        <p className="text-sm text-muted-foreground mt-1">{reportDescription}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {widgets.map((widget) => {
                                        const viz = VISUALIZATIONS.find(v => v.id === widget.visualization);
                                        const Icon = viz?.icon || BarChart3;
                                        return (
                                            <Card key={widget.id}>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Icon className="h-4 w-4 text-primary" />
                                                        {widget.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="h-32 flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
                                                        <p className="text-sm text-muted-foreground">
                                                            {viz?.label} preview
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
