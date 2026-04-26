import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAvailability,
    getSlots,
    getSlot,
    createSlot,
    generateSlots,
    bookSlot,
    rescheduleSlot,
    cancelSlot,
    getWorkingHours,
    setWorkingHours,
    getBusyBlocks,
    createBusyBlock,
    deleteBusyBlock,
    getSchedulingRules,
    createSchedulingRule,
    updateSchedulingRule,
    deleteSchedulingRule,
    getSuggestions,
    getTeamAvailability,
    AvailabilityQueryParams,
    SlotQueryParams,
    BusyBlockQueryParams,
    CreateSlotDto,
    GenerateSlotsDto,
    BookSlotDto,
    RescheduleSlotDto,
    SetWorkingHoursDto,
    CreateBusyBlockDto,
    CreateSchedulingRuleDto,
    UpdateSchedulingRuleDto,
    SuggestionQuery,
    TeamAvailabilityQuery,
} from '../api/calendar';

// Query Keys
export const calendarKeys = {
    all: ['calendar'] as const,
    availability: (params: AvailabilityQueryParams) =>
        [...calendarKeys.all, 'availability', params] as const,
    slots: (params?: SlotQueryParams) =>
        [...calendarKeys.all, 'slots', params] as const,
    slot: (id: string) => [...calendarKeys.all, 'slot', id] as const,
    workingHours: (userId?: string) =>
        [...calendarKeys.all, 'working-hours', userId] as const,
    busyBlocks: (params?: BusyBlockQueryParams) =>
        [...calendarKeys.all, 'busy-blocks', params] as const,
    schedulingRules: () => [...calendarKeys.all, 'rules'] as const,
    suggestions: (params: SuggestionQuery) =>
        [...calendarKeys.all, 'suggestions', params] as const,
    teamAvailability: (userIds: string[], start: string, end: string) =>
        [...calendarKeys.all, 'team-availability', userIds, start, end] as const,
};

// Availability Hooks
export function useAvailability(params: AvailabilityQueryParams) {
    return useQuery({
        queryKey: calendarKeys.availability(params),
        queryFn: () => getAvailability(params),
        enabled: params.userIds.length > 0,
    });
}

// Slots Hooks
export function useSlots(params?: SlotQueryParams, enabled = true) {
    return useQuery({
        queryKey: calendarKeys.slots(params),
        queryFn: () => getSlots(params),
        enabled,
    });
}

export function useSlot(id: string) {
    return useQuery({
        queryKey: calendarKeys.slot(id),
        queryFn: () => getSlot(id),
        enabled: !!id,
    });
}

export function useCreateSlot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateSlotDto) => createSlot(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
        },
    });
}

export function useGenerateSlots() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: GenerateSlotsDto) => generateSlots(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
        },
    });
}

export function useBookSlot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: BookSlotDto }) =>
            bookSlot(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slot(id) });
        },
    });
}

export function useRescheduleSlot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: RescheduleSlotDto }) =>
            rescheduleSlot(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slot(id) });
        },
    });
}

export function useCancelSlot() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => cancelSlot(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.slots() });
            queryClient.invalidateQueries({ queryKey: calendarKeys.slot(id) });
        },
    });
}

// Working Hours Hooks
export function useWorkingHours(userId?: string) {
    return useQuery({
        queryKey: calendarKeys.workingHours(userId),
        queryFn: () => getWorkingHours(userId),
    });
}

export function useSetWorkingHours() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SetWorkingHoursDto) => setWorkingHours(data),
        onSuccess: (_, data) => {
            queryClient.invalidateQueries({
                queryKey: calendarKeys.workingHours(data.userId),
            });
        },
    });
}

// Busy Blocks Hooks
export function useBusyBlocks(params?: BusyBlockQueryParams) {
    return useQuery({
        queryKey: calendarKeys.busyBlocks(params),
        queryFn: () => getBusyBlocks(params),
    });
}

export function useCreateBusyBlock() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateBusyBlockDto) => createBusyBlock(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.busyBlocks() });
        },
    });
}

export function useDeleteBusyBlock() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteBusyBlock(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: calendarKeys.busyBlocks() });
        },
    });
}

// Scheduling Rules Hooks
export function useSchedulingRules() {
    return useQuery({
        queryKey: calendarKeys.schedulingRules(),
        queryFn: () => getSchedulingRules(),
    });
}

export function useCreateSchedulingRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateSchedulingRuleDto) => createSchedulingRule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: calendarKeys.schedulingRules(),
            });
        },
    });
}

export function useUpdateSchedulingRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSchedulingRuleDto }) =>
            updateSchedulingRule(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: calendarKeys.schedulingRules(),
            });
        },
    });
}

export function useDeleteSchedulingRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteSchedulingRule(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: calendarKeys.schedulingRules(),
            });
        },
    });
}

// Suggestions Hooks
export function useSuggestions(query: SuggestionQuery, enabled = true) {
    return useQuery({
        queryKey: calendarKeys.suggestions(query),
        queryFn: () => getSuggestions(query),
        enabled: enabled && query.userIds.length > 0,
    });
}

export function useSuggestionsMutation() {
    return useMutation({
        mutationFn: (query: SuggestionQuery) => getSuggestions(query),
    });
}

// Team Availability Hooks
export function useTeamAvailability(
    userIds: string[],
    start: string,
    end: string,
    slotDurationMins?: number,
) {
    return useQuery({
        queryKey: calendarKeys.teamAvailability(userIds, start, end),
        queryFn: () => getTeamAvailability({ userIds, start, end, slotDurationMins }),
        enabled: userIds.length > 0,
    });
}

// ==================== Calendar Sync Hooks ====================

import {
    getConnectedCalendarAccounts,
    getGoogleAuthUrl,
    googleCalendarCallback,
    disconnectGoogleCalendar,
    getMicrosoftAuthUrl,
    microsoftCalendarCallback,
    disconnectMicrosoftCalendar,
    syncCalendarAccount,
    toggleCalendarSync,
    CalendarCallbackParams,
} from '../api/calendar';

// Query key for sync accounts
export const syncKeys = {
    accounts: () => [...calendarKeys.all, 'sync-accounts'] as const,
};

// Get connected calendar accounts
export function useConnectedCalendarAccounts() {
    return useQuery({
        queryKey: syncKeys.accounts(),
        queryFn: getConnectedCalendarAccounts,
    });
}

// Connect Google Calendar
export function useConnectGoogleCalendar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: CalendarCallbackParams) => googleCalendarCallback(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: syncKeys.accounts() });
        },
    });
}

// Disconnect Google Calendar
export function useDisconnectGoogleCalendar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => disconnectGoogleCalendar(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: syncKeys.accounts() });
        },
    });
}

// Connect Microsoft Calendar
export function useConnectMicrosoftCalendar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: CalendarCallbackParams) => microsoftCalendarCallback(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: syncKeys.accounts() });
        },
    });
}

// Disconnect Microsoft Calendar
export function useDisconnectMicrosoftCalendar() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => disconnectMicrosoftCalendar(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: syncKeys.accounts() });
        },
    });
}

// Sync calendar account
export function useSyncCalendarAccount() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (accountId: string) => syncCalendarAccount(accountId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: syncKeys.accounts() });
            queryClient.invalidateQueries({ queryKey: calendarKeys.all });
        },
    });
}

// Toggle sync enabled
export function useToggleCalendarSync() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ accountId, enabled }: { accountId: string; enabled: boolean }) =>
            toggleCalendarSync(accountId, enabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: syncKeys.accounts() });
        },
    });
}

// Helper to get auth URL
export async function initiateGoogleConnect(redirectUri: string): Promise<string> {
    const result = await getGoogleAuthUrl(redirectUri);
    return result.authUrl;
}

export async function initiateMicrosoftConnect(redirectUri: string): Promise<string> {
    const result = await getMicrosoftAuthUrl(redirectUri);
    return result.authUrl;
}
