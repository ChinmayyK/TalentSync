
'use client';

import { useVendorCandidates } from "@/hooks/use-vendor-portal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function VendorCandidatesPage() {
    const { data: candidates, isLoading } = useVendorCandidates();

    if (isLoading) return <div className="p-6">Loading candidates...</div>;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Submitted Candidates</h1>
                <p className="text-muted-foreground">
                    Track the status of candidates you have submitted.
                </p>
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Candidate Name</TableHead>
                            <TableHead>Job Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Submission Date</TableHead>
                            <TableHead>Stage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!candidates || candidates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No candidates submitted yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            candidates.map((candidate) => (
                                <TableRow key={candidate.id}>
                                    <TableCell className="font-medium">{candidate.name}</TableCell>
                                    <TableCell>{candidate.jobTitle || '-'}</TableCell>
                                    <TableCell>{candidate.email}</TableCell>
                                    <TableCell>
                                        {format(new Date(candidate.createdAt), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{candidate.stage}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
