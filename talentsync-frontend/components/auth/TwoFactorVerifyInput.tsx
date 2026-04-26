"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TwoFactorVerifyInputProps {
    onVerify: (token: string) => Promise<void>;
    onUseRecoveryCode?: () => void;
    isLoading?: boolean;
    error?: string;
    title?: string;
    description?: string;
}

export function TwoFactorVerifyInput({
    onVerify,
    onUseRecoveryCode,
    isLoading = false,
    error,
    title = "Two-Factor Authentication",
    description = "Enter the 6-digit code from your authenticator app",
}: TwoFactorVerifyInputProps) {
    const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Focus first input on mount
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
        const newValue = value.replace(/\D/g, '').slice(-1);
        const newDigits = [...digits];
        newDigits[index] = newValue;
        setDigits(newDigits);

        // Move to next input if value entered
        if (newValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits entered
        if (newValue && index === 5) {
            const token = newDigits.join('');
            if (token.length === 6) {
                onVerify(token);
            }
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            // Move to previous input on backspace when current is empty
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newDigits = pasted.split('').concat(Array(6 - pasted.length).fill('')).slice(0, 6);
        setDigits(newDigits);

        // Focus last filled input or next empty one
        const lastFilledIndex = Math.min(pasted.length, 5);
        inputRefs.current[lastFilledIndex]?.focus();

        // Auto-submit if 6 digits pasted
        if (pasted.length === 6) {
            onVerify(pasted);
        }
    };

    const handleSubmit = () => {
        const token = digits.join('');
        if (token.length === 6) {
            onVerify(token);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mx-auto"
        >
            <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>

            <div className="space-y-4">
                <div>
                    <Label className="sr-only">Verification Code</Label>
                    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                        {digits.map((digit, index) => (
                            <Input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-12 h-14 text-center text-2xl font-mono"
                                disabled={isLoading}
                                autoComplete="off"
                            />
                        ))}
                    </div>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-destructive text-center"
                    >
                        {error}
                    </motion.p>
                )}

                <Button
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={digits.join('').length !== 6 || isLoading}
                >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Verify
                </Button>

                {onUseRecoveryCode && (
                    <Button
                        variant="ghost"
                        className="w-full text-sm"
                        onClick={onUseRecoveryCode}
                        disabled={isLoading}
                    >
                        Use a recovery code instead
                    </Button>
                )}
            </div>
        </motion.div>
    );
}
