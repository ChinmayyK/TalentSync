'use client';

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
    message?: string;
    submessage?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
}

export function PageLoader({
    message = 'Loading...',
    submessage,
    className,
    size = 'md',
    fullScreen = true,
}: PageLoaderProps) {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-10 w-10',
        lg: 'h-14 w-14',
    };

    const textSizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
    };

    return (
        <div
            className={cn(
                'flex items-center justify-center',
                fullScreen && 'min-h-[60vh]',
                className
            )}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center"
            >
                {/* Animated Spinner Container - Single spinner */}
                <div className="relative mx-auto mb-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className={cn(
                            'rounded-full border-4 border-primary/20 border-t-primary',
                            size === 'sm' && 'h-12 w-12',
                            size === 'md' && 'h-16 w-16',
                            size === 'lg' && 'h-20 w-20'
                        )}
                    />
                </div>

                {/* Loading Text */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <p className={cn(
                        'font-medium text-slate-700 dark:text-slate-200',
                        textSizeClasses[size]
                    )}>
                        {message}
                    </p>
                    {submessage && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {submessage}
                        </p>
                    )}
                </motion.div>

                {/* Animated dots */}
                <div className="flex items-center justify-center gap-1 mt-4">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                            className="w-2 h-2 rounded-full bg-primary/50"
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

// Card-style loader for inline loading states
export function CardLoader({ message = 'Loading...' }: { message?: string }) {
    return (
        <div className="bg-card rounded-xl border border-border/50 p-8">
            <PageLoader message={message} size="sm" fullScreen={false} />
        </div>
    );
}

// Table skeleton loader
export function TableLoader({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="bg-muted/30 p-4 border-b border-border/50">
                <div className="flex gap-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <div
                            key={i}
                            className="h-4 bg-muted rounded animate-pulse"
                            style={{ width: `${Math.random() * 80 + 60}px` }}
                        />
                    ))}
                </div>
            </div>
            {/* Rows */}
            <div className="divide-y divide-border/50">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <motion.div
                        key={rowIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: rowIndex * 0.05 }}
                        className="p-4 flex gap-4"
                    >
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <div
                                key={colIndex}
                                className="h-4 bg-muted/50 rounded animate-pulse"
                                style={{
                                    width: `${Math.random() * 100 + 50}px`,
                                    animationDelay: `${colIndex * 100}ms`
                                }}
                            />
                        ))}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
