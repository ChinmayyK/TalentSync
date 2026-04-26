'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface TableSkeletonProps {
    /** Number of rows to show */
    rows?: number;
    /** Number of columns to show */
    columns?: number;
    /** Show checkbox column */
    showCheckbox?: boolean;
    /** Show avatar in first data column */
    showAvatar?: boolean;
    /** Optional title to display */
    title?: string;
}

/**
 * Reusable table skeleton loader with shimmer animation
 * Provides a polished loading experience
 */
export function TableSkeleton({
    rows = 5,
    columns = 6,
    showCheckbox = true,
    showAvatar = true,
    title = 'Loading candidates...',
}: TableSkeletonProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
        >
            {/* Loading Header */}
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                    className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm font-medium text-foreground">{title}</p>
                            <p className="text-xs text-muted-foreground">Please wait while we fetch your data</p>
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0.8, opacity: 0.3 }}
                                    animate={{ scale: [0.8, 1, 0.8], opacity: [0.3, 1, 0.3] }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                    className="h-2 w-2 rounded-full bg-primary"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Header Skeleton */}
            <div className="bg-muted/30 px-4 py-3 border-b border-border">
                <div className="flex items-center gap-4">
                    {showCheckbox && (
                        <Skeleton className="h-4 w-4 rounded bg-muted-foreground/10" />
                    )}
                    {Array.from({ length: Math.min(columns, 6) }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className={`h-3 rounded bg-muted-foreground/10 ${i === 0 ? 'w-32' : i === 1 ? 'w-24' : 'w-16'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Rows with staggered animation */}
            <div className="divide-y divide-border/50">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <motion.div
                        key={rowIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                            duration: 0.3,
                            delay: rowIndex * 0.05,
                            ease: "easeOut"
                        }}
                        className="px-4 py-4 flex items-center gap-4 bg-background hover:bg-muted/20 transition-colors"
                    >
                        {showCheckbox && (
                            <Skeleton className="h-4 w-4 rounded bg-muted-foreground/10 shrink-0" />
                        )}

                        {/* First column with avatar */}
                        <div className="flex items-center gap-3 min-w-[180px]">
                            {showAvatar && (
                                <Skeleton className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shrink-0" />
                            )}
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-28 rounded bg-muted-foreground/15" />
                                <Skeleton className="h-3 w-36 rounded bg-muted-foreground/10" />
                            </div>
                        </div>

                        {/* Other columns with varying widths */}
                        {Array.from({ length: Math.min(columns - 1, 5) }).map((_, colIndex) => (
                            <Skeleton
                                key={colIndex}
                                className={`h-5 rounded shrink-0 ${colIndex === 0
                                        ? 'w-20 rounded-full bg-primary/10'
                                        : colIndex === 1
                                            ? 'w-24 bg-muted-foreground/10'
                                            : 'w-16 bg-muted-foreground/10'
                                    }`}
                            />
                        ))}

                        {/* Actions */}
                        <div className="ml-auto">
                            <Skeleton className="h-8 w-8 rounded-md bg-muted-foreground/10" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Footer */}
            <div className="bg-muted/20 px-4 py-3 border-t border-border">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-24 rounded bg-muted-foreground/10" />
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-7 w-20 rounded bg-muted-foreground/10" />
                        <Skeleton className="h-7 w-16 rounded bg-muted-foreground/10" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default TableSkeleton;

