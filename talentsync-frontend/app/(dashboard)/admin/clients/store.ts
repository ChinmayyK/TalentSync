
"use client";

import { useEffect, useState } from 'react';

export interface Client {
    id: string;
    name: string;
    website: string;
    status: 'Active' | 'Inactive';
    trackerTemplateId: string;
    trackerTemplateName?: string;
    isDemo: boolean;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_clients';

const INITIAL_CLIENTS: Client[] = [
    {
        id: '3305260000000740003',
        name: 'Bombay Bank Ltd',
        website: '',
        status: 'Active',
        trackerTemplateId: '',
        isDemo: false,
        modifiedTime: '15-Sep-2025 09:16:46 AM'
    },
    {
        id: '3305260000002080003',
        name: 'Equitas Small Finance Bank Ltd',
        website: 'http://equitasbank.com',
        status: 'Active',
        trackerTemplateId: '',
        isDemo: false,
        modifiedTime: '21-Aug-2025 10:20:40 AM'
    }
];

export const getClients = (): Client[] => {
    if (typeof window === 'undefined') return INITIAL_CLIENTS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_CLIENTS;
};

export const saveClient = (client: Client) => {
    const clients = getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
        clients[index] = client;
    } else {
        clients.push(client);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
};

export const deleteClient = (id: string) => {
    const clients = getClients();
    const filtered = clients.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useClients() {
    const [clients, setClients] = useState<Client[]>([]);

    const refresh = () => {
        setClients(getClients());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { clients, refresh };
}
