'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    X,
    Plus,
    Briefcase,
    Building2,
    MapPin,
    Globe,
    DollarSign,
    Calendar,
    Tags,
    CheckCircle2,
    LayoutTemplate,
    Search,
    Rocket,
    Save
} from 'lucide-react';
import { Job, CreateJobDto, UpdateJobDto, LocationType, EmploymentType } from '@/lib/api/jobs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface JobFormProps {
    job?: Job;
    onSubmit: (data: CreateJobDto | UpdateJobDto) => Promise<void>;
    isSubmitting: boolean;
}

const locationTypes: { value: LocationType; label: string; icon: any }[] = [
    { value: 'ONSITE', label: 'On-site', icon: Building2 },
    { value: 'REMOTE', label: 'Remote', icon: Globe },
    { value: 'HYBRID', label: 'Hybrid', icon: MapPin },
];

const employmentTypes: { value: EmploymentType; label: string }[] = [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'TEMPORARY', label: 'Temporary' },
    { value: 'FREELANCE', label: 'Freelance' },
];

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
    return (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
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

export function JobForm({ job, onSubmit, isSubmitting }: JobFormProps) {
    const router = useRouter();

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        department: '',
        location: '',
        locationType: 'ONSITE' as LocationType,
        employmentType: 'FULL_TIME' as EmploymentType,
        salaryMin: '',
        salaryMax: '',
        salaryCurrency: 'USD',
        openings: '1',
        closingDate: '',
        skills: [] as string[],
        benefits: [] as string[],
        tags: [] as string[],
        city: '',
        clientName: '',
    });

    const [skillInput, setSkillInput] = useState('');
    const [benefitInput, setBenefitInput] = useState('');
    const [tagInput, setTagInput] = useState('');

    // Load data if editing
    useEffect(() => {
        if (job) {
            setFormData({
                title: job.title || '',
                description: job.description || '',
                requirements: job.requirements || '',
                department: job.department || '',
                location: job.location || '',
                locationType: job.locationType || 'ONSITE',
                employmentType: job.employmentType || 'FULL_TIME',
                salaryMin: job.salaryMin?.toString() || '',
                salaryMax: job.salaryMax?.toString() || '',
                salaryCurrency: job.salaryCurrency || 'USD',
                openings: job.openings?.toString() || '1',
                closingDate: job.closingDate ? job.closingDate.split('T')[0] : '',
                skills: job.skills || [],
                benefits: job.benefits || [],
                tags: job.tags || [],
                city: job.city || '',
                clientName: job.clientName || '',
            });
        }
    }, [job]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data: CreateJobDto = {
            title: formData.title,
            description: formData.description,
            requirements: formData.requirements || undefined,
            department: formData.department || undefined,
            location: formData.location || undefined,
            locationType: formData.locationType,
            employmentType: formData.employmentType,
            salaryMin: formData.salaryMin ? Number(formData.salaryMin) : undefined,
            salaryMax: formData.salaryMax ? Number(formData.salaryMax) : undefined,
            salaryCurrency: formData.salaryCurrency,
            openings: formData.openings ? Number(formData.openings) : 1,
            closingDate: formData.closingDate || undefined,
            skills: formData.skills.length > 0 ? formData.skills : undefined,
            benefits: formData.benefits.length > 0 ? formData.benefits : undefined,
            tags: formData.tags.length > 0 ? formData.tags : undefined,
            city: formData.city || undefined,
            clientName: formData.clientName || undefined,
        };
        await onSubmit(data);
    };

    const addItem = (type: 'skills' | 'benefits' | 'tags', value: string, setter: (v: string) => void) => {
        if (value.trim() && !formData[type].includes(value.trim())) {
            setFormData(prev => ({
                ...prev,
                [type]: [...prev[type], value.trim()],
            }));
            setter('');
        }
    };

    const removeItem = (type: 'skills' | 'benefits' | 'tags', value: string) => {
        setFormData(prev => ({
            ...prev,
            [type]: prev[type].filter(item => item !== value),
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-8 items-start relative">

            {/* LEFT COLUMN */}
            <div className="flex-1 space-y-6 min-w-0">

                {/* 1. Basic Info */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader icon={Briefcase} title="Job Details" subtitle="Basic information about the role" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <StyledLabel required>Job Title</StyledLabel>
                                <Input
                                    value={formData.title}
                                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. Senior Product Designer"
                                    className="h-11 bg-white dark:bg-slate-950 font-medium"
                                />
                            </div>

                            <div>
                                <StyledLabel>Client / Company Name</StyledLabel>
                                <Input
                                    value={formData.clientName}
                                    onChange={e => setFormData(p => ({ ...p, clientName: e.target.value }))}
                                    placeholder="e.g. Acme Corp"
                                    className="h-11 bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <StyledLabel>Department</StyledLabel>
                                <Input
                                    value={formData.department}
                                    onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                                    placeholder="e.g. Design Team"
                                    className="h-11 bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <StyledLabel>Number of Openings</StyledLabel>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.openings}
                                    onChange={e => setFormData(p => ({ ...p, openings: e.target.value }))}
                                    className="h-11 bg-white dark:bg-slate-950"
                                />
                            </div>

                            <div>
                                <StyledLabel>Application Deadline</StyledLabel>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="date"
                                        value={formData.closingDate}
                                        onChange={e => setFormData(p => ({ ...p, closingDate: e.target.value }))}
                                        className="h-11 pl-10 bg-white dark:bg-slate-950"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2. Job Description */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader icon={LayoutTemplate} title="Description" subtitle="Role responsibilities and context" />
                        <Textarea
                            value={formData.description}
                            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                            placeholder="Describe the role... (Supports basic formatting)"
                            className="min-h-[200px] bg-white dark:bg-slate-950 text-base leading-relaxed p-4"
                        />
                    </div>
                </motion.div>

                {/* 3. Requirements */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader icon={CheckCircle2} title="Requirements" subtitle="Skills and qualifications needed" />
                        <Textarea
                            value={formData.requirements}
                            onChange={e => setFormData(p => ({ ...p, requirements: e.target.value }))}
                            placeholder="- Bachelor's degree in..."
                            className="min-h-[150px] bg-white dark:bg-slate-950 text-base leading-relaxed p-4"
                        />
                    </div>
                </motion.div>

                {/* 4. Skills & Tags */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm overflow-hidden"
                >
                    <div className="p-6">
                        <SectionHeader icon={Tags} title="Skills & Tags" subtitle="Improve discoverability" />

                        <div className="space-y-6">
                            <div>
                                <StyledLabel>Required Skills</StyledLabel>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={skillInput}
                                        onChange={e => setSkillInput(e.target.value)}
                                        placeholder="Add a skill (e.g. React, Node.js)"
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('skills', skillInput, setSkillInput))}
                                        className="h-10 bg-white dark:bg-slate-950"
                                    />
                                    <Button type="button" onClick={() => addItem('skills', skillInput, setSkillInput)}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.skills.map(skill => (
                                        <Badge key={skill} variant="secondary" className="px-3 py-1 text-sm gap-2 hover:bg-slate-200">
                                            {skill}
                                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem('skills', skill)} />
                                        </Badge>
                                    ))}
                                    {formData.skills.length === 0 && <span className="text-sm text-muted-foreground italic">No skills added yet</span>}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <StyledLabel>Tags</StyledLabel>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        placeholder="Add a tag..."
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('tags', tagInput, setTagInput))}
                                        className="h-10 bg-white dark:bg-slate-950"
                                    />
                                    <Button type="button" variant="outline" onClick={() => addItem('tags', tagInput, setTagInput)}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="px-3 py-1 text-sm gap-2">
                                            {tag}
                                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeItem('tags', tag)} />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* RIGHT COLUMN: Sticky Sidebar */}
            <div className="w-96 shrink-0 hidden xl:block sticky top-28 space-y-6">

                {/* Publish Widget */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-lg shadow-slate-200/50 dark:shadow-black/50 overflow-hidden"
                >
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white text-center">
                        <Rocket className="w-8 h-8 mx-auto mb-3 text-white/80" />
                        <h3 className="text-lg font-semibold">Publish Job Opening</h3>
                        <p className="text-slate-400 text-sm mt-1">Make this job live for candidates</p>
                    </div>
                    <div className="p-6">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.title}
                            className="w-full h-12 bg-primary hover:bg-primary/90 text-lg shadow-lg shadow-primary/20 mb-3"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                            {job ? 'Update Job' : 'Publish Job'}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="w-full"
                        >
                            Save as Draft
                        </Button>
                    </div>
                </motion.div>

                {/* Location & Comp Widget */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-md overflow-hidden"
                >
                    <div className="p-5 border-b border-border/50">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            Location & Salary
                        </h4>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* Location */}
                        <div>
                            <StyledLabel>Location Type</StyledLabel>
                            <Select
                                value={formData.locationType}
                                onValueChange={v => setFormData(p => ({ ...p, locationType: v as LocationType }))}
                            >
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {locationTypes.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <div className="flex items-center gap-2">
                                                <t.icon className="h-4 w-4 opacity-50" />
                                                {t.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <StyledLabel>City / Region</StyledLabel>
                                <Input
                                    value={formData.city}
                                    onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                                    placeholder="e.g. San Francisco"
                                    className="bg-slate-50 dark:bg-slate-800/50"
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Salary */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <StyledLabel>Salary Range</StyledLabel>
                                <Select
                                    value={formData.salaryCurrency}
                                    onValueChange={v => setFormData(p => ({ ...p, salaryCurrency: v }))}
                                >
                                    <SelectTrigger className="h-8 text-xs w-[80px] bg-slate-50 dark:bg-slate-800/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Min"
                                    type="number"
                                    value={formData.salaryMin}
                                    onChange={e => setFormData(p => ({ ...p, salaryMin: e.target.value }))}
                                    className="bg-slate-50 dark:bg-slate-800/50 text-center"
                                />
                                <span className="text-muted-foreground">-</span>
                                <Input
                                    placeholder="Max"
                                    type="number"
                                    value={formData.salaryMax}
                                    onChange={e => setFormData(p => ({ ...p, salaryMax: e.target.value }))}
                                    className="bg-slate-50 dark:bg-slate-800/50 text-center"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                                Estimated Annual: {formData.salaryMin && formData.salaryMax ? `${formData.salaryCurrency} ${Number((Number(formData.salaryMin) / 1000).toFixed(0))}k - ${Number((Number(formData.salaryMax) / 1000).toFixed(0))}k` : 'Not set'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </form>
    );
}

