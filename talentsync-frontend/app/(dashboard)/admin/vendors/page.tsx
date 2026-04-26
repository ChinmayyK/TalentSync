
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorListTable } from '@/components/vendors/VendorListTable';
import { CreateVendorDialog } from '@/components/vendors/CreateVendorDialog';
import { useVendors, useDeleteVendor, useInviteVendorUser } from '@/hooks/use-vendors';
import { Vendor } from '@/lib/api/vendors';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function VendorsPage() {
    const { data: vendors = [], isLoading } = useVendors();
    const deleteVendor = useDeleteVendor();
    const inviteUserMutation = useInviteVendorUser();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

    // Invite User State
    const [inviteVendor, setInviteVendor] = useState<Vendor | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');

    const handleEdit = (vendor: Vendor) => {
        setVendorToEdit(vendor);
        setIsCreateOpen(true);
    };

    const handleDelete = async () => {
        if (vendorToDelete) {
            await deleteVendor.mutateAsync(vendorToDelete.id);
            setVendorToDelete(null);
        }
    };

    const handleCreateOpenChange = (open: boolean) => {
        setIsCreateOpen(open);
        if (!open) setVendorToEdit(null);
    };

    const handleInviteUser = async () => {
        if (!inviteVendor || !inviteEmail || !inviteName) return;

        try {
            await inviteUserMutation.mutateAsync({
                id: inviteVendor.id,
                dto: { email: inviteEmail, name: inviteName }
            });
            setInviteVendor(null);
            setInviteEmail('');
            setInviteName('');
        } catch (error) {
            // Error managed by hook
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
                    <p className="text-muted-foreground">
                        Manage external recruitment agencies and vendors.
                    </p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Vendor
                </Button>
            </div>

            <VendorListTable
                vendors={vendors}
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={setVendorToDelete}
                onInviteUser={setInviteVendor}
            />

            <CreateVendorDialog
                open={isCreateOpen}
                onOpenChange={handleCreateOpenChange}
                vendorToEdit={vendorToEdit}
            />

            <AlertDialog open={!!vendorToDelete} onOpenChange={(open) => !open && setVendorToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the vendor <strong>{vendorToDelete?.name}</strong> and remove all access for their users.
                            Assigned jobs and candidate submissions will remain but be unlinked.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Simple Invite Dialog */}
            <Dialog open={!!inviteVendor} onOpenChange={(open) => !open && setInviteVendor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite User to {inviteVendor?.name}</DialogTitle>
                        <DialogDescription>
                            Create a user account for this vendor. They will receive an invite to access the Vendor Portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                className="col-span-3"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="col-span-3"
                                placeholder="jane@agency.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button disabled={inviteUserMutation.isPending} onClick={handleInviteUser}>
                            {inviteUserMutation.isPending ? 'Sending...' : 'Send Invite'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
