
'use client';

import "../../../app/globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { vendorNavItems } from "@/lib/navigation-mock-data";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// This layout will reuse AppShell but override navigation
// We might need to modify AppShell to accept overrides better, or just pass them.
// Currently AppShell imports mock data directly. We might need to modify AppShell to accept props for navigation items if we want to override them cleanly without modifying AppShell internals too much.
// Checking AppShell: it accepts props `mainNav`, `adminNav` etc.
// And it sets defaults from mock data if not provided?
// Actually AppShell definition:
// export function AppShell({ children }: AppShellProps) { ... }
// It imports default nav items and uses them. It does NOT accept them as props in the interface `AppShellProps`.
// Line 86: <AppSidebar ... mainNav={mainNavItems} ... />
// So AppShell is hardcoded to use `mainNavItems`.
// I should refactor `AppShell` to accept optional props for navigation, so I can pass vendor nav.
// Or I can create a separate `VendorAppShell`.
// Given `AppShell` is quite complex (state, modals), refactoring it to accept props is better.

// However, for now, I will create a `VendorLayout` that duplicates `AppShell` wrapper structure or just renders `AppSidebar` manually?
// No, `AppShell` handles `MobileHeader`, `CommandPalette` etc.
// Refactoring `AppShell` is the correct path.

// Wait, I can't easily refactor `AppShell` without breaking existing usages if I am not careful.
// Let's modify `AppShell` to accept `navConfig` prop.

export default function VendorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <VendorShell>
            {children}
        </VendorShell>
    );
}

import { useState, useCallback } from 'react';
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { CommandPalette } from "@/components/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { mockCurrentUser, mockTenants } from "@/lib/navigation-mock-data";

function VendorShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [currentTenantId, setCurrentTenantId] = useState(mockCurrentUser.tenantId);

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        router.push('/login');
    };

    // simplified nav for vendor
    const emptyNav = { items: [] };

    return (
        <TooltipProvider>
            <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-background">
                <MobileHeader
                    mainNav={vendorNavItems}
                    adminNav={emptyNav}
                    clientRelatedNav={emptyNav}
                    recruiterRelatedNav={emptyNav}
                    currentUser={mockCurrentUser}
                    onLogout={handleLogout}
                />

                <CommandPalette />

                <AppSidebar
                    tenants={mockTenants}
                    currentTenantId={currentTenantId}
                    currentUser={mockCurrentUser}
                    mainNav={vendorNavItems}
                    adminNav={emptyNav}
                    othersNav={emptyNav}
                    clientRelatedNav={emptyNav}
                    recruiterRelatedNav={emptyNav}
                    onTenantChange={setCurrentTenantId}
                    onLogout={handleLogout}
                />

                <main className="flex-1 overflow-y-auto bg-slate-50 transition-colors relative">
                    {children}
                </main>
            </div>
        </TooltipProvider>
    );
}
