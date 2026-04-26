
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    Save,
    RotateCcw
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { saveClient } from "../store";
import { useTrackerTemplates } from "../../tracking-template/store";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Client name must be at least 2 characters.",
    }),
    website: z.string().url().or(z.literal("")).optional(),
    status: z.enum(["Active", "Inactive"]),
    trackerTemplateId: z.string().min(1, {
        message: "Please select a tracker template.",
    }),
    isDemo: z.boolean().default(false),
});

export default function AddClientPage() {
    const router = useRouter();
    const { templates } = useTrackerTemplates();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            website: "",
            status: "Active",
            trackerTemplateId: "",
            isDemo: false,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        const selectedTemplate = templates.find(t => t.id === values.trackerTemplateId);

        const newClient = {
            id: Date.now().toString(),
            name: values.name,
            website: values.website || "",
            status: values.status,
            trackerTemplateId: values.trackerTemplateId,
            trackerTemplateName: selectedTemplate?.title || "Default",
            isDemo: values.isDemo,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveClient(newClient);
        toast.success("Client added successfully!");
        router.push("/admin/clients/all");
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
                    <h1 className="text-2xl font-bold tracking-tight">Add Clients</h1>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm max-w-4xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Client Name <span className="text-red-500">*</span>
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

                        <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Company Website</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input placeholder="https://" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Client Status <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex gap-6"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="Active" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer">Active</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="Inactive" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer">Inactive</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="trackerTemplateId"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Tracker Template</FormLabel>
                                    <div className="col-span-3">
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue placeholder="-Select-" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {templates.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isDemo"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-start gap-4 space-y-0">
                                    <div />
                                    <div className="col-span-3 flex items-center space-x-2">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Demo Client?
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center gap-4 pt-4 border-t border-border">
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90 min-w-[100px]"
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
