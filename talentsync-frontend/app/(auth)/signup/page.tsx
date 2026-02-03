"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Building2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid work email"),
    companyName: z.string().min(2, "Company name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormData = z.infer<typeof signupSchema>;

// Password requirements
const passwordRequirements = [
    { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
    { label: "One uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
    { label: "One lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
    { label: "One number", test: (pw: string) => /[0-9]/.test(pw) },
];

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
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
function SocialButton({ provider, icon }: { provider: string; icon: React.ReactNode }) {
    return (
        <motion.button
            type="button"
            whileHover={{ scale: 1.02, backgroundColor: "rgb(248 250 252)" }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:border-slate-300 transition-colors"
        >
            {icon}
            {provider}
        </motion.button>
    );
}

// Password strength indicator
function PasswordStrengthIndicator({ password }: { password: string }) {
    const strength = useMemo(() => {
        let score = 0;
        passwordRequirements.forEach(req => {
            if (req.test(password)) score++;
        });
        return score;
    }, [password]);

    const strengthLabel = useMemo(() => {
        if (password.length === 0) return "";
        if (strength <= 1) return "Weak";
        if (strength <= 2) return "Fair";
        if (strength <= 3) return "Good";
        return "Strong";
    }, [password, strength]);

    const strengthColor = useMemo(() => {
        if (strength <= 1) return "bg-red-500";
        if (strength <= 2) return "bg-orange-500";
        if (strength <= 3) return "bg-yellow-500";
        return "bg-green-500";
    }, [strength]);

    if (password.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
        >
            {/* Strength bar */}
            <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Password strength</span>
                    <span className={`text-xs font-medium ${strength <= 1 ? 'text-red-600' : strength <= 2 ? 'text-orange-600' : strength <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {strengthLabel}
                    </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(strength / 4) * 100}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`h-full rounded-full ${strengthColor}`}
                    />
                </div>
            </div>

            {/* Requirements checklist */}
            <div className="grid grid-cols-2 gap-1.5">
                {passwordRequirements.map((req) => {
                    const met = req.test(password);
                    return (
                        <motion.div
                            key={req.label}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-1.5"
                        >
                            <motion.div
                                initial={false}
                                animate={{
                                    backgroundColor: met ? "rgb(34 197 94)" : "rgb(226 232 240)",
                                    scale: met ? [1, 1.2, 1] : 1,
                                }}
                                transition={{ duration: 0.2 }}
                                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            >
                                {met ? (
                                    <Check className="w-2.5 h-2.5 text-white" />
                                ) : (
                                    <X className="w-2.5 h-2.5 text-slate-400" />
                                )}
                            </motion.div>
                            <span className={`text-xs ${met ? 'text-green-600' : 'text-slate-500'}`}>
                                {req.label}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}

export default function SignupPage() {
    const router = useRouter();
    const { signup } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordValue, setPasswordValue] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit = async (data: SignupFormData) => {
        setIsLoading(true);
        try {
            await signup(data);
            toast.success("Account created! Welcome to TalentSync.");
            // Router push happens inside signup
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    // Custom password register to track value
    const passwordRegister = register("password", {
        onChange: (e) => setPasswordValue(e.target.value),
    });

    return (
        <>
            <AuthHeader
                title="Start your 14-day free trial"
                subtitle={
                    <>
                        Already have an account?{" "}
                        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                            Sign in
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
                    provider="Google"
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
                    provider="Microsoft"
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
                className="space-y-4"
            >
                {/* Name Field */}
                <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 font-medium">Full Name</Label>
                    <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="name"
                            placeholder="John Doe"
                            autoComplete="name"
                            {...register("name")}
                            className={`pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors ${errors.name ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-blue-500"}`}
                        />
                    </div>
                    {errors.name && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500">
                            {errors.name.message}
                        </motion.p>
                    )}
                </motion.div>

                {/* Email Field */}
                <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium">Work Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            autoComplete="email"
                            {...register("email")}
                            className={`pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors ${errors.email ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-blue-500"}`}
                        />
                    </div>
                    {errors.email && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500">
                            {errors.email.message}
                        </motion.p>
                    )}
                </motion.div>

                {/* Company Name Field */}
                <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="companyName" className="text-slate-700 font-medium">Company Name</Label>
                    <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="companyName"
                            placeholder="Acme Inc."
                            autoComplete="organization"
                            {...register("companyName")}
                            className={`pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors ${errors.companyName ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-blue-500"}`}
                        />
                    </div>
                    {errors.companyName && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500">
                            {errors.companyName.message}
                        </motion.p>
                    )}
                </motion.div>

                {/* Password Field */}
                <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Create a secure password"
                            {...passwordRegister}
                            className={`pl-10 pr-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors ${errors.password ? "border-red-400 focus-visible:ring-red-400" : "focus-visible:ring-blue-500"}`}
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
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500">
                            {errors.password.message}
                        </motion.p>
                    )}

                    {/* Password Strength Indicator */}
                    <AnimatePresence>
                        <PasswordStrengthIndicator password={passwordValue} />
                    </AnimatePresence>
                </motion.div>

                {/* Benefits */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-6 py-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-green-600" />
                        </div>
                        <span>No credit card</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-green-600" />
                        </div>
                        <span>Full access</span>
                    </div>
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
                                Creating account...
                            </>
                        ) : (
                            "Create Account"
                        )}
                    </Button>
                </motion.div>

                {/* Terms */}
                <motion.p variants={itemVariants} className="text-xs text-center text-slate-500 pt-1">
                    By signing up, you agree to our{" "}
                    <Link href="/terms" className="underline hover:text-slate-700 transition-colors">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="underline hover:text-slate-700 transition-colors">Privacy Policy</Link>.
                </motion.p>
            </motion.form>
        </>
    );
}

