/**
 * React Query hooks for Communication Module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communicationApi, MessageFilters, Channel, TemplateCategory, AutomationTrigger } from '../api/communication';
import { useToast } from '@/hooks/use-toast';

// Query Keys
export const communicationKeys = {
    all: ['communication'] as const,
    stats: () => [...communicationKeys.all, 'stats'] as const,
    messages: () => [...communicationKeys.all, 'messages'] as const,
    messagesList: (filters: MessageFilters) => [...communicationKeys.messages(), filters] as const,
    messageDetail: (id: string) => [...communicationKeys.messages(), id] as const,
    templates: () => [...communicationKeys.all, 'templates'] as const,
    templatesList: (channel?: Channel, category?: TemplateCategory) => [...communicationKeys.templates(), { channel, category }] as const,
    templateDetail: (id: string) => [...communicationKeys.templates(), id] as const,
    automations: () => [...communicationKeys.all, 'automations'] as const,
    automationDetail: (id: string) => [...communicationKeys.automations(), id] as const,
    channels: () => [...communicationKeys.all, 'channels'] as const,
    channel: (channel: Channel) => [...communicationKeys.channels(), channel] as const,
};

// ============================================
// STATS
// ============================================

export function useStats() {
    return useQuery({
        queryKey: communicationKeys.stats(),
        queryFn: () => communicationApi.getStats(),
        staleTime: 30000, // 30 seconds
    });
}

// ============================================
// MESSAGES
// ============================================

export function useMessages(filters: MessageFilters = {}) {
    return useQuery({
        queryKey: communicationKeys.messagesList(filters),
        queryFn: () => communicationApi.getMessages(filters),
    });
}

export function useMessageDetail(id: string) {
    return useQuery({
        queryKey: communicationKeys.messageDetail(id),
        queryFn: () => communicationApi.getMessageDetail(id),
        enabled: !!id,
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.sendMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.messages() });
            queryClient.invalidateQueries({ queryKey: communicationKeys.stats() });
            toast({ title: 'Message sent', description: 'Your message has been queued for delivery.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to send message', description: error.message, variant: 'destructive' });
        },
    });
}

export function useScheduleMessage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.scheduleMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.messages() });
            queryClient.invalidateQueries({ queryKey: communicationKeys.stats() });
            toast({ title: 'Message scheduled', description: 'Your message has been scheduled for delivery.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to schedule message', description: error.message, variant: 'destructive' });
        },
    });
}

export function useRetryMessage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.retryMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.messages() });
            toast({ title: 'Message retried', description: 'The message has been requeued for delivery.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to retry message', description: error.message, variant: 'destructive' });
        },
    });
}

// ============================================
// TEMPLATES
// ============================================

export function useTemplates(channel?: Channel, category?: TemplateCategory) {
    return useQuery({
        queryKey: communicationKeys.templatesList(channel, category),
        queryFn: () => communicationApi.getTemplates(channel, category),
    });
}

export function useTemplate(id: string) {
    return useQuery({
        queryKey: communicationKeys.templateDetail(id),
        queryFn: () => communicationApi.getTemplate(id),
        enabled: !!id,
    });
}

export function useCreateTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.createTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
            toast({ title: 'Template created', description: 'Your new template has been saved.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to create template', description: error.message, variant: 'destructive' });
        },
    });
}

export function useUpdateTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof communicationApi.updateTemplate>[1] }) =>
            communicationApi.updateTemplate(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
            queryClient.invalidateQueries({ queryKey: communicationKeys.templateDetail(id) });
            toast({ title: 'Template updated', description: 'Your changes have been saved.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to update template', description: error.message, variant: 'destructive' });
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.deleteTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
            toast({ title: 'Template deleted' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to delete template', description: error.message, variant: 'destructive' });
        },
    });
}

export function useDuplicateTemplate() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) => communicationApi.duplicateTemplate(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.templates() });
            toast({ title: 'Template duplicated' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to duplicate template', description: error.message, variant: 'destructive' });
        },
    });
}

export function usePreviewTemplate() {
    return useMutation({
        mutationFn: ({ id, context }: { id: string; context: Record<string, any> }) =>
            communicationApi.previewTemplate(id, context),
    });
}

// ============================================
// AUTOMATIONS
// ============================================

export function useAutomations() {
    return useQuery({
        queryKey: communicationKeys.automations(),
        queryFn: () => communicationApi.getAutomations(),
    });
}

export function useAutomation(id: string) {
    return useQuery({
        queryKey: communicationKeys.automationDetail(id),
        queryFn: () => communicationApi.getAutomation(id),
        enabled: !!id,
    });
}

export function useCreateAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.createAutomation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.automations() });
            toast({ title: 'Automation created' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to create automation', description: error.message, variant: 'destructive' });
        },
    });
}

export function useUpdateAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof communicationApi.updateAutomation>[1] }) =>
            communicationApi.updateAutomation(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.automations() });
            queryClient.invalidateQueries({ queryKey: communicationKeys.automationDetail(id) });
            toast({ title: 'Automation updated' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to update automation', description: error.message, variant: 'destructive' });
        },
    });
}

export function useDeleteAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.deleteAutomation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.automations() });
            toast({ title: 'Automation deleted' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to delete automation', description: error.message, variant: 'destructive' });
        },
    });
}

export function useToggleAutomation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.toggleAutomation,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.automations() });
            toast({
                title: data.isActive ? 'Automation enabled' : 'Automation disabled',
            });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to toggle automation', description: error.message, variant: 'destructive' });
        },
    });
}

// ============================================
// CHANNELS
// ============================================

export function useChannels() {
    return useQuery({
        queryKey: communicationKeys.channels(),
        queryFn: () => communicationApi.getChannels(),
    });
}

export function useChannel(channel: Channel) {
    return useQuery({
        queryKey: communicationKeys.channel(channel),
        queryFn: () => communicationApi.getChannel(channel),
        enabled: !!channel,
    });
}

export function useUpdateChannel() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ channel, data }: { channel: Channel; data: Parameters<typeof communicationApi.updateChannel>[1] }) =>
            communicationApi.updateChannel(channel, data),
        onSuccess: (_, { channel }) => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.channels() });
            queryClient.invalidateQueries({ queryKey: communicationKeys.channel(channel) });
            toast({ title: 'Channel configuration saved' });
        },
        onError: (error: Error) => {
            toast({ title: 'Failed to save channel configuration', description: error.message, variant: 'destructive' });
        },
    });
}

export function useTestChannel() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: communicationApi.testChannel,
        onSuccess: (data, channel) => {
            queryClient.invalidateQueries({ queryKey: communicationKeys.channel(channel) });
            queryClient.invalidateQueries({ queryKey: communicationKeys.channels() });
            if (data.success) {
                toast({ title: 'Connection successful', description: data.message });
            } else {
                toast({ title: 'Connection failed', description: data.message, variant: 'destructive' });
            }
        },
        onError: (error: Error) => {
            toast({ title: 'Connection test failed', description: error.message, variant: 'destructive' });
        },
    });
}
