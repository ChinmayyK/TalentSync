"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" as const },
    },
};

// Social login button component
function SocialButton({
    provider,
    icon,
    onClick,
    disabled
}: {
    provider: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.02, backgroundColor: "rgb(248 250 252)" }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:border-slate-300 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {icon}
            {provider}
        </motion.button>
    );
}

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [ssoLoading, setSsoLoading] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        try {
            await login(data.email, data.password, rememberMe);
            toast.success("Welcome back!");
            // Router push happens inside login
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSSOLogin = async (provider: 'google' | 'microsoft') => {
        setSsoLoading(provider);
        try {
            // Get tenant ID from storage or use default
            const tenantId = localStorage.getItem('activeTenantId') || 'default';

            // Call SSO initiate endpoint
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/sso/${tenantId}/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ provider: provider.toUpperCase() }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `SSO not configured for ${provider}`);
            }

            const data = await response.json();

            // Redirect to OAuth provider
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                throw new Error('No redirect URL received');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : `Failed to initiate ${provider} login`);
            setSsoLoading(null);
        }
    };

    return (
        <>
            <AuthHeader
                title="Welcome back"
                subtitle={
                    <>
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                            Start free trial
                        </Link>
                    </>
                }
            />

            {/* Social Login */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex gap-3 mb-6"
            >
                <SocialButton
                    provider={ssoLoading === 'google' ? 'Loading...' : 'Google'}
                    disabled={!!ssoLoading || isLoading}
                    onClick={() => handleSSOLogin('google')}
                    icon={
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    }
                />
                <SocialButton
                    provider={ssoLoading === 'microsoft' ? 'Loading...' : 'Microsoft'}
                    disabled={!!ssoLoading || isLoading}
                    onClick={() => handleSSOLogin('microsoft')}
                    icon={
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#F25022" d="M1 1h10v10H1z" />
                            <path fill="#00A4EF" d="M1 13h10v10H1z" />
                            <path fill="#7FBA00" d="M13 1h10v10H13z" />
                            <path fill="#FFB900" d="M13 13h10v10H13z" />
                        </svg>
                    }
                />
            </motion.div>

            {/* Divider */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="relative mb-6"
            >
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white/80 text-slate-500 font-medium">or continue with email</span>
                </div>
            </motion.div>

            <motion.form
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
            >
                {/* Email Field */}
                <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium">Email address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            autoComplete="email"
                            {...register("email")}
                            className={`pl-10 h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors ${errors.email ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-blue-500"}`}
                        />
                    </div>
                    {errors.email && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-500 flex items-center gap-1"
                        >
                            {errors.email.message}
                        </motion.p>
                    )}
                </motion.div>

                {/* Password Field */}
                <motion.div variants={itemVariants} className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            {...register("password")}
                            className={`pl-10 pr-10 h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors ${errors.password ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-blue-500"}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-500"
                        >
                            {errors.password.message}
                        </motion.p>
                    )}
                </motion.div>

                {/* Remember Me */}
                <motion.div variants={itemVariants} className="flex items-center gap-2">
                    <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                        Remember me for 30 days
                    </label>
                </motion.div>

                {/* Submit Button */}
                <motion.div variants={itemVariants}>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25 text-base font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            "Sign in"
                        )}
                    </Button>
                </motion.div>
            </motion.form>
        </>
    );
}
