/**
 * Resume Parser API Client
 * 
 * Provides hooks for parsing resumes via OCR and text extraction.
 * Used in the Add Candidate → Upload Resume flow.
 */

import { useMutation } from '@tanstack/react-query';
import { client } from './client';

/**
 * Parsed resume result from backend
 */
export interface ParsedResumeResult {
    status: 'PARSED' | 'PARTIALLY_PARSED' | 'UNPARSABLE';
    fields: {
        name?: string;
        email?: string;
        phone?: string;
        skills: string[];
        experience?: string;
    };
    confidence: {
        name: boolean;
        email: boolean;
        phone: boolean;
    };
    rawText?: string;
    fileId: string;
    filename?: string;
}

/**
 * Parse a resume file to extract candidate information
 */
export async function parseResume(fileId: string): Promise<ParsedResumeResult> {
    return client.post<ParsedResumeResult>('/candidates/resume/parse', { fileId });
}

/**
 * Hook to parse a resume file
 */
export function useParseResume() {
    return useMutation({
        mutationFn: (fileId: string) => parseResume(fileId),
    });
}

/**
 * File upload result from storage API
 */
export interface FileUploadResult {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    key: string;
}

/**
 * Get a presigned URL for file upload
 */
export async function getUploadUrl(params: {
    filename: string;
    mimeType: string;
    linkedType?: string;
    linkedId?: string;
}): Promise<{ uploadUrl: string; fileId: string; s3Key: string }> {
    return client.post('/storage/upload-url', params);
}

/**
 * Attach uploaded file after S3 upload completes
 */
export async function attachFile(params: {
    fileId: string;
    s3Key: string;
    mimeType: string;
    size: number;
}): Promise<FileUploadResult> {
    return client.post<FileUploadResult>('/storage/attach', params);
}

/**
 * Upload a file and parse it for resume data
 * Combines upload + OCR flow into one operation
 */
export async function uploadAndParseResume(
    file: File,
    onProgress?: (stage: 'uploading' | 'processing', percent: number) => void
): Promise<ParsedResumeResult> {
    // Step 1: Get presigned upload URL
    onProgress?.('uploading', 10);

    const { uploadUrl, fileId, s3Key } = await getUploadUrl({
        filename: file.name,
        mimeType: file.type,
        linkedType: 'resume',
    });

    onProgress?.('uploading', 30);

    // Step 2: Upload to S3
    await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });

    onProgress?.('uploading', 60);

    // Step 3: Attach file (confirm upload completion)
    await attachFile({
        fileId,
        s3Key,
        mimeType: file.type,
        size: file.size,
    });

    onProgress?.('processing', 70);

    // Step 4: Parse resume
    const result = await parseResume(fileId);

    onProgress?.('processing', 100);

    return result;
}

/**
 * Hook to upload and parse a resume in one flow
 */
export function useUploadAndParseResume() {
    return useMutation({
        mutationFn: ({ file, onProgress }: {
            file: File;
            onProgress?: (stage: 'uploading' | 'processing', percent: number) => void
        }) => uploadAndParseResume(file, onProgress),
    });
}

/**
 * Calculate overall confidence percentage from field confidence flags
 */
export function calculateConfidencePercent(confidence: ParsedResumeResult['confidence']): number {
    const fields = [confidence.name, confidence.email, confidence.phone];
    const confident = fields.filter(Boolean).length;
    return Math.round((confident / fields.length) * 100);
}
