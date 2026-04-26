"use client";

import { useEffect, useState } from "react";

export interface TrackerTemplate {
    id: string;
    title: string;
    description: string;
    columnsRequired: string[];
    modifiedTime: string;
}

export const COLUMNS_OPTIONS = [
    "Age",
    "Book Size",
    "Candidate Email",
    "Candidate Name",
    "Candidate Phone Number",
    "Comments",
    "Current CTC",
    "Current Organization",
    "Current Role",
    "Currently Working?",
    "Date of Birth",
    "Expected CTC",
    "for resetting",
    "Gender",
    "Highest Qualification Held",
    "Industry",
    "Location Applied For",
    "Location Of Residence",
    "Notice Period",
    "Phenom Status",
    "Portfolio size",
    "Position Applied for",
    "Reason for job change",
    "Submission/ Interview Date",
    "Total Experience of Banking/BFSI"
];

const INITIAL_TEMPLATES: TrackerTemplate[] = [
    {
        id: "3305260000000196061",
        title: "Default",
        description: "Main Kotak Tracker with Candidate ID",
        columnsRequired: [
            "Submission/ Interview Date",
            "Candidate Name",
            "Candidate Phone Number",
            "Candidate Email",
            "Position Applied for",
            "Current Organization",
            "Current Role",
            "Current CTC",
            "Industry",
            "Age",
            "Currently Working?",
            "Notice Period",
            "Location Applied For",
            "Comments"
        ],
        modifiedTime: "15-Sep-2025 09:16:46 AM"
    },
    {
        id: "3305260000000098905",
        title: "Kotak ( Default )",
        description: "Main Kotak Tracker with Candidate ID",
        columnsRequired: [
            "Submission/ Interview Date",
            "Candidate Name",
            "Candidate Phone Number",
            "Candidate Email",
            "Position Applied for",
            "Current Organization",
            "Current Role",
            "Current CTC",
            "Industry",
            "Age",
            "Currently Working?",
            "Notice Period",
            "Location Applied For",
            "Comments"
        ],
        modifiedTime: "21-Aug-2025 10:20:40 AM"
    }
];

const STORAGE_KEY = "talentsync_tracker_templates";

export function getTemplates(): TrackerTemplate[] {
    if (typeof window === "undefined") return INITIAL_TEMPLATES;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TEMPLATES));
        return INITIAL_TEMPLATES;
    }
    return JSON.parse(stored);
}

export function saveTemplate(template: TrackerTemplate) {
    const templates = getTemplates();
    const newTemplates = [template, ...templates];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
}

export function deleteTemplate(id: string) {
    const templates = getTemplates();
    const newTemplates = templates.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
}

export function useTrackerTemplates() {
    const [templates, setTemplates] = useState<TrackerTemplate[]>([]);

    useEffect(() => {
        setTemplates(getTemplates());
    }, []);

    const refresh = () => {
        setTemplates(getTemplates());
    };

    return { templates, refresh };
}
