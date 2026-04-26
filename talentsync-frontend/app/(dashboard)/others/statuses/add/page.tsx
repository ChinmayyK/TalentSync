"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, CheckCircle2, Info, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";
import { saveStatus } from "../store";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const formSchema = z.object({
    statusName: z.string().min(2, {
        message: "Status name must be at least 2 characters.",
    }),
    interviewStage: z.string().optional(),
});

export default function AddStatusPage() {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            statusName: "",
            interviewStage: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        // Simulate network delay for effect
        await new Promise(resolve => setTimeout(resolve, 600));

        const newStatus = {
            id: Date.now().toString(),
            name: values.statusName,
            description: "",
            color: "#10b981",
            isActive: true,
            interviewStage: values.interviewStage || "",
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveStatus(newStatus);
        toast.success("Status added successfully!");
        router.push("/others/statuses/all");
        setIsSubmitting(false);
    }

    const interviewStages = [
        "Interview Attended",
        "Selected",
        "Offered",
        "Joined"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {/* Sticky Header */}
            <div className={cn(
                "sticky top-0 z-10 transition-all duration-200 border-b border-transparent",
                scrolled ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-sm" : ""
            )}>
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Create Status</h1>
                            <p className="text-sm text-slate-500">Configure a new hiring pipeline stage</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col lg:flex-row gap-8 items-start"
                >
                    {/* Left Column: Form */}
                    <div className="flex-1 w-full lg:max-w-3xl">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Status Details</h3>
                                    <p className="text-sm text-muted-foreground">Define the status properties</p>
                                </div>
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="statusName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Status Name <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20"
                                                        placeholder="e.g. Technical Interview"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription className="flex items-center gap-1.5 text-xs text-amber-600/90 dark:text-amber-500/90 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg mt-2">
                                                    <Info className="h-3.5 w-3.5 shrink-0" />
                                                    Ensure this matches exactly with Zoho Recruit's status name if synchronizing.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="interviewStage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Interview Stage (Mapped)
                                                </FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input
                                                                className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 cursor-pointer"
                                                                value={field.value}
                                                                onClick={() => setShowDropdown(!showDropdown)}
                                                                readOnly
                                                                placeholder="Select a stage..."
                                                            />
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </FormControl>
                                                    {showDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
                                                        >
                                                            {interviewStages.map((stage) => (
                                                                <div
                                                                    key={stage}
                                                                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                                                                    onClick={() => {
                                                                        field.onChange(stage);
                                                                        setShowDropdown(false);
                                                                    }}
                                                                >
                                                                    {stage}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="pt-6 flex gap-3">
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl"
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                            Create Status
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => router.back()}
                                            className="h-11 rounded-xl"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </div>

                    {/* Right Column: Info Widget */}
                    <div className="hidden lg:block w-80 shrink-0 sticky top-28">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/50">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Pro Tip</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                                        Mapping statuses to standard interview stages helps in generating accurate pipeline reports and analytics.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
