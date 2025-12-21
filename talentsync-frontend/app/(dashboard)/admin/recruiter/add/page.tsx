"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    User
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { saveRecruiter } from "../store";

const formSchema = z.object({
    firstName: z.string().min(1, {
        message: "First name is required.",
    }),
    lastName: z.string().min(1, {
        message: "Last name is required.",
    }),
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    officialEmail: z.string().optional(),
    officialPhoneCode: z.string().default("+91"),
    officialPhoneNumber: z.string().min(10, {
        message: "Please enter a valid phone number.",
    }),
    personalPhoneCode: z.string().default("+91"),
    personalPhoneNumber: z.string().min(10, {
        message: "Please enter a valid phone number.",
    }),
    dateOfBirth: z.string().optional(),
    employmentType: z.enum(["Recruiter", "Vendor"], {
        required_error: "Please select an employment type.",
    }),
    salary: z.string().default("0"),
    blocked: z.boolean().default(false),
    reasonForBlock: z.string().optional(),
    password: z.string().optional(),
});

export default function AddRecruiterPage() {
    const router = useRouter();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            officialEmail: "",
            officialPhoneCode: "+91",
            officialPhoneNumber: "",
            personalPhoneCode: "+91",
            personalPhoneNumber: "",
            dateOfBirth: "",
            employmentType: "Recruiter",
            salary: "0",
            blocked: false,
            reasonForBlock: "",
            password: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        const newRecruiter = {
            id: Date.now().toString(),
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            officialEmail: values.officialEmail || "",
            officialPhoneCode: values.officialPhoneCode,
            officialPhoneNumber: values.officialPhoneNumber,
            personalPhoneCode: values.personalPhoneCode,
            personalPhoneNumber: values.personalPhoneNumber,
            dateOfBirth: values.dateOfBirth || "",
            employmentType: values.employmentType,
            salary: values.salary,
            blocked: values.blocked,
            reasonForBlock: values.reasonForBlock || "",
            password: values.password || "",
            zohoCreatorId: Date.now().toString(),
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveRecruiter(newRecruiter);
        toast.success("Recruiter added successfully!");
        router.push("/admin/recruiter/all");
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
                    <h1 className="text-2xl font-bold tracking-tight">Add Recruiters</h1>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm max-w-4xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Name */}
                        <div className="grid grid-cols-4 items-start gap-4 space-y-0">
                            <FormLabel className="text-sm font-medium pt-3">Name</FormLabel>
                            <div className="col-span-3 grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                                    <Input placeholder="Name" className="bg-background pl-10" {...field} />
                                                </div>
                                            </FormControl>
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
                                                <Input placeholder="Last Name" className="bg-background" {...field} />
                                            </FormControl>
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
                                            <Input className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Official Email ID */}
                        <FormField
                            control={form.control}
                            name="officialEmail"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Offical Email ID</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Official Phone Number */}
                        <FormField
                            control={form.control}
                            name="officialPhoneNumber"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Official Phone Number <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3 flex gap-2">
                                        <div className="flex-shrink-0 w-[100px]">
                                            <Select defaultValue="+91" onValueChange={(val) => form.setValue("officialPhoneCode", val)}>
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

                        {/* Personal Phone Number */}
                        <FormField
                            control={form.control}
                            name="personalPhoneNumber"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Personal Phone Number <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3 flex gap-2">
                                        <div className="flex-shrink-0 w-[100px]">
                                            <Select defaultValue="+91" onValueChange={(val) => form.setValue("personalPhoneCode", val)}>
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

                        {/* Date Of Birth */}
                        <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Date Of Birth <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input type="date" placeholder="dd-MMM-yyyy" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Employment Type */}
                        <FormField
                            control={form.control}
                            name="employmentType"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">
                                        Employment Type <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <div className="col-span-3">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue placeholder="-Select-" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Recruiter">Recruiter</SelectItem>
                                                <SelectItem value="Vendor">Vendor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Salary */}
                        <FormField
                            control={form.control}
                            name="salary"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Salary</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input type="number" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Blocked */}
                        <FormField
                            control={form.control}
                            name="blocked"
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
                                        <FormLabel className="text-sm font-medium leading-none">
                                            Blocked?
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Reason For Block */}
                        <FormField
                            control={form.control}
                            name="reasonForBlock"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-start gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium pt-2">Reason For Block</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Textarea className="bg-background min-h-[80px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Password */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">pass</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input type="password" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <div className="flex items-center gap-4 pt-4 border-t border-border">
                            <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px] text-white"
                            >
                                Add Recruiter
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

