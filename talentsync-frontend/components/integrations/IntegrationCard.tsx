import { cn } from '@/lib/utils';
import { Integration } from '@/types/integrations';
import { providerLogos, providerColors } from '@/lib/integrations-mock-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { Settings, RefreshCw, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IntegrationCardProps {
  integration: Integration;
  onConfigure: (id: string) => void;
  onConnect: (id: string) => void;
  onSync?: (id: string) => void;
  isConnecting?: boolean;
  isSyncing?: boolean;
}

const categoryColors: Record<string, string> = {
  hris: "bg-orange-50 text-orange-700 border-orange-200",
  ats: "bg-emerald-50 text-emerald-700 border-emerald-200",
  crm: "bg-blue-50 text-blue-700 border-blue-200",
  calendar: "bg-violet-50 text-violet-700 border-violet-200",
  hcm: "bg-pink-50 text-pink-700 border-pink-200",
  other: "bg-slate-50 text-slate-700 border-slate-200"
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
  connected: { label: 'Connected', variant: 'default', icon: CheckCircle },
  disconnected: { label: 'Disconnected', variant: 'secondary', icon: AlertCircle },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
  syncing: { label: 'Syncing', variant: 'outline', icon: RefreshCw },
  pending_auth: { label: 'Pending', variant: 'outline', icon: AlertTriangle },
  auth_required: { label: 'Auth Required', variant: 'destructive', icon: AlertTriangle },
};

export function IntegrationCard({ integration, onConfigure, onConnect, onSync, isConnecting, isSyncing }: IntegrationCardProps) {
  const status = statusConfig[integration.status] || statusConfig.disconnected;
  const isConnected = integration.status === 'connected' || integration.status === 'syncing';
  const isAuthRequired = integration.status === 'auth_required';
  const supportedObjects = integration.supportedObjects || [];

  return (
    <div className="group relative bg-white dark:bg-card rounded-3xl p-1 transition-all duration-300 hover:-translate-y-1">
      {/* Outer Blue Glow Border Effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10 -z-10 border border-blue-200/50 dark:border-blue-700/30 shadow-[0_8px_30px_rgb(59,130,246,0.15)]" />

      {/* Inner Card Content */}
      <div className="bg-white dark:bg-card rounded-[20px] p-6 h-full flex flex-col relative z-10 shadow-sm border border-white/50 dark:border-white/5">

        {/* Header Section */}
        <div className="flex items-start justify-between mb-5 relative z-10">
          <div className="flex gap-4">
            {/* Logo with Shadow */}
            <div className="relative group-hover:scale-105 transition-transform duration-300 shrink-0">
              <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/20 rounded-2xl blur-md" />
              <div className="w-20 h-20 rounded-2xl border border-white/50 dark:border-white/10 shadow-lg bg-white overflow-hidden flex items-center justify-center p-2">
                <img
                  src={providerLogos[integration.provider]}
                  alt={integration.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="pt-1">
              <h3 className="font-bold text-xl text-slate-900 dark:text-foreground leading-tight mb-2">
                {integration.name || integration.provider} <br /> Integration
              </h3>
              {/* Category Badge - Blue Pill */}
              {integration.category && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-none rounded-md px-2.5 py-0.5 font-semibold text-xs uppercase tracking-wide">
                  {integration.category}
                </Badge>
              )}
            </div>
          </div>

          {/* Right Side: Status & Settings */}
          <div className="flex flex-col items-end gap-3">
            {/* Status Pill */}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm",
              isConnected
                ? "bg-emerald-50 text-emerald-600"
                : isAuthRequired
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-50 text-slate-500"
            )}>
              <div className={cn("w-2 h-2 rounded-full",
                isConnected ? "bg-emerald-500" : isAuthRequired ? "bg-red-500" : "bg-slate-400"
              )} />
              {status.label}
            </div>
          </div>
        </div>

        {/* Settings Cog - Floating in right area roughly */}
        <div className="absolute top-20 right-6">
          <Button variant="outline" size="icon" className="h-9 w-9 bg-white dark:bg-card shadow-sm border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => onConfigure(integration.id)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Description */}
        <div className="mt-2 mb-8 pr-12">
          <p className="text-slate-500 dark:text-muted-foreground text-sm leading-relaxed">
            {integration.description || `Sync your ${integration.name} data and manage operations directly.`}
          </p>
        </div>

        {/* Auth Warning if needed */}
        {isAuthRequired && (
          <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100 flex gap-2 items-center">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium text-red-600">Authentication Required</span>
          </div>
        )}

        {/* Footer: Tags & Action Button */}
        <div className="mt-auto flex items-center justify-between">
          {/* Visual Tags (Pills) */}
          <div className="flex gap-2">
            {supportedObjects.slice(0, 3).map((obj) => (
              <span key={obj} className="px-3 py-1.5 bg-slate-100 dark:bg-secondary/50 rounded-full text-xs font-medium text-slate-500 dark:text-muted-foreground">
                {obj}
              </span>
            ))}
          </div>

          {/* Primary Action Button */}
          {isAuthRequired ? (
            <Button
              size="lg"
              variant="destructive"
              className="rounded-xl px-6 shadow-md"
              onClick={() => onConnect(integration.id)}
              disabled={isConnecting}
            >
              Reconnect
            </Button>
          ) : isConnected ? (
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 shadow-blue-200 dark:shadow-none shadow-lg transition-all"
              onClick={() => onSync?.(integration.id)}
              disabled={isSyncing}
            >
              {isSyncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Sync Now'}
            </Button>
          ) : (
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-semibold shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => onConnect(integration.id)}
            >
              Connect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
