"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { ReportsKPICards } from '@/components/reports/ReportsKPICards';
import { ReportsFunnel } from '@/components/reports/ReportsFunnel';
import { TimeToHireChart } from '@/components/reports/TimeToHireChart';
import { StageDurationChart } from '@/components/reports/StageDurationChart';
import { RecruiterLoadChart } from '@/components/reports/RecruiterLoadChart';
import { OfferAcceptanceChart } from '@/components/reports/OfferAcceptanceChart';
import { SourcePerformanceTable } from '@/components/reports/SourcePerformanceTable';
import { ReportFilters, ReportsData } from '@/types/reports';
import { toast } from 'sonner';
import { getOverview, getFunnel, getTimeToHire, getInterviewerLoad } from '@/lib/api/reports';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations';

const defaultFilters: ReportFilters = {
    dateRange: '30days',
    stage: 'all',
    recruiterId: 'all',
    source: 'all',
};

export default function Reports() {
    const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
    const [data, setData] = useState<ReportsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Always allow access (real RBAC should use auth context)
    const hasAccess = true;

    const loadReportsData = useCallback(async () => {
        if (!hasAccess) return;

        setIsLoading(true);
        try {
            // Fetch all report data in parallel
            const [overviewData, funnelData, timeToHireData, interviewerLoadData] = await Promise.allSettled([
                getOverview(),
                getFunnel(),
                getTimeToHire(),
                getInterviewerLoad(),
            ]);

            // Build KPIs from overview - match ReportKPI type
            const kpis: ReportsData['kpis'] = [];
            if (overviewData.status === 'fulfilled') {
                const o = overviewData.value;
                kpis.push(
                    { label: 'Total Candidates', value: o.totalCandidates || 0, trend: 0, trendLabel: 'vs last month', icon: 'users' },
                    { label: 'Active Interviews', value: o.activeInterviews || 0, trend: 0, trendLabel: 'vs last month', icon: 'calendar' },
                    { label: 'Completed This Week', value: o.completedThisWeek || 0, trend: 0, trendLabel: 'vs last week', icon: 'check' },
                    { label: 'Pending Feedback', value: o.pendingFeedback || 0, trend: 0, trendLabel: 'awaiting', icon: 'clock' }
                );
            }

            // Build funnel from API data - match FunnelStage type
            let funnel: ReportsData['funnel'] = [];
            if (funnelData.status === 'fulfilled') {
                const funnelValues = funnelData.value;
                const totalCount = funnelValues.reduce((sum, s) => sum + s.count, 0) || 1;
                funnel = funnelValues.map((s, idx) => ({
                    stage: s.stage,
                    label: s.stage.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    count: s.count,
                    percentage: Math.round((s.count / totalCount) * 100),
                    dropOff: idx > 0 ? Math.round(((funnelValues[idx - 1].count - s.count) / (funnelValues[idx - 1].count || 1)) * 100) : 0,
                }));
            }

            // Build time to hire data from API
            let timeToHire: ReportsData['timeToHire'] = [];
            if (overviewData.status === 'fulfilled') {
                const o = overviewData.value;
                if (o.timeToHireTrend && Array.isArray(o.timeToHireTrend)) {
                    timeToHire = o.timeToHireTrend.map(t => ({
                        date: t.month,
                        days: Math.round(t.avgDays || 0)
                    }));
                }
            }

            // Build recruiter load data - match RecruiterLoadData type
            let recruiterLoad: ReportsData['recruiterLoad'] = [];
            if (interviewerLoadData.status === 'fulfilled') {
                recruiterLoad = interviewerLoadData.value.map(r => ({
                    recruiter: r.interviewerName,
                    interviews: r.totalInterviews,
                    completed: r.thisMonth,
                    pending: r.pendingFeedback,
                }));
            }

            setData({
                kpis,
                funnel,
                timeToHire,
                stageDuration: overviewData.status === 'fulfilled' ? overviewData.value.stageDuration : [],
                recruiterLoad,
                offerAcceptance: overviewData.status === 'fulfilled' ? overviewData.value.offerBreakdown : [],
                sourcePerformance: [], // API not implemented yet
            });
        } catch (error) {
            console.error('Failed to load reports:', error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [hasAccess]);

    useEffect(() => {
        loadReportsData();
    }, [loadReportsData, filters]);

    const handleStageClick = (stage: string) => {
        setFilters((prev) => ({ ...prev, stage }));
        toast.info(`Filtering by stage: ${stage}`);
    };

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <span className="text-2xl">🔒</span>
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Access Restricted</h2>
                <p className="text-muted-foreground max-w-md">
                    You don't have permission to view reports. Please contact your administrator for access.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full">
            <motion.main
                initial="initial"
                animate="animate"
                variants={staggerContainer}
            >
                <div className="space-y-6">
                    <motion.div variants={fadeInUp}>
                        <ReportsHeader filters={filters} onFiltersChange={setFilters} />
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <ReportsKPICards kpis={data?.kpis || []} isLoading={isLoading} />
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <ReportsFunnel stages={data?.funnel || []} isLoading={isLoading} onStageClick={handleStageClick} />
                    </motion.div>

                    <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <TimeToHireChart data={data?.timeToHire || []} isLoading={isLoading} />
                        <StageDurationChart data={data?.stageDuration || []} isLoading={isLoading} />
                    </motion.div>

                    <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RecruiterLoadChart data={data?.recruiterLoad || []} isLoading={isLoading} />
                        <OfferAcceptanceChart data={data?.offerAcceptance || []} isLoading={isLoading} />
                    </motion.div>

                    <motion.div variants={staggerItem}>
                        <SourcePerformanceTable data={data?.sourcePerformance || []} isLoading={isLoading} />
                    </motion.div>
                </div>
            </motion.main>
        </div>
    );
}
