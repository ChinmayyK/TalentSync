'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check } from 'lucide-react';

export function PricingCTA() {
    return (
        <section id="pricing" className="py-20 bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-blue-600 rounded-3xl overflow-hidden shadow-2xl relative"
                >
                    {/* Background pattern */}
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-50" />
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-indigo-600 rounded-full blur-3xl opacity-50" />

                    <div className="relative px-8 py-16 md:py-20 md:px-16 text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                            Start hiring better today
                        </h2>
                        <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                            Join thousands of teams who have transformed their interview process with TalentSync. No credit card required to start.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                            <Link href="/signup">
                                <Button size="lg" className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-xl w-full sm:w-auto font-semibold">
                                    Get Started for Free
                                </Button>
                            </Link>
                        </div>

                        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-blue-100">
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 bg-blue-500 rounded-full p-0.5" />
                                <span>Free 14-day trial</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 bg-blue-500 rounded-full p-0.5" />
                                <span>Cancel anytime</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 bg-blue-500 rounded-full p-0.5" />
                                <span>No setup fees</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
