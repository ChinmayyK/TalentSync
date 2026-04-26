'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';

// Premium letter-by-letter animated headline
function AnimatedHeadline() {
    const [mounted, setMounted] = useState(false);
    const line1 = 'Enterprise Hiring,';
    const line2 = 'Simplified';

    useEffect(() => {
        setMounted(true);
    }, []);

    // Spring physics configuration
    const springConfig = {
        type: "spring" as const,
        stiffness: 120,
        damping: 20,
        mass: 0.8,
    };

    // Render static text on server, animated on client
    if (!mounted) {
        return (
            <div className="overflow-hidden">
                <div className="flex flex-wrap">
                    {line1}
                </div>
                <div className="flex flex-wrap bg-clip-text text-transparent bg-gradient-to-r from-primary to-sky-500">
                    {line2}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden">
            {/* Line 1: Enterprise Hiring, */}
            <div className="flex flex-wrap">
                {line1.split('').map((char, index) => (
                    <motion.span
                        key={`line1-${index}`}
                        initial={{
                            opacity: 0,
                            y: char === ' ' ? 0 : 15 + (Math.sin(index * 0.8) * 5),
                            x: char === ' ' ? 0 : Math.cos(index * 0.6) * 4,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            x: 0,
                        }}
                        transition={{
                            ...springConfig,
                            delay: 0.05 + (index * 0.03),
                        }}
                        className="inline-block"
                        style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                    >
                        {char}
                    </motion.span>
                ))}
            </div>

            {/* Line 2: Simplified */}
            <div className="flex flex-wrap">
                {line2.split('').map((char, index) => (
                    <motion.span
                        key={`line2-${index}`}
                        initial={{
                            opacity: 0,
                            y: char === ' ' ? 0 : 20 + (Math.sin(index * 1.2) * 6),
                            x: char === ' ' ? 0 : Math.cos(index * 0.9) * 5,
                            scale: char === ' ' ? 1 : 0.95,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            x: 0,
                            scale: 1,
                        }}
                        transition={{
                            ...springConfig,
                            delay: 0.5 + (index * 0.035),
                        }}
                        className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-primary to-sky-500"
                        style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                    >
                        {char}
                    </motion.span>
                ))}
            </div>
        </div>
    );
}

export function Hero() {
    const [mounted, setMounted] = useState(false);
    const sectionRef = useRef<HTMLElement>(null);

    // Subtle scroll parallax - only for background
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start start", "end start"]
    });

    const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section ref={sectionRef} className="relative overflow-hidden bg-white pt-8 pb-16 sm:pt-12 sm:pb-24 lg:pb-32 lg:pt-16">
            {/* Background decoration with subtle parallax */}
            <motion.div
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
                style={{ y: backgroundY }}
            >
                <div
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                ></div>
            </motion.div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                    {/* Left Column: Text */}
                    <motion.div
                        initial={mounted ? { opacity: 0, y: 20 } : false}
                        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="text-left"
                    >
                        {/* Badge */}
                        <motion.div
                            initial={mounted ? { opacity: 0, y: 10 } : false}
                            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 backdrop-blur-sm px-3 py-1 text-sm font-medium text-primary mb-6 shadow-sm"
                        >
                            <span className="flex h-2 w-2 rounded-full bg-primary mr-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            New: Smart Interview Scheduling
                        </motion.div>

                        {/* Headline - Letter-by-letter animation */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight mb-6 leading-[1.1]">
                            <AnimatedHeadline />
                        </h1>

                        {/* Subheadline */}
                        <motion.p
                            initial={mounted ? { opacity: 0, y: 10 } : false}
                            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                            transition={{ delay: 1.0, duration: 0.6 }}
                            className="mt-4 text-xl text-slate-600 max-w-lg leading-relaxed mb-8"
                        >
                            TalentSync streamlines your entire hiring process. From sourcing to scheduling, manage it all in
                            one cohesive dashboard designed for modern teams.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={mounted ? { opacity: 0, y: 10 } : false}
                            animate={mounted ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                            transition={{ delay: 1.2, duration: 0.6 }}
                            className="flex flex-col sm:flex-row gap-4 justify-start items-center sm:items-stretch w-full sm:w-auto"
                        >
                            <Link href="/signup">
                                <Button
                                    size="lg"
                                    className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto group"
                                >
                                    Start Hiring for Free
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                                </Button>
                            </Link>
                            <Link href="#contact">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-14 px-8 text-lg rounded-full border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto"
                                >
                                    <Calendar className="mr-2 h-5 w-5 text-slate-600" />
                                    Book a Demo
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Trust indicators */}
                        <motion.div
                            initial={mounted ? { opacity: 0 } : false}
                            animate={mounted ? { opacity: 1 } : { opacity: 1 }}
                            transition={{ delay: 1.4, duration: 0.6 }}
                            className="mt-10 flex items-center justify-start gap-x-8 gap-y-4 text-sm font-medium text-slate-500 flex-wrap"
                        >
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                SOC2 Compliant
                            </div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                No credit card required
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Column: Image */}
                    <div className="relative mt-8 lg:mt-0">
                        <motion.div
                            initial={mounted ? { opacity: 0, x: 20 } : false}
                            animate={mounted ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="relative rounded-xl lg:rounded-2xl shadow-2xl shadow-blue-900/20 border border-slate-200/60 bg-white/50 backdrop-blur-sm p-2 w-full max-w-[600px] mx-auto lg:mx-0 lg:ml-auto group"
                        >
                            <div className="relative overflow-hidden rounded-lg lg:rounded-xl">
                                <Image
                                    src="/images/dashboard-hero.png"
                                    alt="TalentSync Dashboard Preview"
                                    width={1200}
                                    height={800}
                                    className="rounded-lg lg:rounded-xl shadow-sm w-full h-auto transition-transform duration-700 group-hover:scale-105"
                                    priority
                                />
                            </div>

                            {/* Floating Card */}
                            {mounted && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20, y: 20 }}
                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                    transition={{ delay: 1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                    className="absolute -left-12 bottom-12 bg-white p-4 rounded-lg shadow-xl border border-slate-100 hidden lg:block max-w-[220px]"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800">Auto-Scheduled</div>
                                            <div className="text-[10px] text-slate-500">Interview with Sarah</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        Confirmed for 2:00 PM
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Bottom Gradient */}
            <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white to-transparent"></div>
        </section>
    );
}
