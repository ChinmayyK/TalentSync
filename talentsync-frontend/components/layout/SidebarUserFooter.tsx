'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarUserFooterProps {
  user: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onLogout: () => void;
}

export function SidebarUserFooter({ user, collapsed, onCollapsedChange, onLogout }: SidebarUserFooterProps) {
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('p-3', collapsed && 'flex flex-col items-center gap-2')}>
      {/* User Card and Collapse Button - Horizontal Layout */}
      <div className={cn('flex items-center gap-2', collapsed && 'flex-col')}>
        {/* User Card */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors text-left',
                collapsed ? 'justify-center p-2 w-full' : 'flex-1'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.role}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? 'center' : 'end'} side="top" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse Toggle - Modern Design */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className={cn(
                'group relative overflow-hidden flex-shrink-0',
                'w-9 h-9 rounded-lg',
                'bg-gradient-to-br from-slate-100 to-slate-200',
                'border border-slate-300/50',
                'hover:from-blue-100 hover:to-sky-100',
                'hover:border-blue-300',
                'hover:shadow-lg hover:shadow-blue-200/50',
                'transition-all duration-300',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                'flex items-center justify-center'
              )}
            >
              {/* Animated background glow */}
              <div
                className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                  'bg-gradient-to-br from-blue-400/20 to-sky-400/20'
                )}
              />

              {/* Icon with rotation animation */}
              <div className="relative transition-transform duration-300 group-hover:scale-110">
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
                ) : (
                  <PanelLeftClose className="h-4 w-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
                )}
              </div>

              {/* Pulse effect on hover */}
              <div
                className={cn(
                  'absolute inset-0 rounded-lg',
                  'opacity-0 group-hover:opacity-100',
                  'bg-blue-400/20',
                  'animate-ping',
                  'transition-opacity duration-300'
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
