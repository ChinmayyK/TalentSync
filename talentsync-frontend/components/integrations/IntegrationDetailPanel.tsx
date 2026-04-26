import { useState } from 'react';
import { Integration } from '@/types/integrations';
import { providerLogos, providerColors, providerDocs } from '@/lib/integrations-mock-data';
import { AuthFlowPanel } from './AuthFlowPanel';
import { FieldMappingPanel } from './FieldMappingPanel';
import { SyncConfigPanel } from './SyncConfigPanel';
import { WebhookEventLog } from './WebhookEventLog';
import { IntegrationMetricsPanel } from './IntegrationMetricsPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  ExternalLink,
  RefreshCw,
  Trash2,
  Power,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Settings,
  Activity,
  Webhook,
  Link2,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationDetailPanelProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (integration: Integration) => void;
  onDisconnect?: (provider: string) => Promise<void>;
  onSync?: (provider: string) => Promise<void>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  connected: { label: 'Connected', variant: 'default', icon: CheckCircle, color: 'text-emerald-500' },
  disconnected: { label: 'Disconnected', variant: 'secondary', icon: Clock, color: 'text-slate-400' },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle, color: 'text-red-500' },
  syncing: { label: 'Syncing', variant: 'outline', icon: Loader2, color: 'text-blue-500' },
  pending_auth: { label: 'Pending Auth', variant: 'outline', icon: Clock, color: 'text-amber-500' },
  auth_required: { label: 'Auth Required', variant: 'outline', icon: AlertCircle, color: 'text-amber-500' },
};

const tabIcons = {
  overview: Settings,
  mapping: Link2,
  events: Webhook,
  metrics: Activity,
};

export function IntegrationDetailPanel({ integration, isOpen, onClose, onUpdate, onDisconnect, onSync }: IntegrationDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAuthFlow, setShowAuthFlow] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!integration) return null;

  const status = statusConfig[integration.status] || statusConfig.disconnected;
  const StatusIcon = status.icon;
  const isConnected = integration.status === 'connected' || integration.status === 'syncing';
  const needsAuth = !isConnected;

  const handleDisconnect = async () => {
    if (onDisconnect) {
      setIsDisconnecting(true);
      try {
        await onDisconnect(integration.provider);
        onUpdate({ ...integration, status: 'disconnected' });
        onClose();
      } finally {
        setIsDisconnecting(false);
      }
    } else {
      toast.success('Integration disconnected');
      onUpdate({ ...integration, status: 'disconnected' });
      onClose();
    }
  };

  const handleTriggerSync = async () => {
    if (onSync) {
      setIsSyncing(true);
      try {
        await onSync(integration.provider);
        onUpdate({ ...integration, status: 'syncing' });
      } finally {
        setIsSyncing(false);
      }
    } else {
      toast.success('Sync initiated', { description: 'Data synchronization started.' });
      onUpdate({ ...integration, status: 'syncing' });
    }
  };

  const handleAuthComplete = () => {
    setShowAuthFlow(false);
    onUpdate({ ...integration, status: 'connected' });
    setActiveTab('mapping');
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col overflow-hidden">
        {/* Premium Header with Gradient */}
        <div className={cn(
          "relative px-6 py-5 border-b border-border/50",
          "bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
        )}>
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_1px_1px,_currentColor_1px,_transparent_1px)] bg-[length:16px_16px]" />

          <SheetHeader className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Large Integration Icon */}
                <div className={cn(
                  "relative w-14 h-14 rounded-xl flex items-center justify-center bg-white shadow-lg overflow-hidden",
                  "ring-2 ring-white/20 ring-offset-2 ring-offset-transparent"
                )}>
                  <img
                    src={providerLogos[integration.provider]}
                    alt={integration.name}
                    className="w-10 h-10 object-contain"
                  />
                  {/* Status indicator dot */}
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                    isConnected ? "bg-emerald-500" : integration.status === 'error' ? "bg-red-500" : "bg-slate-400"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl font-semibold text-foreground truncate">
                    {integration.name}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-muted-foreground mt-0.5">
                    {integration.description || `${integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} integration`}
                  </SheetDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={status.variant}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5",
                        status.variant === 'default' && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                      )}
                    >
                      <StatusIcon className={cn(
                        "h-3 w-3",
                        status.color,
                        integration.status === 'syncing' && "animate-spin"
                      )} />
                      {status.label}
                    </Badge>
                    {isConnected && integration.lastSyncAt && (
                      <span className="text-xs text-muted-foreground">
                        Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isConnected && (
                    <DropdownMenuItem onClick={handleTriggerSync} disabled={isSyncing}>
                      <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                      {isSyncing ? 'Syncing...' : 'Trigger Sync'}
                    </DropdownMenuItem>
                  )}
                  {providerDocs[integration.provider] && (
                    <DropdownMenuItem asChild>
                      <a href={providerDocs[integration.provider]} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Docs
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {isConnected && (
                    <DropdownMenuItem onClick={handleDisconnect} disabled={isDisconnecting} className="text-amber-600">
                      <Power className="mr-2 h-4 w-4" />
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Integration
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SheetHeader>

          {/* Quick Stats Bar for Connected Integrations */}
          {isConnected && (
            <div className="mt-4 grid grid-cols-3 gap-3 relative">
              {[
                { label: 'Records Synced', value: '1,247', icon: Zap },
                { label: 'Last 7 Days', value: '+89', icon: Activity },
                { label: 'Success Rate', value: '99.8%', icon: CheckCircle },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/50 border border-border/50"
                >
                  <stat.icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{stat.value}</p>
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {showAuthFlow || needsAuth ? (
              <AuthFlowPanel
                integration={integration}
                onAuthComplete={handleAuthComplete}
                onCancel={() => {
                  setShowAuthFlow(false);
                  if (needsAuth) onClose();
                }}
              />
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 mb-6 h-11 p-1 bg-muted/50">
                  {(['overview', 'mapping', 'events', 'metrics'] as const).map((tab) => {
                    const Icon = tabIcons[tab];
                    return (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="flex items-center gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline capitalize">{tab}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-0">
                  <SyncConfigPanel
                    integration={integration}
                    onSave={(config) => onUpdate({ ...integration, config })}
                  />
                </TabsContent>

                <TabsContent value="mapping" className="mt-0">
                  <FieldMappingPanel integrationId={integration.id} provider={integration.provider} />
                </TabsContent>

                <TabsContent value="events" className="mt-0">
                  <WebhookEventLog integrationId={integration.id} provider={integration.provider} />
                </TabsContent>

                <TabsContent value="metrics" className="mt-0">
                  <IntegrationMetricsPanel integrationId={integration.id} provider={integration.provider} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
