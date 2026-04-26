"use client";

import { useEffect, useState } from 'react';

export interface Status {
    id: string;
    name: string;
    description: string;
    color: string;
    isActive: boolean;
    interviewStage?: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_statuses';

const INITIAL_STATUSES: Status[] = [
    {
        id: '1',
        name: 'Active',
        description: 'Currently active and in progress',
        color: '#10b981',
        isActive: true,
        modifiedTime: '01-Jan-2026 06:52:00 PM'
    },
    {
        id: '2',
        name: 'Pending',
        description: 'Awaiting review or action',
        color: '#f59e0b',
        isActive: true,
        modifiedTime: '01-Jan-2026 06:52:00 PM'
    },
    {
        id: '3',
        name: 'Completed',
        description: 'Successfully completed',
        color: '#3b82f6',
        isActive: true,
        modifiedTime: '01-Jan-2026 06:52:00 PM'
    }
];

export const getStatuses = (): Status[] => {
    if (typeof window === 'undefined') return INITIAL_STATUSES;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_STATUSES;
};

export const saveStatus = (status: Status) => {
    const statuses = getStatuses();
    const index = statuses.findIndex(s => s.id === status.id);
    if (index >= 0) {
        statuses[index] = status;
    } else {
        statuses.push(status);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
};

export const deleteStatus = (id: string) => {
    const statuses = getStatuses();
    const filtered = statuses.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useStatuses() {
    const [statuses, setStatuses] = useState<Status[]>([]);

    const refresh = () => {
        setStatuses(getStatuses());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { statuses, refresh };
}
