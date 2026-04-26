
import { client } from './client';

export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface Vendor {
    id: string;
    tenantId: string;
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    website?: string;
    status: VendorStatus;
    createdAt: string;
    updatedAt: string;
    _count?: {
        users: number;
        assignedJobs: number;
        candidates: number;
    };
}

export interface CreateVendorDto {
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    website?: string;
}

export interface UpdateVendorDto extends Partial<CreateVendorDto> {
    status?: VendorStatus;
}

export interface InviteVendorUserDto {
    email: string;
    name: string;
}

export interface AssignJobDto {
    jobId: string;
    commissionType?: string;
    commissionValue?: number;
}

export async function getVendors(): Promise<Vendor[]> {
    return client.get('/vendors');
}

export async function getVendor(id: string): Promise<Vendor> {
    return client.get(`/vendors/${id}`);
}

export async function createVendor(dto: CreateVendorDto): Promise<Vendor> {
    return client.post('/vendors', dto);
}

export async function updateVendor(id: string, dto: UpdateVendorDto): Promise<Vendor> {
    return client.patch(`/vendors/${id}`, dto);
}

export async function deleteVendor(id: string): Promise<void> {
    return client.delete(`/vendors/${id}`);
}

export async function inviteVendorUser(id: string, dto: InviteVendorUserDto): Promise<void> {
    return client.post(`/vendors/${id}/users`, dto);
}

export async function assignJobToVendor(id: string, dto: AssignJobDto): Promise<void> {
    return client.post(`/vendors/${id}/jobs`, dto);
}

export async function removeJobFromVendor(id: string, jobId: string): Promise<void> {
    return client.delete(`/vendors/${id}/jobs/${jobId}`);
}
