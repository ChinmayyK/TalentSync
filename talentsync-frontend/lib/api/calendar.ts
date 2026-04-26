import { client } from './client';

// Types
export interface TimeInterval {
    start: string;
    end: string;
}

export interface WeeklyPattern {
    dow: number;
    start: string;
    end: string;
}

export interface WorkingHours {
    id: string;
    tenantId: string;
    userId: string;
    weekly: WeeklyPattern[];
    timezone: string;
    effectiveFrom?: string;
    effectiveTo?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BusyBlock {
    id: string;
    tenantId: string;
    userId: string;
    startAt: string;
    endAt: string;
    reason?: string;
    source: 'manual' | 'calendar_sync' | 'interview';
    sourceId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface SchedulingRule {
    id: string;
    tenantId: string;
    name: string;
    minNoticeMins: number;
    bufferBeforeMins: number;
    bufferAfterMins: number;
    defaultSlotMins: number;
    allowOverlapping: boolean;
    isDefault: boolean;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'CANCELLED' | 'EXPIRED';

export interface SlotParticipant {
    type: 'user' | 'candidate';
    id: string;
    email?: string;
    phone?: string;
    name?: string;
}

export interface InterviewSlot {
    id: string;
    tenantId: string;
    interviewId?: string;
    organizerId?: string;
    participants: SlotParticipant[];
    startAt: string;
    endAt: string;
    timezone: string;
    status: SlotStatus;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface TimeSlot {
    start: string;
    end: string;
    durationMins: number;
}

export interface AvailabilityResult {
    userId: string;
    intervals: TimeInterval[];
}

export interface MultiUserAvailabilityResult {
    individual: AvailabilityResult[];
    combined: TimeSlot[];
}

export interface PaginatedSlots {
    items: InterviewSlot[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}

// DTOs
export interface SetWorkingHoursDto {
    userId?: string;
    weekly: WeeklyPattern[];
    timezone: string;
    effectiveFrom?: string;
    effectiveTo?: string;
}

export interface CreateBusyBlockDto {
    userId?: string;
    startAt: string;
    endAt: string;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface CreateSchedulingRuleDto {
    name: string;
    minNoticeMins?: number;
    bufferBeforeMins?: number;
    bufferAfterMins?: number;
    defaultSlotMins?: number;
    allowOverlapping?: boolean;
    isDefault?: boolean;
}

export interface UpdateSchedulingRuleDto extends Partial<CreateSchedulingRuleDto> { }

export interface CreateSlotDto {
    participants: SlotParticipant[];
    startAt: string;
    endAt: string;
    timezone: string;
    metadata?: Record<string, any>;
}

export interface GenerateSlotsDto {
    userIds: string[];
    startRange: string;
    endRange: string;
    slotDurationMins: number;
    ruleId?: string;
    timezone: string;
}

export interface BookSlotDto {
    interviewId?: string;
    candidate: SlotParticipant;
    candidateId?: string;
    metadata?: Record<string, any>;
}

export interface RescheduleSlotDto {
    newStartAt: string;
    newEndAt: string;
    reason?: string;
}

export interface SlotQueryParams {
    status?: SlotStatus;
    userId?: string;
    start?: string;
    end?: string;
    page?: number;
    perPage?: number;
}

export interface AvailabilityQueryParams {
    userIds: string[];
    start: string;
    end: string;
    durationMins?: number;
    timezone?: string;
}

export interface BusyBlockQueryParams {
    userId?: string;
    start?: string;
    end?: string;
    source?: string;
}

// API Functions

// Availability
export async function getAvailability(
    params: AvailabilityQueryParams
): Promise<MultiUserAvailabilityResult> {
    return client.get('/calendar/availability', { params: params as any });
}

// Per-Interviewer Availability with external calendar busy slots
export interface InterviewerAvailabilityQuery {
    start: string;
    end: string;
    durationMins?: number;
}

export interface BusySlotInfo {
    start: string;
    end: string;
    source: 'internal' | 'google' | 'microsoft';
    reason?: string;
}

export interface InterviewerAvailabilityResponse {
    userId: string;
    freeSlots: Array<{
        start: string;
        end: string;
        durationMins: number;
    }>;
    busySlots: BusySlotInfo[];
    calendarConnected: boolean;
    connectedCalendars: Array<{
        provider: string;
        syncEnabled: boolean;
        lastSyncAt?: string;
    }>;
    calendarSyncError?: string;
}

export async function getInterviewerAvailability(
    interviewerId: string,
    params: InterviewerAvailabilityQuery
): Promise<InterviewerAvailabilityResponse> {
    return client.get(`/calendar/interviewers/${interviewerId}/availability`, { params: params as any });
}

// Slots
export async function getSlots(params?: SlotQueryParams): Promise<PaginatedSlots> {
    return client.get('/calendar/slots', { params: params as any });
}

export async function getSlot(id: string): Promise<InterviewSlot> {
    return client.get(`/calendar/slots/${id}`);
}

export async function createSlot(data: CreateSlotDto): Promise<InterviewSlot> {
    return client.post('/calendar/slots', data);
}

export async function generateSlots(data: GenerateSlotsDto): Promise<InterviewSlot[]> {
    return client.post('/calendar/slots/generate', data);
}

export async function bookSlot(id: string, data: BookSlotDto): Promise<InterviewSlot> {
    return client.post(`/calendar/slots/${id}/book`, data);
}

export async function rescheduleSlot(
    id: string,
    data: RescheduleSlotDto
): Promise<InterviewSlot> {
    return client.patch(`/calendar/slots/${id}/reschedule`, data);
}

export async function cancelSlot(id: string): Promise<InterviewSlot> {
    return client.post(`/calendar/slots/${id}/cancel`);
}

// Working Hours
export async function getWorkingHours(userId?: string): Promise<WorkingHours | null> {
    return client.get('/calendar/working-hours', { params: { userId } });
}

export async function setWorkingHours(data: SetWorkingHoursDto): Promise<WorkingHours> {
    return client.put('/calendar/working-hours', data);
}

// Busy Blocks
export async function getBusyBlocks(params?: BusyBlockQueryParams): Promise<BusyBlock[]> {
    return client.get('/calendar/busy-blocks', { params: params as any });
}

export async function createBusyBlock(data: CreateBusyBlockDto): Promise<BusyBlock> {
    return client.post('/calendar/busy-blocks', data);
}

export async function deleteBusyBlock(id: string): Promise<void> {
    return client.delete(`/calendar/busy-blocks/${id}`);
}

// Scheduling Rules
export async function getSchedulingRules(): Promise<SchedulingRule[]> {
    return client.get('/calendar/rules');
}

export async function getSchedulingRule(id: string): Promise<SchedulingRule> {
    return client.get(`/calendar/rules/${id}`);
}

export async function createSchedulingRule(
    data: CreateSchedulingRuleDto
): Promise<SchedulingRule> {
    return client.post('/calendar/rules', data);
}

export async function updateSchedulingRule(
    id: string,
    data: UpdateSchedulingRuleDto
): Promise<SchedulingRule> {
    return client.put(`/calendar/rules/${id}`, data);
}

export async function deleteSchedulingRule(id: string): Promise<void> {
    return client.delete(`/calendar/rules/${id}`);
}

// ==================== Suggestions & Team Availability ====================

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'any';

export interface SlotPreferences {
    preferredTimeOfDay?: TimeOfDay;
    preferredDays?: number[]; // 0-6 (Sun-Sat)
    avoidBackToBack?: boolean;
    minGapBetweenInterviewsMins?: number;
}

export interface SuggestionQuery {
    userIds: string[];
    candidateId?: string;
    durationMins: number;
    startRange: string;
    endRange: string;
    maxSuggestions?: number;
    preferences?: SlotPreferences;
    ruleId?: string;
}

export interface SlotSuggestion {
    start: string;
    end: string;
    score: number;
    reasons: string[];
    userAvailability: Record<string, boolean>;
}

export interface SuggestionResponse {
    suggestions: SlotSuggestion[];
    totalAvailableSlots: number;
    queryRange: {
        start: string;
        end: string;
    };
    processingTimeMs: number;
}

export interface TeamAvailabilityQuery {
    userIds: string[];
    start: string;
    end: string;
    slotDurationMins?: number;
}

export interface UserAvailability {
    userId: string;
    userName?: string;
    intervals: Array<{
        start: string;
        end: string;
    }>;
}

export interface TeamAvailabilityResponse {
    userAvailability: UserAvailability[];
    commonSlots: Array<{
        start: string;
        end: string;
    }>;
    queryRange: {
        start: string;
        end: string;
    };
}

// Suggestions API
export async function getSuggestions(data: SuggestionQuery): Promise<SuggestionResponse> {
    return client.post('/calendar/suggestions', data);
}

// Team Availability API
export async function getTeamAvailability(
    params: TeamAvailabilityQuery
): Promise<TeamAvailabilityResponse> {
    return client.get('/calendar/team-availability', { params: params as any });
}

// ==================== Calendar Sync ====================

export interface CalendarSyncAccount {
    id: string;
    provider: 'google' | 'microsoft';
    providerAccountId: string;
    syncEnabled: boolean;
    lastSyncAt: string | null;
}

export interface ConnectedAccountsResponse {
    accounts: CalendarSyncAccount[];
}

export interface AuthUrlResponse {
    authUrl: string;
}

export interface CalendarCallbackParams {
    code: string;
    redirectUri: string;
}

export interface SyncResult {
    success: boolean;
    eventsProcessed: number;
}

// Get connected calendar accounts
export async function getConnectedCalendarAccounts(): Promise<ConnectedAccountsResponse> {
    return client.get('/calendar/sync/accounts');
}

// Get Google OAuth authorization URL
export async function getGoogleAuthUrl(redirectUri: string): Promise<AuthUrlResponse> {
    return client.get('/calendar/sync/google/auth-url', { params: { redirectUri } });
}

// Exchange Google OAuth code for tokens
export async function googleCalendarCallback(params: CalendarCallbackParams): Promise<{ success: boolean; accountId: string }> {
    return client.post('/calendar/sync/google/callback', params);
}

// Disconnect Google Calendar
export async function disconnectGoogleCalendar(): Promise<{ success: boolean }> {
    return client.delete('/calendar/sync/google');
}

// Get Microsoft OAuth authorization URL
export async function getMicrosoftAuthUrl(redirectUri: string): Promise<AuthUrlResponse> {
    return client.get('/calendar/sync/microsoft/auth-url', { params: { redirectUri } });
}

// Exchange Microsoft OAuth code for tokens
export async function microsoftCalendarCallback(params: CalendarCallbackParams): Promise<{ success: boolean; accountId: string }> {
    return client.post('/calendar/sync/microsoft/callback', params);
}

// Disconnect Microsoft Calendar
export async function disconnectMicrosoftCalendar(): Promise<{ success: boolean }> {
    return client.delete('/calendar/sync/microsoft');
}

// Trigger manual sync for an account
export async function syncCalendarAccount(accountId: string): Promise<SyncResult> {
    return client.post(`/calendar/sync/${accountId}/sync`);
}

// Toggle sync enabled/disabled
export async function toggleCalendarSync(accountId: string, enabled: boolean): Promise<{ success: boolean }> {
    return client.patch(`/calendar/sync/${accountId}/toggle`, { enabled });
}
