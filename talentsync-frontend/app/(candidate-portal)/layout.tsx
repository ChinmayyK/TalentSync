import type { Metadata } from 'next';
import '@/app/globals.css';

export const metadata: Metadata = {
    title: 'Candidate Portal - TalentSync',
    description: 'View your application status, upcoming interviews, and manage your documents.',
};

export default function CandidatePortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {children}
        </div>
    );
}
