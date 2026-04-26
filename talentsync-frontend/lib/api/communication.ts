/**
 * Communication API Client
 * Typed wrappers for all Communication Module endpoints
 */

import { getAuthToken } from '../auth';
import { client } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================
// TYPES
// ============================================

export type Channel = 'EMAIL' | 'WHATSAPP' | 'SMS';
export type MessageStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';
export type RecipientType = 'CANDIDATE' | 'INTERVIEWER' | 'USER' | 'EXTERNAL';
export type TemplateCategory =
    | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_REMINDER' | 'INTERVIEW_RESCHEDULED'
    | 'INTERVIEW_CANCELLED' | 'FEEDBACK_REQUEST' | 'OFFER_LETTER' | 'WELCOME' | 'CUSTOM';
export type AutomationTrigger =
    | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_REMINDER_24H' | 'INTERVIEW_REMINDER_1H'
    | 'INTERVIEW_RESCHEDULED' | 'INTERVIEW_CANCELLED' | 'INTERVIEW_COMPLETED'
    | 'FEEDBACK_SUBMITTED' | 'CANDIDATE_STAGE_CHANGED' | 'OFFER_EXTENDED';

export interface MessageLog {
    id: string;
    tenantId: string;
    channel: Channel;
    templateId: string | null;
    recipientType: RecipientType;
    recipientId: string;
    recipientEmail: string | null;
    recipientPhone: string | null;
    subject: string | null;
    body: string;
    status: MessageStatus;
    externalId: string | null;
    metadata: Record<string, any> | null;
    scheduledFor: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface MessageTemplate {
    id: string;
    tenantId: string;
    name: string;
    channel: Channel;
    category: TemplateCategory;
    subject: string | null;
    body: string;
    variables: string[];
    isSystem: boolean;
    isActive: boolean;
    version: number;
    createdById: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AutomationRule {
    id: string;
    tenantId: string;
    name: string;
    trigger: AutomationTrigger;
    channel: Channel;
    templateId: string;
    template?: MessageTemplate;
    delay: number;
    conditions: Record<string, any> | null;
    isActive: boolean;
    createdById: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChannelConfig {
    id: string;
    tenantId: string;
    channel: Channel;
    provider: string;
    credentials: Record<string, any>;
    settings: Record<string, any> | null;
    isActive: boolean;
    isVerified: boolean;
    lastTestedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CommunicationStats {
    totalSent: number;
    totalPending: number;
    totalFailed: number;
    totalScheduled: number;
    byChannel: {
        email: number;
        whatsapp: number;
        sms: number;
    };
    recentActivity: Partial<MessageLog>[];
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface MessageFilters {
    channel?: Channel;
    status?: MessageStatus;
    recipientType?: RecipientType;
    recipientId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    page?: number;
    limit?: number;
}

// ============================================
// API CLIENT
// ============================================

// ============================================
// API CLIENT
// ============================================

// request function removed in favor of shared client

// ============================================
// MESSAGES
// ============================================

export async function getMessages(filters: MessageFilters = {}): Promise<PaginatedResponse<MessageLog>> {
    const params: Record<string, any> = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value != null) params[key] = value;
    });
    return client.get("/communication/messages", { params });
}

export async function getMessageDetail(id: string): Promise<MessageLog> {
    return client.get(`/communication/messages/${id}`);
}

export async function sendMessage(data: {
    channel: Channel;
    recipientType: RecipientType;
    recipientId: string;
    templateId?: string;
    subject?: string;
    body?: string;
    context?: Record<string, any>;
}): Promise<MessageLog> {
    return client.post('/communication/messages/send', data);
}

export async function scheduleMessage(data: {
    channel: Channel;
    recipientType: RecipientType;
    recipientId: string;
    scheduledFor: string;
    templateId?: string;
    subject?: string;
    body?: string;
    context?: Record<string, any>;
}): Promise<any> {
    return client.post('/communication/messages/schedule', data);
}

export async function retryMessage(id: string): Promise<{ success: boolean; messageId: string }> {
    return client.post(`/communication/messages/${id}/retry`);
}

export async function cancelScheduledMessage(id: string): Promise<any> {
    return client.delete(`/communication/messages/scheduled/${id}`);
}

// ============================================
// TEMPLATES
// ============================================

export async function getTemplates(channel?: Channel, category?: TemplateCategory): Promise<MessageTemplate[]> {
    const params: Record<string, any> = {};
    if (channel) params['channel'] = channel;
    if (category) params['category'] = category;
    return client.get("/communication/templates", { params });
}

export async function getTemplate(id: string): Promise<MessageTemplate> {
    return client.get(`/communication/templates/${id}`);
}

export async function createTemplate(data: {
    name: string;
    channel: Channel;
    category: TemplateCategory;
    subject?: string;
    body: string;
    variables?: string[];
}): Promise<MessageTemplate> {
    return client.post('/communication/templates', data);
}

export async function updateTemplate(id: string, data: {
    name?: string;
    subject?: string;
    body?: string;
    variables?: string[];
    isActive?: boolean;
}): Promise<MessageTemplate> {
    return client.put(`/communication/templates/${id}`, data);
}

export async function deleteTemplate(id: string): Promise<void> {
    return client.delete(`/communication/templates/${id}`);
}

export async function previewTemplate(id: string, context: Record<string, any>): Promise<{ subject: string; body: string }> {
    return client.post(`/communication/templates/${id}/preview`, { context });
}

export async function duplicateTemplate(id: string, name: string): Promise<MessageTemplate> {
    return client.post(`/communication/templates/${id}/duplicate`, { name });
}

export async function getTemplateVariables(): Promise<Record<string, { name: string; description: string }[]>> {
    return client.get('/communication/templates/variables');
}

// ============================================
// AUTOMATIONS
// ============================================

export async function getAutomations(): Promise<AutomationRule[]> {
    return client.get('/communication/automations');
}

export async function getAutomation(id: string): Promise<AutomationRule> {
    return client.get(`/communication/automations/${id}`);
}

export async function createAutomation(data: {
    name: string;
    trigger: AutomationTrigger;
    channel: Channel;
    templateId: string;
    delay?: number;
    conditions?: Record<string, any>;
}): Promise<AutomationRule> {
    return client.post('/communication/automations', data);
}

export async function updateAutomation(id: string, data: {
    name?: string;
    templateId?: string;
    delay?: number;
    conditions?: Record<string, any>;
    isActive?: boolean;
}): Promise<AutomationRule> {
    return client.put(`/communication/automations/${id}`, data);
}

export async function deleteAutomation(id: string): Promise<void> {
    return client.delete(`/communication/automations/${id}`);
}

export async function toggleAutomation(id: string): Promise<AutomationRule> {
    return client.patch(`/communication/automations/${id}/toggle`);
}

export async function getAutomationTriggers(): Promise<{ trigger: AutomationTrigger; description: string }[]> {
    return client.get('/communication/automations/triggers');
}

// ============================================
// CHANNELS
// ============================================

export async function getChannels(): Promise<ChannelConfig[]> {
    return client.get('/communication/channels');
}

export async function getChannel(channel: Channel): Promise<ChannelConfig> {
    return client.get(`/communication/channels/${channel}`);
}

export async function updateChannel(channel: Channel, data: {
    credentials: Record<string, any>;
    settings?: Record<string, any>;
}): Promise<ChannelConfig> {
    return client.put(`/communication/channels/${channel}`, { channel, ...data });
}

export async function testChannel(channel: Channel): Promise<{ success: boolean; message: string }> {
    return client.post(`/communication/channels/${channel}/test`);
}

export async function deleteChannel(channel: Channel): Promise<void> {
    return client.delete(`/communication/channels/${channel}`);
}

// ============================================
// STATS
// ============================================

export async function getStats(): Promise<CommunicationStats> {
    return client.get('/communication/stats');
}

// ============================================
// EXPORT ALL
// ============================================

export const communicationApi = {
    // Messages
    getMessages,
    getMessageDetail,
    sendMessage,
    scheduleMessage,
    retryMessage,
    cancelScheduledMessage,
    // Templates
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
    duplicateTemplate,
    getTemplateVariables,
    // Automations
    getAutomations,
    getAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    getAutomationTriggers,
    // Channels
    getChannels,
    getChannel,
    updateChannel,
    testChannel,
    deleteChannel,
    // Stats
    getStats,
};

export default communicationApi;
