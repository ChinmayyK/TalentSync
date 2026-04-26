"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Check, AlertCircle } from "lucide-react";
import { tenantApi, AuthenticationSettings } from "@/lib/api/tenant";

export default function AuthSSOTab() {
    const [auth, setAuth] = useState<AuthenticationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadAuthenticationSettings();
    }, []);

    const loadAuthenticationSettings = async () => {
        setLoading(true);
        const data = await tenantApi.getAuthenticationSettings();
        setAuth(data);
        setLoading(false);
    };

    const handleTestSSO = async () => {
        if (!auth) return;
        setTesting(true);
        await tenantApi.testSSO(auth.ssoConfig);
        setTesting(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!auth) return null;

    return (
        <div className="space-y-6">
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                    Authentication Methods
                </h3>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="defaultLogin">Default Login Method</Label>
                        <Select value={auth.defaultLoginMethod}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">Email + Password</SelectItem>
                                <SelectItem value="google">Google OAuth</SelectItem>
                                <SelectItem value="microsoft">Microsoft OAuth</SelectItem>
                                <SelectItem value="azure">Azure AD</SelectItem>
                                <SelectItem value="saml">SAML SSO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded">
                        <Checkbox
                            id="allowPassword"
                            checked={auth.allowPasswordLogin}
                            onCheckedChange={(checked) =>
                                setAuth({
                                    ...auth,
                                    allowPasswordLogin: checked as boolean,
                                })
                            }
                        />
                        <Label htmlFor="allowPassword" className="cursor-pointer">
                            Allow password login
                        </Label>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] rounded">
                        <Checkbox
                            id="forceSSO"
                            checked={auth.forceSSO}
                            onCheckedChange={(checked) =>
                                setAuth({
                                    ...auth,
                                    forceSSO: checked as boolean,
                                })
                            }
                        />
                        <Label htmlFor="forceSSO" className="cursor-pointer">
                            Force SSO login for all users
                        </Label>
                    </div>
                </div>
            </div>

            <Separator />

            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        SSO Configuration
                    </h3>
                    <Badge
                        className={
                            auth.ssoConnectionStatus === "connected"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }
                    >
                        {auth.ssoConnectionStatus === "connected" ? (
                            <Check className="w-3 h-3 mr-1" />
                        ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {auth.ssoConnectionStatus === "connected"
                            ? "Connected"
                            : "Not Connected"}
                    </Badge>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="idpName">Identity Provider Name</Label>
                        <Input
                            id="idpName"
                            value={auth.ssoConfig.identityProviderName}
                            onChange={(e) =>
                                setAuth({
                                    ...auth,
                                    ssoConfig: {
                                        ...auth.ssoConfig,
                                        identityProviderName: e.target.value,
                                    },
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="loginURL">SSO Login URL</Label>
                        <Input
                            id="loginURL"
                            value={auth.ssoConfig.loginURL}
                            onChange={(e) =>
                                setAuth({
                                    ...auth,
                                    ssoConfig: {
                                        ...auth.ssoConfig,
                                        loginURL: e.target.value,
                                    },
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="entityID">Entity ID</Label>
                        <Input
                            id="entityID"
                            value={auth.ssoConfig.entityID}
                            onChange={(e) =>
                                setAuth({
                                    ...auth,
                                    ssoConfig: {
                                        ...auth.ssoConfig,
                                        entityID: e.target.value,
                                    },
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleTestSSO} disabled={testing}>
                        Test SSO Connection
                    </Button>
                </div>
            </div>
        </div>
    );
}
