'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export function ProductShowcase() {
    return (
        <section className="py-24 bg-white overflow-hidden">
            {/* Section 1: Kanban Pipeline */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-32">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Text - Left on Desktop */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="order-2 lg:order-1"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                            Visualize Your Hiring Pipeline
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Stop guessing where candidates are standing. Our intuitive Kanban board gives you a clear bird's-eye view of your entire funnel.
                        </p>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-blue-500 flex-shrink-0" />
                                <span className="text-slate-700">Drag-and-drop candidates between stages</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-blue-500 flex-shrink-0" />
                                <span className="text-slate-700">Customizable stages to fit your workflow</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-blue-500 flex-shrink-0" />
                                <span className="text-slate-700">Instant visibility into bottlenecks</span>
                            </li>
                        </ul>

                        <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5">
                            Explore Pipeline Features <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </motion.div>

                    {/* Image - Right on Desktop */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="order-1 lg:order-2 relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-indigo-50 rounded-2xl transform rotate-3 scale-105 opacity-50 -z-10"></div>
                        <Image
                            src="/images/candidate-kanban.png"
                            alt="Kanban Board Mockup"
                            width={800}
                            height={600}
                            className="rounded-xl shadow-2xl border border-slate-100"
                        />
                    </motion.div>
                </div>
            </div>

            {/* Section 2: Analytics */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Image - Left on Desktop */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-bl from-emerald-100 to-teal-50 rounded-2xl transform -rotate-3 scale-105 opacity-50 -z-10"></div>
                        <Image
                            src="/images/analytics-dashboard.png"
                            alt="Analytics Dashboard Mockup"
                            width={800}
                            height={600}
                            className="rounded-xl shadow-2xl border border-slate-100"
                        />
                    </motion.div>

                    {/* Text - Right on Desktop */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 tracking-tight">
                            Data-Driven Hiring Decisions
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Understand what's working and what's not. Track time-to-hire, source quality, and pass-through rates in real-time.
                        </p>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                                <span className="text-slate-700">Real-time funnel conversion metrics</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                                <span className="text-slate-700">Identify top performing sources</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                                <span className="text-slate-700">Exportable reports for stakeholders</span>
                            </li>
                        </ul>

                        <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                            See Analytics Tools <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
