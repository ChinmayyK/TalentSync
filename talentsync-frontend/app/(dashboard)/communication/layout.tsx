'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Send,
    FileText,
    Zap,
    Settings
} from 'lucide-react';

const tabs = [
    { label: 'Overview', href: '/communication', icon: LayoutDashboard },
    { label: 'Messages', href: '/communication/messages', icon: Send },
    { label: 'Templates', href: '/communication/templates', icon: FileText },
    { label: 'Automations', href: '/communication/automations', icon: Zap },
    { label: 'Channels', href: '/communication/channels', icon: Settings },
];

export default function CommunicationLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/communication') {
            return pathname === '/communication';
        }
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sub-navigation */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="px-4 md:px-8">
                    <nav
                        className="flex items-center gap-2 py-2 overflow-x-auto w-full [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {tabs.map((tab) => (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${isActive(tab.href)
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
