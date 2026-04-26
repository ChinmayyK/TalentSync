
import { client } from './client';
import { Job } from './jobs';
import { Vendor } from './vendors'; // Assuming Vendor type is exported
// Wait, return type of getMyCandidates?
// It returns Candidate[] (with some enrichment).
// I should define Candidate type or import it.
// Checking `candidates.ts` if it exists (from file list earlier).
// Yes, `candidates.ts` exists.

export interface Candidate {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    stage: string;
    status: string;
    createdAt: string;
    jobTitle?: string; // Enriched
}

// Submitting candidate requires specific DTO
export interface SubmitCandidateDto {
    jobId: string;
    name: string;
    email: string;
    phone?: string;
    linkedinProfile?: string;
    resumeUrl: string; // File key from upload
    resumeFileId: string; // File Object ID
}

export async function getVendorJobs(): Promise<Job[]> {
    return client.get('/portal/vendor/jobs');
}

export async function getVendorJob(id: string): Promise<Job> {
    return client.get(`/portal/vendor/jobs/${id}`);
}

export async function getVendorCandidates(): Promise<Candidate[]> {
    return client.get('/portal/vendor/candidates');
}

export async function getResumeUploadUrl(filename: string): Promise<{ uploadUrl: string; s3Key: string; fileId: string }> {
    return client.post('/portal/vendor/upload-url', { filename });
}

export async function submitCandidate(dto: SubmitCandidateDto): Promise<Candidate> {
    return client.post('/portal/vendor/candidates', dto);
}
