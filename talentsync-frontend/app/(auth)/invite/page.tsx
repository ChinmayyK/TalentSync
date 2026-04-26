"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Lock, User, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:3001`;
    }
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const API_URL = getApiBaseUrl();

const inviteSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InvitePreview {
    email: string;
    role: string;
    tenantName: string;
    brandingLogoUrl?: string | null;
    brandingColors?: { primary?: string; secondary?: string } | null;
}

// Password requirements
const passwordRequirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "One number", test: (pw: string) => /[0-9]/.test(pw) },
];

function InviteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { acceptInvite } = useAuth();
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordValue, setPasswordValue] = useState("");
    const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
    });

    // Validate token and get preview on mount
    useEffect(() => {
        async function validateToken() {
            if (!token) {
                setError("Missing invitation token");
                setIsValidating(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/v1/auth/invite/${token}`);

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || "Invalid or expired invitation");
                }

                const data = await response.json();
                setInvitePreview(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Invalid invitation");
            } finally {
                setIsValidating(false);
            }
        }

        validateToken();
    }, [token]);

    const onSubmit = async (data: InviteFormData) => {
        if (!token) {
            toast.error("Invalid invitation link");
            return;
        }

        setIsLoading(true);
        try {
            await acceptInvite({
                token,
                password: data.password,
                name: data.name,
            });
            toast.success("Welcome! Your account has been created.");
            // Router push happens inside acceptInvite
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isValidating) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                <p className="text-slate-600">Validating invitation...</p>
            </div>
        );
    }

    // Error state
    if (error || !token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Invalid Invitation</h2>
                <p className="text-slate-600 mb-6 max-w-md">{error || "This invitation link is missing a token."}</p>
                <Link href="/login">
                    <Button variant="outline">Go to Login</Button>
                </Link>
            </div>
        );
    }

    const passwordRegister = register("password", {
        onChange: (e) => setPasswordValue(e.target.value),
    });

    return (
        <>
            <AuthHeader
                title={`Join ${invitePreview?.tenantName || "your team"}`}
                subtitle={
                    invitePreview ? (
                        <span className="text-slate-600">
                            You've been invited to join as a <strong className="text-slate-800">{invitePreview.role}</strong>
                        </span>
                    ) : (
                        "Set up your account to join the team on TalentSync."
                    )
                }
            />

            {/* Tenant branding */}
            {invitePreview?.brandingLogoUrl && (
                <div className="flex justify-center mb-6">
                    <img
                        src={invitePreview.brandingLogoUrl}
                        alt={invitePreview.tenantName}
                        className="h-12 object-contain"
                    />
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email (read-only) */}
                {invitePreview?.email && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Email</Label>
                        <Input
                            type="email"
                            value={invitePreview.email}
                            disabled
                            className="bg-slate-50 text-slate-600"
                        />
                    </div>
                )}

                {/* Name */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-2"
                >
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                        Full Name
                    </Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            id="name"
                            placeholder="Enter your full name"
                            {...register("name")}
                            className={`pl-10 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                    </div>
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </motion.div>

                {/* Password */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                >
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                        Create Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 8 characters"
                            {...passwordRegister}
                            className={`pl-10 pr-10 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                </motion.div>

                {/* Password requirements */}
                {passwordValue && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="grid grid-cols-2 gap-2"
                    >
                        {passwordRequirements.map((req) => {
                            const met = req.test(passwordValue);
                            return (
                                <div key={req.label} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${met ? 'bg-green-500' : 'bg-slate-200'}`}>
                                        {met ? (
                                            <Check className="w-2.5 h-2.5 text-white" />
                                        ) : (
                                            <X className="w-2.5 h-2.5 text-slate-400" />
                                        )}
                                    </div>
                                    <span className={`text-xs ${met ? 'text-green-600' : 'text-slate-500'}`}>
                                        {req.label}
                                    </span>
                                </div>
                            );
                        })}
                    </motion.div>
                )}

                {/* Confirm Password */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                >
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                        Confirm Password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            {...register("confirmPassword")}
                            className={`pl-10 pr-10 ${errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
                </motion.div>

                {/* Submit Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting up account...
                            </>
                        ) : (
                            "Accept Invitation & Join"
                        )}
                    </Button>
                </motion.div>
            </form>

            {/* Terms notice */}
            <p className="text-xs text-center text-slate-500 mt-6">
                By accepting this invitation, you agree to our{" "}
                <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
        </>
    );
}

export default function InvitePage() {
    return (
        <Suspense fallback={<div className="flex justify-center min-h-[300px] items-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
            <InviteContent />
        </Suspense>
    );
}
