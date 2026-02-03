"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    MapPin,
    Building2,
    Save,
    Loader2,
    Info,
    CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { saveAddress, getAddresses } from "../../store";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const countries = [
    "India", "United States", "United Kingdom", "Canada", "Australia",
    "Germany", "France", "Singapore", "UAE", "Japan", "Other",
];

const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
];

const addressTypes = [
    { value: "office", label: "Head/Corporate Office" },
    { value: "branch", label: "Branch Office" },
    { value: "warehouse", label: "Warehouse/Storage" },
    { value: "home", label: "Home/Residential" },
    { value: "other", label: "Other" },
];

const formSchema = z.object({
    addressName: z.string().min(2, "Address name is required"),
    addressType: z.string().min(1, "Select an address type"),
    addressLine1: z.string().min(5, "Address must be at least 5 characters"),
    addressLine2: z.string().optional(),
    landmark: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(5, "Valid zip code required"),
    country: z.string().min(2, "Country is required"),
    notes: z.string().optional(),
});

export default function EditAddressPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            addressName: "",
            addressType: "",
            addressLine1: "",
            addressLine2: "",
            landmark: "",
            city: "",
            state: "",
            zipCode: "",
            country: "India",
            notes: "",
        },
    });

    useEffect(() => {
        const addresses = getAddresses();
        const address = addresses.find(a => a.id === id);

        if (address) {
            form.reset({
                addressName: address.addressName,
                addressType: address.type,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 || "",
                landmark: address.landmark || "",
                city: address.city,
                state: address.state,
                zipCode: address.zipCode,
                country: address.country,
                notes: address.notes || "",
            });
        } else {
            toast.error("Address not found");
            router.push("/others/address/all");
        }
        setIsLoading(false);
    }, [id, form, router]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        const fullAddress = [
            values.addressLine1,
            values.addressLine2,
            values.landmark,
            values.city,
            values.state,
            values.zipCode,
            values.country,
        ].filter(Boolean).join(", ");

        const updatedAddress = {
            id, // Keep existing ID
            addressName: values.addressName,
            type: values.addressType,
            addressLine1: values.addressLine1,
            addressLine2: values.addressLine2,
            landmark: values.landmark,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
            country: values.country,
            notes: values.notes,
            fullAddress: fullAddress,
            addedTime: new Date().toLocaleString('en-US', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            })
        };

        saveAddress(updatedAddress);
        toast.success("Address updated successfully!", {
            icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        });
        router.push("/others/address/all");
    }

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Address</h1>
                            <p className="text-sm text-slate-500">Update location details for this address</p>
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
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">Location Details</h3>
                                    <p className="text-sm text-slate-500">Enter the full address particulars</p>
                                </div>
                            </div>

                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="addressName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        Address Name <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Head Office" className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="addressType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        Address Type <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {addressTypes.map((type) => (
                                                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="addressLine1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Address Line 1 <span className="text-red-500">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Street address, building name" className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="addressLine2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Apartment, suite, unit" className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        City <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="City name" className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="zipCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        Zip/Postal Code <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="000000" className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        State <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                                                                <SelectValue placeholder="Select state" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[300px]">
                                                            {indianStates.map((state) => (
                                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="country"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                        Country <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-primary/20">
                                                                <SelectValue placeholder="Select country" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {countries.map((country) => (
                                                                <SelectItem key={country} value={country}>{country}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                                    Additional Notes
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Any specific delivery instructions or details..."
                                                        className="min-h-[100px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none focus:ring-primary/20"
                                                        {...field}
                                                    />
                                                </FormControl>
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
                                            Update Address
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
                    <div className="hidden lg:block w-80 shrink-0 sticky top-28 space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/50">
                            <div className="flex items-start gap-3">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Address ID</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 font-mono text-xs">
                                        {id}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/50">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Editing Mode</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                                        You are currently editing an existing address record. Changes will be reflected immediately across the system.
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

