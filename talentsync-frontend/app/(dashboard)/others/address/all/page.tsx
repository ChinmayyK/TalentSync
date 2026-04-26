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
    MapPin,
    Building2,
    Home,
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
import { useAddresses, deleteAddress, saveAddress, Address } from "../store";
import { cn } from "@/lib/utils";

export default function AllAddressesPage() {
    const router = useRouter();
    const { addresses, refresh } = useAddresses();
    const [searchTerm, setSearchTerm] = useState("");
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filteredAddresses = addresses.filter((addr) =>
        addr.addressName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addr.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addr.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string) => {
        deleteAddress(id);
        refresh();
        toast.success("Address deleted successfully");
    };

    const handleCopy = (addr: Address) => {
        navigator.clipboard.writeText(addr.fullAddress);
        toast.success("Full address copied to clipboard");
    };

    const handleDuplicate = (addr: Address) => {
        const duplicated = {
            ...addr,
            id: Date.now().toString(),
            addressName: `${addr.addressName} (Copy)`,
            addedTime: new Date().toLocaleString('en-US', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            })
        };
        saveAddress(duplicated);
        refresh();
        toast.success("Address duplicated successfully");
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'home': return <Home className="h-3.5 w-3.5" />;
            case 'office': return <Building2 className="h-3.5 w-3.5" />;
            case 'branch': return <Building2 className="h-3.5 w-3.5" />;
            case 'warehouse': return <Building2 className="h-3.5 w-3.5" />;
            default: return <MapPin className="h-3.5 w-3.5" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'office': return 'Head Office';
            case 'home': return 'Residential';
            default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
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
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">All Addresses</h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Manage your geographical locations and office addresses.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search addresses..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-[250px] bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary/20 transition-all focus:w-[300px] h-10 rounded-xl"
                                />
                            </div>
                            <Button
                                onClick={() => router.push("/others/address/add")}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-10 px-4 rounded-xl"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                New Address
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
                            <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
                                <TableHead className="w-[50px] font-semibold text-slate-900 dark:text-white pl-4">#</TableHead>
                                <TableHead className="w-[200px] font-semibold text-slate-900 dark:text-white">Name</TableHead>
                                <TableHead className="w-[150px] font-semibold text-slate-900 dark:text-white">Type</TableHead>
                                <TableHead className="font-semibold text-slate-900 dark:text-white">Full Address</TableHead>
                                <TableHead className="w-[150px] font-semibold text-slate-900 dark:text-white">City</TableHead>
                                <TableHead className="w-[80px] font-semibold text-slate-900 dark:text-white text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAddresses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                                <ListFilter className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="font-medium">No addresses found</p>
                                            <p className="text-sm mt-1">Try adjusting your search or add a new one.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAddresses.map((addr, index) => (
                                    <motion.tr
                                        key={addr.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className="group border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <TableCell className="py-4 pl-4 font-mono text-xs text-slate-400">
                                            {(index + 1).toString().padStart(2, '0')}
                                        </TableCell>
                                        <TableCell className="py-4 font-medium text-slate-900 dark:text-slate-200">
                                            {addr.addressName}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 capitalize">
                                                {getTypeIcon(addr.type)}
                                                {getTypeLabel(addr.type)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-slate-600 dark:text-slate-400 text-sm max-w-[400px] truncate" title={addr.fullAddress}>
                                            {addr.fullAddress}
                                        </TableCell>
                                        <TableCell className="py-4 text-slate-600 dark:text-slate-400 text-sm">
                                            {addr.city}, {addr.country}
                                        </TableCell>
                                        <TableCell className="py-4 text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[160px]">
                                                    <DropdownMenuItem onClick={() => router.push(`/others/address/edit/${addr.id}`)}>
                                                        <Pencil className="mr-2 h-4 w-4" />Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(addr)}>
                                                        <Files className="mr-2 h-4 w-4" />Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCopy(addr)}>
                                                        <Copy className="mr-2 h-4 w-4" />Copy Address
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20" onClick={() => handleDelete(addr.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-500 flex justify-between items-center">
                        <span>Showing {filteredAddresses.length} of {addresses.length} addresses</span>
                        <span className="text-slate-400">List updated automatically</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
