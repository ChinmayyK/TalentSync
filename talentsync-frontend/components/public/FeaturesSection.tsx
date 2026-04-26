'use client';

import { motion } from 'framer-motion';
import { Calendar, Users, BarChart3, Globe, Shield, Zap, ArrowUpRight } from 'lucide-react';

const features = [
    {
        icon: Calendar,
        title: 'Smart Scheduling',
        description: 'Auto-pilot for your calendar. We handle the email tagging and timezone conversions.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: Users,
        title: 'Candidate Hub',
        description: 'One centralized database for every resume, note, and scorecard. No more lost feedback.',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        icon: Zap,
        title: 'Instant Feedback',
        description: 'Mobile-first scorecards ensure your team submits feedback minutes after the interview.',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        icon: BarChart3,
        title: 'Pipeline Analytics',
        description: 'Track time-to-hire and pass-through rates. Spot bottlenecks before they hurt.',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        icon: Globe,
        title: 'Global Integrations',
        description: 'Syncs deep with Slack, Zoom, LinkedIn, and your favorite HRIS tools.',
        color: 'text-violet-600',
        bg: 'bg-violet-50',
    },
    {
        icon: Shield,
        title: 'Enterprise Security',
        description: 'SOC 2 Type II compliant. Role-based access control (RBAC) and audit logs included.',
        color: 'text-rose-600',
        bg: 'bg-rose-50',
    },
];

export function FeaturesSection() {
    return (
        <section id="features" className="py-24 sm:py-32 bg-slate-50/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-base font-semibold leading-7 text-primary uppercase tracking-wide">Efficiency First</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Designed for modern hiring teams
                    </p>
                    <p className="mt-6 text-lg leading-8 text-slate-600">
                        Stop managing spreadsheets. Connect TalentSync to your workflow and hire the best talent in half the time.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-blue-100 hover:shadow-md transition-all duration-300"
                        >
                            <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-6`}>
                                <feature.icon className={`h-6 w-6 ${feature.color}`} />
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-3">
                                {feature.title}
                            </h3>

                            <p className="text-slate-500 leading-relaxed text-sm mb-4">
                                {feature.description}
                            </p>

                            <div className="flex items-center text-sm font-semibold text-primary group-hover:underline decoration-primary/30 underline-offset-4 decoration-2">
                                Learn more <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
