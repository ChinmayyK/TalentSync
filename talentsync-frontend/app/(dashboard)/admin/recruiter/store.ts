"use client";

import { useEffect, useState } from 'react';

export interface Recruiter {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    officialEmail: string;
    officialPhoneCode: string;
    officialPhoneNumber: string;
    personalPhoneCode: string;
    personalPhoneNumber: string;
    dateOfBirth: string;
    employmentType: 'Recruiter' | 'Vendor';
    salary: string;
    blocked: boolean;
    reasonForBlock: string;
    password: string;
    zohoCreatorId: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_recruiters';

const INITIAL_RECRUITERS: Recruiter[] = [
    {
        id: '330526000000061616',
        firstName: 'Divesh',
        lastName: 'Dhangar',
        email: 'divesh.dhangar@gmail.com',
        officialEmail: 'divesh.dhangar@talentsync.com',
        officialPhoneCode: '+91',
        officialPhoneNumber: '9536877888',
        personalPhoneCode: '+91',
        personalPhoneNumber: '7982603678',
        dateOfBirth: '04-Mar-1979',
        employmentType: 'Vendor',
        salary: '0',
        blocked: false,
        reasonForBlock: 'No activity',
        password: '',
        zohoCreatorId: '330526000000061616',
        modifiedTime: '01-Jan-2026 03:08:00 PM'
    },
    {
        id: '330526000000061598',
        firstName: 'Shraddha',
        lastName: 'Mohite',
        email: 'mail.shraddhi03@gmail.com',
        officialEmail: 'shraddha.mohite@talentsync.com',
        officialPhoneCode: '+91',
        officialPhoneNumber: '9136307914',
        personalPhoneCode: '+91',
        personalPhoneNumber: '7977795152',
        dateOfBirth: '29-Oct-1995',
        employmentType: 'Recruiter',
        salary: '0',
        blocked: false,
        reasonForBlock: '',
        password: '',
        zohoCreatorId: '330526000000061598',
        modifiedTime: '01-Jan-2026 03:08:00 PM'
    }
];

export const getRecruiters = (): Recruiter[] => {
    if (typeof window === 'undefined') return INITIAL_RECRUITERS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_RECRUITERS;
};

export const saveRecruiter = (recruiter: Recruiter) => {
    const recruiters = getRecruiters();
    const index = recruiters.findIndex(r => r.id === recruiter.id);
    if (index >= 0) {
        recruiters[index] = recruiter;
    } else {
        recruiters.push(recruiter);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recruiters));
};

export const deleteRecruiter = (id: string) => {
    const recruiters = getRecruiters();
    const filtered = recruiters.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useRecruiters() {
    const [recruiters, setRecruiters] = useState<Recruiter[]>([]);

    const refresh = () => {
        setRecruiters(getRecruiters());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { recruiters, refresh };
}
