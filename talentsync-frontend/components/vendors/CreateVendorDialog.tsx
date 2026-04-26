
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Vendor, CreateVendorDto } from '@/lib/api/vendors';
import { useCreateVendor, useUpdateVendor } from '@/hooks/use-vendors';

const vendorSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    contactName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

interface CreateVendorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendorToEdit?: Vendor | null;
}

export function CreateVendorDialog({
    open,
    onOpenChange,
    vendorToEdit,
}: CreateVendorDialogProps) {
    const isEditing = !!vendorToEdit;
    const createVendor = useCreateVendor();
    const updateVendor = useUpdateVendor();

    const form = useForm<z.infer<typeof vendorSchema>>({
        resolver: zodResolver(vendorSchema),
        defaultValues: {
            name: '',
            contactName: '',
            email: '',
            phone: '',
            website: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (vendorToEdit) {
                form.reset({
                    name: vendorToEdit.name,
                    contactName: vendorToEdit.contactName || '',
                    email: vendorToEdit.email,
                    phone: vendorToEdit.phone || '',
                    website: vendorToEdit.website || '',
                });
            } else {
                form.reset({
                    name: '',
                    contactName: '',
                    email: '',
                    phone: '',
                    website: '',
                });
            }
        }
    }, [open, vendorToEdit, form]);

    const onSubmit = async (values: z.infer<typeof vendorSchema>) => {
        try {
            if (isEditing && vendorToEdit) {
                await updateVendor.mutateAsync({
                    id: vendorToEdit.id,
                    dto: values,
                });
            } else {
                await createVendor.mutateAsync(values);
            }
            onOpenChange(false);
        } catch (error) {
            // Error managed by hook
            console.error(error)
        }
    };

    const isLoading = createVendor.isPending || updateVendor.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update vendor details here.'
                            : 'Add a new vendor or agency to the platform.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Agency Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Acme Recruitment" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="contact@agency.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Website</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
