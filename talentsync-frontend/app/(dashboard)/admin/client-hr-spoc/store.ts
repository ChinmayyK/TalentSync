"use client";

import { useEffect, useState } from 'react';

export interface ClientHRSPOC {
    id: string;
    clientId: string;
    clientName: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneCode: string;
    phoneNumber: string;
    locationHandling: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_client_hr_spocs';

const INITIAL_SPOCS: ClientHRSPOC[] = [
    {
        id: '1',
        clientId: '3305260000000740003',
        clientName: 'Bombay Bank Ltd',
        firstName: 'Amit',
        lastName: 'Sharma',
        email: 'amit.sharma@bombaybank.com',
        phoneCode: '+91',
        phoneNumber: '9876543210',
        locationHandling: 'Mumbai',
        modifiedTime: '01-Jan-2026 10:00:00 AM'
    }
];

export const getSPOCs = (): ClientHRSPOC[] => {
    if (typeof window === 'undefined') return INITIAL_SPOCS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_SPOCS;
};

export const saveSPOC = (spoc: ClientHRSPOC) => {
    const spocs = getSPOCs();
    const index = spocs.findIndex(s => s.id === spoc.id);
    if (index >= 0) {
        spocs[index] = spoc;
    } else {
        spocs.push(spoc);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spocs));
};

export const deleteSPOC = (id: string) => {
    const spocs = getSPOCs();
    const filtered = spocs.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useClientHRSPOCs() {
    const [spocs, setSPOCs] = useState<ClientHRSPOC[]>([]);

    const refresh = () => {
        setSPOCs(getSPOCs());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { spocs, refresh };
}
