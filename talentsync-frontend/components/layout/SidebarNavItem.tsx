'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon, Plus } from 'lucide-react';

interface NavItem {
    name: string;
    href?: string;
    addPath?: string;
    icon: LucideIcon;
    badge?: number;
}

interface SidebarNavItemProps {
    item: NavItem;
    collapsed: boolean;
    isActive: boolean;
}

export function SidebarNavItem({ item, collapsed, isActive }: SidebarNavItemProps) {
    const Icon = item.icon;
    const router = useRouter();

    // Don't render if no href (dropdown items)
    if (!item.href) {
        return null;
    }

    // Collapsed state - icon only with indicator
    if (collapsed) {
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <Link
                        href={item.href}
                        className={cn(
                            'relative flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200',
                            isActive
                                ? 'bg-blue-100 text-blue-600 shadow-md scale-110'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:scale-105'
                        )}
                    >
                        {/* Active indicator dot */}
                        {isActive && (
                            <span className="absolute -left-1 w-1.5 h-6 bg-blue-500 rounded-full" />
                        )}
                        <Icon className={cn('h-5 w-5', isActive && 'h-[22px] w-[22px]')} />

                        {/* Badge indicator for collapsed */}
                        {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {item.badge > 9 ? '9+' : item.badge}
                            </span>
                        )}
                    </Link>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    sideOffset={12}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2 font-medium',
                        isActive && 'bg-blue-600 text-white'
                    )}
                >
                    {item.name}
                    {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                            variant={isActive ? "outline" : "secondary"}
                            className={cn(
                                "h-5 min-w-[20px] px-1.5 text-xs",
                                isActive && "border-white/50 text-white"
                            )}
                        >
                            {item.badge}
                        </Badge>
                    )}
                </TooltipContent>
            </Tooltip>
        );
    }

    // Expanded state
    return (
        <div className="relative group">
            <Link
                href={item.href}
                className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold text-base scale-[1.02] shadow-sm border-l-4 border-blue-500 ml-0 pl-2.5'
                        : 'text-slate-600 text-sm font-medium hover:bg-slate-100 hover:text-slate-900'
                )}
            >
                <Icon
                    className={cn(
                        'h-5 w-5 flex-shrink-0 transition-all',
                        isActive ? 'text-blue-600 h-[22px] w-[22px]' : 'text-slate-400'
                    )}
                />
                <span className="flex-1">{item.name}</span>
                {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {item.badge}
                    </Badge>
                )}
            </Link>

            {/* Plus icon button - shows on hover */}
            {item.addPath && (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(item.addPath!);
                            }}
                            className={cn(
                                'absolute right-2 top-1/2 -translate-y-1/2',
                                'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                                'p-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white',
                                'shadow-md hover:shadow-lg'
                            )}
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                        <p className="text-xs">Add {item.name}</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

