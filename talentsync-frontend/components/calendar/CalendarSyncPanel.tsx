'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Trash2, Calendar, Loader2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    useConnectedCalendarAccounts,
    useDisconnectGoogleCalendar,
    useDisconnectMicrosoftCalendar,
    useSyncCalendarAccount,
    useToggleCalendarSync,
    initiateGoogleConnect,
    initiateMicrosoftConnect,
} from '@/lib/hooks/useCalendar';

// Provider icons (inline SVG for Google and Microsoft)
const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const MicrosoftIcon = () => (
    <svg viewBox="0 0 23 23" width="20" height="20" className="mr-2">
        <rect fill="#f25022" x="1" y="1" width="10" height="10" />
        <rect fill="#00a4ef" x="1" y="12" width="10" height="10" />
        <rect fill="#7fba00" x="12" y="1" width="10" height="10" />
        <rect fill="#ffb900" x="12" y="12" width="10" height="10" />
    </svg>
);

interface CalendarSyncPanelProps {
    className?: string;
}

export function CalendarSyncPanel({ className }: CalendarSyncPanelProps) {
    const [disconnectProvider, setDisconnectProvider] = useState<'google' | 'microsoft' | null>(null);
    const [connectingProvider, setConnectingProvider] = useState<'google' | 'microsoft' | null>(null);

    const { data, isLoading, refetch } = useConnectedCalendarAccounts();
    const disconnectGoogle = useDisconnectGoogleCalendar();
    const disconnectMicrosoft = useDisconnectMicrosoftCalendar();
    const syncAccount = useSyncCalendarAccount();
    const toggleSync = useToggleCalendarSync();

    const accounts = data?.accounts || [];
    const googleAccount = accounts.find(a => a.provider === 'google');
    const microsoftAccount = accounts.find(a => a.provider === 'microsoft');

    const handleConnectGoogle = async () => {
        setConnectingProvider('google');
        try {
            const redirectUri = `${window.location.origin}/calendar/oauth/callback`;
            const authUrl = await initiateGoogleConnect(redirectUri);
            // Store state for callback
            sessionStorage.setItem('calendar_oauth_provider', 'google');
            sessionStorage.setItem('calendar_oauth_redirect', window.location.href);
            // Redirect to OAuth
            window.location.href = authUrl;
        } catch (error) {
            toast.error('Failed to initiate Google Calendar connection');
            setConnectingProvider(null);
        }
    };

    const handleConnectMicrosoft = async () => {
        setConnectingProvider('microsoft');
        try {
            const redirectUri = `${window.location.origin}/calendar/oauth/callback`;
            const authUrl = await initiateMicrosoftConnect(redirectUri);
            // Store state for callback
            sessionStorage.setItem('calendar_oauth_provider', 'microsoft');
            sessionStorage.setItem('calendar_oauth_redirect', window.location.href);
            // Redirect to OAuth
            window.location.href = authUrl;
        } catch (error) {
            toast.error('Failed to initiate Microsoft Calendar connection');
            setConnectingProvider(null);
        }
    };

    const handleDisconnect = async () => {
        if (!disconnectProvider) return;

        try {
            if (disconnectProvider === 'google') {
                await disconnectGoogle.mutateAsync();
            } else {
                await disconnectMicrosoft.mutateAsync();
            }
            toast.success(`${disconnectProvider === 'google' ? 'Google' : 'Microsoft'} Calendar disconnected`);
        } catch (error) {
            toast.error('Failed to disconnect calendar');
        } finally {
            setDisconnectProvider(null);
        }
    };

    const handleSync = async (accountId: string) => {
        try {
            const result = await syncAccount.mutateAsync(accountId);
            toast.success(`Synced ${result.eventsProcessed} events`);
        } catch (error) {
            toast.error('Failed to sync calendar');
        }
    };

    const handleToggleSync = async (accountId: string, enabled: boolean) => {
        try {
            await toggleSync.mutateAsync({ accountId, enabled });
            toast.success(`Calendar sync ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            toast.error('Failed to update sync settings');
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Calendar Sync
                </CardTitle>
                <CardDescription>
                    Connect your calendar to automatically sync busy times and availability
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* Google Calendar */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <GoogleIcon />
                                <div>
                                    <div className="font-medium">Google Calendar</div>
                                    {googleAccount ? (
                                        <div className="text-sm text-muted-foreground">
                                            Connected as {googleAccount.providerAccountId}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            Not connected
                                        </div>
                                    )}
                                </div>
                            </div>
                            {googleAccount ? (
                                <div className="flex items-center gap-2">
                                    {googleAccount.lastSyncAt && (
                                        <span className="text-xs text-muted-foreground">
                                            Last sync: {format(new Date(googleAccount.lastSyncAt), 'MMM d, h:mm a')}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Switch
                                            checked={googleAccount.syncEnabled}
                                            onCheckedChange={(checked) => handleToggleSync(googleAccount.id, checked)}
                                            disabled={toggleSync.isPending}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {googleAccount.syncEnabled ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleSync(googleAccount.id)}
                                        disabled={syncAccount.isPending}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncAccount.isPending ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDisconnectProvider('google')}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={handleConnectGoogle}
                                    disabled={connectingProvider === 'google'}
                                >
                                    {connectingProvider === 'google' ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    Connect
                                </Button>
                            )}
                        </div>

                        {/* Microsoft Calendar */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <MicrosoftIcon />
                                <div>
                                    <div className="font-medium">Microsoft Outlook</div>
                                    {microsoftAccount ? (
                                        <div className="text-sm text-muted-foreground">
                                            Connected as {microsoftAccount.providerAccountId}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            Not connected
                                        </div>
                                    )}
                                </div>
                            </div>
                            {microsoftAccount ? (
                                <div className="flex items-center gap-2">
                                    {microsoftAccount.lastSyncAt && (
                                        <span className="text-xs text-muted-foreground">
                                            Last sync: {format(new Date(microsoftAccount.lastSyncAt), 'MMM d, h:mm a')}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Switch
                                            checked={microsoftAccount.syncEnabled}
                                            onCheckedChange={(checked) => handleToggleSync(microsoftAccount.id, checked)}
                                            disabled={toggleSync.isPending}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {microsoftAccount.syncEnabled ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleSync(microsoftAccount.id)}
                                        disabled={syncAccount.isPending}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncAccount.isPending ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDisconnectProvider('microsoft')}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={handleConnectMicrosoft}
                                    disabled={connectingProvider === 'microsoft'}
                                >
                                    {connectingProvider === 'microsoft' ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : null}
                                    Connect
                                </Button>
                            )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                            <p>
                                When connected, your calendar events will be synced every 30 days ahead.
                                Busy times from your calendar will automatically block availability.
                            </p>
                        </div>
                    </>
                )}
            </CardContent>

            {/* Disconnect Confirmation */}
            <AlertDialog open={!!disconnectProvider} onOpenChange={() => setDisconnectProvider(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Calendar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the connection to your{' '}
                            {disconnectProvider === 'google' ? 'Google' : 'Microsoft'} calendar.
                            Synced busy times will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnect}
                            className="bg-destructive text-destructive-foreground"
                        >
                            Disconnect
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
