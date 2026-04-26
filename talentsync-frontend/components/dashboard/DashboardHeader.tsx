import { Bell, Settings, ChevronDown, Building2, LogOut, User, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

const tenants = [
  { id: 'talentsync', name: 'TalentSync', logo: 'MS' },
];

interface DashboardHeaderProps {
  currentTenant?: string;
  onTenantChange?: (tenantId: string) => void;
}

export function DashboardHeader({ currentTenant = 'talentsync', onTenantChange }: DashboardHeaderProps) {
  const tenant = tenants.find(t => t.id === currentTenant) || tenants[0];

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 h-16">
        {/* Left: Logo + Tenant */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-lg text-foreground hidden sm:block">TalentSync</span>
          </div>

          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* Tenant Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9 px-3">
                <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-muted-foreground">{tenant.logo}</span>
                </div>
                <span className="text-sm font-medium hidden sm:block">{tenant.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Switch Organization
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tenants.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => onTenantChange?.(t.id)}
                  className="gap-3"
                >
                  <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground">{t.logo}</span>
                  </div>
                  <span className="font-medium">{t.name}</span>
                  {t.id === currentTenant && (
                    <span className="ml-auto text-xs text-primary">Active</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-3">
                <Building2 className="h-4 w-4" />
                Manage Organizations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Actions + Avatar */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">CK</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium leading-none">Chinmay Kudalkar</div>
                  <div className="text-xs text-muted-foreground leading-none mt-0.5">Admin</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">Chinmay Kudalkar</span>
                  <span className="text-xs text-muted-foreground font-normal">admin@talentsync.com</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
