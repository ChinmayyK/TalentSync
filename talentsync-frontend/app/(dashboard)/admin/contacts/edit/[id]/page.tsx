"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getContacts, saveContact, deleteContact, Contact } from "../../store";
import { getClients, Client } from "../../../clients/store";

export default function EditContactPage() {
    const router = useRouter();
    const params = useParams();
    const contactId = params.id as string;

    const [clients, setClients] = useState<Client[]>([]);
    const [formData, setFormData] = useState<Partial<Contact>>({
        firstName: "",
        lastName: "",
        email: "",
        secondaryEmail: "",
        jobTitle: "",
        workPhone: "",
        mobile: "",
        clientId: "",
        clientName: "",
        department: "",
        emailStatus: "Active",
        notes: "",
        tags: [],
    });
    const [originalContact, setOriginalContact] = useState<Contact | null>(null);

    useEffect(() => {
        setClients(getClients());
        const contacts = getContacts();
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            // Ensure all fields have default values to prevent controlled/uncontrolled input issues
            setFormData({
                ...contact,
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                email: contact.email || "",
                secondaryEmail: contact.secondaryEmail || "",
                jobTitle: contact.jobTitle || "",
                workPhone: contact.workPhone || "",
                mobile: contact.mobile || "",
                clientId: contact.clientId || "",
                clientName: contact.clientName || "",
                department: contact.department || "",
                emailStatus: contact.emailStatus || "Active",
                notes: contact.notes || "",
                tags: contact.tags || [],
            });
            setOriginalContact(contact);
        } else {
            toast.error("Contact not found");
            router.push("/admin/contacts/all");
        }
    }, [contactId, router]);

    const handleChange = (field: keyof Contact, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        setFormData(prev => ({
            ...prev,
            clientId,
            clientName: client?.name || ""
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            toast.error("First name and last name are required");
            return;
        }

        const now = new Date().toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }).replace(',', '');

        const updatedContact: Contact = {
            ...originalContact!,
            firstName: formData.firstName || "",
            lastName: formData.lastName || "",
            email: formData.email || "",
            secondaryEmail: formData.secondaryEmail,
            jobTitle: formData.jobTitle,
            workPhone: formData.workPhone,
            mobile: formData.mobile,
            clientId: formData.clientId,
            clientName: formData.clientName,
            department: formData.department,
            emailStatus: formData.emailStatus as 'Active' | 'Bounced' | 'Unsubscribed',
            notes: formData.notes,
            tags: formData.tags,
            modifiedTime: now,
        };

        saveContact(updatedContact);
        toast.success("Contact updated successfully");
        router.push("/admin/contacts/all");
    };

    const handleDelete = () => {
        deleteContact(contactId);
        toast.success("Contact deleted successfully");
        router.push("/admin/contacts/all");
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-9 w-9"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Edit Contact</h1>
                        <p className="text-sm text-muted-foreground">
                            {formData.firstName} {formData.lastName}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete {formData.firstName} {formData.lastName}? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => handleChange("firstName", e.target.value)}
                                placeholder="Enter first name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => handleChange("lastName", e.target.value)}
                                placeholder="Enter last name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange("email", e.target.value)}
                                placeholder="Enter email address"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="secondaryEmail">Secondary Email</Label>
                            <Input
                                id="secondaryEmail"
                                type="email"
                                value={formData.secondaryEmail}
                                onChange={(e) => handleChange("secondaryEmail", e.target.value)}
                                placeholder="Enter secondary email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                                id="jobTitle"
                                value={formData.jobTitle}
                                onChange={(e) => handleChange("jobTitle", e.target.value)}
                                placeholder="e.g., Regional Manager - HR"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => handleChange("department", e.target.value)}
                                placeholder="e.g., Human Resources"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Contact Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="workPhone">Work Phone</Label>
                            <Input
                                id="workPhone"
                                value={formData.workPhone}
                                onChange={(e) => handleChange("workPhone", e.target.value)}
                                placeholder="Enter work phone"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile</Label>
                            <Input
                                id="mobile"
                                value={formData.mobile}
                                onChange={(e) => handleChange("mobile", e.target.value)}
                                placeholder="Enter mobile number"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Client Association */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Client Association</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clientId">Associated Client</Label>
                            <Select
                                value={formData.clientId}
                                onValueChange={handleClientChange}
                            >
                                <SelectTrigger id="clientId">
                                    <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="emailStatus">Email Status</Label>
                            <Select
                                value={formData.emailStatus}
                                onValueChange={(value) => handleChange("emailStatus", value)}
                            >
                                <SelectTrigger id="emailStatus">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Bounced">Bounced</SelectItem>
                                    <SelectItem value="Unsubscribed">Unsubscribed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => handleChange("notes", e.target.value)}
                            placeholder="Add any additional notes about this contact..."
                            rows={4}
                        />
                    </CardContent>
                </Card>

                {/* Metadata */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                            <span className="font-medium">Created:</span> {originalContact?.createdTime}
                        </div>
                        <div>
                            <span className="font-medium">Last Modified:</span> {originalContact?.modifiedTime}
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
