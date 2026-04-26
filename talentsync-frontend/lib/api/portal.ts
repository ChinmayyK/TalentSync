/**
 * API client for candidate portal endpoints.
 * Uses X-Portal-Token header instead of JWT Bearer token.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = `${API_BASE_URL}/api/v1/portal`;

export class PortalApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: any,
    ) {
        super(message);
        this.name = 'PortalApiError';
    }
}

// Store portal token in session storage
const PORTAL_TOKEN_KEY = 'portal_token';

export function setPortalToken(token: string): void {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(PORTAL_TOKEN_KEY, token);
    }
}

export function getPortalToken(): string | null {
    if (typeof window !== 'undefined') {
        return sessionStorage.getItem(PORTAL_TOKEN_KEY);
    }
    return null;
}

export function clearPortalToken(): void {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(PORTAL_TOKEN_KEY);
    }
}

async function portalRequest<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getPortalToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Portal-Token': token } : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = { message: response.statusText };
        }
        throw new PortalApiError(
            response.status,
            errorData.message || 'Portal API request failed',
            errorData,
        );
    }

    return response.json();
}

// Types
export interface PortalCandidate {
    id: string;
    name: string;
    email?: string;
    roleTitle?: string;
    stage: string;
    photoUrl?: string;
    createdAt: string;
    companyName?: string;
    companyLogoUrl?: string;
}

export interface PortalInterview {
    id: string;
    date: string;
    durationMins: number;
    stage: string;
    status: string;
    meetingLink?: string;
    interviewerNames: string[];
}

export interface PortalDocument {
    id: string;
    filename: string;
    mimeType?: string;
    size?: number;
    createdAt: string;
    downloadUrl?: string;
}

export interface ValidateTokenResponse {
    valid: boolean;
    candidate?: PortalCandidate;
    message?: string;
}

// API Functions
export async function validatePortalToken(token: string): Promise<ValidateTokenResponse> {
    const response = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    });

    return response.json();
}

export async function getPortalProfile(): Promise<PortalCandidate> {
    return portalRequest<PortalCandidate>('/me');
}

export async function getPortalInterviews(): Promise<PortalInterview[]> {
    return portalRequest<PortalInterview[]>('/interviews');
}

export async function getPortalDocuments(): Promise<PortalDocument[]> {
    return portalRequest<PortalDocument[]>('/documents');
}

export async function generateUploadUrl(filename: string, contentType?: string): Promise<{
    uploadUrl: string;
    fileId: string;
    s3Key: string;
}> {
    return portalRequest('/documents', {
        method: 'POST',
        body: JSON.stringify({ filename, contentType: contentType || 'application/octet-stream' }),
    });
}

export async function confirmDocumentUpload(
    fileId: string,
    s3Key: string,
    mimeType?: string,
    size?: number,
): Promise<PortalDocument> {
    return portalRequest(`/documents/${fileId}`, {
        method: 'PUT',
        body: JSON.stringify({ s3Key, mimeType, size }),
    });
}
