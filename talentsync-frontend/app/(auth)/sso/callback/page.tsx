"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function SSOCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const processCallback = async () => {
            try {
                const code = searchParams.get("code");
                const state = searchParams.get("state");
                const errorParam = searchParams.get("error");
                const errorDescription = searchParams.get("error_description");

                // Check for OAuth error
                if (errorParam) {
                    throw new Error(errorDescription || errorParam);
                }

                if (!code) {
                    throw new Error("No authorization code received");
                }

                // Extract tenant ID from state (format: "tenant:tenantId")
                let tenantId = "default";
                if (state) {
                    const parts = state.split(":");
                    if (parts.length >= 2 && parts[0] === "tenant") {
                        tenantId = parts[1];
                    }
                }

                // Determine provider from URL or state
                const provider = searchParams.get("provider") || "GOOGLE";

                // Call backend SSO callback endpoint
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1/sso/${tenantId}/callback`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            code,
                            provider,
                            state,
                        }),
                    }
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "SSO authentication failed");
                }

                const data = await response.json();

                // Store tokens and user data
                if (data.accessToken) {
                    localStorage.setItem("accessToken", data.accessToken);
                }
                if (data.refreshToken) {
                    localStorage.setItem("refreshToken", data.refreshToken);
                }
                if (data.tenant?.id) {
                    localStorage.setItem("activeTenantId", data.tenant.id);
                }
                if (data.user) {
                    localStorage.setItem("user", JSON.stringify(data.user));
                }

                toast.success("Signed in successfully!");
                router.push("/dashboard");
            } catch (err) {
                const message = err instanceof Error ? err.message : "SSO authentication failed";
                setError(message);
                toast.error(message);

                // Redirect to login after showing error
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            }
        };

        processCallback();
    }, [searchParams, router]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center max-w-md p-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Authentication Failed</h2>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <p className="text-sm text-slate-500">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Completing Sign In</h2>
                <p className="text-slate-600">Please wait while we verify your credentials...</p>
            </div>
        </div>
    );
}

export default function SSOCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Loading...</h2>
                    </div>
                </div>
            }
        >
            <SSOCallbackContent />
        </Suspense>
    );
}
