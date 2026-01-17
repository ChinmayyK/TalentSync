"use client";

import { useEffect, useState } from 'react';

export interface Address {
    id: string;
    addressName: string; // Changed from 'name' to match form
    type: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    notes?: string;
    fullAddress: string; // The composed string representation
    addedTime: string;
}

const STORAGE_KEY = 'talentsync_addresses';

const INITIAL_ADDRESSES: Address[] = [
    {
        id: '330526000000758049',
        addressName: 'Head Office',
        type: 'office',
        addressLine1: 'Sco 395, Ground Floor, Urban Estate',
        addressLine2: 'nearby KFC, Sector 20',
        city: 'Panchkula',
        state: 'Haryana',
        zipCode: '134117',
        country: 'India',
        fullAddress: 'Sco 395, Ground Floor, Urban Estate, nearby KFC, Sector 20, Panchkula, Haryana 134117',
        addedTime: '31-Dec-2025 12:41:36 PM'
    },
    {
        id: '330526000000745005',
        addressName: 'Mumbai Branch',
        type: 'branch',
        addressLine1: 'Geocon Products, R 2057, Akshar Business Park',
        addressLine2: 'Janta Market Rd, Opp. APMC Fruits & Vegetable Market',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        zipCode: '400703',
        country: 'India',
        fullAddress: 'Geocon Products, R 2057, Akshar Business Park, Janta Market Rd, Opp. APMC Fruits & Vegetable Market, Sector 25, Vashi, Navi Mumbai, Maharashtra 400703, India.',
        addedTime: '26-Dec-2025 07:46:36 PM'
    }
];

export const getAddresses = (): Address[] => {
    if (typeof window === 'undefined') return INITIAL_ADDRESSES;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return INITIAL_ADDRESSES;

    try {
        const parsed = JSON.parse(stored);
        // Migration support for old string-only addresses if any
        return parsed.map((a: any) => ({
            ...a,
            addressName: a.addressName || 'Saved Address',
            type: a.type || 'other',
            addressLine1: a.addressLine1 || a.address || '',
            city: a.city || '',
            state: a.state || '',
            zipCode: a.zipCode || '',
            country: a.country || 'India',
            fullAddress: a.fullAddress || a.address || ''
        }));
    } catch (e) {
        return INITIAL_ADDRESSES;
    }
};

export const saveAddress = (address: Address) => {
    const addresses = getAddresses();
    const index = addresses.findIndex(a => a.id === address.id);
    if (index >= 0) {
        addresses[index] = address;
    } else {
        addresses.push(address);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
};

export const deleteAddress = (id: string) => {
    const addresses = getAddresses();
    const filtered = addresses.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export function useAddresses() {
    const [addresses, setAddresses] = useState<Address[]>([]);

    const refresh = () => {
        setAddresses(getAddresses());
    };

    useEffect(() => {
        refresh();
    }, []);

    return { addresses, refresh };
}

