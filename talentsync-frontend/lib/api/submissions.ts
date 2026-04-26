import { client } from './client';

// Types
export interface ManualSubmissionResult {
    runId: string;
    runTimestamp: string;
    triggeredBy: string;
    totalScanned: number;
    submitted: number;
    skipped: number;
    failures: Array<{ interviewId: string; candidateId?: string; reason: string }>;
}

export interface SubmissionRun {
    id: string;
    tenantId: string;
    triggeredBy: string;
    triggeredAt: string;
    totalScanned: number;
    totalSubmitted: number;
    totalSkipped: number;
    errors: Array<{ interviewId: string; reason: string }> | null;
    remarks: string | null;
    completedAt: string | null;
}

export interface TriggerManualSubmissionDto {
    remarks?: string;
}

// API Functions
export async function runManualSubmission(dto: TriggerManualSubmissionDto = {}): Promise<ManualSubmissionResult> {
    return client.post<ManualSubmissionResult>('/ops/submissions/manual-run', dto);
}

export async function getSubmissionRunHistory(limit = 20): Promise<SubmissionRun[]> {
    return client.get<SubmissionRun[]>('/ops/submissions/history', { params: { limit } });
}
