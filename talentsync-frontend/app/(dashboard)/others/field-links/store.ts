"use client";

import { useEffect, useState } from 'react';

export interface FieldLink {
    id: string;
    labelName: string;
    fieldLinkName: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_field_links';

const INITIAL_FIELD_LINKS: FieldLink[] = [
    {
        id: '330526000000069472',
        labelName: 'for resetting',
        fieldLinkName: 'NA',
        modifiedTime: '01-Jan-2026 07:50:00 PM'
    },
    {
        id: '330526000000069471',
        labelName: 'Book Size',
        fieldLinkName: 'Book_Size',
        modifiedTime: '01-Jan-2026 07:50:00 PM'
    },
    {
        id: '330526000000069470',
        labelName: 'Portfolio size',
        fieldLinkName: 'Portfolio_Size',
        modifiedTime: '01-Jan-2026 07:50:00 PM'
    }
];

export const getFieldLinks = (): FieldLink[] => {
    if (typeof window === 'undefined') return INITIAL_FIELD_LINKS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_FIELD_LINKS;
};

export const saveFieldLink = (fieldLink: FieldLink) => {
    const fieldLinks = getFieldLinks();
    const index = fieldLinks.findIndex(f => f.id === fieldLink.id);
    if (index >= 0) {
        fieldLinks[index] = fieldLink;
    } else {
        fieldLinks.push(fieldLink);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fieldLinks));
};

export const deleteFieldLink = (id: string) => {
    const fieldLinks = getFieldLinks();
    const filtered = fieldLinks.filter(f => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useFieldLinks() {
    const [fieldLinks, setFieldLinks] = useState<FieldLink[]>([]);

    const refresh = () => {
        setFieldLinks(getFieldLinks());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { fieldLinks, refresh };
}

