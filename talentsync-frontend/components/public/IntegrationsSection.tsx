'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { OrbitingIntegrations } from './OrbitingIntegrations';

export function IntegrationsSection() {
    return (
        <section className="py-32 bg-slate-50 relative overflow-hidden">
            {/* Background glow effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6 text-slate-900">
                        The heartbeat of your hiring stack
                    </h2>
                    <p className="text-xl text-slate-600 leading-relaxed">
                        TalentSync acts as the central nervous system for your recruiting tools. We sync in real-time with 50+ ATS, CRM, and calendar platforms.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative rounded-3xl overflow-hidden shadow-xl shadow-slate-200 border border-white bg-white"
                >
                    <OrbitingIntegrations />

                    {/* Overlay Content (Hidden for Orbit view to be clear, or simplified) */}
                </motion.div>

                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-sm font-medium text-slate-500">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="text-primary text-2xl font-bold mb-1">50+</div>
                        Native Integrations
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="text-primary text-2xl font-bold mb-1">2-Way</div>
                        Real-time Sync
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="text-primary text-2xl font-bold mb-1">API</div>
                        Custom Webhooks
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="text-primary text-2xl font-bold mb-1">99.9%</div>
                        Uptime SLA
                    </div>
                </div>
            </div>
        </section>
    );
}
