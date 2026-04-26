"use client";

import { motion } from 'framer-motion';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { fadeInUp } from '@/lib/animations';

interface AnalyticsChartsProps {
    timeToHireTrend: any[];
    stageDuration: any[];
    offerBreakdown: any[];
    isLoading: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const AnalyticsCharts = ({ 
    timeToHireTrend, 
    stageDuration, 
    offerBreakdown, 
    isLoading 
}: AnalyticsChartsProps) => {
    
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-80 bg-muted/50 animate-pulse rounded-2xl border border-border/50" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Time to Hire Trend */}
            <motion.div 
                variants={fadeInUp}
                className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
            >
                <h3 className="text-lg font-semibold mb-6">Time to Hire Trend</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timeToHireTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="avgDays" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#3b82f6' }}
                                activeDot={{ r: 6 }}
                                name="Avg Days"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Stage Duration */}
            <motion.div 
                variants={fadeInUp}
                className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
            >
                <h3 className="text-lg font-semibold mb-6">Avg Days in Stage</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stageDuration} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                            <XAxis type="number" axisLine={false} tickLine={false} hide />
                            <YAxis 
                                dataKey="stage" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fontSize: 11}} 
                                width={80}
                                tickFormatter={(val) => val.charAt(0) + val.slice(1).toLowerCase().replace(/_/g, ' ')}
                            />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar 
                                dataKey="avgDays" 
                                fill="#8b5cf6" 
                                radius={[0, 4, 4, 0]} 
                                barSize={20}
                                name="Avg Days"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Offer Acceptance Breakdown */}
            <motion.div 
                variants={fadeInUp}
                className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
            >
                <h3 className="text-lg font-semibold mb-6">Offer Breakdown</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={offerBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="count"
                                nameKey="status"
                            >
                                {offerBreakdown.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend 
                                iconType="circle" 
                                layout="horizontal" 
                                verticalAlign="bottom" 
                                align="center"
                                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
};
