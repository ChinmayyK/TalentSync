'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Loader2,
    DollarSign,
    Briefcase,
    Calendar,
    FileText,
    User,
    MapPin,
    Building2,
    Users,
    Gift,
    TrendingUp,
    Clock,
    Save,
    X,
    CheckCircle2,
    ChevronsUpDown,
    Check,
    Calculator,
    PieChart,
} from 'lucide-react';
import { Offer, CreateOfferDto, UpdateOfferDto, SalaryType } from '@/lib/api/offers';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { client } from '@/lib/api/client';
import { PageLoader } from '@/components/ui/page-loader';

// --- Interfaces ---

interface OfferFormProps {
    offer?: Offer;
    candidateId?: string;
    candidateName?: string;
    onSubmit: (data: CreateOfferDto | UpdateOfferDto) => Promise<void>;
    isSubmitting: boolean;
}

interface CandidateOption {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
}

// --- Constants ---

const salaryTypes: { value: SalaryType; label: string; periodFactor: number }[] = [
    { value: 'ANNUAL', label: 'Annual', periodFactor: 1 },
    { value: 'MONTHLY', label: 'Monthly', periodFactor: 12 },
    { value: 'WEEKLY', label: 'Weekly', periodFactor: 52 },
    { value: 'HOURLY', label: 'Hourly', periodFactor: 2080 }, // Approx 40hrs * 52w
];

const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

// --- Helper Components ---

function SectionHeader({ icon: Icon, title, subtitle, rightElement }: { icon: React.ElementType; title: string; subtitle?: string; rightElement?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl shadow-sm border border-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>
            </div>
            {rightElement}
        </div>
    );
}

function StyledLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm mb-1.5 block">
            {children}
            {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
    );
}

// Currencies input that handles formatting
function CurrencyInput({
    value,
    onChange,
    currencySymbol,
    placeholder,
    className
}: {
    value: string;
    onChange: (val: string) => void;
    currencySymbol: string;
    placeholder?: string;
    className?: string;
}) {
    const format = (val: string) => {
        if (!val) return '';
        const number = parseFloat(val.replace(/,/g, ''));
        if (isNaN(number)) return val;
        return new Intl.NumberFormat('en-US').format(number);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/,/g, '');
        if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
            onChange(rawValue);
        }
    };

    return (
        <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium transition-colors group-focus-within:text-primary">
                {currencySymbol}
            </span>
            <Input
                value={format(value)}
                onChange={handleChange}
                placeholder={placeholder}
                className={cn(
                    "pl-8 h-11 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20",
                    "placeholder:text-slate-400 transition-all duration-200 font-medium",
                    className
                )}
            />
        </div>
    );
}

// --- Main Component ---

export function OfferForm({ offer, candidateId: propCandidateId, candidateName: propCandidateName, onSubmit, isSubmitting }: OfferFormProps) {
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        candidateId: propCandidateId || '',
        salary: '',
        currency: 'INR',
        salaryType: 'ANNUAL' as SalaryType,
        bonus: '',
        equity: '',
        startDate: '',
        expiryDate: '',
        position: '',
        department: '',
        reportingTo: '',
        workLocation: '',
        notes: '',
    });

    // Candidate Search State
    const [openCandidateSearch, setOpenCandidateSearch] = useState(false);
    const [candidates, setCandidates] = useState<CandidateOption[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<{ name: string, email?: string } | null>(
        propCandidateName ? { name: propCandidateName } : null
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    // Initial Load
    useEffect(() => {
        if (offer) {
            setFormData({
                candidateId: offer.candidateId,
                salary: String(offer.salary),
                currency: offer.currency || 'INR',
                salaryType: offer.salaryType || 'ANNUAL',
                bonus: offer.bonus ? String(offer.bonus) : '',
                equity: offer.equity || '',
                startDate: offer.startDate ? offer.startDate.split('T')[0] : '',
                expiryDate: offer.expiryDate ? offer.expiryDate.split('T')[0] : '',
                position: offer.position || '',
                department: offer.department || '',
                reportingTo: offer.reportingTo || '',
                workLocation: offer.workLocation || '',
                notes: offer.notes || '',
            });
            if (offer.candidate) {
                setSelectedCandidate({ name: offer.candidate.name, email: offer.candidate.email });
            }
        }
    }, [offer]);

    // Live Compensation Calculation
    const totalCompensation = useMemo(() => {
        const baseSalary = parseFloat(formData.salary) || 0;
        const bonus = parseFloat(formData.bonus) || 0;
        const typeInfo = salaryTypes.find(t => t.value === formData.salaryType);
        const factor = typeInfo ? typeInfo.periodFactor : 1;

        const annualizedBase = baseSalary * factor;
        const total = annualizedBase + bonus; // Simple calc: Annualized base + one-time bonus

        return {
            annualBase: annualizedBase,
            total: total
        };
    }, [formData.salary, formData.bonus, formData.salaryType]);

    // Fetch candidates on search
    useEffect(() => {
        if (!openCandidateSearch) return;

        const fetchCandidates = async () => {
            setLoadingCandidates(true);
            try {
                // @ts-ignore
                const res = await client.get('/candidates', { params: { q: searchQuery, perPage: 50 } });
                // @ts-ignore
                setCandidates(res.data.map((c: any) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`,
                    email: c.email,
                    jobTitle: c.jobTitle
                })));
            } catch (err) {
                console.error("Failed to search candidates", err);
            } finally {
                setLoadingCandidates(false);
            }
        };

        const debounce = setTimeout(fetchCandidates, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, openCandidateSearch]);

    // Handlers
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data: CreateOfferDto = {
            candidateId: formData.candidateId,
            salary: Number(formData.salary),
            currency: formData.currency,
            salaryType: formData.salaryType,
            bonus: formData.bonus ? Number(formData.bonus) : undefined,
            equity: formData.equity || undefined,
            startDate: formData.startDate || undefined,
            expiryDate: formData.expiryDate || undefined,
            position: formData.position || undefined,
            department: formData.department || undefined,
            reportingTo: formData.reportingTo || undefined,
            workLocation: formData.workLocation || undefined,
            notes: formData.notes || undefined,
        };
        await onSubmit(data);
    };

    const selectedCurrencyInfo = currencies.find(c => c.code === formData.currency);
    const selectedSalaryTypeInfo = salaryTypes.find(t => t.value === formData.salaryType);

    return (
        <form onSubmit={handleSubmit} className="flex gap-8 items-start relative">

            {/* LEFT COLUMN: Main Form */}
            <div className="flex-1 space-y-6 min-w-0">

                {/* 1. Candidate Selection */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader
                            icon={User}
                            title="Candidate Details"
                            subtitle="Who is this offer for?"
                            rightElement={selectedCandidate && (
                                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Selected
                                </span>
                            )}
                        />

                        {propCandidateId && selectedCandidate ? (
                            // Pre-selected View (Read Only)
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {selectedCandidate.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold text-lg text-slate-900 dark:text-white">{selectedCandidate.name}</p>
                                    <p className="text-sm text-slate-500">{selectedCandidate.email || 'No email provided'}</p>
                                </div>
                            </div>
                        ) : (
                            // Searchable Selector
                            <div>
                                <StyledLabel required>Select Candidate</StyledLabel>
                                <Popover open={openCandidateSearch} onOpenChange={setOpenCandidateSearch}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCandidateSearch}
                                            className="w-full h-12 justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                {selectedCandidate ? (
                                                    <>
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-[10px]">
                                                                {selectedCandidate.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium text-slate-900">{selectedCandidate.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">Search for a candidate...</span>
                                                )}
                                            </div>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Search by name..."
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                            />
                                            <CommandList>
                                                {loadingCandidates && (
                                                    <div className="p-4 flex justify-center">
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    </div>
                                                )}
                                                {!loadingCandidates && candidates.length === 0 && (
                                                    <CommandEmpty>No candidates found.</CommandEmpty>
                                                )}
                                                {candidates.map((candidate) => (
                                                    <CommandItem
                                                        key={candidate.id}
                                                        value={candidate.id}
                                                        onSelect={() => {
                                                            setFormData(p => ({ ...p, candidateId: candidate.id }));
                                                            setSelectedCandidate({ name: candidate.name, email: candidate.email });
                                                            setOpenCandidateSearch(false);
                                                        }}
                                                        className="flex items-center gap-3 py-3 px-4 cursor-pointer"
                                                    >
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-primary/5 text-xs">
                                                                {candidate.name.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{candidate.name}</span>
                                                            <span className="text-xs text-muted-foreground">{candidate.email}</span>
                                                        </div>
                                                        <Check
                                                            className={cn(
                                                                "ml-auto h-4 w-4",
                                                                formData.candidateId === candidate.id ? "opacity-100 text-primary" : "opacity-0"
                                                            )}
                                                        />
                                                    </CommandItem>
                                                ))}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 2. Position & Role */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader
                            icon={Briefcase}
                            title="Position & Role"
                            subtitle="Define the job details"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div>
                                <StyledLabel required>Position Title</StyledLabel>
                                <Input
                                    value={formData.position}
                                    onChange={e => setFormData(p => ({ ...p, position: e.target.value }))}
                                    placeholder="e.g. Senior Product Designer"
                                    className="h-11 bg-white"
                                />
                            </div>
                            <div>
                                <StyledLabel>Department</StyledLabel>
                                <Input
                                    value={formData.department}
                                    onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                                    placeholder="e.g. Design"
                                    className="h-11 bg-white"
                                />
                            </div>
                            <div>
                                <StyledLabel>Reports To</StyledLabel>
                                <Input
                                    value={formData.reportingTo}
                                    onChange={e => setFormData(p => ({ ...p, reportingTo: e.target.value }))}
                                    placeholder="e.g. Head of Design"
                                    className="h-11 bg-white"
                                />
                            </div>
                            <div>
                                <StyledLabel>Work Location</StyledLabel>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        value={formData.workLocation}
                                        onChange={e => setFormData(p => ({ ...p, workLocation: e.target.value }))}
                                        placeholder="e.g. New York, NY"
                                        className="h-11 pl-10 bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 3. Compensation */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader
                            icon={DollarSign}
                            title="Compensation Package"
                            subtitle="Structure the financial offer"
                            rightElement={
                                <div className="text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md font-medium">
                                    {selectedCurrencyInfo?.code} ({selectedCurrencyInfo?.symbol})
                                </div>
                            }
                        />

                        <div className="space-y-6">
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-3">
                                    <StyledLabel>Currency</StyledLabel>
                                    <Select
                                        value={formData.currency}
                                        onValueChange={v => setFormData(p => ({ ...p, currency: v }))}
                                    >
                                        <SelectTrigger className="h-11 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.map(c => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    <span className="font-semibold w-6 inline-block">{c.code}</span>
                                                    <span className="text-muted-foreground">{c.name}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-12 md:col-span-5">
                                    <StyledLabel required>Base Salary</StyledLabel>
                                    <CurrencyInput
                                        value={formData.salary}
                                        onChange={val => setFormData(p => ({ ...p, salary: val }))}
                                        currencySymbol={selectedCurrencyInfo?.symbol || '$'}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <StyledLabel>Pay Frequency</StyledLabel>
                                    <Select
                                        value={formData.salaryType}
                                        onValueChange={v => setFormData(p => ({ ...p, salaryType: v as SalaryType }))}
                                    >
                                        <SelectTrigger className="h-11 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {salaryTypes.map(t => (
                                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div>
                                    <StyledLabel>Signing Bonus (One-time)</StyledLabel>
                                    <CurrencyInput
                                        value={formData.bonus}
                                        onChange={val => setFormData(p => ({ ...p, bonus: val }))}
                                        currencySymbol={selectedCurrencyInfo?.symbol || '$'}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <StyledLabel>Equity / Stock Options</StyledLabel>
                                    <div className="relative">
                                        <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            value={formData.equity}
                                            onChange={e => setFormData(p => ({ ...p, equity: e.target.value }))}
                                            placeholder="e.g. 0.05% or 5000 units"
                                            className="h-11 pl-10 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 4. Timeline & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full"
                    >
                        <div className="p-6">
                            <SectionHeader icon={Calendar} title="Timeline" />
                            <div className="space-y-4">
                                <div>
                                    <StyledLabel>Start Date</StyledLabel>
                                    <Input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                                        className="h-11 bg-white"
                                    />
                                </div>
                                <div>
                                    <StyledLabel>Expiration Date</StyledLabel>
                                    <Input
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={e => setFormData(p => ({ ...p, expiryDate: e.target.value }))}
                                        className="h-11 bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full"
                    >
                        <div className="p-6 h-full flex flex-col">
                            <SectionHeader icon={FileText} title="Notes" />
                            <Textarea
                                value={formData.notes}
                                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Internal notes, terms, or conditions..."
                                className="flex-1 bg-white min-h-[140px] resize-none"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* RIGHT COLUMN: Live Summary Widget */}
            <div className="w-96 shrink-0 hidden xl:block sticky top-28">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10">
                        {/* Premium Header */}
                        <div className="relative overflow-hidden bg-slate-900 p-6 pb-8 text-white">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <PieChart className="h-32 w-32 -mr-8 -mt-8" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent opacity-50" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 text-slate-300 text-sm font-medium mb-1">
                                    <Calculator className="h-4 w-4" />
                                    <span>Estimated Annual Value</span>
                                </div>
                                <div className="flex items-baseline gap-1 mt-2">
                                    <span className="text-2xl font-medium text-slate-300">{selectedCurrencyInfo?.symbol}</span>
                                    <span className="text-4xl font-bold tracking-tight">
                                        {new Intl.NumberFormat('en-US').format(totalCompensation.total)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 -mt-4 bg-white dark:bg-slate-900 rounded-t-2xl relative z-10">
                            {/* Composition Bar */}
                            {(totalCompensation.total > 0) && (
                                <div className="mb-8">
                                    <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
                                        <span>Salary ({Math.round((totalCompensation.annualBase / totalCompensation.total) * 100)}%)</span>
                                        <span>Bonus ({Math.round(((Number(formData.bonus) || 0) / totalCompensation.total) * 100)}%)</span>
                                    </div>
                                    <div className="h-2 rounded-full flex overflow-hidden bg-slate-100 dark:bg-slate-800">
                                        <div
                                            style={{ width: `${(totalCompensation.annualBase / totalCompensation.total) * 100}%` }}
                                            className="bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                        />
                                        <div
                                            style={{ width: `${((Number(formData.bonus) || 0) / totalCompensation.total) * 100}%` }}
                                            className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-5">
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Base Salary</p>
                                            <p className="text-xs text-muted-foreground">{selectedSalaryTypeInfo?.label}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-foreground">
                                            {selectedCurrencyInfo?.symbol}{new Intl.NumberFormat('en-US').format(Number(formData.salary) || 0)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
                                            <Gift className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Signing Bonus</p>
                                            <p className="text-xs text-muted-foreground">One-time</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-emerald-600">
                                            +{selectedCurrencyInfo?.symbol}{new Intl.NumberFormat('en-US').format(Number(formData.bonus) || 0)}
                                        </p>
                                    </div>
                                </div>

                                {formData.equity && (
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                                                <TrendingUp className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Equity</p>
                                                <p className="text-xs text-muted-foreground">Stock Options</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-purple-600">{formData.equity}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-8 mt-4">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.candidateId || !formData.salary}
                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 text-base font-medium rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-5 w-5 mr-2" />
                                    )}
                                    {offer ? 'Update Offer' : 'Create Offer'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => router.back()}
                                    className="w-full mt-3 h-10 text-muted-foreground hover:text-foreground rounded-xl"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </form>
    );
}
