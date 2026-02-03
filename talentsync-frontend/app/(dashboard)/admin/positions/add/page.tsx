"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    Search,
    Loader2,
    Save,
    Briefcase,
    Building2,
    CheckCircle2
} from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { savePosition } from "../store";
import { useClients } from "../../clients/store";
import { useClientHRSPOCs } from "../../client-hr-spoc/store";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const positionCategories = [
    "Branch/Area/Cluster Manager",
    "Field/Open Market Sales",
    "Information Technology",
    "Inside Sales",
    "Operation / Others",
    "Relationship Managers"
];

const formSchema = z.object({
    clientId: z.string().min(1, {
        message: "Please select a client.",
    }),
    postingTitle: z.string().min(2, {
        message: "Posting title must be at least 2 characters.",
    }),
    category: z.string().min(1, {
        message: "Please select a category.",
    }),
    hrId: z.string().optional(),
});

export default function AddPositionPage() {
    const router = useRouter();
    const { clients } = useClients();
    const { spocs } = useClientHRSPOCs();
    const [scrolled, setScrolled] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter SPOCs based on selected client
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const filteredSPOCs = spocs.filter(s => s.clientId === selectedClientId);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId: "",
            postingTitle: "",
            category: "",
            hrId: "",
        },
    });

    // Update filtered SPOCs when clientId changes
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'clientId') {
                setSelectedClientId(value.clientId || "");
                form.setValue("hrId", ""); // Reset HR when client changes
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        // Simulate network delay for effect
        await new Promise(resolve => setTimeout(resolve, 600));

        const selectedClient = clients.find(c => c.id === values.clientId);
        const selectedHR = spocs.find(s => s.id === values.hrId);

        const newPosition = {
            id: Date.now().toString(),
            postingTitle: values.postingTitle,
            clientId: values.clientId,
            clientName: selectedClient?.name || "Unknown",
            category: values.category,
            hrId: values.hrId || "",
            hrName: selectedHR ? `${selectedHR.firstName} ${selectedHR.lastName}` : "",
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        savePosition(newPosition);
        toast.success("Position added successfully!");
        router.push("/admin/positions/all");
        setIsSubmitting(false);
    }

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
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Create Position</h1>
                            <p className="text-sm text-slate-500">Add a new job position for a client</p>
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
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Position Details</h3>
                                    <p className="text-sm text-muted-foreground">Fill in the core information for this position</p>
                                </div>
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="clientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Client <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                                                            <SelectValue placeholder="Select a client" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {clients.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="postingTitle"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Posting Title <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20"
                                                        placeholder="e.g. Senior Software Engineer"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        Category <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                                                                <SelectValue placeholder="Select category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {positionCategories.map(cat => (
                                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="hrId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        Assigned HR
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClientId}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                                                                <SelectValue placeholder={selectedClientId ? "Select HR SPOC" : "Select Client First"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {filteredSPOCs.length > 0 ? (
                                                                filteredSPOCs.map(s => (
                                                                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                                                                ))
                                                            ) : (
                                                                <SelectItem value="none" disabled>No HRs found</SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="pt-6 flex gap-3">
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl"
                                        >
                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                            Create Position
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
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/50">
                                <div className="flex items-start gap-3">
                                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Client Context</h4>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 leading-relaxed">
                                            Selecting a client will automatically filter the available HR SPOCs to ensure correct assignment.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-900/50">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">Best Practice</h4>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                                            Use clear, standard posting titles to improve searchability and reporting accuracy.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

