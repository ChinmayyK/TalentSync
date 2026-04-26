import { client } from './client';

// Extended metadata from Zoho/external systems
export interface ApprovalRequestMetadata {
    // External IDs
    recordId?: string;
    zohoRecruitRecordId?: string;
    ipAddress?: string;

    // Personal details
    dateOfBirth?: string;
    age?: number;
    phone?: string;
    mobile?: string;
    secondaryEmail?: string;
    gender?: string;

    // Location & Industry
    industry?: string;
    locationResidence?: string;
    locationAppliedFor?: string;
    specificBranchLocation?: string;
    cityOfInterview?: string;
    catchmentArea?: string;


    // Employment status
    currentlyWorking?: boolean;
    reasonForChange?: string;
    recruiterComment?: string;
    statusChangeTime?: string;
    panCardNumber?: string;
    yearOfPassing?: string;
    addedInPortal?: boolean;
    idfcPortalCandidateId?: string;


    // Experience details
    currentOrganization?: string;
    currentRole?: string;
    totalExperience?: string;
    highestQualification?: string;
    currentCtc?: string;
    expectedCtc?: string;
    noticePeriod?: string;
    bfsiExperience?: string;
    grade?: string;
    focusedProducts?: string;

    // Other details
    appraisalRatings?: string;
    achievements?: string;
    branchManagerExperience?: string;
    branchesManaging?: string;
    currentCluster?: string;
    clusterRatings?: string;
    interviewedLastYear?: boolean;
    selectLine?: string;
    bscRanking?: string;
    branchLocationSize?: string;
    twoWheelerLicense?: boolean;
    interviewedLast3Months?: boolean;
    portfolioSize?: string;
    addedInGoogleSheet?: boolean;

    // Interview & submission specific
    availablePositions?: string;
    dateOfInterview?: string;
    interviewIdOld?: string;
    feedbackPending?: boolean;
    viewCandidateHistory?: boolean;
    confirmSubmit?: boolean;
    sendWhatsappInvite?: boolean;

    // Manual submission tracking

    manualSubmission?: {
        runId: string;
        submittedAt: string;
        submittedBy: string;
        remarks?: string;
    };

    // Allow additional unknown fields
    [key: string]: unknown;
}

// Types
export interface ApprovalRequest {
    id: string;
    tenantId: string;
    entityType: 'CANDIDATE' | 'SUBMISSION' | 'JOB' | 'OTHER';
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    submissionStatus: string | null;
    recruiterId: string | null;
    recruiterName: string | null;
    candidateId: string | null;
    candidateFirstName: string | null;
    candidateLastName: string | null;
    candidateEmail: string | null;
    interviewId: string | null;
    interviewDate: string | null;
    clientName: string | null;
    positionAppliedFor: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
    rejectedBy: string | null;
    rejectedAt: string | null;
    remarks: string | null;
    metadata: ApprovalRequestMetadata | null;
    submittedAt: string;
    createdAt: string;
    updatedAt: string;
}


export interface PaginatedApprovals {
    items: ApprovalRequest[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApprovalStats {
    pending: number;
    missed: number;
    approved: number;
    rejected: number;
    total: number;
}

export interface QueryApprovalsParams {
    [key: string]: string | number | boolean | undefined | null;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ApproveRejectDto {
    remarks?: string;
}

export interface BulkApproveRejectDto {
    ids: string[];
    remarks?: string;
}

// API Functions
export async function getPendingApprovals(params: QueryApprovalsParams = {}): Promise<PaginatedApprovals> {
    return client.get<PaginatedApprovals>('/ops/approvals/pending', { params });
}

export async function getMissedApprovals(params: QueryApprovalsParams = {}): Promise<PaginatedApprovals> {
    return client.get<PaginatedApprovals>('/ops/approvals/missed', { params });
}

export async function getApprovalStats(): Promise<ApprovalStats> {
    return client.get<ApprovalStats>('/ops/approvals/stats');
}

export async function getApprovalById(id: string): Promise<ApprovalRequest> {
    return client.get<ApprovalRequest>(`/ops/approvals/${id}`);
}

export async function approveRequest(id: string, dto: ApproveRejectDto = {}): Promise<ApprovalRequest> {
    return client.post<ApprovalRequest>(`/ops/approvals/${id}/approve`, dto);
}

export async function rejectRequest(id: string, dto: ApproveRejectDto = {}): Promise<ApprovalRequest> {
    return client.post<ApprovalRequest>(`/ops/approvals/${id}/reject`, dto);
}

export async function bulkApprove(dto: BulkApproveRejectDto): Promise<{ count: number }> {
    return client.post<{ count: number }>('/ops/approvals/bulk/approve', dto);
}

export async function bulkReject(dto: BulkApproveRejectDto): Promise<{ count: number }> {
    return client.post<{ count: number }>('/ops/approvals/bulk/reject', dto);
}

export async function approveAllPendingAndMissed(remarks?: string): Promise<{ count: number; message: string }> {
    return client.post<{ count: number; message: string }>('/ops/approvals/bulk/approve-all', { remarks });
}
