'use client';

import { motion } from 'framer-motion';
import {
    Cloud,
    Slack,
    Video,
    Calendar,
    Mail,
    Database,
    MessageCircle,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrbitingIconProps {
    icon: React.ElementType;
    color: string;
    bg: string;
    radius: number;
    duration: number;
    delay: number;
    label: string;
}

const OrbitingIcon = ({ icon: Icon, color, bg, radius, duration, delay, label }: OrbitingIconProps) => {
    return (
        <motion.div
            className="absolute left-1/2 top-1/2 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration, repeat: Infinity, ease: "linear", delay: -delay }}
            style={{
                width: radius * 2,
                height: radius * 2,
                transformOrigin: "center",
                marginLeft: -radius,
                marginTop: -radius
            }}
        >
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ transform: `rotate(-${360}deg)` }} // Counter-rotate to keep icon upright? Actually complex with framer.
            // Simplified: Just rotate the container, and counter-rotate the child??
            // Better approach: animate the x/y coordinates using circle math?
            // Or just standard css rotation.
            >
                <div className="relative group">
                    {/* Connection Beam to Center */}
                    <div
                        className="absolute top-1/2 left-1/2 w-[1px] -translate-x-1/2 origin-top bg-gradient-to-b from-primary/20 via-primary/10 to-transparent"
                        style={{ height: radius }}
                    />

                    {/* Counter-rotation for the icon itself to stay upright */}
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration, repeat: Infinity, ease: "linear", delay: -delay }}
                        className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-white border border-slate-100 relative z-10",
                            // Keep background tints for color but remove backdrop blur if simple white looks better
                            // Actually backdrop blur on white bg is redundant.
                            bg
                        )}
                    >
                        <Icon className={cn("w-6 h-6", color)} />
                    </motion.div>

                    {/* Tooltip */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-white bg-slate-800 px-2 py-1 rounded pointer-events-none whitespace-nowrap z-20">
                        {label}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Simplified Orbit implementation using pure CSS for orbit, simpler to manage
const OrbitPath = ({ radius, duration, reverse = false }: { radius: number, duration: number, reverse?: boolean }) => {
    return (
        <div className="absolute left-1/2 top-1/2 rounded-full border border-slate-200"
            style={{
                width: radius * 2,
                height: radius * 2,
                marginLeft: -radius,
                marginTop: -radius
            }}
        />
    );
}

export function OrbitingIntegrations() {
    return (
        <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden bg-white/50 rounded-3xl border border-slate-100">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-primary/5 blur-[100px]" />

            {/* Center Node */}
            <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-primary to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 border-4 border-white">
                <span className="text-3xl font-bold text-white">L</span>
                {/* Ripple Effect */}
                <div className="absolute inset-0 rounded-3xl bg-primary/30 animate-ping" />
                <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 animate-pulse delay-75" />
            </div>

            {/* Orbits */}
            <OrbitPath radius={150} duration={20} />
            <OrbitPath radius={240} duration={35} />

            {/* Inner Ring Icons (Radius 150) */}
            <OrbitingIcon icon={Cloud} color="text-sky-500" bg="bg-sky-500/10" radius={150} duration={20} delay={0} label="Salesforce" />
            <OrbitingIcon icon={Slack} color="text-pink-500" bg="bg-pink-500/10" radius={150} duration={20} delay={6.6} label="Slack" />
            <OrbitingIcon icon={Video} color="text-primary" bg="bg-primary/10" radius={150} duration={20} delay={13.3} label="Zoom" />

            {/* Outer Ring Icons (Radius 240) */}
            <OrbitingIcon icon={Calendar} color="text-yellow-500" bg="bg-yellow-500/10" radius={240} duration={35} delay={0} label="Google Calendar" />
            <OrbitingIcon icon={Mail} color="text-primary" bg="bg-primary/10" radius={240} duration={35} delay={7} label="Outlook" />
            <OrbitingIcon icon={Database} color="text-green-500" bg="bg-green-500/10" radius={240} duration={35} delay={14} label="MongoDB" />
            <OrbitingIcon icon={MessageCircle} color="text-purple-500" bg="bg-purple-500/10" radius={240} duration={35} delay={21} label="Intercom" />
            <OrbitingIcon icon={FileText} color="text-orange-500" bg="bg-orange-500/10" radius={240} duration={35} delay={28} label="Notion" />
        </div>
    );
}
