
'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, UserPlus, FileText } from 'lucide-react';
import { Vendor } from '@/lib/api/vendors';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface VendorListTableProps {
    vendors: Vendor[];
    isLoading: boolean;
    onEdit: (vendor: Vendor) => void;
    onDelete: (vendor: Vendor) => void;
    onInviteUser: (vendor: Vendor) => void;
}

export function VendorListTable({
    vendors,
    isLoading,
    onEdit,
    onDelete,
    onInviteUser
}: VendorListTableProps) {
    if (isLoading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    if (vendors.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-slate-50 border-dashed">
                <div className="text-lg font-medium text-slate-900">No vendors found</div>
                <p className="text-sm text-slate-500 mt-1">
                    Add your first vendor agency to start tracking submissions.
                </p>
            </div>
        );
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Jobs</TableHead>
                        <TableHead>Candidates</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{vendor.name}</span>
                                    <span className="text-xs text-muted-foreground">{vendor.email}</span>
                                </div>
                            </TableCell>
                            <TableCell>{vendor.contactName || '-'}</TableCell>
                            <TableCell>
                                <Badge variant={vendor.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                    {vendor.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{vendor._count?.users || 0}</TableCell>
                            <TableCell>{vendor._count?.assignedJobs || 0}</TableCell>
                            <TableCell>{vendor._count?.candidates || 0}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                                {format(new Date(vendor.createdAt), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onEdit(vendor)}>
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onInviteUser(vendor)}>
                                            <UserPlus className="mr-2 h-4 w-4" /> Invite User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete(vendor)} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
