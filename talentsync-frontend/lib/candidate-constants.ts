export const stageLabels: Record<string, string> = {
    APPLIED: 'Applied',
    SCREENING: 'Screening',
    INTERVIEW: 'Interview',
    INTERVIEW_1: 'Interview 1',
    INTERVIEW_2: 'Interview 2',
    HR_ROUND: 'HR Round',
    OFFER: 'Offer',
    HIRED: 'Hired',
    REJECTED: 'Rejected',
    // Legacy lowercase keys for backward compatibility
    applied: 'Applied',
    received: 'Received',
    screening: 'Screening',
    interview: 'Interview',
    'interview-1': 'Interview 1',
    'interview-2': 'Interview 2',
    'hr-round': 'HR Round',
    offer: 'Offer',
    hired: 'Hired',
    rejected: 'Rejected',
};

export const stageColors: Record<string, string> = {
    APPLIED: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    SCREENING: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    INTERVIEW: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    INTERVIEW_1: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    INTERVIEW_2: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    HR_ROUND: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    OFFER: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    HIRED: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    REJECTED: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    // Legacy lowercase keys for backward compatibility
    applied: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    received: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
    screening: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    interview: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
    'interview-1': 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    'interview-2': 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    'hr-round': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    offer: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    hired: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    rejected: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

export const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};
