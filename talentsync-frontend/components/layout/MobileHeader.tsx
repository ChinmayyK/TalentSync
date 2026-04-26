'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Menu,
    X,
    LayoutDashboard,
    Users,
    Calendar,
    BarChart3,
    Settings,
    Video,
    MessageSquare,
    Trash2,
    UserCog,
    Plug,
    Activity,
    LogOut,
    LucideIcon,
} from 'lucide-react';
import { NavGroup, NavItem, CurrentUser } from '@/types/navigation';

// Icon mapping from string to actual icon component
const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    Users,
    Calendar,
    BarChart3,
    Settings,
    Trash2,
    Activity,
    Plug,
    Video,
    MessageSquare,
    UserCog,
};

interface MobileHeaderProps {
    mainNav?: NavGroup;
    adminNav?: NavGroup;
    clientRelatedNav?: NavGroup;
    recruiterRelatedNav?: NavGroup;
    currentUser?: CurrentUser;
    onLogout?: () => void;
}

export function MobileHeader({
    mainNav,
    adminNav,
    clientRelatedNav,
    recruiterRelatedNav,
    currentUser,
    onLogout
}: MobileHeaderProps) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // Prevent hydration mismatch from Radix UI generated IDs
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fallback nav items if none provided
    const defaultMainItems: NavItem[] = [
        { title: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
        { title: 'Candidates', path: '/candidates', icon: 'Users' },
        { title: 'Interviews', path: '/interviews', icon: 'Video' },
        { title: 'Calendar', path: '/calendar', icon: 'Calendar' },
        { title: 'Reports', path: '/reports', icon: 'BarChart3' },
    ];

    const mainItems = mainNav?.items || defaultMainItems;
    const adminItems = adminNav?.items || [];

    const renderNavItem = (item: NavItem) => {
        const Icon = iconMap[item.icon] || LayoutDashboard;
        const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

        return (
            <Link
                key={item.path || item.title}
                href={item.path || '#'}
                onClick={() => setOpen(false)}
                className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold scale-[1.02] shadow-sm border-l-4 border-blue-500 ml-0 pl-2.5'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
            >
                <Icon className={cn('h-5 w-5 transition-all', isActive ? 'text-blue-600 h-[22px] w-[22px]' : 'text-slate-400')} />
                {item.title}
                {item.badge && (
                    <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                        {item.badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-50">
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    L
                </div>
                <span className="font-semibold text-slate-900">TalentSync</span>
            </Link>

            {/* Only render Sheet after mount to avoid hydration mismatch with Radix IDs */}
            {mounted ? (
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] p-0">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                <span className="font-semibold text-slate-900">Menu</span>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 hover:rotate-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Navigation */}
                            <ScrollArea className="flex-1">
                                <nav className="p-4 space-y-1">
                                    {/* Main Navigation */}
                                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Main
                                    </p>
                                    {mainItems.map(renderNavItem)}

                                    {/* Admin Navigation */}
                                    {adminItems.length > 0 && (
                                        <>
                                            <Separator className="my-3" />
                                            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                {adminNav?.label || 'Admin'}
                                            </p>
                                            {adminItems.map(renderNavItem)}
                                        </>
                                    )}

                                    {/* Client Related Navigation */}
                                    {clientRelatedNav?.items && clientRelatedNav.items.length > 0 && (
                                        <>
                                            <Separator className="my-3" />
                                            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                {clientRelatedNav.label}
                                            </p>
                                            {clientRelatedNav.items.map(renderNavItem)}
                                        </>
                                    )}

                                    {/* Recruiter Related Navigation */}
                                    {recruiterRelatedNav?.items && recruiterRelatedNav.items.length > 0 && (
                                        <>
                                            <Separator className="my-3" />
                                            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                                {recruiterRelatedNav.label}
                                            </p>
                                            {recruiterRelatedNav.items.map(renderNavItem)}
                                        </>
                                    )}
                                </nav>
                            </ScrollArea>

                            {/* User Footer */}
                            {currentUser && (
                                <div className="p-4 border-t border-slate-200 bg-slate-50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
                                            {currentUser.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {currentUser.name}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {currentUser.email}
                                            </p>
                                        </div>
                                    </div>
                                    {onLogout && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => {
                                                setOpen(false);
                                                onLogout();
                                            }}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sign Out
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                </Button>
            )}
        </header>
    );
}
