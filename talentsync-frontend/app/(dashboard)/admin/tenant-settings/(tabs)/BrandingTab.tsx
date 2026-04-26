"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { BrandingSettings, tenantApi } from "@/lib/api/tenant";

export default function BrandingTab() {
    const [branding, setBranding] = useState<BrandingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // File input refs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const lightLogoInputRef = useRef<HTMLInputElement>(null);
    const darkLogoInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (type: 'main' | 'favicon' | 'lightTheme' | 'darkTheme', file: File | null) => {
        if (!branding || !file) return;
        setBranding({
            ...branding,
            logos: { ...branding.logos, [type]: file }
        });
        toast.success(`${type} logo selected: ${file.name}`);
    };

    useEffect(() => {
        loadBrandingSettings();
    }, []);

    const loadBrandingSettings = async () => {
        setLoading(true);
        try {
            const data = await tenantApi.getBrandingSettings();
            setBranding(data);
        } catch (error) {
            console.error("Failed to load branding settings:", error);
            toast.error("Failed to load branding settings");
            // Set default values on error
            setBranding({
                organizationName: "",
                address: "",
                supportEmail: "",
                primaryColor: "#0066CC",
                accentColor: "#00CC88",
                logos: {}
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBranding = async () => {
        if (!branding) return;
        setSaving(true);
        try {
            await tenantApi.updateBrandingSettings(branding);
        } catch (error) {
            console.error("Failed to save branding:", error);
            toast.error("Failed to save branding settings");
        } finally {
            setSaving(false);
        }
    };

    const handleResetBranding = async () => {
        setSaving(true);
        try {
            const reset = await tenantApi.resetBranding();
            setBranding(reset);
        } catch (error) {
            console.error("Failed to reset branding:", error);
            toast.error("Failed to reset branding");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!branding) return null;

    return (
        <div className="space-y-6">
            {/* Organization Profile */}
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                    Organization Profile
                </h3>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input
                            id="orgName"
                            value={branding.organizationName}
                            onChange={(e) =>
                                setBranding({
                                    ...branding,
                                    organizationName: e.target.value,
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            value={branding.address}
                            onChange={(e) =>
                                setBranding({
                                    ...branding,
                                    address: e.target.value,
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="supportEmail">Support Email</Label>
                        <Input
                            id="supportEmail"
                            type="email"
                            value={branding.supportEmail}
                            onChange={(e) =>
                                setBranding({
                                    ...branding,
                                    supportEmail: e.target.value,
                                })
                            }
                            className="mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* Brand Colors */}
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                    Brand Colors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2 mt-2">
                            <Input
                                id="primaryColor"
                                type="color"
                                value={branding.primaryColor}
                                onChange={(e) =>
                                    setBranding({
                                        ...branding,
                                        primaryColor: e.target.value,
                                    })
                                }
                                className="w-16 h-10 p-1 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={branding.primaryColor}
                                onChange={(e) =>
                                    setBranding({
                                        ...branding,
                                        primaryColor: e.target.value,
                                    })
                                }
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="accentColor">Accent Color</Label>
                        <div className="flex gap-2 mt-2">
                            <Input
                                id="accentColor"
                                type="color"
                                value={branding.accentColor}
                                onChange={(e) =>
                                    setBranding({
                                        ...branding,
                                        accentColor: e.target.value,
                                    })
                                }
                                className="w-16 h-10 p-1 cursor-pointer"
                            />
                            <Input
                                type="text"
                                value={branding.accentColor}
                                onChange={(e) =>
                                    setBranding({
                                        ...branding,
                                        accentColor: e.target.value,
                                    })
                                }
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Brand Assets */}
            <div className="bg-[#FFFFFF] rounded-lg border border-[#E5E7EB] p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                    Brand Assets
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Logo</Label>
                        <div
                            onClick={() => logoInputRef.current?.click()}
                            className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition flex flex-col items-center gap-2"
                        >
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {branding?.logos?.main ? (branding.logos.main as File).name : "Click to upload"}
                            </p>
                            <input
                                ref={logoInputRef}
                                type="file"
                                className="hidden"
                                accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                                onChange={(e) => handleFileSelect('main', e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Favicon</Label>
                        <div
                            onClick={() => faviconInputRef.current?.click()}
                            className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition flex flex-col items-center gap-2"
                        >
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {branding?.logos?.favicon ? (branding.logos.favicon as File).name : "Click to upload"}
                            </p>
                            <input
                                ref={faviconInputRef}
                                type="file"
                                className="hidden"
                                accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                                onChange={(e) => handleFileSelect('favicon', e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Light Theme Logo</Label>
                        <div
                            onClick={() => lightLogoInputRef.current?.click()}
                            className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition flex flex-col items-center gap-2"
                        >
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {branding?.logos?.lightTheme ? (branding.logos.lightTheme as File).name : "Click to upload"}
                            </p>
                            <input
                                ref={lightLogoInputRef}
                                type="file"
                                className="hidden"
                                accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                                onChange={(e) => handleFileSelect('lightTheme', e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Dark Theme Logo</Label>
                        <div
                            onClick={() => darkLogoInputRef.current?.click()}
                            className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition flex flex-col items-center gap-2"
                        >
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {branding?.logos?.darkTheme ? (branding.logos.darkTheme as File).name : "Click to upload"}
                            </p>
                            <input
                                ref={darkLogoInputRef}
                                type="file"
                                className="hidden"
                                accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
                                onChange={(e) => handleFileSelect('darkTheme', e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
                <Button
                    variant="outline"
                    onClick={handleResetBranding}
                    disabled={saving}
                >
                    Reset to Default
                </Button>
                <Button
                    onClick={handleSaveBranding}
                    disabled={saving}
                    className="bg-[#0066CC] hover:bg-[#0052A3] text-white"
                >
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
