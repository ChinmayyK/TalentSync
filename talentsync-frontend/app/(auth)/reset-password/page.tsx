"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetPasswordSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordData) => {
        if (!token) {
            toast.error("Invalid reset token");
            return;
        }

        setIsLoading(true);
        try {
            const baseUrl = typeof window !== 'undefined'
                ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3001`)
                : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

            const response = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    newPassword: data.password
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to reset password. Token may be expired.");
            }

            toast.success("Password reset successfully!");
            router.push("/login?reset=true");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center">
                <AuthHeader title="Invalid Link" subtitle="This password reset link is invalid or missing a token." />
                <Link href="/login">
                    <Button variant="outline">Back to Login</Button>
                </Link>
            </div>
        );
    }

    return (
        <>
            <AuthHeader
                title="Set new password"
                subtitle="Your new password must be different from previously used passwords."
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Min. 8 characters"
                        {...register("password")}
                        className={errors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        {...register("confirmPassword")}
                        className={errors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting password...
                        </>
                    ) : (
                        "Reset Password"
                    )}
                </Button>

                <div className="text-center">
                    <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </div>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
