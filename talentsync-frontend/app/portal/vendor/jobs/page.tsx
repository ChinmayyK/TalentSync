
'use client';

import { useVendorJobs } from "@/hooks/use-vendor-portal";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function VendorJobsPage() {
    const { data: jobs, isLoading } = useVendorJobs();
    const router = useRouter();

    if (isLoading) return <div className="p-6">Loading jobs...</div>;

    if (!jobs || jobs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <h2 className="text-xl font-semibold mb-2">No Active Jobs</h2>
                <p className="text-muted-foreground">You don't have any jobs assigned to you yet.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
                <p className="text-muted-foreground">
                    Jobs assigned to your agency. Submit candidates directly.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                    <Card key={job.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-xl line-clamp-1" title={job.title}>{job.title}</CardTitle>
                                <Badge variant={job.status === 'OPEN' ? 'default' : 'secondary'}>
                                    {job.status}
                                </Badge>
                            </div>
                            <CardDescription className="line-clamp-2">
                                {job.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    {job.location || 'Remote'} ({job.locationType})
                                </div>
                                <div className="flex items-center">
                                    <Briefcase className="mr-2 h-4 w-4" />
                                    {job.department}
                                </div>
                                <div className="flex items-center">
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    {job.salaryMin && job.salaryMax
                                        ? `${job.salaryCurrency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`
                                        : 'Salary not specified'}
                                </div>
                                <div className="flex items-center">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Closing: {job.closingDate ? format(new Date(job.closingDate), 'MMM d, yyyy') : 'Open'}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={() => router.push(`/portal/vendor/jobs/${job.id}`)}>
                                View Details & Submit
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
