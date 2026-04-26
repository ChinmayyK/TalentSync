'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Trash2,
    Mail,
    MessageSquare,
    Calendar,
    Tag,
    Download,
    MoreHorizontal,
    X,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuickAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    variant?: 'default' | 'destructive';
    onClick: () => void;
}

interface QuickActionsToolbarProps {
    /** Number of items selected */
    selectedCount: number;
    /** Primary actions (shown as buttons) */
    primaryActions: QuickAction[];
    /** Secondary actions (shown in dropdown) */
    secondaryActions?: QuickAction[];
    /** Called when selection is cleared */
    onClearSelection: () => void;
    /** Additional class */
    className?: string;
}

/**
 * Floating quick actions toolbar for bulk operations
 * Shows at bottom of screen when items are selected
 */
export function QuickActionsToolbar({
    selectedCount,
    primaryActions,
    secondaryActions = [],
    onClearSelection,
    className,
}: QuickActionsToolbarProps) {
    if (selectedCount === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                    'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
                    'bg-white dark:bg-slate-900 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700',
                    'px-4 py-2 flex items-center gap-3',
                    className
                )}
            >
                {/* Selection count */}
                <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-700">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                        {selectedCount}
                    </span>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        selected
                    </span>
                </div>

                {/* Primary actions */}
                <div className="flex items-center gap-1">
                    {primaryActions.map((action) => (
                        <Button
                            key={action.id}
                            variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
                            size="sm"
                            onClick={action.onClick}
                            className={cn(
                                'gap-2 h-9',
                                action.variant !== 'destructive' && 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            )}
                        >
                            {action.icon}
                            <span className="hidden sm:inline">{action.label}</span>
                        </Button>
                    ))}
                </div>

                {/* Secondary actions dropdown */}
                {secondaryActions.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {secondaryActions.map((action) => (
                                <DropdownMenuItem
                                    key={action.id}
                                    onClick={action.onClick}
                                    className={cn(
                                        action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                                    )}
                                >
                                    {action.icon}
                                    <span className="ml-2">{action.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Clear selection */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-slate-600 ml-1"
                >
                    <X className="h-4 w-4" />
                </Button>
            </motion.div>
        </AnimatePresence>
    );
}

// Pre-configured action presets
export const QUICK_ACTIONS = {
    delete: (onClick: () => void): QuickAction => ({
        id: 'delete',
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        variant: 'destructive',
        onClick,
    }),
    email: (onClick: () => void): QuickAction => ({
        id: 'email',
        label: 'Email',
        icon: <Mail className="h-4 w-4" />,
        onClick,
    }),
    message: (onClick: () => void): QuickAction => ({
        id: 'message',
        label: 'Message',
        icon: <MessageSquare className="h-4 w-4" />,
        onClick,
    }),
    schedule: (onClick: () => void): QuickAction => ({
        id: 'schedule',
        label: 'Schedule',
        icon: <Calendar className="h-4 w-4" />,
        onClick,
    }),
    tag: (onClick: () => void): QuickAction => ({
        id: 'tag',
        label: 'Add Tag',
        icon: <Tag className="h-4 w-4" />,
        onClick,
    }),
    export: (onClick: () => void): QuickAction => ({
        id: 'export',
        label: 'Export',
        icon: <Download className="h-4 w-4" />,
        onClick,
    }),
};

export default QuickActionsToolbar;
