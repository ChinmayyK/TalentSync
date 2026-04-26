"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Plus,
    Search,
    MoreHorizontal,
    Copy,
    Trash2,
    Pencil,
    Phone,
    X,
    Files
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRecruiters, deleteRecruiter, saveRecruiter, Recruiter } from "../store";
import { ColumnHeaderMenu } from "@/components/ui/column-header-menu";

type SortConfig = {
    key: keyof Recruiter | null;
    direction: 'asc' | 'desc';
};

export default function AllRecruitersPage() {
    const router = useRouter();
    const { recruiters, refresh } = useRecruiters();
    const [searchTerm, setSearchTerm] = useState("");
    const [blockedFilter, setBlockedFilter] = useState<boolean | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

    const handleSort = (key: keyof Recruiter, direction: 'asc' | 'desc') => {
        setSortConfig({ key, direction });
        toast.info(`Sorted by ${key} (${direction})`);
    };

    const handleGroup = (key: keyof Recruiter, direction: 'asc' | 'desc') => {
        toast.info(`Grouped by ${key} (${direction})`);
    };

    const handleHideColumn = (columnName: string) => {
        setHiddenColumns(prev => new Set(prev).add(columnName));
        toast.info(`${columnName} column hidden`);
    };

    let sortedRecruiters = [...recruiters];

    if (sortConfig.key) {
        sortedRecruiters.sort((a, b) => {
            const aVal = a[sortConfig.key!];
            const bVal = b[sortConfig.key!];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const filteredRecruiters = sortedRecruiters.filter((rec) => {
        const matchesSearch =
            `${rec.firstName} ${rec.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rec.officialEmail.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBlocked = blockedFilter === null || rec.blocked === blockedFilter;

        return matchesSearch && matchesBlocked;
    });

    const handleDelete = (id: string) => {
        deleteRecruiter(id);
        refresh();
        toast.success("Recruiter deleted successfully");
    };

    const handleCopy = (rec: Recruiter) => {
        const text = `${rec.firstName} ${rec.lastName} - ${rec.email}, ${rec.officialPhoneCode}${rec.officialPhoneNumber}`;
        navigator.clipboard.writeText(text);
        toast.success("Recruiter details copied to clipboard");
    };

    const handleDuplicate = (rec: Recruiter) => {
        const duplicatedRecruiter = {
            ...rec,
            id: Date.now().toString(),
            firstName: `${rec.firstName} (Copy)`,
            zohoCreatorId: Date.now().toString(),
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };
        saveRecruiter(duplicatedRecruiter);
        refresh();
        toast.success("Recruiter duplicated successfully");
    };

    return (
        <div className="p-6 max-w-[1800px] mx-auto min-h-screen bg-transparent space-y-6 text-foreground">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">All Recruiters</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage your team of recruitment professionals.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search recruiters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-[250px] bg-background/50 backdrop-blur-sm border-muted transition-all focus:w-[300px]"
                        />
                    </div>

                    <Button
                        onClick={() => router.push("/admin/recruiter/add")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-9 w-9 p-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                </div>
            </div>

            {/* Grouping/Filter Chips */}
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage your recruiters</span>
                {blockedFilter !== null && (
                    <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-900 border-none px-3 py-1 flex items-center gap-2 font-medium cursor-pointer"
                        onClick={() => setBlockedFilter(null)}
                    >
                        Blocked? = {blockedFilter ? 'true' : 'false'} <X className="h-3 w-3" />
                    </Badge>
                )}
            </div>

            {/* Table Section */}
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-muted/50 border-border/50">
                            {/* Actions Column - FIRST */}
                            <TableHead className="w-[50px] border-r border-border/50 font-bold text-center">Actions</TableHead>
                            {!hiddenColumns.has('name') && (
                                <TableHead className="w-[180px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Name"
                                        onSort={(dir) => handleSort('firstName', dir)}
                                        onGroup={(dir) => handleGroup('firstName', dir)}
                                        onHide={() => handleHideColumn('name')}
                                        onSearch={() => toast.info("Search Name")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('email') && (
                                <TableHead className="w-[220px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Email"
                                        onSort={(dir) => handleSort('email', dir)}
                                        onGroup={(dir) => handleGroup('email', dir)}
                                        onHide={() => handleHideColumn('email')}
                                        onSearch={() => toast.info("Search Email")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('officialEmail') && (
                                <TableHead className="w-[220px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Offical Email ID"
                                        onSort={(dir) => handleSort('officialEmail', dir)}
                                        onGroup={(dir) => handleGroup('officialEmail', dir)}
                                        onHide={() => handleHideColumn('officialEmail')}
                                        onSearch={() => toast.info("Search Official Email")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('officialPhone') && (
                                <TableHead className="w-[150px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Official Phone Number"
                                        onSort={(dir) => handleSort('officialPhoneNumber', dir)}
                                        onGroup={(dir) => handleGroup('officialPhoneNumber', dir)}
                                        onHide={() => handleHideColumn('officialPhone')}
                                        onSearch={() => toast.info("Search Official Phone")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('personalPhone') && (
                                <TableHead className="w-[150px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Personal Phone Number"
                                        onSort={(dir) => handleSort('personalPhoneNumber', dir)}
                                        onGroup={(dir) => handleGroup('personalPhoneNumber', dir)}
                                        onHide={() => handleHideColumn('personalPhone')}
                                        onSearch={() => toast.info("Search Personal Phone")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('dob') && (
                                <TableHead className="w-[140px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Date Of Birth"
                                        onSort={(dir) => handleSort('dateOfBirth', dir)}
                                        onGroup={(dir) => handleGroup('dateOfBirth', dir)}
                                        onHide={() => handleHideColumn('dob')}
                                        onSearch={() => toast.info("Search DOB")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('employmentType') && (
                                <TableHead className="w-[140px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Employment Type"
                                        onSort={(dir) => handleSort('employmentType', dir)}
                                        onGroup={(dir) => handleGroup('employmentType', dir)}
                                        onHide={() => handleHideColumn('employmentType')}
                                        onSearch={() => toast.info("Search Employment Type")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('zohoId') && (
                                <TableHead className="w-[180px] border-r border-border/50">
                                    <ColumnHeaderMenu
                                        columnName="Zoho Creator ID"
                                        onSort={(dir) => handleSort('zohoCreatorId', dir)}
                                        onGroup={(dir) => handleGroup('zohoCreatorId', dir)}
                                        onHide={() => handleHideColumn('zohoId')}
                                        onSearch={() => toast.info("Search Zoho ID")}
                                    />
                                </TableHead>
                            )}
                            {!hiddenColumns.has('reason') && (
                                <TableHead className="w-[200px]">
                                    <ColumnHeaderMenu
                                        columnName="Reason For Block"
                                        onSort={(dir) => handleSort('reasonForBlock', dir)}
                                        onGroup={(dir) => handleGroup('reasonForBlock', dir)}
                                        onHide={() => handleHideColumn('reason')}
                                        onSearch={() => toast.info("Search Reason")}
                                    />
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRecruiters.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-24 text-center">
                                    No recruiters found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRecruiters.map((rec, index) => (
                                <motion.tr
                                    key={rec.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className={`border-b border-border transition-all duration-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                        } hover:bg-blue-500/10`}
                                >
                                    {/* Actions Cell - FIRST */}
                                    <TableCell className="py-4 border-r border-border/50 text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 transition-all hover:bg-muted/80 shadow-sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[160px]">
                                                <DropdownMenuItem onClick={() => router.push(`/admin/recruiter/edit/${rec.id}`)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDuplicate(rec)}>
                                                    <Files className="mr-2 h-4 w-4" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCopy(rec)}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Copy
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    onClick={() => handleDelete(rec.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>

                                    {!hiddenColumns.has('name') && (
                                        <TableCell className="font-medium text-foreground py-4 border-r border-border/50">
                                            {rec.firstName} {rec.lastName}
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('email') && (
                                        <TableCell className="py-4 border-r border-border/50">
                                            <a href={`mailto:${rec.email}`} className="text-primary hover:underline">
                                                {rec.email}
                                            </a>
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('officialEmail') && (
                                        <TableCell className="py-4 border-r border-border/50">
                                            <a href={`mailto:${rec.officialEmail}`} className="text-primary hover:underline">
                                                {rec.officialEmail}
                                            </a>
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('officialPhone') && (
                                        <TableCell className="py-4 border-r border-border/50">
                                            <div className="flex items-center gap-1 text-primary">
                                                <Phone className="h-3 w-3" />
                                                <span className="text-xs">{rec.officialPhoneCode}{rec.officialPhoneNumber}</span>
                                            </div>
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('personalPhone') && (
                                        <TableCell className="py-4 border-r border-border/50">
                                            <div className="flex items-center gap-1 text-primary">
                                                <Phone className="h-3 w-3" />
                                                <span className="text-xs">{rec.personalPhoneCode}{rec.personalPhoneNumber}</span>
                                            </div>
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('dob') && (
                                        <TableCell className="py-4 border-r border-border/50 text-sm">
                                            {rec.dateOfBirth || "-"}
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('employmentType') && (
                                        <TableCell className="py-4 border-r border-border/50 text-sm">
                                            {rec.employmentType}
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('zohoId') && (
                                        <TableCell className="text-xs font-mono text-muted-foreground py-4 border-r border-border/50">
                                            {rec.zohoCreatorId}
                                        </TableCell>
                                    )}
                                    {!hiddenColumns.has('reason') && (
                                        <TableCell className="py-4 text-sm text-muted-foreground">
                                            {rec.reasonForBlock || "-"}
                                        </TableCell>
                                    )}
                                </motion.tr>
                            ))
                        )}
                    </TableBody>
                </Table>
                <div className="p-4 border-t border-border/50 text-xs italic text-slate-500 bg-muted/10">
                    Showing {filteredRecruiters.length} of {recruiters.length}
                </div>
            </div>
        </div>
    );
}
