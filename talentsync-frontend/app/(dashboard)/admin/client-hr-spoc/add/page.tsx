"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    Search,
    ChevronDown,
    Plus
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
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { saveSPOC } from "../store";
import { useClients } from "../../clients/store";

const formSchema = z.object({
    clientId: z.string().min(1, {
        message: "Please select a client.",
    }),
    firstName: z.string().min(2, {
        message: "First name must be at least 2 characters.",
    }),
    lastName: z.string().min(1, {
        message: "Last name is required.",
    }),
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    phoneCode: z.string().default("+91"),
    phoneNumber: z.string().min(10, {
        message: "Please enter a valid 10-digit phone number.",
    }),
    locationHandling: z.string().optional(),
});

export default function AddClientHRSPOCPage() {
    const router = useRouter();
    const { clients } = useClients();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientId: "",
            firstName: "",
            lastName: "",
            email: "",
            phoneCode: "+91",
            phoneNumber: "",
            locationHandling: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        const selectedClient = clients.find(c => c.id === values.clientId);

        const newSPOC = {
            id: Date.now().toString(),
            clientId: values.clientId,
            clientName: selectedClient?.name || "Unknown Client",
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phoneCode: values.phoneCode,
            phoneNumber: values.phoneNumber,
            locationHandling: values.locationHandling || "",
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveSPOC(newSPOC);
        toast.success("Client HR SPOC added successfully!");
        router.push("/admin/client-hr-spoc/all");
    }

    const handleReset = () => {
        form.reset();
        toast.info("Form reset.");
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto min-h-screen bg-transparent space-y-8 text-foreground">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full hover:bg-muted"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add Client HR SPOC</h1>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm max-w-4xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Client Name */}
                        <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Client Name <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3">
                                        <div className="flex gap-2">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-background flex-1">
                                                        <SelectValue placeholder="-Select-" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {clients.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button variant="outline" size="icon" className="shrink-0">
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Name of HR */}
                        <div className="grid grid-cols-4 items-start gap-4 space-y-0">
                            <FormLabel className="text-sm font-medium pt-3">
                                Name Of HR <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="col-span-3 grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <Input placeholder="" className="bg-background" {...field} />
                                            </FormControl>
                                            <p className="text-[10px] text-muted-foreground">First Name</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <Input placeholder="" className="bg-background" {...field} />
                                            </FormControl>
                                            <p className="text-[10px] text-muted-foreground">Last Name</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Email <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input placeholder="" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Phone */}
                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Phone</FormLabel>
                                    <div className="col-span-3 flex gap-2">
                                        <div className="flex-shrink-0 w-[100px]">
                                            <Select defaultValue="+91" onValueChange={(val) => form.setValue("phoneCode", val)}>
                                                <SelectTrigger className="bg-background">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">🇮🇳</span>
                                                        <span>+91</span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="+91">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">🇮🇳</span>
                                                            <span>+91</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="+1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">🇺🇸</span>
                                                            <span>+1</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <FormControl>
                                            <Input placeholder="81234 56789" className="bg-background flex-1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Location Handling */}
                        <FormField
                            control={form.control}
                            name="locationHandling"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Location Handling</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input placeholder="" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Buttons */}
                        <div className="flex items-center gap-4 pt-4 border-t border-border">
                            <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px] text-white"
                            >
                                Add
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                                className="min-w-[100px]"
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

