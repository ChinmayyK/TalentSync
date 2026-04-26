"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Plus,
    Search,
    MoreHorizontal,
    Copy,
    Trash2,
    Files,
    Pencil,
    Filter,
    Import,
    MoreVertical,
    ChevronDown,
    Mail,
    MessageSquare,
    Users,
    RefreshCw,
    FileText,
    UserCheck,
    Settings,
    Inbox
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useContacts, deleteContact, saveContact, Contact } from "../store";
import { ColumnHeaderMenu } from "@/components/ui/column-header-menu";

type SortConfig = {
    key: keyof Contact | null;
    direction: 'asc' | 'desc';
};

// Filter options matching Zoho Recruit
const FILTER_OPTIONS = [
    { id: 'locatedWithin', label: 'Located Within' },
    { id: 'toDos', label: 'To-Dos' },
    { id: 'emailStatus', label: 'Email Status' },
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'email', label: 'Email' },
    { id: 'jobTitle', label: 'Job Title' },
    { id: 'workPhone', label: 'Work Phone' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'clientName', label: 'Client Name' },
    { id: 'secondaryEmail', label: 'Secondary Email' },
    { id: 'notes', label: 'Notes' },
    { id: 'attachmentCategory', label: 'Attachment Category' },
    { id: 'socialProfiles', label: 'Associated any Social Profiles' },
    { id: 'tags', label: 'Associated Tags' },
    { id: 'portalStatus', label: 'Client Portal User Status' },
    { id: 'contactOwner', label: 'Contact Owner' },
    { id: 'createdBy', label: 'Created By' },
    { id: 'createdTime', label: 'Created Time' },
    { id: 'currency', label: 'Currency' },
    { id: 'dataProcessingBasis', label: 'Data Processing Basis' },
    { id: 'department', label: 'Department' },
    { id: 'emailOptOut', label: 'Email Opt Out' },
    { id: 'exchangeRate', label: 'Exchange Rate' },
    { id: 'facebook', label: 'Facebook' },
];

export default function AllContactsPage() {
    const router = useRouter();
    const { contacts, refresh } = useContacts();
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
    const [filterSearch, setFilterSearch] = useState("");
    const [territoryFilter, setTerritoryFilter] = useState("all");
    const [contactsFilter, setContactsFilter] = useState("all");
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importData, setImportData] = useState<Partial<Contact>[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Bulk action states
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [massEmailOpen, setMassEmailOpen] = useState(false);
    const [massSmsOpen, setMassSmsOpen] = useState(false);
    const [massDeleteOpen, setMassDeleteOpen] = useState(false);
    const [massUpdateOpen, setMassUpdateOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [smsBody, setSmsBody] = useState("");
    const [updateField, setUpdateField] = useState("jobTitle");
    const [updateValue, setUpdateValue] = useState("");

    // Additional bulk action states
    const [approveOpen, setApproveOpen] = useState(false);
    const [assignmentRulesOpen, setAssignmentRulesOpen] = useState(false);
    const [autoresponderOpen, setAutoresponderOpen] = useState(false);
    const [massTransferOpen, setMassTransferOpen] = useState(false);
    const [massConvertOpen, setMassConvertOpen] = useState(false);
    const [scheduleEmailOpen, setScheduleEmailOpen] = useState(false);
    const [draftsOpen, setDraftsOpen] = useState(false);
    const [transferTo, setTransferTo] = useState("");
    const [convertTo, setConvertTo] = useState("candidate");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [autoresponderMessage, setAutoresponderMessage] = useState("");
    const [drafts, setDrafts] = useState<{ id: string; subject: string; body: string; date: string }[]>([]);

    const handleSort = (key: keyof Contact, direction: 'asc' | 'desc') => {
        setSortConfig({ key, direction });
        toast.info(`Sorted by ${key} (${direction})`);
    };

    const handleGroup = (key: keyof Contact, direction: 'asc' | 'desc') => {
        toast.info(`Grouped by ${key} (${direction})`);
    };

    const handleHideColumn = (columnName: string) => {
        setHiddenColumns(prev => new Set(prev).add(columnName));
        toast.info(`${columnName} column hidden`);
    };

    const toggleFilter = (filterId: string) => {
        setSelectedFilters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(filterId)) {
                newSet.delete(filterId);
            } else {
                newSet.add(filterId);
            }
            return newSet;
        });
    };

    let sortedContacts = [...contacts];

    if (sortConfig.key) {
        sortedContacts.sort((a, b) => {
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

    const filteredContacts = sortedContacts.filter((contact) => {
        const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) ||
            contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const filteredFilterOptions = FILTER_OPTIONS.filter(opt =>
        opt.label.toLowerCase().includes(filterSearch.toLowerCase())
    );

    const handleDelete = (id: string) => {
        deleteContact(id);
        refresh();
        toast.success("Contact deleted successfully");
    };

    const handleDuplicate = (contact: Contact) => {
        const duplicatedContact: Contact = {
            ...contact,
            id: Date.now().toString(),
            firstName: `${contact.firstName} (Copy)`,
            modifiedTime: new Date().toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).replace(',', '')
        };
        saveContact(duplicatedContact);
        refresh();
        toast.success("Contact duplicated successfully");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                toast.error("CSV file must have a header row and at least one data row");
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name'));
            const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name'));
            const emailIdx = headers.findIndex(h => h === 'email' || h.includes('email'));
            const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile'));
            const jobTitleIdx = headers.findIndex(h => h.includes('job') || h.includes('title') || h.includes('position'));
            const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('client') || h.includes('organization'));

            const parsedContacts: Partial<Contact>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                if (values.length > 0 && values.some(v => v)) {
                    parsedContacts.push({
                        firstName: firstNameIdx >= 0 ? values[firstNameIdx] : values[0] || 'Unknown',
                        lastName: lastNameIdx >= 0 ? values[lastNameIdx] : values[1] || '',
                        email: emailIdx >= 0 ? values[emailIdx] : '',
                        mobile: phoneIdx >= 0 ? values[phoneIdx] : '',
                        jobTitle: jobTitleIdx >= 0 ? values[jobTitleIdx] : '',
                        clientName: companyIdx >= 0 ? values[companyIdx] : '',
                    });
                }
            }

            if (parsedContacts.length === 0) {
                toast.error("No valid contacts found in CSV");
                return;
            }

            setImportData(parsedContacts);
            setImportModalOpen(true);
        };
        reader.readAsText(file);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImportConfirm = () => {
        setIsImporting(true);
        const now = new Date().toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }).replace(',', '');

        let imported = 0;
        for (const data of importData) {
            if (data.firstName) {
                const newContact: Contact = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    secondaryEmail: '',
                    jobTitle: data.jobTitle || '',
                    workPhone: '',
                    mobile: data.mobile || '',
                    clientId: '',
                    clientName: data.clientName || '',
                    department: '',
                    emailStatus: 'Active',
                    notes: '',
                    tags: [],
                    createdTime: now,
                    modifiedTime: now,
                };
                saveContact(newContact);
                imported++;
            }
        }

        refresh();
        setIsImporting(false);
        setImportModalOpen(false);
        setImportData([]);
        toast.success(`Successfully imported ${imported} contacts`);
    };

    // Bulk action handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredContacts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredContacts.map(c => c.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleMassEmail = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setMassEmailOpen(true);
    };

    const handleMassSms = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setMassSmsOpen(true);
    };

    const handleMassDelete = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setMassDeleteOpen(true);
    };

    const handleMassUpdate = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setMassUpdateOpen(true);
    };

    const confirmMassDelete = () => {
        selectedIds.forEach(id => deleteContact(id));
        refresh();
        setSelectedIds(new Set());
        setMassDeleteOpen(false);
        toast.success(`Deleted ${selectedIds.size} contacts`);
    };

    const confirmMassEmail = () => {
        const selectedContacts = filteredContacts.filter(c => selectedIds.has(c.id));
        const emails = selectedContacts.map(c => c.email).filter(Boolean);
        toast.success(`Email sent to ${emails.length} contacts`);
        setMassEmailOpen(false);
        setEmailSubject("");
        setEmailBody("");
    };

    const confirmMassSms = () => {
        const selectedContacts = filteredContacts.filter(c => selectedIds.has(c.id));
        const phones = selectedContacts.map(c => c.mobile || c.workPhone).filter(Boolean);
        toast.success(`SMS sent to ${phones.length} contacts`);
        setMassSmsOpen(false);
        setSmsBody("");
    };

    const confirmMassUpdate = () => {
        selectedIds.forEach(id => {
            const contact = contacts.find(c => c.id === id);
            if (contact) {
                saveContact({ ...contact, [updateField]: updateValue });
            }
        });
        refresh();
        setSelectedIds(new Set());
        setMassUpdateOpen(false);
        setUpdateValue("");
        toast.success(`Updated ${selectedIds.size} contacts`);
    };

    const handleDeduplicate = () => {
        // Find duplicates based on email
        const emailMap = new Map<string, Contact[]>();
        contacts.forEach(c => {
            if (c.email) {
                const existing = emailMap.get(c.email.toLowerCase()) || [];
                existing.push(c);
                emailMap.set(c.email.toLowerCase(), existing);
            }
        });

        let duplicatesFound = 0;
        emailMap.forEach((dupes) => {
            if (dupes.length > 1) {
                duplicatesFound += dupes.length - 1;
            }
        });

        if (duplicatesFound > 0) {
            toast.info(`Found ${duplicatesFound} duplicate contacts. Deduplication feature coming soon.`);
        } else {
            toast.success("No duplicate contacts found");
        }
    };

    // Additional bulk action handlers
    const handleApprove = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setApproveOpen(true);
    };

    const confirmApprove = () => {
        toast.success(`Approved ${selectedIds.size} contacts`);
        setApproveOpen(false);
        setSelectedIds(new Set());
    };

    const handleMassTransfer = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setMassTransferOpen(true);
    };

    const confirmMassTransfer = () => {
        if (!transferTo) {
            toast.error("Please select a user to transfer to");
            return;
        }
        toast.success(`Transferred ${selectedIds.size} contacts to ${transferTo}`);
        setMassTransferOpen(false);
        setTransferTo("");
        setSelectedIds(new Set());
    };

    const handleMassConvert = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setMassConvertOpen(true);
    };

    const confirmMassConvert = () => {
        toast.success(`Converted ${selectedIds.size} contacts to ${convertTo}s`);
        setMassConvertOpen(false);
        setConvertTo("candidate");
        setSelectedIds(new Set());
    };

    const handleScheduleEmail = () => {
        if (selectedIds.size === 0) {
            toast.error("Please select at least one contact");
            return;
        }
        setScheduleEmailOpen(true);
    };

    const confirmScheduleEmail = () => {
        if (!scheduleDate || !scheduleTime || !emailSubject || !emailBody) {
            toast.error("Please fill in all fields");
            return;
        }
        toast.success(`Email scheduled for ${scheduleDate} at ${scheduleTime} to ${selectedIds.size} contacts`);
        setScheduleEmailOpen(false);
        setScheduleDate("");
        setScheduleTime("");
        setEmailSubject("");
        setEmailBody("");
    };

    const handleSaveDraft = () => {
        if (!emailSubject || !emailBody) {
            toast.error("Please enter subject and body");
            return;
        }
        const newDraft = {
            id: Date.now().toString(),
            subject: emailSubject,
            body: emailBody,
            date: new Date().toLocaleString()
        };
        setDrafts(prev => [...prev, newDraft]);
        setMassEmailOpen(false);
        setEmailSubject("");
        setEmailBody("");
        toast.success("Draft saved");
    };

    const handleOpenDrafts = () => {
        setDraftsOpen(true);
    };

    const handleLoadDraft = (draft: typeof drafts[0]) => {
        setEmailSubject(draft.subject);
        setEmailBody(draft.body);
        setDraftsOpen(false);
        setMassEmailOpen(true);
    };

    const handleDeleteDraft = (id: string) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success("Draft deleted");
    };

    const handleAutoresponder = () => {
        setAutoresponderOpen(true);
    };

    const confirmAutoresponder = () => {
        if (!autoresponderMessage) {
            toast.error("Please enter an autoresponder message");
            return;
        }
        toast.success("Autoresponder configured successfully");
        setAutoresponderOpen(false);
        setAutoresponderMessage("");
    };

    const handleAssignmentRules = () => {
        setAssignmentRulesOpen(true);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-background">
            {/* Left Filter Sidebar */}
            <div className="w-[220px] border-r border-border/50 bg-card/30 shrink-0">
                <div className="p-3 border-b border-border/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Filter Contacts By
                        </span>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search filters..."
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            className="pl-7 h-8 text-xs bg-background/50"
                        />
                    </div>
                </div>
                <ScrollArea className="h-[calc(100%-80px)]">
                    <div className="p-2 space-y-0.5">
                        {filteredFilterOptions.map((filter) => (
                            <div
                                key={filter.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={() => toggleFilter(filter.id)}
                            >
                                <Checkbox
                                    id={filter.id}
                                    checked={selectedFilters.has(filter.id)}
                                    className="h-3.5 w-3.5"
                                />
                                <label
                                    htmlFor={filter.id}
                                    className="text-xs text-foreground cursor-pointer flex-1"
                                >
                                    {filter.label}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
                    <div className="flex items-center gap-3">
                        <Select value={territoryFilter} onValueChange={setTerritoryFilter}>
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                                <Filter className="h-3.5 w-3.5 mr-1" />
                                <SelectValue placeholder="All Territories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Territories</SelectItem>
                                <SelectItem value="north">North</SelectItem>
                                <SelectItem value="south">South</SelectItem>
                                <SelectItem value="east">East</SelectItem>
                                <SelectItem value="west">West</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={contactsFilter} onValueChange={setContactsFilter}>
                            <SelectTrigger className="h-8 w-[120px] text-xs">
                                <SelectValue placeholder="All Contacts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Contacts</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Import className="h-3.5 w-3.5 mr-1" />
                            Import CSV
                        </Button>
                        <Button
                            onClick={() => router.push("/admin/contacts/add")}
                            size="sm"
                            className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Contact
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <MoreHorizontal className="h-4 w-4 mr-1" />
                                    Actions
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={handleApprove}>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Approve Contacts
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleAssignmentRules}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Assignment Rules
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleAutoresponder}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Autoresponders
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDeduplicate}>
                                    <Users className="h-4 w-4 mr-2" />
                                    Deduplicate Contacts
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleMassEmail}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Mass Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleMassSms}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Mass SMS
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleMassTransfer}>
                                    <Users className="h-4 w-4 mr-2" />
                                    Mass Transfer
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleMassUpdate}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Mass Update
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleMassConvert}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Mass Convert
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleMassDelete} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Mass Delete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleScheduleEmail}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Schedule Mass Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleOpenDrafts}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Drafts
                                    {drafts.length > 0 && (
                                        <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 rounded-full">{drafts.length}</span>
                                    )}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="relative ml-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search contacts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 w-[200px] text-xs bg-background/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0">
                            <TableRow className="hover:bg-muted/50 border-border/50">
                                <TableHead className="w-[50px] border-r border-border/50 font-bold text-center">
                                    <Checkbox
                                        className="h-3.5 w-3.5"
                                        checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="w-[60px] border-r border-border/50 font-bold text-center">
                                    Actions
                                </TableHead>
                                {!hiddenColumns.has('name') && (
                                    <TableHead className="w-[180px] border-r border-border/50">
                                        <ColumnHeaderMenu
                                            columnName="Contact Name"
                                            onSort={(dir) => handleSort('firstName', dir)}
                                            onGroup={(dir) => handleGroup('firstName', dir)}
                                            onHide={() => handleHideColumn('name')}
                                            onSearch={() => toast.info("Search Contact Name")}
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
                                {!hiddenColumns.has('jobTitle') && (
                                    <TableHead className="w-[200px] border-r border-border/50">
                                        <ColumnHeaderMenu
                                            columnName="Job Title"
                                            onSort={(dir) => handleSort('jobTitle', dir)}
                                            onGroup={(dir) => handleGroup('jobTitle', dir)}
                                            onHide={() => handleHideColumn('jobTitle')}
                                            onSearch={() => toast.info("Search Job Title")}
                                        />
                                    </TableHead>
                                )}
                                {!hiddenColumns.has('workPhone') && (
                                    <TableHead className="w-[130px] border-r border-border/50">
                                        <ColumnHeaderMenu
                                            columnName="Work Phone"
                                            onSort={(dir) => handleSort('workPhone', dir)}
                                            onGroup={(dir) => handleGroup('workPhone', dir)}
                                            onHide={() => handleHideColumn('workPhone')}
                                            onSearch={() => toast.info("Search Work Phone")}
                                        />
                                    </TableHead>
                                )}
                                {!hiddenColumns.has('mobile') && (
                                    <TableHead className="w-[130px] border-r border-border/50">
                                        <ColumnHeaderMenu
                                            columnName="Mobile"
                                            onSort={(dir) => handleSort('mobile', dir)}
                                            onGroup={(dir) => handleGroup('mobile', dir)}
                                            onHide={() => handleHideColumn('mobile')}
                                            onSearch={() => toast.info("Search Mobile")}
                                        />
                                    </TableHead>
                                )}
                                {!hiddenColumns.has('clientName') && (
                                    <TableHead className="w-[200px] border-r border-border/50">
                                        <ColumnHeaderMenu
                                            columnName="Client Name"
                                            onSort={(dir) => handleSort('clientName', dir)}
                                            onGroup={(dir) => handleGroup('clientName', dir)}
                                            onHide={() => handleHideColumn('clientName')}
                                            onSearch={() => toast.info("Search Client Name")}
                                        />
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredContacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No contacts found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredContacts.map((contact, index) => (
                                    <motion.tr
                                        key={contact.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: index * 0.02 }}
                                        className={`group border-b border-border transition-all duration-200 ${selectedIds.has(contact.id)
                                            ? 'bg-primary/10'
                                            : index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                                            } hover:bg-blue-500/10`}
                                    >
                                        <TableCell className="py-2 border-r border-border/50 text-center">
                                            <Checkbox
                                                className="h-3.5 w-3.5"
                                                checked={selectedIds.has(contact.id)}
                                                onCheckedChange={() => toggleSelectOne(contact.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2 border-r border-border/50">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted/80">
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-[150px]">
                                                    <DropdownMenuItem onClick={() => router.push(`/admin/contacts/edit/${contact.id}`)}>
                                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(contact)}>
                                                        <Files className="mr-2 h-3.5 w-3.5" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        navigator.clipboard.writeText(`${contact.firstName} ${contact.lastName}`);
                                                        toast.success("Contact name copied");
                                                    }}>
                                                        <Copy className="mr-2 h-3.5 w-3.5" />
                                                        Copy
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                        onClick={() => handleDelete(contact.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        {!hiddenColumns.has('name') && (
                                            <TableCell className="py-2 border-r border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-medium">
                                                        {contact.firstName.charAt(0)}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="text-sm font-medium text-primary hover:underline cursor-pointer text-left"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/admin/contacts/view/${contact.id}`);
                                                        }}
                                                    >
                                                        {contact.firstName} {contact.lastName}
                                                    </button>
                                                </div>
                                            </TableCell>
                                        )}
                                        {!hiddenColumns.has('email') && (
                                            <TableCell className="py-2 border-r border-border/50 text-sm text-primary">
                                                {contact.email ? (
                                                    <a href={`mailto:${contact.email}`} className="hover:underline">
                                                        {contact.email}
                                                    </a>
                                                ) : ''}
                                            </TableCell>
                                        )}
                                        {!hiddenColumns.has('jobTitle') && (
                                            <TableCell className="py-2 border-r border-border/50 text-sm text-muted-foreground">
                                                {contact.jobTitle || ''}
                                            </TableCell>
                                        )}
                                        {!hiddenColumns.has('workPhone') && (
                                            <TableCell className="py-2 border-r border-border/50 text-sm text-muted-foreground">
                                                {contact.workPhone || ''}
                                            </TableCell>
                                        )}
                                        {!hiddenColumns.has('mobile') && (
                                            <TableCell className="py-2 border-r border-border/50 text-sm text-muted-foreground">
                                                {contact.mobile || ''}
                                            </TableCell>
                                        )}
                                        {!hiddenColumns.has('clientName') && (
                                            <TableCell className="py-2 border-r border-border/50 text-sm text-primary">
                                                {contact.clientName || ''}
                                            </TableCell>
                                        )}
                                    </motion.tr>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-border/50 flex justify-between items-center bg-muted/20 text-xs text-muted-foreground">
                    <span>Total Count: {filteredContacts.length}</span>
                    <div className="flex items-center gap-3">
                        <Select defaultValue="100">
                            <SelectTrigger className="h-7 w-[140px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 Records Per Page</SelectItem>
                                <SelectItem value="25">25 Records Per Page</SelectItem>
                                <SelectItem value="50">50 Records Per Page</SelectItem>
                                <SelectItem value="100">100 Records Per Page</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
                                &lt;
                            </Button>
                            <span>1 to {Math.min(filteredContacts.length, 100)}</span>
                            <Button variant="ghost" size="sm" className="h-7 px-2" disabled>
                                &gt;
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Import Confirmation Dialog */}
            <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle>Import Contacts</DialogTitle>
                        <DialogDescription>
                            Review the contacts below before importing. Found {importData.length} contacts in the CSV file.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="border rounded-md overflow-auto max-h-[300px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="text-xs bg-muted/30">
                                    <TableHead>First Name</TableHead>
                                    <TableHead>Last Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Company</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importData.slice(0, 10).map((contact, idx) => (
                                    <TableRow key={idx} className="text-xs">
                                        <TableCell>{contact.firstName || '-'}</TableCell>
                                        <TableCell>{contact.lastName || '-'}</TableCell>
                                        <TableCell>{contact.email || '-'}</TableCell>
                                        <TableCell>{contact.mobile || '-'}</TableCell>
                                        <TableCell>{contact.clientName || '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {importData.length > 10 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                                            ... and {importData.length - 10} more contacts
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setImportModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleImportConfirm} disabled={isImporting}>
                            {isImporting ? 'Importing...' : `Import ${importData.length} Contacts`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mass Delete Confirmation Dialog */}
            <Dialog open={massDeleteOpen} onOpenChange={setMassDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Confirm Mass Delete
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{selectedIds.size}</strong> contacts? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMassDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmMassDelete}>
                            Delete {selectedIds.size} Contacts
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mass Email Dialog */}
            <Dialog open={massEmailOpen} onOpenChange={setMassEmailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Send Mass Email
                        </DialogTitle>
                        <DialogDescription>
                            Sending to {selectedIds.size} recipient(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                placeholder="Enter email subject..."
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="body">Message</Label>
                            <textarea
                                id="body"
                                className="w-full h-40 p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter your email message..."
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMassEmailOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmMassEmail} disabled={!emailSubject || !emailBody}>
                            Send Email
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mass SMS Dialog */}
            <Dialog open={massSmsOpen} onOpenChange={setMassSmsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Send Mass SMS
                        </DialogTitle>
                        <DialogDescription>
                            Sending to {selectedIds.size} recipient(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="sms">Message (160 characters max)</Label>
                            <textarea
                                id="sms"
                                className="w-full h-24 p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter your SMS message..."
                                value={smsBody}
                                onChange={(e) => setSmsBody(e.target.value.slice(0, 160))}
                                maxLength={160}
                            />
                            <p className="text-xs text-muted-foreground text-right">{smsBody.length}/160</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMassSmsOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmMassSms} disabled={!smsBody}>
                            Send SMS
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mass Update Dialog */}
            <Dialog open={massUpdateOpen} onOpenChange={setMassUpdateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            Mass Update
                        </DialogTitle>
                        <DialogDescription>
                            Update {selectedIds.size} contact(s) at once
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="field">Field to Update</Label>
                            <Select value={updateField} onValueChange={setUpdateField}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="jobTitle">Job Title</SelectItem>
                                    <SelectItem value="department">Department</SelectItem>
                                    <SelectItem value="emailStatus">Email Status</SelectItem>
                                    <SelectItem value="notes">Notes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="value">New Value</Label>
                            <Input
                                id="value"
                                placeholder="Enter new value..."
                                value={updateValue}
                                onChange={(e) => setUpdateValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMassUpdateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmMassUpdate} disabled={!updateValue}>
                            Update {selectedIds.size} Contacts
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Contacts Dialog */}
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-green-600" />
                            Approve Contacts
                        </DialogTitle>
                        <DialogDescription>
                            You are about to approve <strong>{selectedIds.size}</strong> contact(s). Approved contacts will be visible to all team members.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmApprove} className="bg-green-600 hover:bg-green-700">
                            Approve {selectedIds.size} Contacts
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assignment Rules Dialog */}
            <Dialog open={assignmentRulesOpen} onOpenChange={setAssignmentRulesOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Assignment Rules
                        </DialogTitle>
                        <DialogDescription>
                            Configure automatic contact assignment rules
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rule Name</Label>
                            <Input placeholder="e.g., Assign to Sales Team" />
                        </div>
                        <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select defaultValue="source">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="source">Based on Source</SelectItem>
                                    <SelectItem value="territory">Based on Territory</SelectItem>
                                    <SelectItem value="jobTitle">Based on Job Title</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Assign To</Label>
                            <Select defaultValue="admin">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin User</SelectItem>
                                    <SelectItem value="recruiter1">Recruiter 1</SelectItem>
                                    <SelectItem value="recruiter2">Recruiter 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignmentRulesOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => { setAssignmentRulesOpen(false); toast.success("Assignment rule created"); }}>
                            Create Rule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Autoresponder Dialog */}
            <Dialog open={autoresponderOpen} onOpenChange={setAutoresponderOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Configure Autoresponder
                        </DialogTitle>
                        <DialogDescription>
                            Set up automatic responses for new contacts
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Trigger</Label>
                            <Select defaultValue="new">
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">New Contact Added</SelectItem>
                                    <SelectItem value="import">Contact Imported</SelectItem>
                                    <SelectItem value="form">Form Submission</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input placeholder="Thank you for reaching out!" />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <textarea
                                className="w-full h-32 p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Dear {{firstName}}, Thank you for contacting us..."
                                value={autoresponderMessage}
                                onChange={(e) => setAutoresponderMessage(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAutoresponderOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmAutoresponder}>
                            Save Autoresponder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mass Transfer Dialog */}
            <Dialog open={massTransferOpen} onOpenChange={setMassTransferOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Transfer Contacts
                        </DialogTitle>
                        <DialogDescription>
                            Transfer {selectedIds.size} contact(s) to another team member
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Transfer To</Label>
                            <Select value={transferTo} onValueChange={setTransferTo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin User</SelectItem>
                                    <SelectItem value="recruiter1">Recruiter 1</SelectItem>
                                    <SelectItem value="recruiter2">Recruiter 2</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMassTransferOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmMassTransfer} disabled={!transferTo}>
                            Transfer {selectedIds.size} Contacts
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mass Convert Dialog */}
            <Dialog open={massConvertOpen} onOpenChange={setMassConvertOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Convert Contacts
                        </DialogTitle>
                        <DialogDescription>
                            Convert {selectedIds.size} contact(s) to another record type
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Convert To</Label>
                            <Select value={convertTo} onValueChange={setConvertTo}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="candidate">Candidate</SelectItem>
                                    <SelectItem value="client">Client</SelectItem>
                                    <SelectItem value="lead">Lead</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMassConvertOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmMassConvert}>
                            Convert to {convertTo.charAt(0).toUpperCase() + convertTo.slice(1)}s
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Schedule Email Dialog */}
            <Dialog open={scheduleEmailOpen} onOpenChange={setScheduleEmailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Schedule Mass Email
                        </DialogTitle>
                        <DialogDescription>
                            Schedule email to {selectedIds.size} recipient(s)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input
                                placeholder="Enter email subject..."
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <textarea
                                className="w-full h-32 p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter your email message..."
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setScheduleEmailOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmScheduleEmail} disabled={!scheduleDate || !scheduleTime || !emailSubject || !emailBody}>
                            Schedule Email
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Drafts Dialog */}
            <Dialog open={draftsOpen} onOpenChange={setDraftsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Email Drafts
                        </DialogTitle>
                        <DialogDescription>
                            {drafts.length > 0 ? `You have ${drafts.length} saved draft(s)` : 'No drafts saved yet'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {drafts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No drafts yet</p>
                                <p className="text-sm">Save drafts from the Mass Email dialog</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-auto">
                                {drafts.map((draft) => (
                                    <div key={draft.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{draft.subject}</p>
                                            <p className="text-xs text-muted-foreground">{draft.date}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => handleLoadDraft(draft)}>
                                                Load
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteDraft(draft.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDraftsOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
