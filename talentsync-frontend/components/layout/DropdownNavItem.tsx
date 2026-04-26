"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface DropdownNavItemProps {
    title: string;
    icon: LucideIcon;
    children: Array<{
        title: string;
        path: string;
        icon: LucideIcon;
    }>;
    collapsed: boolean;
}

export function DropdownNavItem({ title, icon: Icon, children, collapsed }: DropdownNavItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    if (collapsed) {
        return null; // Don't show dropdowns when sidebar is collapsed
    }

    const isAnyChildActive = children.some(
        (child) => pathname === child.path || pathname.startsWith(child.path + '/')
    );

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left',
                    isAnyChildActive
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
            >
                <div className="flex items-center gap-3">
                    <Icon
                        className={cn(
                            'h-5 w-5 flex-shrink-0',
                            isAnyChildActive ? 'text-blue-600' : 'text-slate-400'
                        )}
                    />
                    <span className="text-sm font-medium">{title}</span>
                </div>
                <ChevronRight
                    className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isOpen ? 'rotate-90' : '',
                        isAnyChildActive ? 'text-blue-600' : 'text-slate-400'
                    )}
                />
            </button>

            {isOpen && (
                <div className="ml-8 space-y-1 border-l-2 border-slate-200 pl-3">
                    {children.map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = pathname === child.path || pathname.startsWith(child.path + '/');

                        return (
                            <Link
                                key={child.path}
                                href={child.path}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                                    isActive
                                        ? 'bg-blue-50 text-blue-600 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                )}
                            >
                                <ChildIcon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                                <span>{child.title}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
