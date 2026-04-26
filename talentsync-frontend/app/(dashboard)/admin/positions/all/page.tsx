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
    Briefcase,
    ListFilter
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
import { usePositions, deletePosition, savePosition, Position } from "../store";
import { cn } from "@/lib/utils";

export default function AllPositionsPage() {
    const router = useRouter();
    const { positions, refresh } = usePositions();
    const [searchTerm, setSearchTerm] = useState("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filteredPositions = positions.filter((pos) =>
        pos.postingTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string) => {
        deletePosition(id);
        refresh();
        toast.success("Position deleted successfully");
    };

    const handleCopy = (pos: Position) => {
        const text = `${pos.postingTitle} - ${pos.clientName} (${pos.category})`;
        navigator.clipboard.writeText(text);
        toast.success("Position details copied to clipboard");
    };

    const handleDuplicate = (pos: Position) => {
        const duplicatedPosition = {
            ...pos,
            id: Date.now().toString(),
            postingTitle: `${pos.postingTitle} (Copy)`,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };
        savePosition(duplicatedPosition);
        refresh();
        toast.success("Position duplicated successfully");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 font-sans">
            {/* Sticky Header */}
            <div className={cn(
                "sticky top-0 z-10 transition-all duration-200 border-b border-transparent",
                scrolled ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-sm" : ""
            )}>
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">All Positions</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Manage and track your open recruitment slots.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Search positions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-[250px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary/20 focus:border-primary transition-all focus:w-[300px] rounded-xl"
                                />
                            </div>

                            <Button
                                onClick={() => router.push("/admin/positions/add")}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-4 h-10"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New Position
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="max-w-[1600px] mx-auto px-6 py-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-700">
                                <TableHead className="w-[60px] text-center font-semibold text-slate-600 dark:text-slate-300 h-10 border-r border-slate-200 dark:border-slate-700/50">Actions</TableHead>
                                <TableHead className="w-[300px] font-semibold text-slate-600 dark:text-slate-300 h-10 border-r border-slate-200 dark:border-slate-700/50">Posting Title</TableHead>
                                <TableHead className="w-[200px] font-semibold text-slate-600 dark:text-slate-300 h-10 border-r border-slate-200 dark:border-slate-700/50">Client</TableHead>
                                <TableHead className="w-[120px] font-semibold text-slate-600 dark:text-slate-300 h-10 border-r border-slate-200 dark:border-slate-700/50">Record ID</TableHead>
                                <TableHead className="w-[200px] font-semibold text-slate-600 dark:text-slate-300 h-10 border-r border-slate-200 dark:border-slate-700/50">HR</TableHead>
                                <TableHead className="font-semibold text-slate-600 dark:text-slate-300 h-10">Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPositions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                                                <ListFilter className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p>No positions found matching your search.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPositions.map((pos, index) => (
                                    <motion.tr
                                        key={pos.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        {/* Actions Cell */}
                                        <TableCell className="py-2 text-center border-r border-slate-100 dark:border-slate-800">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
                                                        <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-[180px] rounded-xl shadow-lg border-slate-100 dark:border-slate-800">
                                                    <DropdownMenuItem onClick={() => router.push(`/admin/positions/edit/${pos.id}`)} className="cursor-pointer py-2 focus:bg-slate-50 dark:focus:bg-slate-800 rounded-lg m-1">
                                                        <Pencil className="mr-2 h-4 w-4 text-blue-500" />
                                                        Edit Position
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(pos)} className="cursor-pointer py-2 focus:bg-slate-50 dark:focus:bg-slate-800 rounded-lg m-1">
                                                        <Files className="mr-2 h-4 w-4 text-amber-500" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCopy(pos)} className="cursor-pointer py-2 focus:bg-slate-50 dark:focus:bg-slate-800 rounded-lg m-1">
                                                        <Copy className="mr-2 h-4 w-4 text-emerald-500" />
                                                        Copy Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer py-2 rounded-lg m-1"
                                                        onClick={() => handleDelete(pos.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>

                                        <TableCell className="py-2 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                                                    <Briefcase className="h-4 w-4" />
                                                </div>
                                                {pos.postingTitle}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                            {pos.clientName}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                            {pos.id}
                                        </TableCell>
                                        <TableCell className="py-2 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                            {pos.hrName || "-"}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                {pos.category}
                                            </span>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                        <span>Showing {filteredPositions.length} of {positions.length} positions</span>
                        <span>List updated automatically</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
