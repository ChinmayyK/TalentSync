/**
 * Jobs API Client
 * Handles all job-related API calls
 */
import { client } from './client';

// Types matching backend DTOs
export type JobStatus = 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'CANCELLED';
export type LocationType = 'ONSITE' | 'REMOTE' | 'HYBRID';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY' | 'FREELANCE';
export type JobVisibility = 'INTERNAL' | 'EXTERNAL' | 'CONFIDENTIAL';
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Job {
    id: string;
    tenantId: string;
    title: string;
    description: string;
    requirements?: string;
    department?: string;
    location?: string;
    locationType?: LocationType;
    employmentType?: EmploymentType;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    openings?: number;
    closingDate?: string;
    hiringManagerId?: string;
    recruiterId?: string;
    skills?: string[];
    benefits?: string[];
    tags?: string[];
    status: JobStatus;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
    city?: string;
    clientName?: string;
    lastActivityAt?: string;
    assignedRecruiterIds?: string[];
    visibility?: JobVisibility;
    priority?: JobPriority;
    _count?: {
        applications: number;
        offers: number;
    };
}

export interface CreateJobDto {
    title: string;
    description: string;
    requirements?: string;
    department?: string;
    location?: string;
    locationType?: LocationType;
    employmentType?: EmploymentType;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    openings?: number;
    closingDate?: string;
    hiringManagerId?: string;
    recruiterId?: string;
    skills?: string[];
    benefits?: string[];
    tags?: string[];
    city?: string;
    clientName?: string;
    assignedRecruiterIds?: string[];
    visibility?: JobVisibility;
    priority?: JobPriority;
}

export interface UpdateJobDto extends Partial<CreateJobDto> {
    status?: JobStatus;
}

export interface QueryJobsParams {
    status?: JobStatus;
    department?: string;
    locationType?: LocationType;
    search?: string;
    page?: number;
    limit?: number;
}

export interface JobsResponse {
    data: Job[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface JobStats {
    total: number;
    open: number;
    draft: number;
    closed: number;
    recentApplications: number;
}

// API Functions
export async function getJobs(params?: QueryJobsParams): Promise<JobsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.locationType) searchParams.set('locationType', params.locationType);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return client.get(`/jobs${query ? `?${query}` : ''}`);
}

export async function getJob(id: string): Promise<Job> {
    return client.get(`/jobs/${id}`);
}

export async function getJobStats(): Promise<JobStats> {
    return client.get('/jobs/stats');
}

export async function createJob(dto: CreateJobDto): Promise<Job> {
    return client.post('/jobs', dto);
}

export async function updateJob(id: string, dto: UpdateJobDto): Promise<Job> {
    return client.put(`/jobs/${id}`, dto);
}

export async function publishJob(id: string): Promise<Job> {
    return client.post(`/jobs/${id}/publish`);
}

export async function closeJob(id: string): Promise<Job> {
    return client.post(`/jobs/${id}/close`);
}

export async function deleteJob(id: string): Promise<void> {
    return client.delete(`/jobs/${id}`);
}
