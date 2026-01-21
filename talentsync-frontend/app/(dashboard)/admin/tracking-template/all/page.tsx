
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
    FileDown,
    Files,
    Pencil
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
import { useTrackerTemplates, deleteTemplate, saveTemplate, TrackerTemplate } from "../store";
import { toast } from "sonner";

// Main component for displaying all tracker templates
export default function AllTrackerTemplatesPage() {
    const router = useRouter();
    const { templates, refresh } = useTrackerTemplates();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredTemplates = templates.filter((template) =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string) => {
        deleteTemplate(id);
        refresh();
        toast.success("Template deleted successfully");
    };

    const handleDuplicate = (template: TrackerTemplate) => {
        const duplicatedTemplate = {
            ...template,
            id: Date.now().toString(),
            title: `${template.title} (Copy)`,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };
        saveTemplate(duplicatedTemplate);
        refresh();
        toast.success("Template duplicated successfully");
    };

    const handleExport = (id: string) => {
        toast.info("Exporting template...");
    };



    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-transparent space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">All Tracker Templates</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage your recruitment tracker templates.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-[250px] bg-background/50 backdrop-blur-sm border-muted transition-all focus:w-[300px]"
                        />
                    </div>

                    <Button
                        onClick={() => router.push("/admin/tracking-template/add")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 shrink-0 h-9 w-9 p-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-muted/50 border-border/50">
                            <TableHead className="w-[80px] border-r border-border/50 font-bold text-center">Actions</TableHead>
                            <TableHead className="w-[150px] border-r border-border/50">Title</TableHead>
                            <TableHead className="w-[280px] border-r border-border/50">Description</TableHead>
                            <TableHead className="w-[160px] border-r border-border/50">ID</TableHead>
                            <TableHead className="border-r border-border/50">Columns Required</TableHead>
                            <TableHead className="w-[180px]">Modified Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTemplates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No templates found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTemplates.map((template, index) => (
                                <motion.tr
                                    key={template.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="group border-b border-border hover:bg-blue-500/10 transition-colors"
                                >
                                    <TableCell className="py-4 border-r border-border/50">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 transition-all hover:bg-muted/80 shadow-sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Open menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[160px]">
                                                <DropdownMenuItem onClick={() => router.push(`/admin/tracking-template/edit/${template.id}`)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                                    <Files className="mr-2 h-4 w-4" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => {
                                                    navigator.clipboard.writeText(template.title);
                                                    toast.success("Template title copied to clipboard");
                                                }}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    Copy
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    onClick={() => handleDelete(template.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground py-4 border-r border-border/50">
                                        {template.title}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate max-w-[300px] py-4 border-r border-border/50">
                                        {template.description}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground py-4 border-r border-border/50">
                                        {template.id}
                                    </TableCell>
                                    <TableCell className="py-4 border-r border-border/50">
                                        <div className="text-xs leading-relaxed space-y-0.5">
                                            {template.columnsRequired.map((col, idx) => (
                                                <div key={idx} className="text-foreground">
                                                    {col}
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap py-4 border-r border-border/50">
                                        {template.modifiedTime}
                                    </TableCell>
                                </motion.tr>
                            ))
                        )}
                    </TableBody>
                </Table>
                <div className="p-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-muted/20">
                    <span>Showing {filteredTemplates.length} of {templates.length} templates</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled>Previous</Button>
                        <Button variant="ghost" size="sm" disabled>Next</Button>
                    </div>
                </div>
            </div>
        </div >
    );
}

