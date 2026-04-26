'use client';

import { motion } from 'framer-motion';

interface AuthHeaderProps {
    title: string;
    subtitle?: string | React.ReactNode;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 text-center"
        >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                    {title}
                </span>
            </h2>
            {subtitle && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="mt-3 text-sm text-slate-600"
                >
                    {subtitle}
                </motion.p>
            )}
        </motion.div>
    );
}
