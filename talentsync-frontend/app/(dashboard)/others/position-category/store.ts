"use client";

import { useEffect, useState } from 'react';

export interface PositionCategory {
    id: string;
    categoryName: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_position_categories';

const INITIAL_CATEGORIES: PositionCategory[] = [
    {
        id: '330526000000098743',
        categoryName: 'Information Technology',
        modifiedTime: '01-Jan-2026 07:55:00 PM'
    },
    {
        id: '330526000000098742',
        categoryName: 'Inside Sales',
        modifiedTime: '01-Jan-2026 07:55:00 PM'
    },
    {
        id: '330526000000098741',
        categoryName: 'Operation / Others',
        modifiedTime: '01-Jan-2026 07:55:00 PM'
    },
    {
        id: '330526000000098740',
        categoryName: 'Field/Open Market Sales',
        modifiedTime: '01-Jan-2026 07:55:00 PM'
    },
    {
        id: '330526000000098739',
        categoryName: 'Branch/Area/Cluster Manager',
        modifiedTime: '01-Jan-2026 07:55:00 PM'
    },
    {
        id: '330526000000098738',
        categoryName: 'Relationship Managers',
        modifiedTime: '01-Jan-2026 07:55:00 PM'
    }
];

export const getPositionCategories = (): PositionCategory[] => {
    if (typeof window === 'undefined') return INITIAL_CATEGORIES;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_CATEGORIES;
};

export const savePositionCategory = (category: PositionCategory) => {
    const categories = getPositionCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
        categories[index] = category;
    } else {
        categories.push(category);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

export const deletePositionCategory = (id: string) => {
    const categories = getPositionCategories();
    const filtered = categories.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function usePositionCategories() {
    const [categories, setCategories] = useState<PositionCategory[]>([]);

    const refresh = () => {
        setCategories(getPositionCategories());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { categories, refresh };
}
