/**
 * Candidates API Service
 * Handles all API calls related to candidates including resume uploads
 */

import { client } from './client';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UploadUrlResponse {
    fileId: string;
    uploadUrl: string;
    s3Key: string;
}

interface AttachResumeRequest {
    fileId: string;
    s3Key: string;
    mimeType?: string;
    size?: number;
}

/**
 * Upload a resume for a candidate
 */
export async function uploadCandidateResume(
    candidateId: string,
    file: File,
    _token?: string // deprecated, kept for backward compatibility
): Promise<{ success: boolean; fileId: string }> {
    try {
        // Step 1: Request upload URL
        const uploadUrlResponse = await client.post<UploadUrlResponse>(
            `/candidates/${candidateId}/resume/upload-url`,
            { filename: file.name }
        );

        const { fileId, uploadUrl, s3Key } = uploadUrlResponse;

        // Step 2: Upload to S3 - MUST use fetch to avoid adding custom headers
        const s3Response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        if (!s3Response.ok) {
            throw new Error('Failed to upload file to S3');
        }

        // Step 3: Confirm upload
        const attachRequest: AttachResumeRequest = {
            fileId,
            s3Key,
            mimeType: file.type,
            size: file.size,
        };

        const result = await client.post<{ fileId: string }>(
            `/candidates/${candidateId}/resume/attach`,
            attachRequest
        );

        return {
            success: true,
            fileId: result.fileId,
        };
    } catch (error) {
        throw error;
    }
}

/**
 * Get candidate details
 */
export async function getCandidate(candidateId: string, _token?: string) {
    return client.get(`/candidates/${candidateId}`);
}

/**
 * List all candidates with filters
 */
export async function listCandidates(
    _token?: string, // deprecated, auth handled by client
    params?: {
        page?: number;
        perPage?: number;
        stage?: string;
        source?: string;
        role?: string;
        q?: string;
    }
) {
    const backendParams: Record<string, any> = {};
    if (params?.page) backendParams.page = params.page;
    if (params?.perPage) backendParams.perPage = params.perPage;
    if (params?.stage) backendParams.stage = params.stage;
    if (params?.source) backendParams.source = params.source;
    if (params?.role) backendParams.role = params.role;
    if (params?.q) backendParams.q = params.q;

    return client.get("/candidates", { params: backendParams });
}

// =====================================================
// CANDIDATE DOCUMENTS API
// =====================================================

/**
 * Get all documents for a candidate
 */
export async function getCandidateDocuments(candidateId: string, _token?: string) {
    return client.get(`/candidates/${candidateId}/documents`);
}

// =====================================================
// CANDIDATE NOTES API
// =====================================================

export interface CandidateNoteResponse {
    id: string;
    candidateId: string;
    content: string;
    authorId: string;
    author: {
        id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

/**
 * Get all notes for a candidate
 */
export async function getCandidateNotes(candidateId: string, _token?: string): Promise<{ data: CandidateNoteResponse[] }> {
    return client.get(`/candidates/${candidateId}/notes`);
}

/**
 * Add a note to a candidate
 */
export async function addCandidateNote(
    candidateId: string,
    content: string,
    _token?: string
): Promise<CandidateNoteResponse> {
    return client.post(`/candidates/${candidateId}/notes`, { content });
}

/**
 * Update a candidate note
 */
export async function updateCandidateNote(
    candidateId: string,
    noteId: string,
    content: string,
    _token?: string
): Promise<CandidateNoteResponse> {
    return client.patch(`/candidates/${candidateId}/notes/${noteId}`, { content });
}

/**
 * Delete a candidate note
 */
export async function deleteCandidateNote(
    candidateId: string,
    noteId: string,
    _token?: string
): Promise<{ success: boolean }> {
    return client.delete(`/candidates/${candidateId}/notes/${noteId}`);
}

// =====================================================
// CANDIDATE TIMELINE API
// =====================================================

export interface TimelineEvent {
    id: string;
    type: 'STAGE_CHANGE' | 'NOTE_ADDED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'EMAIL_SENT' | 'SMS_SENT' | 'WHATSAPP_SENT' | 'DOCUMENT_UPLOADED' | 'CANDIDATE_CREATED';
    timestamp: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
    actor?: {
        id: string;
        name: string;
        email: string;
    } | null;
}

/**
 * Get unified timeline for a candidate
 */
export async function getCandidateTimeline(candidateId: string, _token?: string): Promise<TimelineEvent[]> {
    return client.get(`/candidates/${candidateId}/timeline`);
}

