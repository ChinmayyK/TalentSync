'use client';

import { motion } from 'framer-motion';

export function TrustedBy() {
    const companies = [
        { name: 'Acme Corp' },
        { name: 'TechStart' },
        { name: 'Global Hire' },
        { name: 'Future Tech' },
        { name: 'CloudScale' },
        { name: 'Nexus' },
        { name: 'Orbit' },
        { name: 'Vertex' },
    ];

    // Double the array for seamless loop
    const displayCompanies = [...companies, ...companies];

    return (
        <section className="py-12 bg-slate-50 border-y border-slate-100 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
                    Trusted by innovative hiring teams
                </p>

                <div className="relative w-full mask-gradient">
                    {/* Gradient masks for smooth fade edges */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10"></div>
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10"></div>

                    <motion.div
                        className="flex items-center gap-16 whitespace-nowrap"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{
                            repeat: Infinity,
                            duration: 30,
                            ease: "linear",
                            repeatType: "loop"
                        }}
                    >
                        {displayCompanies.map((company, index) => (
                            <div
                                key={index}
                                className="text-2xl font-bold text-slate-300 hover:text-slate-400 transition-colors cursor-default"
                            >
                                {company.name}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
