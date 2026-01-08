"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Copy, Check, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useRegenerateRecoveryCodes } from '@/lib/api/two-factor';

interface RecoveryCodesModalProps {
    open: boolean;
    onClose: () => void;
}

export function RecoveryCodesModal({ open, onClose }: RecoveryCodesModalProps) {
    const [activeTab, setActiveTab] = useState<'view' | 'regenerate'>('view');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
    const [hasRegenerated, setHasRegenerated] = useState(false);

    const regenerateMutation = useRegenerateRecoveryCodes();

    const handleRegenerate = async () => {
        try {
            const result = await regenerateMutation.mutateAsync();
            setRecoveryCodes(result.recoveryCodes);
            setHasRegenerated(true);
            setActiveTab('view');
            toast.success('New recovery codes generated');
        } catch (error: any) {
            toast.error(error.message || 'Failed to regenerate codes');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setCopied(true);
        toast.success('Recovery codes copied to clipboard');
        setTimeout(() => setCopied(false), 3000);
    };

    const handleClose = () => {
        if (!hasRegenerated || recoveryCodes.length === 0) {
            onClose();
            return;
        }
        // Show warning if they haven't copied
        if (!copied) {
            if (confirm('Have you saved your recovery codes? They will not be shown again.')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-primary" />
                            Recovery Codes
                        </DialogTitle>
                        <DialogDescription>
                            Use these codes to access your account if you lose your authenticator device.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'view' | 'regenerate')} className="mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="view">View Codes</TabsTrigger>
                            <TabsTrigger value="regenerate">Regenerate</TabsTrigger>
                        </TabsList>

                        <TabsContent value="view" className="mt-4">
                            {recoveryCodes.length > 0 ? (
                                <div className="space-y-4">
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>
                                            These codes will <strong>only be shown once</strong>. Save them now!
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
                                        className="w-full"
                                        onClick={handleCopy}
                                    >
                                        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                        {copied ? 'Copied!' : 'Copy Recovery Codes'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Recovery codes can only be viewed when first generated.</p>
                                    <p className="text-sm mt-2">If you've lost them, regenerate new codes.</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="regenerate" className="mt-4">
                            <div className="space-y-4">
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                        Generating new codes will <strong>invalidate all existing recovery codes</strong>. Make sure to save the new ones.
                                    </AlertDescription>
                                </Alert>

                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleRegenerate}
                                    disabled={regenerateMutation.isPending}
                                >
                                    {regenerateMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Generate New Recovery Codes
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button onClick={handleClose}>
                            {hasRegenerated && recoveryCodes.length > 0 ? "I've saved my codes" : 'Close'}
                        </Button>
                    </DialogFooter>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}

