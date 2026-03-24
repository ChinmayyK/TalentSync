'use client';

import { motion } from 'framer-motion';
import { TalentSyncLogo } from "@/components/branding/TalentSyncLogo";
import { Calendar, Users, BarChart3, Sparkles } from 'lucide-react';

// Floating shape component for animated background
function FloatingShape({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1],
                y: [0, -20, 0],
            }}
            transition={{
                duration: 6,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

// Feature item for the brand panel
function FeatureItem({ icon: Icon, title, description, index }: {
    icon: React.ElementType;
    title: string;
    description: string;
    index: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
            className="flex items-start gap-4 group"
        >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <h3 className="font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-blue-100/80">{description}</p>
            </div>
        </motion.div>
    );
}

const features = [
    {
        icon: Calendar,
        title: "Smart Scheduling",
        description: "AI-powered interview scheduling that adapts to everyone's availability"
    },
    {
        icon: Users,
        title: "Team Collaboration",
        description: "Seamless coordination between recruiters, hiring managers, and candidates"
    },
    {
        icon: BarChart3,
        title: "Real-time Analytics",
        description: "Data-driven insights to optimize your hiring pipeline"
    },
];

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Brand Showcase (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
                {/* Animated background shapes */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <FloatingShape
                        className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-2xl"
                        delay={0}
                    />
                    <FloatingShape
                        className="absolute top-[40%] right-[5%] w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/20 to-transparent blur-3xl"
                        delay={1.5}
                    />
                    <FloatingShape
                        className="absolute bottom-[10%] left-[20%] w-80 h-80 rounded-full bg-gradient-to-br from-cyan-400/15 to-transparent blur-2xl"
                        delay={3}
                    />
                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-blue-600 font-bold text-xl">L</span>
                            </div>
                            <span className="font-bold text-white text-2xl tracking-tight">TalentSync</span>
                        </div>
                    </motion.div>

                    {/* Main headline */}
                    <div className="flex-1 flex flex-col justify-center max-w-lg">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-sm text-white/90 mb-6">
                                <Sparkles className="w-4 h-4" />
                                <span>Trusted by 500+ companies</span>
                            </div>
                            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                                Hire smarter,
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
                                    faster, better.
                                </span>
                            </h1>
                            <p className="text-lg text-blue-100/90 leading-relaxed mb-10">
                                Transform your interview process with intelligent scheduling, seamless collaboration, and actionable insights.
                            </p>
                        </motion.div>

                        {/* Features */}
                        <div className="space-y-6">
                            {features.map((feature, index) => (
                                <FeatureItem key={feature.title} {...feature} index={index} />
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="text-sm text-blue-200/60"
                    >
                        © 2025 TalentSync Inc. All rights reserved.
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Form Area */}
            <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
                {/* Mobile logo */}
                <div className="lg:hidden flex justify-center pt-8 pb-4">
                    <TalentSyncLogo size="large" />
                </div>

                {/* Form container */}
                <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="w-full max-w-md"
                    >
                        {/* Glassmorphism card */}
                        <div className="relative">
                            {/* Subtle gradient glow behind card */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-pink-500/20 rounded-3xl blur-xl opacity-60" />

                            <div className="relative bg-white/80 backdrop-blur-xl py-10 px-6 sm:px-10 shadow-2xl shadow-slate-200/50 rounded-3xl border border-white/50">
                                {children}
                            </div>
                        </div>

                        {/* Mobile footer */}
                        <div className="lg:hidden text-center text-xs text-slate-500 mt-8">
                            © 2025 TalentSync Inc. All rights reserved.
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

