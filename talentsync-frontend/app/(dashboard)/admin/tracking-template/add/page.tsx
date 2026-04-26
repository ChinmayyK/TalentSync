
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
    X,
    Check,
    ChevronDown,
    Info,
    ArrowLeft,
    Save,
    RotateCcw,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveTemplate, COLUMNS_OPTIONS } from "../store";

const formSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters.",
    }),
    description: z.string().min(5, {
        message: "Description must be at least 5 characters.",
    }),
    columnsRequired: z.array(z.string()).min(1, {
        message: "Please select at least one column.",
    }),
});

export default function AddTrackerTemplatePage() {
    const router = useRouter();
    const [openCombobox, setOpenCombobox] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            columnsRequired: [],
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        const newTemplate = {
            id: Date.now().toString(), // Simple ID generation
            title: values.title,
            description: values.description,
            columnsRequired: values.columnsRequired,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveTemplate(newTemplate);
        toast.success("Tracker Template saved successfully!");
        router.push("/admin/tracking-template/all");
    }

    const handleReset = () => {
        form.reset({
            title: "",
            description: "",
            columnsRequired: [],
        });
        toast.info("Form reset.");
    };

    const handleSaveDraft = () => {
        toast.info("Saved as draft (mock).");
    };

    const selectedColumns = form.watch("columnsRequired");

    const toggleColumn = (column: string) => {
        const current = form.getValues("columnsRequired");
        if (current.includes(column)) {
            form.setValue("columnsRequired", current.filter((c) => c !== column));
        } else {
            form.setValue("columnsRequired", [...current, column]);
        }
    };

    const removeColumn = (column: string) => {
        const current = form.getValues("columnsRequired");
        form.setValue("columnsRequired", current.filter((c) => c !== column));
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto min-h-screen bg-transparent space-y-8">
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
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Tracker Template</h1>
                    <p className="text-sm text-muted-foreground">Define what information needs to be tracked for candidates.</p>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 shadow-sm">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                            <div className="grid gap-6 max-w-3xl">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-medium flex items-center gap-1">
                                                Title <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Senior Developer Tracker" className="bg-background/50 h-10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-base font-medium flex items-center gap-1">
                                                Description <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Brief description of this tracker's purpose..."
                                                    className="min-h-[100px] bg-background/50 resize-y"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="columnsRequired"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-base font-medium">Columns Required</FormLabel>
                                            <div className="mt-2">
                                                {/* Selected Chips Area */}
                                                <div className="min-h-[50px] p-3 rounded-md border border-input bg-background/50 flex flex-wrap gap-2 mb-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
                                                    {field.value.length === 0 ? (
                                                        <span className="text-muted-foreground text-sm self-center">No columns selected. Select from below...</span>
                                                    ) : (
                                                        field.value.map((col) => (
                                                            <motion.div
                                                                key={col}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                layout
                                                            >
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="pl-2 pr-1 py-1 text-sm font-normal gap-1 hover:bg-muted-foreground/20 transition-colors"
                                                                >
                                                                    {col}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeColumn(col)}
                                                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                                    >
                                                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                                        <span className="sr-only">Remove {col}</span>
                                                                    </button>
                                                                </Badge>
                                                            </motion.div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Combobox Trigger */}
                                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openCombobox}
                                                            className="w-full justify-between bg-background/50"
                                                        >
                                                            Add columns...
                                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search columns..." />
                                                            <CommandList>
                                                                <CommandEmpty>No column found.</CommandEmpty>
                                                                <CommandGroup className="max-h-[300px] overflow-auto">
                                                                    {COLUMNS_OPTIONS.map((col) => (
                                                                        <CommandItem
                                                                            key={col}
                                                                            value={col}
                                                                            onSelect={() => toggleColumn(col)}
                                                                        >
                                                                            <div
                                                                                className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${selectedColumns.includes(col)
                                                                                    ? "bg-primary text-primary-foreground"
                                                                                    : "opacity-50 [&_svg]:invisible"
                                                                                    }`}
                                                                            >
                                                                                <Check className="h-4 w-4" />
                                                                            </div>
                                                                            {col}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormDescription className="mt-2 text-xs">
                                                    Select the data points you want to capture for each candidate in this tracker.
                                                </FormDescription>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-border/50">
                                <Button
                                    type="submit"
                                    className="min-w-[140px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-medium"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Template
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSaveDraft}
                                    className="min-w-[120px] border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Save as Draft
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleReset}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reset Whole Template
                                </Button>
                            </div>

                        </form>
                    </Form>
                </div>
            </div>
        </div>
    );
}
