'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    Calendar,
    Clock,
    FileText,
    Pencil,
    Trash2,
    MoreHorizontal,
    Plus,
    Star,
    Send,
    MessageSquare,
    Video,
    Users,
    CheckSquare,
    StickyNote,
    History,
    Link as LinkIcon,
    Building2,
    GraduationCap,
    Award,
    ExternalLink,
    Search,
    Settings,
    RefreshCw,
    Download,
    Upload,
    Eye,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { toast } from 'sonner';
import {
    mockCandidateProfile,
    mockDocuments,
    mockInterviews,
    mockCommunications,
    mockNotes,
    currentUserRole,
} from '@/lib/candidate-mock-data';
import {
    CandidateProfile as CandidateProfileType,
    CandidateDocument,
    CandidateInterview,
    CommunicationEntry,
    CandidateNote,
} from '@/types/candidate';
import { uploadCandidateResume, getCandidate, getCandidateDocuments, getCandidateNotes, addCandidateNote, API_BASE_URL } from '@/lib/api/candidates';
import { getAuthToken } from '@/lib/auth';
import { useDeleteCandidate, useUpdateCandidate } from '@/lib/hooks/useCandidates';
import { ChangeStageModal } from '@/components/candidates/ChangeStageModal';
import { cn } from '@/lib/utils';

// --- Components ---

function DetailSection({
    id,
    title,
    icon: Icon,
    children,
    actions,
}: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-28">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm tracking-tight">{title}</h3>
                    </div>
                    {actions && <div>{actions}</div>}
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </section>
    );
}

function InfoRow({ label, value, isLink = false, multiLine = false }: { label: string; value: string | React.ReactNode; isLink?: boolean; multiLine?: boolean }) {
    return (
        <div className={cn("py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4", multiLine ? "items-start" : "items-center")}>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
            <div className="md:col-span-2 text-sm text-slate-900 dark:text-slate-200 font-medium break-words">
                {isLink ? (
                    <span className="text-primary hover:underline cursor-pointer transition-colors">{value || '—'}</span>
                ) : (
                    value || <span className="text-slate-400 font-normal">—</span>
                )}
            </div>
        </div>
    );
}

function SidebarNavItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                active
                    ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
            )}
        >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-primary" : "text-slate-400 dark:text-slate-500")} />
            <span>{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
    );
}

export default function CandidateProfile() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const deleteCandidateMutation = useDeleteCandidate();
    const updateCandidateMutation = useUpdateCandidate();

    // UI State
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('overview');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [stageModalOpen, setStageModalOpen] = useState(false);

    // Data State
    const [candidate, setCandidate] = useState<CandidateProfileType | null>(null);
    const [documents, setDocuments] = useState<CandidateDocument[]>([]);
    const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
    const [communications, setCommunications] = useState<CommunicationEntry[]>([]);
    const [notes, setNotes] = useState<CandidateNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Ref for section observation
    const sectionObserver = useRef<IntersectionObserver | null>(null);

    // Extended candidate data for display
    const [extendedData, setExtendedData] = useState({
        firstName: '', lastName: '', email: '', secondaryEmail: '', mobile: '', phone: '',
        street: '', city: '', state: '', zipCode: '', country: '',
        currentEmployer: '', currentJobTitle: '', experienceYears: '', expectedSalary: '', currentSalary: '', noticePeriod: '',
        highestQualification: '', university: '', skillSet: [] as string[], source: '',
        candidateOwner: '', createdBy: '', modifiedBy: '', createdTime: '', modifiedTime: '',
    });

    // --- Effects ---

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const loadData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const token = getAuthToken();

        try {
            if (token) {
                const apiData = await getCandidate(id, token) as any;

                // Map API data (simplified for brevity, matching existing logic)
                const nameParts = (apiData.name || '').split(' ');

                setExtendedData({
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    email: apiData.email || '',
                    secondaryEmail: apiData.secondaryEmail || '',
                    mobile: apiData.phone || apiData.mobile || '',
                    phone: apiData.workPhone || '',
                    street: apiData.street || '',
                    city: apiData.city || apiData.location?.split(',')[0] || '',
                    state: apiData.state || '',
                    zipCode: apiData.zipCode || '',
                    country: apiData.country || 'India',
                    currentEmployer: apiData.currentEmployer || apiData.company || '',
                    currentJobTitle: apiData.currentJobTitle || apiData.roleTitle || '',
                    experienceYears: apiData.experienceYears || apiData.experience || '',
                    expectedSalary: apiData.expectedSalary || '',
                    currentSalary: apiData.currentSalary || '',
                    noticePeriod: apiData.noticePeriod || '',
                    highestQualification: apiData.highestQualification || apiData.education || '',
                    university: apiData.university || '',
                    skillSet: apiData.skills || apiData.tags || [],
                    source: apiData.source || 'Direct',
                    candidateOwner: apiData.assignedRecruiter?.name || 'Admin User',
                    createdBy: apiData.createdBy || 'System',
                    modifiedBy: apiData.modifiedBy || 'System',
                    createdTime: apiData.createdAt || '',
                    modifiedTime: apiData.updatedAt || '',
                });

                setCandidate({
                    id: apiData.id,
                    name: apiData.name,
                    email: apiData.email || '',
                    phone: apiData.phone || '',
                    location: apiData.location || '',
                    appliedRole: apiData.roleTitle || apiData.appliedRole || '',
                    experienceSummary: apiData.notes || apiData.experienceSummary || '',
                    assignedRecruiter: apiData.assignedRecruiter || { id: '', name: 'Unassigned', email: '' },
                    tags: apiData.tags || [],
                    currentStage: apiData.currentStage || apiData.stage || 'screening',
                    source: apiData.source || 'Direct',
                    createdAt: apiData.createdAt,
                    updatedAt: apiData.updatedAt,
                    tenantId: apiData.tenantId,
                });

                // Fetch other resources (Docs, Notes, etc.) - Error handling omitted for brevity, assumed safe
                try {
                    const notesResponse = await getCandidateNotes(id, token);
                    setNotes((notesResponse.data || []).map((note: any) => ({
                        id: note.id,
                        content: note.content,
                        authorId: note.authorId,
                        authorName: note.author?.name || 'Unknown',
                        createdAt: note.createdAt,
                    })));
                } catch (e) { setNotes([]); }

                try {
                    const docsResponse = await getCandidateDocuments(id, token) as { data: any[] };
                    setDocuments((docsResponse.data || []).map((doc: any) => ({
                        id: doc.id,
                        type: (doc.mimeType?.includes('pdf') ? 'resume' : 'other') as CandidateDocument['type'],
                        name: doc.filename,
                        url: `${API_BASE_URL}/api/v1/storage/${doc.id}/download`,
                        uploadedAt: doc.createdAt,
                        uploadedBy: 'System',
                        size: doc.size || 0,
                    })));
                } catch (e) { setDocuments([]); }

                setInterviews(apiData.interviews || mockInterviews);
                setCommunications(apiData.communications || mockCommunications);

            } else {
                // Mock Data Fallback
                setCandidate(mockCandidateProfile);
                setDocuments(mockDocuments);
                setInterviews(mockInterviews);
                setCommunications(mockCommunications);
                setNotes(mockNotes);
            }
        } catch (error) {
            console.error('Failed to fetch candidate', error);
            // Fallback to avoid white screen
            setCandidate(mockCandidateProfile);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { loadData(); }, [loadData]);

    const scrollToSection = (sectionId: string) => {
        setActiveSection(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
            const offset = 100; // Height of sticky header + padding
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    // Note Adding Logic
    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        const token = getAuthToken();
        if (!token) { toast.error('Login required'); return; }

        try {
            const createdNote = await addCandidateNote(id, newNote, token);
            setNotes([{
                id: createdNote.id,
                content: createdNote.content,
                authorId: createdNote.authorId,
                authorName: createdNote.author?.name || 'Unknown',
                createdAt: createdNote.createdAt,
            }, ...notes]);
            setNewNote('');
            toast.success('Note added');
        } catch (error) { toast.error('Failed to add note'); }
    };

    // Delete Logic
    const confirmDelete = () => {
        deleteCandidateMutation.mutate(id, {
            onSuccess: () => { toast.success('Candidate deleted'); router.push('/candidates'); },
            onError: () => toast.error('Failed to delete'),
        });
        setShowDeleteDialog(false);
    };

    const handleStageChange = async (cid: string, newStage: string) => {
        await updateCandidateMutation.mutateAsync({ id: cid, data: { stage: newStage } });
        setStageModalOpen(false);
        loadData();
        toast.success(`Stage updated to ${newStage}`);
    };

    const getStageColor = (stage: string) => {
        const colors: Record<string, string> = {
            screening: 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            interview: 'bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            offer: 'bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            hired: 'bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
            rejected: 'bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
        };
        return colors[stage.toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    if (isLoading) return <PageLoader message="Loading Profile..." submessage="Fetching candidate details" />;
    if (!candidate) return <div className="min-h-screen flex items-center justify-center">Candidate not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950/50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-slate-50 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950">
            {/* Sticky Header */}
            <div className={cn(
                "sticky top-0 z-20 w-full border-b transition-all duration-200",
                scrolled ? "bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm" : "bg-transparent border-transparent"
            )}>
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.back()}
                                className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-5 w-5 text-slate-500" />
                            </Button>

                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-800 shadow-md">
                                    <AvatarFallback className="bg-indigo-600 text-white font-semibold text-lg">
                                        {candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{candidate.name}</h1>
                                        <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getStageColor(candidate.currentStage))}>
                                            {candidate.currentStage.toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {candidate.appliedRole}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {candidate.location}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="hidden md:flex bg-white dark:bg-slate-900" onClick={() => toast.info('Send Email')}>
                                <Mail className="h-4 w-4 mr-2" />
                                Email
                            </Button>
                            <Button variant="outline" className="hidden md:flex bg-white dark:bg-slate-900" onClick={() => setStageModalOpen(true)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Change Stage
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                        Actions <ChevronDown className="h-4 w-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => setStageModalOpen(true)}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Change Stage
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.info('Schedule Interview')}>
                                        <Video className="mr-2 h-4 w-4" /> Schedule Interview
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete Candidate
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Navigation Sidebar - Sticky */}
                    <div className="hidden lg:block w-64 shrink-0 sticky top-28">
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Quick Navigation</h3>
                            <div className="space-y-1">
                                <SidebarNavItem icon={User} label="Overview" active={activeSection === 'overview'} onClick={() => scrollToSection('overview')} />
                                <SidebarNavItem icon={FileText} label="Basic Info" active={activeSection === 'basic-info'} onClick={() => scrollToSection('basic-info')} />
                                <SidebarNavItem icon={Briefcase} label="Experience" active={activeSection === 'experience'} onClick={() => scrollToSection('experience')} />
                                <SidebarNavItem icon={GraduationCap} label="Education" active={activeSection === 'education'} onClick={() => scrollToSection('education')} />
                                <SidebarNavItem icon={MapPin} label="Address" active={activeSection === 'address'} onClick={() => scrollToSection('address')} />
                                <SidebarNavItem icon={StickyNote} label="Notes" active={activeSection === 'notes'} onClick={() => scrollToSection('notes')} />
                                <SidebarNavItem icon={LinkIcon} label="Attachments" active={activeSection === 'attachments'} onClick={() => scrollToSection('attachments')} />
                            </div>
                        </div>

                        <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Assigned Recruiter
                            </h4>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 bg-blue-100 text-blue-600">
                                    <AvatarFallback>{extendedData.candidateOwner.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{extendedData.candidateOwner}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-300">Recruiter</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 w-full min-w-0 space-y-2">

                        <DetailSection id="overview" title="Candidate Overview" icon={User}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                                <InfoRow label="Full Name" value={candidate.name} />
                                <InfoRow label="Current Title" value={extendedData.currentJobTitle} />
                                <InfoRow label="Email" value={candidate.email} isLink />
                                <InfoRow label="Phone" value={candidate.phone} />
                                <InfoRow label="Source" value={extendedData.source} />
                                <InfoRow label="Added On" value={new Date(candidate.createdAt).toLocaleDateString()} />
                            </div>
                        </DetailSection>

                        <DetailSection id="basic-info" title="Professional Details" icon={FileText}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                                <InfoRow label="Experience (Yrs)" value={extendedData.experienceYears} />
                                <InfoRow label="Current Salary" value={extendedData.currentSalary} />
                                <InfoRow label="Expected Salary" value={extendedData.expectedSalary} />
                                <InfoRow label="Notice Period" value={extendedData.noticePeriod} />
                                <InfoRow label="Highest Qual." value={extendedData.highestQualification} />
                                <InfoRow label="Skills" value={
                                    <div className="flex flex-wrap gap-2">
                                        {extendedData.skillSet.map(skill => (
                                            <Badge key={skill} variant="secondary" className="rounded-md px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-normal">
                                                {skill}
                                            </Badge>
                                        ))}
                                    </div>
                                } />
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Executive Summary</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {candidate.experienceSummary || "No summary provided for this candidate."}
                                </p>
                            </div>
                        </DetailSection>

                        <DetailSection id="experience" title="Experience History" icon={Briefcase}>
                            {extendedData.currentEmployer ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                                        <div className="h-10 w-10 mt-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-sm">
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-white">{extendedData.currentJobTitle}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{extendedData.currentEmployer}</p>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                <span>Present</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span>{candidate.location}</span>
                                            </p>
                                        </div>
                                        <Badge className="ml-auto h-6 bg-emerald-100 text-emerald-700 border-emerald-200">Current</Badge>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No experience history recorded.</p>
                            )}
                        </DetailSection>

                        <DetailSection id="education" title="Education" icon={GraduationCap}>
                            {extendedData.highestQualification ? (
                                <div className="flex gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                                    <div className="h-10 w-10 mt-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shadow-sm">
                                        <Award className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900 dark:text-white">{extendedData.highestQualification}</h4>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{extendedData.university || 'University/Institute not specified'}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 italic">No education details recorded.</p>
                            )}
                        </DetailSection>

                        <DetailSection id="address" title="Address Information" icon={MapPin}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                                <InfoRow label="Street" value={extendedData.street} />
                                <InfoRow label="City" value={extendedData.city} />
                                <InfoRow label="State" value={extendedData.state} />
                                <InfoRow label="Zip Code" value={extendedData.zipCode} />
                                <InfoRow label="Country" value={extendedData.country} />
                            </div>
                        </DetailSection>

                        <DetailSection id="notes" title="Notes & Comments" icon={StickyNote}>
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Textarea
                                        placeholder="Add a private note about this candidate..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        className="min-h-[100px] bg-slate-50 dark:bg-slate-950 resize-y"
                                    />
                                    <div className="flex justify-end">
                                        <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()} className="bg-primary shadow-md">
                                            Add Note <Plus className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-3 mt-6">
                                    {notes.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            No notes added yet.
                                        </div>
                                    ) : (
                                        notes.map((note) => (
                                            <div key={note.id} className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl">
                                                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.content}</p>
                                                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarFallback className="text-[10px] bg-slate-200 text-slate-600">{note.authorName?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-slate-600 dark:text-slate-400">{note.authorName}</span>
                                                    <span>•</span>
                                                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </DetailSection>

                        <DetailSection id="attachments" title="Attachments" icon={LinkIcon}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {documents.length > 0 ? documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                                        <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-600 flex items-center justify-center shrink-0">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.name}</p>
                                            <p className="text-xs text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()} • {(Number(doc.size) / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                            <Download className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </div>
                                )) : (
                                    <div className="col-span-2 text-center py-8 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        No documents attached.
                                    </div>
                                )}
                            </div>
                        </DetailSection>
                    </div>
                </div>

                {/* Utils */}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the candidate and remove their data from our servers.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {candidate && (
                    <ChangeStageModal
                        open={stageModalOpen}
                        onOpenChange={setStageModalOpen}
                        candidateId={candidate.id}
                        candidateName={candidate.name}
                        currentStage={candidate.currentStage}
                        onStageChange={handleStageChange}
                    />
                )}
            </div>
        </div>
    );
}
