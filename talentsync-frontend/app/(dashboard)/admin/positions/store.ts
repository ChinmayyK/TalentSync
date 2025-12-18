"use client";

import { useEffect, useState } from 'react';

export interface Position {
    id: string;
    postingTitle: string;
    clientId: string;
    clientName: string;
    category: string;
    hrId: string;
    hrName: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_positions';

const INITIAL_POSITIONS: Position[] = [
    {
        id: '330526000000061488',
        postingTitle: 'Area Head-GBG',
        clientId: 'idfc-1',
        clientName: 'IDFC First Bank Limited',
        category: 'Relationship Managers',
        hrId: 'hr-1',
        hrName: 'Binay Mal',
        modifiedTime: '01-Jan-2026 02:18:00 PM'
    }
];

export const getPositions = (): Position[] => {
    if (typeof window === 'undefined') return INITIAL_POSITIONS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_POSITIONS;
};

export const savePosition = (position: Position) => {
    const positions = getPositions();
    const index = positions.findIndex(p => p.id === position.id);
    if (index >= 0) {
        positions[index] = position;
    } else {
        positions.push(position);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
};

export const deletePosition = (id: string) => {
    const positions = getPositions();
    const filtered = positions.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function usePositions() {
    const [positions, setPositions] = useState<Position[]>([]);

    const refresh = () => {
        setPositions(getPositions());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { positions, refresh };
}

