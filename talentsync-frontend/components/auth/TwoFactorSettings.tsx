"use client";

import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Key, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { use2FAStatus } from '@/lib/api/two-factor';
import { TwoFactorSetupModal } from './TwoFactorSetupModal';
import { TwoFactorDisableModal } from './TwoFactorDisableModal';
import { RecoveryCodesModal } from './RecoveryCodesModal';

export function TwoFactorSettings() {
    const { data: status, isLoading, refetch } = use2FAStatus();
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const is2FAEnabled = status?.enabled ?? false;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${is2FAEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                {is2FAEnabled ? (
                                    <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                                <CardDescription>
                                    Add an extra layer of security to your account
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
                            {is2FAEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent>
                    {is2FAEnabled ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Your account is protected with two-factor authentication. You'll need to enter a verification code from your authenticator app when signing in.
                            </p>

                            <Separator />

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRecoveryModal(true)}
                                >
                                    <Key className="h-4 w-4 mr-2" />
                                    View Recovery Codes
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRecoveryModal(true)}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Regenerate Codes
                                </Button>

                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setShowDisableModal(true)}
                                >
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    Disable 2FA
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Two-factor authentication adds an extra layer of security by requiring a verification code in addition to your password when signing in.
                            </p>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Recommended apps:</span>
                                <span className="font-medium">Google Authenticator</span>
                                <span>•</span>
                                <span className="font-medium">Authy</span>
                                <span>•</span>
                                <span className="font-medium">1Password</span>
                            </div>

                            <Button onClick={() => setShowSetupModal(true)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Enable Two-Factor Authentication
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <TwoFactorSetupModal
                open={showSetupModal}
                onClose={() => {
                    setShowSetupModal(false);
                    refetch();
                }}
            />

            <TwoFactorDisableModal
                open={showDisableModal}
                onClose={() => {
                    setShowDisableModal(false);
                    refetch();
                }}
            />

            <RecoveryCodesModal
                open={showRecoveryModal}
                onClose={() => setShowRecoveryModal(false)}
            />
        </>
    );
}
