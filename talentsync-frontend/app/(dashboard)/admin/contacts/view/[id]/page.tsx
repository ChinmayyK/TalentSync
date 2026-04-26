"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    Mail,
    MapPin,
    Linkedin,
    Twitter,
    Facebook,
    Calendar,
    Briefcase,
    MoreHorizontal,
    Pencil,
    Clock,
    ChevronDown,
    Plus,
    MessageSquare,
    Phone,
    FileText,
    UserPlus,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getContacts, Contact } from "../../store";

// Sample related data
const sampleJobOpenings = [
    {
        id: '1',
        postingTitle: 'Customer Service Officer - Customer Relationship Operations',
        clientName: 'Utkarsh Small Finance Bank',
        targetDate: '04/04/2023',
        jobOpeningStatus: 'Inactive',
        city: 'Faridabad, Hisar, Karnal, Panipat, Rohtak, Yamuna...',
        assignedRecruiters: 'Lokesh Mittal',
        positions: 124,
        associatedCandidates: 0,
        salary: 'INR 0.8 Lac - 4 Lac PA'
    },
    {
        id: '2',
        postingTitle: 'Customer Service Officer - Customer Relationship Operations',
        clientName: 'Utkarsh Small Finance Bank',
        targetDate: '04/04/2023',
        jobOpeningStatus: 'Inactive',
        city: 'Jind, Amb, Ambala, Jagadhri, Karnal, Kurukshetra...',
        assignedRecruiters: 'Lokesh Mittal',
        positions: 105,
        associatedCandidates: 0,
        salary: 'INR 0.3 Lac - 4 Lac PA'
    }
];

const sampleInterviews = [
    {
        id: '1',
        interviewName: 'Video Interview',
        from: '05/17/2022 04:00 PM',
        to: '05/17/2022 05:15 PM',
        candidateName: 'ashesh',
        interviewOwner: 'Mahalakshmi Natramu...'
    }
];

const sampleEmails = [
    {
        id: '1',
        date: 'Aug 04 2023',
        time: '10:45',
        from: 'aanchal.mehta@utkarsh.bank',
        to: 'aanchal.mehta@utkarsh.bank',
        subject: 'Invitation to the interview at Utkarsh Small Finance Bank',
        sentBy: 'Lokesh Mittal',
        owner: 'Aanchal Mehta',
        status: 'Delivered'
    },
    {
        id: '2',
        date: 'Aug 04 2023',
        time: '09:30',
        from: 'aanchal.mehta@utkarsh.bank',
        to: 'aanchal.mehta@utkarsh.bank',
        subject: 'New dream first candidate notification for help you on job info',
        sentBy: 'Lokesh Mittal',
        owner: '',
        status: 'Bounced'
    }
];

// Sample timeline events
const sampleTimelineEvents = [
    {
        id: '1',
        type: 'EMAIL_SENT',
        title: 'Email sent',
        description: 'Invitation to the interview at Utkarsh Small Finance Bank',
        timestamp: '2023-08-04T10:45:00',
        actor: 'Lokesh Mittal',
        icon: Mail,
        color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    },
    {
        id: '2',
        type: 'NOTE_ADDED',
        title: 'Note added',
        description: 'Discussed salary expectations and joining timeline',
        timestamp: '2023-08-03T15:30:00',
        actor: 'Lokesh Mittal',
        icon: MessageSquare,
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    {
        id: '3',
        type: 'CALL_MADE',
        title: 'Phone call',
        description: 'Initial discussion about hiring requirements',
        timestamp: '2023-08-02T11:00:00',
        actor: 'Lokesh Mittal',
        icon: Phone,
        color: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    {
        id: '4',
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview scheduled',
        description: 'Video Interview - 05/17/2022 04:00 PM',
        timestamp: '2023-08-01T09:15:00',
        actor: 'Mahalakshmi Natarajan',
        icon: Calendar,
        color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    {
        id: '5',
        type: 'JOB_OPENING_LINKED',
        title: 'Linked to job opening',
        description: 'Customer Service Officer - Customer Relationship Operations',
        timestamp: '2023-07-28T14:20:00',
        actor: 'Lokesh Mittal',
        icon: Briefcase,
        color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    },
    {
        id: '6',
        type: 'DOCUMENT_SHARED',
        title: 'Document shared',
        description: 'Shared company brochure and job description',
        timestamp: '2023-07-25T10:00:00',
        actor: 'Lokesh Mittal',
        icon: FileText,
        color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    },
    {
        id: '7',
        type: 'CONTACT_CREATED',
        title: 'Contact created',
        description: 'Added as new contact from Utkarsh Small Finance Bank',
        timestamp: '2023-07-20T09:00:00',
        actor: 'Lokesh Mittal',
        icon: UserPlus,
        color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    },
];

export default function ContactViewPage() {
    const router = useRouter();
    const params = useParams();
    const contactId = params.id as string;
    const [contact, setContact] = useState<Contact | null>(null);
    const [activeTab, setActiveTab] = useState("overview");
    const [noteText, setNoteText] = useState("");

    useEffect(() => {
        const contacts = getContacts();
        const found = contacts.find(c => c.id === contactId);
        if (found) {
            setContact(found);
        } else {
            toast.error("Contact not found");
            router.push("/admin/contacts/all");
        }
    }, [contactId, router]);

    if (!contact) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const fullName = `${contact.firstName} ${contact.lastName}`;
    const initials = `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`;

    return (
        <div className="h-[calc(100vh-64px)] bg-background">
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/admin/contacts/all")}
                            className="h-8 w-8"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-700">
                            <AvatarFallback className="text-white font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold">{fullName}</h1>
                                <span className="text-sm text-muted-foreground">- {contact.clientName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Add Tags</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                            <Mail className="h-3.5 w-3.5 mr-1" />
                            Send Email
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/contacts/edit/${contactId}`)}
                            className="h-8 text-xs"
                        >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>Clone</DropdownMenuItem>
                                <DropdownMenuItem>Print Preview</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="border-b border-border/50 bg-card/30 px-4">
                        <TabsList className="h-10 bg-transparent border-0 p-0">
                            <TabsTrigger
                                value="overview"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="timeline"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4"
                            >
                                Timeline
                            </TabsTrigger>
                            <TabsTrigger
                                value="emails"
                                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 px-4"
                            >
                                Emails
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Overview Tab Content */}
                    <TabsContent value="overview" className="flex-1 m-0 overflow-auto">
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-4">
                                {/* Last Updated */}
                                <div className="flex justify-end text-xs text-muted-foreground">
                                    <span>Last Update: 920 day(s) ago</span>
                                    <Button variant="link" size="sm" className="h-auto p-0 ml-2 text-xs text-primary">
                                        Hide empty fields
                                    </Button>
                                </div>

                                {/* Business Card */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Business Card</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Origin</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Email</span>
                                                    <span className="col-span-2 text-primary">{contact.email || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Work Phone</span>
                                                    <span className="col-span-2">{contact.workPhone || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Fax</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Contact Owner</span>
                                                    <span className="col-span-2 text-primary">Lokesh Mittal</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Salutation</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mobile</span>
                                                    <div className="col-span-2 flex items-center gap-2">
                                                        <span>{contact.mobile || contact.workPhone || '-'}</span>
                                                        {(contact.mobile || contact.workPhone) && (
                                                            <Badge variant="outline" className="text-[10px] h-4">Verified</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Contact Information */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Department</span>
                                                    <span className="col-span-2">{contact.department || 'Talent Acquisition'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Created By</span>
                                                    <span className="col-span-2 text-primary">Lokesh Mittal</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Secondary Email</span>
                                                    <span className="col-span-2">{contact.secondaryEmail || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Currency</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Exchange Rate</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Assistant Name</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Client Name</span>
                                                    <span className="col-span-2 text-primary">{contact.clientName}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Email</span>
                                                    <span className="col-span-2 text-primary">{contact.email}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Job Title</span>
                                                    <span className="col-span-2">{contact.jobTitle || '-'}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mobile</span>
                                                    <div className="col-span-2 flex items-center gap-2">
                                                        <span>{contact.mobile || contact.workPhone || '-'}</span>
                                                        {(contact.mobile || contact.workPhone) && (
                                                            <Badge variant="outline" className="text-[10px] h-4">Verified</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Modified By</span>
                                                    <span className="col-span-2 text-primary">Lokesh Mittal</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Address Information */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Address Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mailing Street</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mailing City</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mailing Zip</span>
                                                    <span className="col-span-2">umeshtiwari, kashmiragate, jalawapur, jkhaieng</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mailing State</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Mailing Country</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Other Street</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Other City</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Other State</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Other Zip</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Other Country</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <Button variant="outline" size="sm" className="text-xs">
                                                <MapPin className="h-3.5 w-3.5 mr-1" />
                                                Locate Map
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Other Info */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Other Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Added to Client</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Business Card ID</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Co-Ref Name</span>
                                                    <span className="col-span-2 text-primary">Lokesh Mittal</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <span className="text-muted-foreground">Email Opt Out</span>
                                                    <span className="col-span-2">-</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Description */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Description Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="text-sm text-muted-foreground">
                                            {contact.notes || 'No description available'}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Social Links */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Social Links</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Linkedin className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">LinkedIn</span>
                                                <span className="text-sm">-</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Facebook className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Facebook</span>
                                                <span className="text-sm">-</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Twitter className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Twitter</span>
                                                <span className="text-sm">-</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Notes */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Notes</CardTitle>
                                        <span className="text-xs text-muted-foreground">Recent First ▼</span>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <Textarea
                                                    placeholder="Add a note and hit enter..."
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    className="min-h-[60px] text-sm"
                                                />
                                            </div>
                                            <div className="text-sm text-muted-foreground italic">
                                                No notes found
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Attachments */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Attachments</CardTitle>
                                        <Button variant="outline" size="sm" className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" />
                                            Attach
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="text-sm text-muted-foreground italic text-center py-4">
                                            No attachments found
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Job Openings */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Job Openings</CardTitle>
                                        <Button variant="outline" size="sm" className="h-7 text-xs">
                                            <Plus className="h-3 w-3 mr-1" />
                                            New Job Opening
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="text-xs bg-muted/30">
                                                    <TableHead className="w-[250px]">Posting Title</TableHead>
                                                    <TableHead>Client Name</TableHead>
                                                    <TableHead>Target Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>City</TableHead>
                                                    <TableHead>Assigned Recruiters</TableHead>
                                                    <TableHead className="text-right">Positions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sampleJobOpenings.map((job) => (
                                                    <TableRow key={job.id} className="text-xs">
                                                        <TableCell className="text-primary font-medium">{job.postingTitle}</TableCell>
                                                        <TableCell>{job.clientName}</TableCell>
                                                        <TableCell>{job.targetDate}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-[10px]">{job.jobOpeningStatus}</Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-[150px] truncate">{job.city}</TableCell>
                                                        <TableCell>{job.assignedRecruiters}</TableCell>
                                                        <TableCell className="text-right">{job.positions}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Interviews */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Interviews</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="h-7 text-xs">Candidate Interviews</Button>
                                            <Button variant="outline" size="sm" className="h-7 text-xs">Interview Events</Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="text-xs bg-muted/30">
                                                    <TableHead>Interview Name</TableHead>
                                                    <TableHead>From</TableHead>
                                                    <TableHead>To</TableHead>
                                                    <TableHead>Candidate Name</TableHead>
                                                    <TableHead>Interview Owner</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sampleInterviews.map((interview) => (
                                                    <TableRow key={interview.id} className="text-xs">
                                                        <TableCell className="text-primary">{interview.interviewName}</TableCell>
                                                        <TableCell>{interview.from}</TableCell>
                                                        <TableCell>{interview.to}</TableCell>
                                                        <TableCell className="text-primary">{interview.candidateName}</TableCell>
                                                        <TableCell>{interview.interviewOwner}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Emails */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Emails</CardTitle>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span>Sent By: Lokesh Mittal</span>
                                            <ChevronDown className="h-3 w-3" />
                                            <span>To: Aanchal Mehta</span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="text-xs bg-muted/30">
                                                    <TableHead className="w-[100px]">Date</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>From</TableHead>
                                                    <TableHead>To</TableHead>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sampleEmails.map((email) => (
                                                    <TableRow key={email.id} className="text-xs">
                                                        <TableCell>{email.date}</TableCell>
                                                        <TableCell>{email.time}</TableCell>
                                                        <TableCell>{email.from}</TableCell>
                                                        <TableCell>{email.to}</TableCell>
                                                        <TableCell className="text-primary max-w-[200px] truncate">{email.subject}</TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={email.status === 'Delivered' ? 'default' : 'destructive'}
                                                                className="text-[10px]"
                                                            >
                                                                {email.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Info */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Info</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="text-sm text-muted-foreground italic text-center">
                                            No records found
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Checklists */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Checklists</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="text-sm text-muted-foreground italic text-center">
                                            No checklists found
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Invited Events */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Invited Events</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="text-sm text-muted-foreground italic text-center">
                                            No records found
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* To-Dos */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                        <CardTitle className="text-sm font-medium">To-Dos</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                                <Plus className="h-3 w-3 mr-1" />
                                                New Task
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                                <Plus className="h-3 w-3 mr-1" />
                                                New Event
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-7 text-xs">
                                                <Plus className="h-3 w-3 mr-1" />
                                                New Call
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="text-sm text-muted-foreground italic text-center">
                                            No records found
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Campaigns */}
                                <Card>
                                    <CardHeader className="py-3 px-4 bg-muted/30">
                                        <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="text-xs bg-muted/30">
                                                    <TableHead>Campaign Name</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Start Date</TableHead>
                                                    <TableHead>End Date</TableHead>
                                                    <TableHead>Expected Revenue</TableHead>
                                                    <TableHead>Budgeted Cost</TableHead>
                                                    <TableHead>Member Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableRow className="text-xs">
                                                    <TableCell className="text-primary">Manual of Aadhar, Blue Print, Job Data Domain Mapping</TableCell>
                                                    <TableCell>-</TableCell>
                                                    <TableCell>Zoho Campaigns</TableCell>
                                                    <TableCell>-</TableCell>
                                                    <TableCell>-</TableCell>
                                                    <TableCell>₹ 0.0.0</TableCell>
                                                    <TableCell>₹ 0.0.0</TableCell>
                                                    <TableCell>Sent</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* Timeline Tab Content */}
                    <TabsContent value="timeline" className="flex-1 m-0 overflow-auto p-4">
                        <Card>
                            <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Activity Timeline
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs">
                                    {sampleTimelineEvents.length} events
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-1">
                                    {sampleTimelineEvents.map((event, index) => {
                                        const Icon = event.icon;
                                        const date = new Date(event.timestamp);
                                        const isLast = index === sampleTimelineEvents.length - 1;
                                        return (
                                            <div key={event.id} className="flex gap-4 relative">
                                                {/* Timeline line */}
                                                {!isLast && (
                                                    <div className="absolute left-[19px] top-10 w-0.5 h-[calc(100%-16px)] bg-border" />
                                                )}

                                                {/* Icon */}
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${event.color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 pb-6">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm text-foreground">{event.title}</p>
                                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                                {event.description}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                by <span className="font-medium">{event.actor}</span>
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Emails Tab Content */}
                    <TabsContent value="emails" className="flex-1 m-0 overflow-auto p-4">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead className="w-[100px]">Date</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sampleEmails.map((email) => (
                                            <TableRow key={email.id} className="text-xs">
                                                <TableCell>{email.date}</TableCell>
                                                <TableCell>{email.time}</TableCell>
                                                <TableCell>{email.from}</TableCell>
                                                <TableCell>{email.to}</TableCell>
                                                <TableCell className="text-primary max-w-[200px] truncate">{email.subject}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={email.status === 'Delivered' ? 'default' : 'destructive'}
                                                        className="text-[10px]"
                                                    >
                                                        {email.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
