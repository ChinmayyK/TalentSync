"use client";

import { useEffect, useState } from 'react';

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    secondaryEmail?: string;
    jobTitle?: string;
    workPhone?: string;
    mobile?: string;
    clientId?: string;
    clientName?: string;
    department?: string;
    emailStatus?: 'Active' | 'Bounced' | 'Unsubscribed';
    notes?: string;
    socialProfiles?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
    };
    tags?: string[];
    createdBy?: string;
    createdTime: string;
    modifiedTime: string;
}

const STORAGE_KEY = 'talentsync_contacts';

const INITIAL_CONTACTS: Contact[] = [
    {
        id: '1',
        firstName: 'Aanchal',
        lastName: 'Mehta',
        email: 'aanchal.mehta@utkarsh.bank',
        jobTitle: 'Regional Manager - HR & Training',
        workPhone: '7722096980',
        mobile: '',
        clientName: 'Utkarsh Small Finance Bank',
        clientId: '1',
        department: 'HR',
        emailStatus: 'Active',
        createdTime: '15-Sep-2025 09:16:46 AM',
        modifiedTime: '15-Sep-2025 09:16:46 AM'
    },
    {
        id: '2',
        firstName: 'Aarfa',
        lastName: 'Neha',
        email: '',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'Angel Broking Limited',
        clientId: '2',
        emailStatus: 'Active',
        createdTime: '14-Sep-2025 10:20:40 AM',
        modifiedTime: '14-Sep-2025 10:20:40 AM'
    },
    {
        id: '3',
        firstName: 'Aatish',
        lastName: 'Verma',
        email: 'aatish.verma@kotak.com',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'Kotak Mahindra Bank Limited',
        clientId: '3',
        emailStatus: 'Active',
        createdTime: '13-Sep-2025 11:30:00 AM',
        modifiedTime: '13-Sep-2025 11:30:00 AM'
    },
    {
        id: '4',
        firstName: 'Aayushi',
        lastName: 'Sharma',
        email: 'aayushi.sharma@edubridgeindia.com',
        jobTitle: '',
        workPhone: '',
        mobile: '8875205549',
        clientName: 'Edubridge Learning Pvt Ltd.',
        clientId: '4',
        emailStatus: 'Active',
        createdTime: '12-Sep-2025 09:00:00 AM',
        modifiedTime: '12-Sep-2025 09:00:00 AM'
    },
    {
        id: '5',
        firstName: 'Abdul',
        lastName: 'Montag',
        email: 'abdul@montaqinfra.com',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'Montaq Infrastructure Pvt. Ltd.',
        clientId: '5',
        emailStatus: 'Active',
        createdTime: '11-Sep-2025 08:45:00 AM',
        modifiedTime: '11-Sep-2025 08:45:00 AM'
    },
    {
        id: '6',
        firstName: 'Abhay',
        lastName: 'Awasthi',
        email: 'abhay.awasthy@fabf.in',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'Abhay Awasthi',
        clientId: '6',
        emailStatus: 'Active',
        createdTime: '10-Sep-2025 10:15:00 AM',
        modifiedTime: '10-Sep-2025 10:15:00 AM'
    },
    {
        id: '7',
        firstName: 'Abhilash',
        lastName: 'G N',
        email: 'abhilash.at@kotak.com',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'Kotak Mahindra Bank Limited',
        clientId: '3',
        emailStatus: 'Active',
        createdTime: '09-Sep-2025 11:00:00 AM',
        modifiedTime: '09-Sep-2025 11:00:00 AM'
    },
    {
        id: '8',
        firstName: 'Abhishek',
        lastName: 'B',
        email: 'abhishek.b@mycorporatejobs.in',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'My Corporate Jobs',
        clientId: '7',
        emailStatus: 'Active',
        createdTime: '08-Sep-2025 09:30:00 AM',
        modifiedTime: '08-Sep-2025 09:30:00 AM'
    },
    {
        id: '9',
        firstName: 'Aditi',
        lastName: 'Sharma',
        email: 'aditi.sharma9@hdfcbank.com',
        jobTitle: 'Senior Manager - Talent Acquisition',
        workPhone: '+91 90236 46072',
        mobile: '',
        clientName: 'HDFC Bank Limited',
        clientId: '8',
        emailStatus: 'Active',
        createdTime: '07-Sep-2025 10:00:00 AM',
        modifiedTime: '07-Sep-2025 10:00:00 AM'
    },
    {
        id: '10',
        firstName: 'Aditi',
        lastName: 'Singhi',
        email: 'aditi.singhi@idfcfirstbank.com',
        jobTitle: '',
        workPhone: '',
        mobile: '',
        clientName: 'IDFC First Bank Limited',
        clientId: '9',
        emailStatus: 'Active',
        createdTime: '06-Sep-2025 08:00:00 AM',
        modifiedTime: '06-Sep-2025 08:00:00 AM'
    }
];

export const getContacts = (): Contact[] => {
    if (typeof window === 'undefined') return INITIAL_CONTACTS;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : INITIAL_CONTACTS;
};

export const saveContact = (contact: Contact) => {
    const contacts = getContacts();
    const index = contacts.findIndex(c => c.id === contact.id);
    if (index >= 0) {
        contacts[index] = contact;
    } else {
        contacts.push(contact);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
};

export const deleteContact = (id: string) => {
    const contacts = getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useContacts() {
    const [contacts, setContacts] = useState<Contact[]>([]);

    const refresh = () => {
        setContacts(getContacts());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { contacts, refresh };
}
