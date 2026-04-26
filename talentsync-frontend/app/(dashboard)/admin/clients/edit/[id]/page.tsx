"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    Save
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
import { getClients, saveClient, Client } from "../../store";
import { useTrackerTemplates } from "../../../tracking-template/store";

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

export default function EditClientPage() {
    const router = useRouter();
    const { id } = useParams();
    const { templates } = useTrackerTemplates();
    const [client, setClient] = useState<Client | null>(null);

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

    useEffect(() => {
        const clients = getClients();
        const found = clients.find(c => c.id === id);
        if (found) {
            setClient(found);
            form.reset({
                name: found.name,
                website: found.website,
                status: found.status,
                trackerTemplateId: found.trackerTemplateId,
                isDemo: found.isDemo,
            });
        } else {
            toast.error("Client not found");
            router.push("/admin/clients/all");
        }
    }, [id, form, router]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!client) return;

        const selectedTemplate = templates.find(t => t.id === values.trackerTemplateId);

        const updatedClient: Client = {
            ...client,
            name: values.name,
            website: values.website || "",
            status: values.status,
            trackerTemplateId: values.trackerTemplateId,
            trackerTemplateName: selectedTemplate?.title || client.trackerTemplateName,
            isDemo: values.isDemo,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveClient(updatedClient);
        toast.success("Client updated successfully!");
        router.push("/admin/clients/all");
    }

    if (!client) return null;

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
                    <h1 className="text-2xl font-bold tracking-tight">Edit Client</h1>
                    <p className="text-sm text-muted-foreground">ID: {id}</p>
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
                                            <Input className="bg-background" {...field} />
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
                                                value={field.value}
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
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px] text-white gap-2"
                            >
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="min-w-[100px]"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
