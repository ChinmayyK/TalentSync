"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    ArrowLeft,
    Save,
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
import { getRecruiters, saveRecruiter, Recruiter } from "../../store";

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
    officialPhoneCode: z.string(),
    officialPhoneNumber: z.string().min(10, {
        message: "Please enter a valid phone number.",
    }),
    personalPhoneCode: z.string(),
    personalPhoneNumber: z.string().min(10, {
        message: "Please enter a valid phone number.",
    }),
    dateOfBirth: z.string().optional(),
    employmentType: z.enum(["Recruiter", "Vendor"]),
    salary: z.string(),
    blocked: z.boolean(),
    reasonForBlock: z.string().optional(),
    password: z.string().optional(),
});

export default function EditRecruiterPage() {
    const router = useRouter();
    const { id } = useParams();
    const [recruiter, setRecruiter] = useState<Recruiter | null>(null);

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

    useEffect(() => {
        const recruiters = getRecruiters();
        const found = recruiters.find(r => r.id === id);
        if (found) {
            setRecruiter(found);
            form.reset({
                firstName: found.firstName,
                lastName: found.lastName,
                email: found.email,
                officialEmail: found.officialEmail,
                officialPhoneCode: found.officialPhoneCode,
                officialPhoneNumber: found.officialPhoneNumber,
                personalPhoneCode: found.personalPhoneCode,
                personalPhoneNumber: found.personalPhoneNumber,
                dateOfBirth: found.dateOfBirth,
                employmentType: found.employmentType,
                salary: found.salary,
                blocked: found.blocked,
                reasonForBlock: found.reasonForBlock,
                password: found.password,
            });
        } else {
            toast.error("Recruiter not found");
            router.push("/admin/recruiter/all");
        }
    }, [id, form, router]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!recruiter) return;

        const updatedRecruiter: Recruiter = {
            ...recruiter,
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
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };

        saveRecruiter(updatedRecruiter);
        toast.success("Recruiter updated successfully!");
        router.push("/admin/recruiter/all");
    }

    if (!recruiter) return null;

    return (
        <div className="p-6 max-w-[1200px] mx-auto min-h-screen bg-transparent space-y-8 text-foreground">
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
                    <h1 className="text-2xl font-bold tracking-tight">Edit Recruiter</h1>
                    <p className="text-sm text-muted-foreground">ID: {id}</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 shadow-sm max-w-4xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                                    <Input className="bg-background pl-10" {...field} />
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
                                                <Input className="bg-background" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Email <span className="text-red-500">*</span></FormLabel>
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
                            name="officialEmail"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Official Email ID</FormLabel>
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
                            name="officialPhoneNumber"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Official Phone Number <span className="text-red-500">*</span></FormLabel>
                                    <div className="col-span-3 flex gap-2">
                                        <div className="flex-shrink-0 w-[100px]">
                                            <Select value={form.watch("officialPhoneCode")} onValueChange={(val) => form.setValue("officialPhoneCode", val)}>
                                                <SelectTrigger className="bg-background">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">🇮🇳</span>
                                                        <span>{form.watch("officialPhoneCode")}</span>
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
                                            <Input className="bg-background flex-1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="personalPhoneNumber"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Personal Phone Number <span className="text-red-500">*</span></FormLabel>
                                    <div className="col-span-3 flex gap-2">
                                        <div className="flex-shrink-0 w-[100px]">
                                            <Select value={form.watch("personalPhoneCode")} onValueChange={(val) => form.setValue("personalPhoneCode", val)}>
                                                <SelectTrigger className="bg-background">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">🇮🇳</span>
                                                        <span>{form.watch("personalPhoneCode")}</span>
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
                                            <Input className="bg-background flex-1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Date Of Birth</FormLabel>
                                    <div className="col-span-3">
                                        <FormControl>
                                            <Input type="date" className="bg-background" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="employmentType"
                            render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-center gap-4 space-y-0">
                                    <FormLabel className="text-sm font-medium">Employment Type</FormLabel>
                                    <div className="col-span-3">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
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
                                        <FormLabel className="text-sm font-medium leading-none">Blocked?</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

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
