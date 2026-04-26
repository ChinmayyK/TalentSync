'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
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
  CheckCircle,
  Link as LinkIcon,
  Briefcase,
  MapPin,
  Building2,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  List,
  Plus,
  ChevronRight,
  LucideIcon,
  ChevronDown
} from 'lucide-react';
import { SidebarNavItem } from './SidebarNavItem';
import { DropdownNavItem } from './DropdownNavItem';
import { SidebarUserFooter } from './SidebarUserFooter';
import { TenantSelector } from './TenantSelector';
import { ViewSelector } from './ViewSelector';
import { SidebarSearch } from './SidebarSearch';
import { NavGroup, NavItem as NavItemType, CurrentUser, Tenant } from '@/types/navigation';

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
  CheckCircle2: CheckCircle,
  Link2: LinkIcon,
  Briefcase,
  MapPin,
  Building2,
  UserCheck,
  UserPlus,
  FileSpreadsheet,
  List,
  Plus,
};

type NavView = 'MAIN' | 'ADMIN' | 'OTHERS';

interface AppSidebarProps {
  tenants: Tenant[];
  currentTenantId: string;
  currentUser: CurrentUser;
  mainNav: NavGroup;
  adminNav: NavGroup;
  othersNav: NavGroup;
  clientRelatedNav: NavGroup;
  recruiterRelatedNav: NavGroup;
  onTenantChange: (tenantId: string) => void;
  onLogout: () => void;
}

export function AppSidebar({
  tenants,
  currentTenantId,
  currentUser,
  mainNav,
  adminNav,
  othersNav,
  clientRelatedNav,
  recruiterRelatedNav,
  onTenantChange,
  onLogout,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<NavView>('MAIN');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Sync view with pathname and handle initial mount
  useEffect(() => {
    setMounted(true);
    if (pathname.startsWith('/admin') || pathname.startsWith('/integrations')) {
      setCurrentView('ADMIN');
    } else if (pathname.startsWith('/others')) {
      setCurrentView('OTHERS');
    } else {
      setCurrentView('MAIN');
    }
  }, [pathname]);

  const currentTenant = tenants.find((t) => t.id === currentTenantId);

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Transform NavItem from types to the format expected by SidebarNavItem
  const transformNavItem = (item: NavItemType) => ({
    name: item.title,
    href: item.path,
    addPath: item.addPath,
    icon: iconMap[item.icon] || LayoutDashboard,
    badge: item.badge,
  });

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 relative',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Header / Tenant Selector */}
      <div className="p-4 border-b border-slate-200">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer">
                {currentTenant?.name?.charAt(0) || 'L'}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{currentTenant?.name || 'TalentSync'}</TooltipContent>
          </Tooltip>
        ) : (
          <TenantSelector
            tenants={tenants}
            currentTenantId={currentTenantId}
            onTenantChange={onTenantChange}
            collapsed={collapsed}
          />
        )}
      </div>

      {/* Search */}
      <SidebarSearch
        mainNav={mainNav}
        adminNav={adminNav}
        othersNav={othersNav}
        clientRelatedNav={clientRelatedNav}
        recruiterRelatedNav={recruiterRelatedNav}
        collapsed={collapsed}
      />

      {/* View Selector Dropdown - Always visible for mobile */}
      <div className="px-4 py-3 border-b border-slate-100">
        <ViewSelector
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            // Navigate to the first item of the selected view
            if (view === 'MAIN') router.push('/dashboard');
            else if (view === 'ADMIN') router.push('/admin/users-and-teams');
            else if (view === 'OTHERS') router.push('/others/statuses');
          }}
          collapsed={collapsed}
        />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        {currentView === 'MAIN' && (
          <>
            {!collapsed && (
              <div className="mb-2 px-3 py-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Workspace
                </span>
              </div>
            )}
            <nav className="space-y-1">
              {mainNav.items.map((item) => {
                const transformed = transformNavItem(item);
                return (
                  <SidebarNavItem
                    key={transformed.href}
                    item={transformed}
                    collapsed={collapsed}
                    isActive={pathname === transformed.href || pathname.startsWith(transformed.href + '/')}
                  />
                );
              })}
            </nav>
          </>
        )}

        {currentView === 'ADMIN' && (
          <>
            {/* Control Panel Section */}
            {!collapsed && (
              <div className="mb-2 px-3 py-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Control Panel
                </span>
              </div>
            )}
            <nav className="space-y-1">
              {adminNav.items.map((item) => {
                const transformed = transformNavItem(item);
                return (
                  <SidebarNavItem
                    key={transformed.href}
                    item={transformed}
                    collapsed={collapsed}
                    isActive={pathname === transformed.href || pathname.startsWith(transformed.href + '/')}
                  />
                );
              })}
            </nav>

            {/* Client Related Section */}
            {!collapsed && (
              <div className="mt-6 mb-2 px-3 py-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  {clientRelatedNav.label}
                </span>
              </div>
            )}
            <nav className="space-y-1">
              {clientRelatedNav.items.map((item) => {
                const transformed = transformNavItem(item);
                return (
                  <SidebarNavItem
                    key={transformed.href}
                    item={transformed}
                    collapsed={collapsed}
                    isActive={pathname === transformed.href || pathname.startsWith(transformed.href + '/')}
                  />
                );
              })}
            </nav>

            {/* Recruiter Related Section */}
            {!collapsed && (
              <div className="mt-6 mb-2 px-3 py-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  {recruiterRelatedNav.label}
                </span>
              </div>
            )}
            <nav className="space-y-1">
              {recruiterRelatedNav.items.map((item) => {
                const transformed = transformNavItem(item);
                return (
                  <SidebarNavItem
                    key={transformed.href}
                    item={transformed}
                    collapsed={collapsed}
                    isActive={pathname === transformed.href || pathname.startsWith(transformed.href + '/')}
                  />
                );
              })}
            </nav>
          </>
        )}

        {currentView === 'OTHERS' && (
          <>
            {!collapsed && (
              <div className="mb-2 px-3 py-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  Resources
                </span>
              </div>
            )}
            <nav className="space-y-1">
              {othersNav.items.map((item) => {
                const transformed = transformNavItem(item);
                return (
                  <SidebarNavItem
                    key={transformed.href}
                    item={transformed}
                    collapsed={collapsed}
                    isActive={pathname === transformed.href || pathname.startsWith(transformed.href + '/')}
                  />
                );
              })}
            </nav>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-200">
        <SidebarUserFooter
          user={{
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            avatar: currentUser.avatarUrl,
          }}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          onLogout={onLogout}
        />
      </div>
    </aside>
  );
}
