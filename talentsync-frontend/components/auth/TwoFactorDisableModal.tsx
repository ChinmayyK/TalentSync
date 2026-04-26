"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useDisable2FA } from '@/lib/api/two-factor';

interface TwoFactorDisableModalProps {
    open: boolean;
    onClose: () => void;
}

export function TwoFactorDisableModal({ open, onClose }: TwoFactorDisableModalProps) {
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');

    const disableMutation = useDisable2FA();

    const handleDisable = async () => {
        if (!password) {
            toast.error('Please enter your password');
            return;
        }
        if (token.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        try {
            await disableMutation.mutateAsync({ password, token });
            toast.success('Two-factor authentication has been disabled');
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to disable 2FA');
        }
    };

    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setToken(value);
    };

    const handleClose = () => {
        setPassword('');
        setToken('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldOff className="h-5 w-5" />
                            Disable Two-Factor Authentication
                        </DialogTitle>
                        <DialogDescription>
                            This will remove the extra layer of security from your account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-6">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Your account will be less secure without 2FA. Only disable if absolutely necessary.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <Label htmlFor="disable-password">Current Password</Label>
                            <Input
                                id="disable-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="disable-token">Authenticator Code</Label>
                            <Input
                                id="disable-token"
                                value={token}
                                onChange={handleTokenChange}
                                placeholder="000000"
                                className="text-center text-lg tracking-widest font-mono"
                                maxLength={6}
                                autoComplete="off"
                            />
                            <p className="text-xs text-muted-foreground">
                                Or use a recovery code
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisable}
                            disabled={!password || token.length !== 6 || disableMutation.isPending}
                        >
                            {disableMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Disable 2FA
                        </Button>
                    </DialogFooter>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
