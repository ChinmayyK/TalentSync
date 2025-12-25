'use client';

import { motion } from 'framer-motion';

const steps = [
    {
        number: '01',
        title: 'Create Your TalentSync',
        description: 'Set up your hiring pipeline, roles, and interviewer availability in minutes.',
    },
    {
        number: '02',
        title: 'Automate Scheduling',
        description: 'Let TalentSync coordinate times between candidates and interviewers automatically.',
    },
    {
        number: '03',
        title: 'Hire the Best',
        description: 'Compare feedback, analyze results, and make confident hiring decisions.',
    },
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-20 sm:py-32 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        How TalentSync Works
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                        A simple, streamlined process designed to save you hours every week.
                    </p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="relative flex flex-col items-center text-center"
                        >
                            <div className="w-24 h-24 bg-white rounded-full border-4 border-blue-50 flex items-center justify-center mb-6 z-10 relative shadow-sm">
                                <span className="text-3xl font-bold text-blue-600">{step.number}</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                            <p className="text-slate-600 leading-relaxed px-4">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

