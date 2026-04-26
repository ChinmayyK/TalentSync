"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Smartphone, Copy, Check, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Image from 'next/image';
import {
    use2FAStatus,
    useInitiate2FASetup,
    useVerify2FASetup,
    useDisable2FA,
    useRegenerateRecoveryCodes,
    TwoFactorSetupResponse,
} from '@/lib/api/two-factor';

interface TwoFactorSetupProps {
    open: boolean;
    onClose: () => void;
}

type SetupStep = 'initial' | 'scanning' | 'verify' | 'recovery' | 'complete';

export function TwoFactorSetupModal({ open, onClose }: TwoFactorSetupProps) {
    const [step, setStep] = useState<SetupStep>('initial');
    const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
    const [token, setToken] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
    const [showManualKey, setShowManualKey] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const { data: status, refetch: refetchStatus } = use2FAStatus();
    const initiateMutation = useInitiate2FASetup();
    const verifyMutation = useVerify2FASetup();

    // Focus input when step changes
    useEffect(() => {
        if (step === 'verify' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [step]);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setStep('initial');
            setSetupData(null);
            setToken('');
            setRecoveryCodes([]);
            setCopied(false);
        }
    }, [open]);

    const handleStartSetup = async () => {
        try {
            const data = await initiateMutation.mutateAsync();
            setSetupData(data);
            setStep('scanning');
        } catch (error: any) {
            toast.error(error.message || 'Failed to start 2FA setup');
        }
    };

    const handleVerify = async () => {
        if (token.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        try {
            const result = await verifyMutation.mutateAsync(token);
            setRecoveryCodes(result.recoveryCodes);
            setStep('recovery');
            toast.success('2FA has been enabled!');
        } catch (error: any) {
            toast.error(error.message || 'Invalid verification code');
            setToken('');
        }
    };

    const handleCopyRecoveryCodes = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setCopied(true);
        toast.success('Recovery codes copied to clipboard');
        setTimeout(() => setCopied(false), 3000);
    };

    const handleComplete = () => {
        refetchStatus();
        onClose();
    };

    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setToken(value);

        // Auto-submit when 6 digits entered
        if (value.length === 6) {
            setTimeout(() => handleVerify(), 100);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <AnimatePresence mode="wait">
                    {/* Step 1: Initial */}
                    {step === 'initial' && (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Enable Two-Factor Authentication
                                </DialogTitle>
                                <DialogDescription>
                                    Add an extra layer of security to your account by requiring a verification code when signing in.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 my-6">
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                    <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">You'll need an authenticator app</p>
                                        <p className="text-muted-foreground">
                                            Like Google Authenticator, Authy, or 1Password
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={onClose}>Cancel</Button>
                                <Button onClick={handleStartSetup} disabled={initiateMutation.isPending}>
                                    {initiateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Continue
                                </Button>
                            </DialogFooter>
                        </motion.div>
                    )}

                    {/* Step 2: Scan QR Code */}
                    {step === 'scanning' && setupData && (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <DialogHeader>
                                <DialogTitle>Scan QR Code</DialogTitle>
                                <DialogDescription>
                                    Scan this QR code with your authenticator app
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-col items-center gap-4 my-6">
                                <div className="p-4 bg-white rounded-lg">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={setupData.qrCodeUrl}
                                        alt="2FA QR Code"
                                        width={200}
                                        height={200}
                                        className="rounded"
                                    />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowManualKey(!showManualKey)}
                                >
                                    {showManualKey ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                    {showManualKey ? 'Hide' : 'Show'} manual entry key
                                </Button>

                                <AnimatePresence>
                                    {showManualKey && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="w-full"
                                        >
                                            <Card>
                                                <CardContent className="pt-4">
                                                    <Label className="text-xs text-muted-foreground">Manual Entry Key</Label>
                                                    <code className="block text-sm font-mono mt-1 break-all">
                                                        {setupData.manualEntryKey}
                                                    </code>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setStep('initial')}>Back</Button>
                                <Button onClick={() => setStep('verify')}>I've scanned it</Button>
                            </DialogFooter>
                        </motion.div>
                    )}

                    {/* Step 3: Verify Code */}
                    {step === 'verify' && (
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <DialogHeader>
                                <DialogTitle>Verify Setup</DialogTitle>
                                <DialogDescription>
                                    Enter the 6-digit code from your authenticator app
                                </DialogDescription>
                            </DialogHeader>

                            <div className="my-6">
                                <Label htmlFor="verify-token">Verification Code</Label>
                                <Input
                                    ref={inputRef}
                                    id="verify-token"
                                    value={token}
                                    onChange={handleTokenChange}
                                    placeholder="000000"
                                    className="text-center text-2xl tracking-widest font-mono mt-2"
                                    maxLength={6}
                                    autoComplete="off"
                                />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setStep('scanning')}>Back</Button>
                                <Button onClick={handleVerify} disabled={token.length !== 6 || verifyMutation.isPending}>
                                    {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Verify & Enable
                                </Button>
                            </DialogFooter>
                        </motion.div>
                    )}

                    {/* Step 4: Recovery Codes */}
                    {step === 'recovery' && (
                        <motion.div
                            key="recovery"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    2FA Enabled Successfully
                                </DialogTitle>
                                <DialogDescription>
                                    Save these recovery codes in a secure location
                                </DialogDescription>
                            </DialogHeader>

                            <div className="my-6">
                                <Alert variant="destructive" className="mb-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        These codes will <strong>only be shown once</strong>. If you lose your device and don't have these codes, you'll lose access to your account.
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                                    {recoveryCodes.map((code, index) => (
                                        <div key={index} className="text-center py-1">
                                            {code}
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full mt-4"
                                    onClick={handleCopyRecoveryCodes}
                                >
                                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                    {copied ? 'Copied!' : 'Copy Recovery Codes'}
                                </Button>
                            </div>

                            <DialogFooter>
                                <Button onClick={handleComplete}>I've saved my codes</Button>
                            </DialogFooter>
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
