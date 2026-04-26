
'use client';

import { useState } from 'react';
import { useVendorJob, useSubmitCandidate } from "@/hooks/use-vendor-portal";
import { getResumeUploadUrl } from "@/lib/api/vendor-portal"; // Direct call as it's part of form flow usually, or use Mutation if preferred.
// I'll use direct call inside onSubmit or mutation.
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Briefcase, DollarSign, Calendar, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from "sonner";


const submissionSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    linkedinProfile: z.string().url().optional().or(z.literal('')),
});

export default function VendorJobDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const jobId = params.id as string;

    // Hooks
    const { data: job, isLoading } = useVendorJob(jobId);
    const submitMutation = useSubmitCandidate();

    // File State
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Form
    const form = useForm<z.infer<typeof submissionSchema>>({
        resolver: zodResolver(submissionSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            linkedinProfile: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof submissionSchema>) => {
        if (!file) {
            toast.error("Please upload a resume");
            return;
        }

        try {
            setIsUploading(true);

            // 1. Get presigned URL
            const { uploadUrl, s3Key, fileId } = await getResumeUploadUrl(file.name);

            // 2. Upload file
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/pdf',
                },
            });

            // 3. Submit candidate
            await submitMutation.mutateAsync({
                jobId,
                ...values,
                resumeUrl: s3Key,
                resumeFileId: fileId
            });

            toast.success("Candidate submitted successfully!");
            router.push('/portal/vendor/candidates');

        } catch (error) {
            console.error('Submission failed', error);
            toast.error("Failed to submit candidate. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <div className="p-6">Loading job details...</div>;
    if (!job) return <div className="p-6">Job not found</div>;

    return (
        <div className="p-6 h-full flex flex-col md:flex-row gap-6">
            {/* Job Details Sidebar */}
            <div className="w-full md:w-2/3 space-y-6"> {/* Main content: Job Description */}
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center"><MapPin className="mr-1 h-4 w-4" /> {job.location} ({job.locationType})</span>
                                <span className="flex items-center"><Briefcase className="mr-1 h-4 w-4" /> {job.department}</span>
                                <span className="flex items-center"><DollarSign className="mr-1 h-4 w-4" />
                                    {job.salaryMin ? `${job.salaryCurrency || '$'} ${job.salaryMin.toLocaleString()} - ${job.salaryMax?.toLocaleString()}` : 'Salary N/A'}
                                </span>
                            </div>
                        </div>
                        <Badge>{job.status}</Badge>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent className="prose max-w-none text-sm">
                            <div dangerouslySetInnerHTML={{ __html: job.description }} /> {/* Assuming HTML or plain text */}
                        </CardContent>
                    </Card>

                    {job.requirements && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Requirements</CardTitle>
                            </CardHeader>
                            <CardContent className="prose max-w-none text-sm">
                                <div dangerouslySetInnerHTML={{ __html: job.requirements }} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Submission Form Sidebar */}
            <div className="w-full md:w-1/3">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle>Submit Candidate</CardTitle>
                        <CardDescription>Enter candidate details and attach resume.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="john@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+1 555..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="linkedinProfile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>LinkedIn URL</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://linkedin.com/in/..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-2">
                                    <Label>Resume</Label>
                                    <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                                        <Input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    setFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        {file ? (
                                            <div className="flex items-center text-sm font-medium text-green-600">
                                                <FileText className="mr-2 h-4 w-4" />
                                                {file.name}
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                                                <span className="text-sm font-medium text-muted-foreground">Upload Resume</span>
                                                <span className="text-xs text-muted-foreground mt-1">PDF or DOCX (Max 5MB)</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={isUploading || submitMutation.isPending}>
                                    {isUploading ? 'Uploading Resume...' : submitMutation.isPending ? 'Submitting...' : 'Submit Candidate'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
