/**
 * Offers API Client
 * Handles all offer-related API calls
 */
import { client } from './client';

export type OfferStatus =
    | 'DRAFT'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'SENT'
    | 'VIEWED'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'WITHDRAWN'
    | 'COUNTERED';

export type SalaryType = 'ANNUAL' | 'MONTHLY' | 'HOURLY' | 'WEEKLY';

export interface Offer {
    id: string;
    tenantId: string;
    candidateId: string;
    jobId?: string;
    salary: number;
    currency: string;
    salaryType: SalaryType;
    bonus?: number;
    equity?: string;
    startDate?: string;
    expiryDate?: string;
    position?: string;
    department?: string;
    reportingTo?: string;
    workLocation?: string;
    status: OfferStatus;
    sentAt?: string;
    viewedAt?: string;
    respondedAt?: string;
    documentUrl?: string;
    signedDocUrl?: string;
    notes?: string;
    declineReason?: string;
    counterOffer?: {
        salary?: number;
        startDate?: string;
        notes?: string;
    };
    createdAt: string;
    updatedAt: string;
    job?: {
        id: string;
        title: string;
    };
    candidate?: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
    };
}

export interface CreateOfferDto {
    candidateId: string;
    jobId?: string;
    salary: number;
    currency?: string;
    salaryType?: SalaryType;
    bonus?: number;
    equity?: string;
    startDate?: string;
    expiryDate?: string;
    position?: string;
    department?: string;
    reportingTo?: string;
    workLocation?: string;
    notes?: string;
}

export interface UpdateOfferDto extends Partial<CreateOfferDto> {
    status?: OfferStatus;
}

export interface QueryOffersParams {
    status?: OfferStatus;
    candidateId?: string;
    jobId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface OffersResponse {
    data: Offer[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface OfferStats {
    total: number;
    draft: number;
    sent: number;
    accepted: number;
    declined: number;
    pending: number;
    acceptanceRate: number;
}

// API Functions
export async function getOffers(params?: QueryOffersParams): Promise<OffersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.candidateId) searchParams.set('candidateId', params.candidateId);
    if (params?.jobId) searchParams.set('jobId', params.jobId);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return client.get(`/offers${query ? `?${query}` : ''}`);
}

export async function getOffer(id: string): Promise<Offer> {
    return client.get(`/offers/${id}`);
}

export async function getOfferStats(): Promise<OfferStats> {
    return client.get('/offers/stats');
}

export async function createOffer(dto: CreateOfferDto): Promise<Offer> {
    return client.post('/offers', dto);
}

export async function updateOffer(id: string, dto: UpdateOfferDto): Promise<Offer> {
    return client.put(`/offers/${id}`, dto);
}

export async function sendOffer(id: string): Promise<Offer> {
    return client.post(`/offers/${id}/send`);
}

export async function withdrawOffer(id: string): Promise<Offer> {
    return client.post(`/offers/${id}/withdraw`);
}

export async function respondToOffer(
    id: string,
    response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED',
    details?: { declineReason?: string; counterOffer?: any }
): Promise<Offer> {
    return client.post(`/offers/${id}/respond`, { response, ...details });
}

export async function deleteOffer(id: string): Promise<void> {
    return client.delete(`/offers/${id}`);
}
