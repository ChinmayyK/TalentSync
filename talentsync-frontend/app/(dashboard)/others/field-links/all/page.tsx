"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Plus,
    Search,
    MoreHorizontal,
    Copy,
    Trash2,
    Pencil,
    Files,
    ListFilter,
    Link as LinkIcon
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
import { toast } from "sonner";
import { useFieldLinks, deleteFieldLink, saveFieldLink, FieldLink } from "../store";
import { ColumnHeaderMenu } from "@/components/ui/column-header-menu";
import { cn } from "@/lib/utils";

type SortConfig = {
    key: keyof FieldLink | null;
    direction: 'asc' | 'desc';
};

export default function AllFieldLinksPage() {
    const router = useRouter();
    const { fieldLinks, refresh } = useFieldLinks();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSort = (key: keyof FieldLink, direction: 'asc' | 'desc') => {
        setSortConfig({ key, direction });
        toast.info(`Sorted by ${key} (${direction})`);
    };

    const handleGroup = (key: keyof FieldLink, direction: 'asc' | 'desc') => {
        toast.info(`Grouped by ${key} (${direction})`);
    };

    const handleHideColumn = (columnName: string) => {
        setHiddenColumns(prev => new Set(prev).add(columnName));
        toast.info(`${columnName} column hidden`);
    };

    let sortedFieldLinks = [...fieldLinks];

    if (sortConfig.key) {
        sortedFieldLinks.sort((a, b) => {
            const aVal = a[sortConfig.key!];
            const bVal = b[sortConfig.key!];

            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const filteredFieldLinks = sortedFieldLinks.filter((link) =>
        link.labelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.fieldLinkName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string) => {
        deleteFieldLink(id);
        refresh();
        toast.success("Field Link deleted successfully");
    };

    const handleCopy = (link: FieldLink) => {
        const text = `${link.labelName} - ${link.fieldLinkName}`;
        navigator.clipboard.writeText(text);
        toast.success("Field Link details copied to clipboard");
    };

    const handleDuplicate = (link: FieldLink) => {
        const duplicatedLink = {
            ...link,
            id: Date.now().toString(),
            labelName: `${link.labelName} (Copy)`,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };
        saveFieldLink(duplicatedLink);
        refresh();
        toast.success("Field Link duplicated successfully");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 font-sans text-slate-900 dark:text-slate-100">
            {/* Sticky Header */}
            <div className={cn(
                "sticky top-0 z-10 transition-all duration-200 border-b border-transparent",
                scrolled ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-sm" : ""
            )}>
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">All Field Links</h1>
                            <p className="text-sm text-slate-500">Manage and map data field associations</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Search field links..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-[250px] bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-all rounded-xl focus:w-[300px]"
                                />
                            </div>

                            <Button
                                onClick={() => router.push("/others/field-links/add")}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-4 h-10"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New Field Link
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="max-w-[1600px] mx-auto px-6 py-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <div className="p-1">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-border/50">
                                    <TableHead className="w-[80px] font-semibold text-center h-10">Actions</TableHead>
                                    {!hiddenColumns.has('labelName') && (
                                        <TableHead className="w-[300px] h-10">
                                            <ColumnHeaderMenu
                                                columnName="Label Name"
                                                onSort={(dir) => handleSort('labelName', dir)}
                                                onGroup={(dir) => handleGroup('labelName', dir)}
                                                onHide={() => handleHideColumn('labelName')}
                                                onSearch={() => toast.info("Search Label Name")}
                                            />
                                        </TableHead>
                                    )}
                                    {!hiddenColumns.has('fieldLinkName') && (
                                        <TableHead className="w-[300px] h-10">
                                            <ColumnHeaderMenu
                                                columnName="Field Link Name"
                                                onSort={(dir) => handleSort('fieldLinkName', dir)}
                                                onGroup={(dir) => handleGroup('fieldLinkName', dir)}
                                                onHide={() => handleHideColumn('fieldLinkName')}
                                                onSearch={() => toast.info("Search Field Link Name")}
                                            />
                                        </TableHead>
                                    )}
                                    {!hiddenColumns.has('id') && (
                                        <TableHead className="w-[250px] h-10">
                                            <ColumnHeaderMenu
                                                columnName="ID"
                                                onSort={(dir) => handleSort('id', dir)}
                                                onGroup={(dir) => handleGroup('id', dir)}
                                                onHide={() => handleHideColumn('id')}
                                                onSearch={() => toast.info("Search ID")}
                                            />
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFieldLinks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <ListFilter className="h-10 w-10 mb-2 opacity-20" />
                                                <p>No field links found matching your criteria.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredFieldLinks.map((link, index) => (
                                        <motion.tr
                                            key={link.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                            className="group border-b border-border/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
                                        >
                                            <TableCell className="py-2 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100">
                                                            <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-[160px] rounded-xl">
                                                        <DropdownMenuItem onClick={() => router.push(`/others/field-links/edit/${link.id}`)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDuplicate(link)}>
                                                            <Files className="mr-2 h-4 w-4" />
                                                            Duplicate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleCopy(link)}>
                                                            <Copy className="mr-2 h-4 w-4" />
                                                            Copy Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                            onClick={() => handleDelete(link.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>

                                            {!hiddenColumns.has('labelName') && (
                                                <TableCell className="font-medium text-slate-700 dark:text-slate-200 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                                            <LinkIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                        </div>
                                                        {link.labelName}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {!hiddenColumns.has('fieldLinkName') && (
                                                <TableCell className="py-2 text-slate-600 dark:text-slate-400 font-mono text-sm">
                                                    {link.fieldLinkName}
                                                </TableCell>
                                            )}
                                            {!hiddenColumns.has('id') && (
                                                <TableCell className="text-xs font-mono text-muted-foreground py-2">
                                                    {link.id}
                                                </TableCell>
                                            )}
                                        </motion.tr>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="p-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <span>Showing {filteredFieldLinks.length} items</span>
                        <span>Total: {fieldLinks.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
