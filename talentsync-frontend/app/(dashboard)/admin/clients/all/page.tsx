
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
import { toast } from "sonner";
import { useClients, deleteClient, saveClient, Client } from "../store";
import { ColumnHeaderMenu } from "@/components/ui/column-header-menu";

type SortConfig = {
  key: keyof Client | null;
  direction: 'asc' | 'desc';
};

export default function AllClientsPage() {
  const router = useRouter();
  const { clients, refresh } = useClients();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const handleSort = (key: keyof Client, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
    toast.info(`Sorted by ${key} (${direction})`);
  };

  const handleGroup = (key: keyof Client, direction: 'asc' | 'desc') => {
    toast.info(`Grouped by ${key} (${direction})`);
  };

  const handleHideColumn = (columnName: string) => {
    setHiddenColumns(prev => new Set(prev).add(columnName));
    toast.info(`${columnName} column hidden`);
  };

  let sortedClients = [...clients];

  if (sortConfig.key) {
    sortedClients.sort((a, b) => {
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

  const filteredClients = sortedClients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.website.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteClient(id);
    refresh();
    toast.success("Client deleted successfully");
  };

  const handleDuplicate = (client: Client) => {
    const duplicatedClient = {
      ...client,
      id: Date.now().toString(),
      name: `${client.name} (Copy)`,
      modifiedTime: new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }).replace(',', '')
    };
    saveClient(duplicatedClient);
    refresh();
    toast.success("Client duplicated successfully");
  };

  const handleExport = (id: string) => {
    toast.info("Exporting client data...");
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-transparent space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Clients</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your client portfolio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[250px] bg-background/50 backdrop-blur-sm border-muted transition-all focus:w-[300px]"
            />
          </div>

          <Button
            onClick={() => router.push("/admin/clients/add")}
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
              {!hiddenColumns.has('name') && (
                <TableHead className="w-[200px] border-r border-border/50">
                  <ColumnHeaderMenu
                    columnName="Client Name"
                    onSort={(dir) => handleSort('name', dir)}
                    onGroup={(dir) => handleGroup('name', dir)}
                    onHide={() => handleHideColumn('name')}
                    onSearch={() => toast.info("Search Client Name")}
                  />
                </TableHead>
              )}
              {!hiddenColumns.has('website') && (
                <TableHead className="w-[250px] border-r border-border/50">
                  <ColumnHeaderMenu
                    columnName="Company Website"
                    onSort={(dir) => handleSort('website', dir)}
                    onGroup={(dir) => handleGroup('website', dir)}
                    onHide={() => handleHideColumn('website')}
                    onSearch={() => toast.info("Search Website")}
                  />
                </TableHead>
              )}
              {!hiddenColumns.has('id') && (
                <TableHead className="w-[180px] border-r border-border/50">
                  <ColumnHeaderMenu
                    columnName="ID"
                    onSort={(dir) => handleSort('id', dir)}
                    onGroup={(dir) => handleGroup('id', dir)}
                    onHide={() => handleHideColumn('id')}
                    onSearch={() => toast.info("Search ID")}
                  />
                </TableHead>
              )}
              {!hiddenColumns.has('status') && (
                <TableHead className="w-[120px] border-r border-border/50">
                  <ColumnHeaderMenu
                    columnName="Client Status"
                    onSort={(dir) => handleSort('status', dir)}
                    onGroup={(dir) => handleGroup('status', dir)}
                    onHide={() => handleHideColumn('status')}
                    onSearch={() => toast.info("Search Status")}
                  />
                </TableHead>
              )}
              {!hiddenColumns.has('template') && (
                <TableHead className="w-[180px] border-r border-border/50">
                  <ColumnHeaderMenu
                    columnName="Tracker Template"
                    onSort={(dir) => handleSort('trackerTemplateName', dir)}
                    onGroup={(dir) => handleGroup('trackerTemplateName', dir)}
                    onHide={() => handleHideColumn('template')}
                    onSearch={() => toast.info("Search Template")}
                  />
                </TableHead>
              )}
              {!hiddenColumns.has('demo') && (
                <TableHead className="w-[150px] border-r border-border/50">
                  <ColumnHeaderMenu
                    columnName="Demo Client?"
                    onSort={(dir) => handleSort('isDemo', dir)}
                    onGroup={(dir) => handleGroup('isDemo', dir)}
                    onHide={() => handleHideColumn('demo')}
                    onSearch={() => toast.info("Search Demo")}
                  />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No clients found.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client, index) => (
                <motion.tr
                  key={client.id}
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
                        <DropdownMenuItem onClick={() => router.push(`/admin/clients/edit/${client.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(client)}>
                          <Files className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(client.name);
                          toast.success("Client name copied to clipboard");
                        }}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  {!hiddenColumns.has('name') && (
                    <TableCell className="font-medium text-foreground py-4 border-r border-border/50">
                      {client.name}
                    </TableCell>
                  )}
                  {!hiddenColumns.has('website') && (
                    <TableCell className="text-primary py-4 border-r border-border/50">
                      {client.website ? (
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                          {client.website}
                        </a>
                      ) : (
                        ""
                      )}
                    </TableCell>
                  )}
                  {!hiddenColumns.has('id') && (
                    <TableCell className="text-xs font-mono text-muted-foreground py-4 border-r border-border/50">
                      {client.id}
                    </TableCell>
                  )}
                  {!hiddenColumns.has('status') && (
                    <TableCell className="py-4 border-r border-border/50">
                      <div className="text-foreground text-sm">
                        {client.status}
                      </div>
                    </TableCell>
                  )}
                  {!hiddenColumns.has('template') && (
                    <TableCell className="py-4 border-r border-border/50 text-muted-foreground">
                      {client.trackerTemplateName || "Default"}
                    </TableCell>
                  )}
                  {!hiddenColumns.has('demo') && (
                    <TableCell className="py-4 border-r border-border/50">
                      <span className="text-sm">
                        {client.isDemo ? "true" : "false"}
                      </span>
                    </TableCell>
                  )}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-4 border-t border-border/50 text-xs text-muted-foreground flex justify-between items-center bg-muted/20">
          <span>Showing {filteredClients.length} of {clients.length} clients</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div >
    </div >
  );
}
