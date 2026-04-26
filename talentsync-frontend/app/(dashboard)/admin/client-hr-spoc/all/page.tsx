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
  Mail,
  Phone,
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
import { toast } from "sonner";
import { useClientHRSPOCs, deleteSPOC, saveSPOC, ClientHRSPOC } from "../store";

export default function AllClientHRSPOCPage() {
  const router = useRouter();
  const { spocs, refresh } = useClientHRSPOCs();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSPOCs = spocs.filter((spoc) =>
    `${spoc.firstName} ${spoc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spoc.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    spoc.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteSPOC(id);
    refresh();
    toast.success("Client HR SPOC deleted successfully");
  };

  const handleCopy = (spoc: ClientHRSPOC) => {
    const text = `${spoc.firstName} ${spoc.lastName} (${spoc.clientName}) - ${spoc.email}, ${spoc.phoneCode}${spoc.phoneNumber}`;
    navigator.clipboard.writeText(text);
    toast.success("Contact details copied to clipboard");
  };

  const handleDuplicate = (spoc: ClientHRSPOC) => {
    const duplicatedSPOC = {
      ...spoc,
      id: Date.now().toString(),
      firstName: `${spoc.firstName} (Copy)`,
      modifiedTime: new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }).replace(',', '')
    };
    saveSPOC(duplicatedSPOC);
    refresh();
    toast.success("SPOC duplicated successfully");
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-transparent space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Client HR SPOC</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your client's human resource points of contact.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SPOCs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[250px] bg-background/50 backdrop-blur-sm border-muted transition-all focus:w-[300px]"
            />
          </div>

          <Button
            onClick={() => router.push("/admin/client-hr-spoc/add")}
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
              <TableHead className="w-[200px] border-r border-border/50">Name Of HR</TableHead>
              <TableHead className="w-[200px] border-r border-border/50">Client Name</TableHead>
              <TableHead className="w-[250px] border-r border-border/50">Contact Info</TableHead>
              <TableHead className="w-[150px] border-r border-border/50">Location</TableHead>
              <TableHead className="w-[180px] border-r border-border/50">ID</TableHead>
              <TableHead className="w-[180px]">Modified Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSPOCs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No SPOCs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSPOCs.map((spoc, index) => (
                <motion.tr
                  key={spoc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`group border-b border-border transition-all duration-200 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    } hover:bg-blue-500/10`}
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
                        <DropdownMenuItem onClick={() => router.push(`/admin/client-hr-spoc/edit/${spoc.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(spoc)}>
                          <Files className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(spoc)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => handleDelete(spoc.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="font-medium text-foreground py-4 border-r border-border/50">
                    {spoc.firstName} {spoc.lastName}
                  </TableCell>
                  <TableCell className="py-4 border-r border-border/50">
                    {spoc.clientName}
                  </TableCell>
                  <TableCell className="py-4 border-r border-border/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                        <Mail className="h-3 w-3" />
                        <span className="text-sm">{spoc.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs">{spoc.phoneCode} {spoc.phoneNumber}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 border-r border-border/50">
                    {spoc.locationHandling || "-"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground py-4 border-r border-border/50">
                    {spoc.id}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm py-4 border-r border-border/50">
                    {spoc.modifiedTime}
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-muted/20">
          <span>Showing {filteredSPOCs.length} of {spocs.length} SPOCs</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div >
  );
}
