"use client";

import { KPICard } from "@/components/dashboard/KPICard";
import { CheckCircle, Link, Briefcase, LayoutDashboard } from "lucide-react";

export default function OthersDummyPage({ title }: { title: string }) {
    return (
        <div className="container mx-auto px-6 py-8 min-h-screen bg-transparent space-y-6 max-w-[1600px] text-foreground">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        This is a placeholder for the {title.toLowerCase()} management page.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Items"
                    value={128}
                    trend={12}
                    icon={LayoutDashboard}
                    description="Total active items in system"
                    data={[100, 110, 105, 115, 120, 125, 128]}
                />
                <KPICard
                    title="Active Now"
                    value={45}
                    trend={5}
                    icon={CheckCircle}
                    description="Items currently in processing"
                    data={[30, 35, 32, 40, 38, 42, 45]}
                />
                <KPICard
                    title="Pending Sync"
                    value={12}
                    trend={-2}
                    icon={Link}
                    description="Awaiting external synchronization"
                    data={[15, 14, 16, 13, 14, 13, 12]}
                />
                <KPICard
                    title="Categories"
                    value={8}
                    trend={0}
                    icon={Briefcase}
                    description="Distinct classification types"
                    data={[8, 8, 8, 8, 8, 8, 8]}
                />
            </div>

            {/* Coming Soon Card */}
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Link className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Module Coming Soon</h3>
                <p className="text-muted-foreground max-w-sm mt-1">
                    The {title} module is currently being migrated to the new dashboard architecture.
                    Check back soon for full functionality!
                </p>
            </div>
        </div>
    );
}
