'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
    Loader2, Upload, X, User, FileText, PenLine,
    AlertTriangle, CheckCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useCreateCandidate } from '@/lib/hooks/useCandidates';
import {
    useUploadAndParseResume,
    ParsedResumeResult,
    calculateConfidencePercent
} from '@/lib/api/resume-parser';
import { motion, AnimatePresence } from 'framer-motion';

const SOURCES = [
    'LinkedIn',
    'Indeed',
    'Referral',
    'Website',
    'Job Board',
    'Agency',
    'Other',
];

const STAGES = [
    'applied',
    'screening',
    'interview',
    'technical',
    'offer',
    'hired',
    'rejected',
];

interface AddCandidateFormData {
    name: string;
    email: string;
    phone: string;
    roleTitle: string;
    source: string;
    stage: string;
    notes: string;
}

interface AddCandidateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type UploadStage = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export function AddCandidateModal({ open, onOpenChange, onSuccess }: AddCandidateModalProps) {
    const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [resumeFile, setResumeFile] = useState<File | null>(null);

    // OCR state
    const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [parsedResume, setParsedResume] = useState<ParsedResumeResult | null>(null);
    const [ocrFileId, setOcrFileId] = useState<string | null>(null);

    const createCandidate = useCreateCandidate();
    const uploadAndParse = useUploadAndParseResume();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<AddCandidateFormData>({
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            roleTitle: '',
            source: '',
            stage: 'applied',
            notes: '',
        },
    });

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    // Handle resume file selection and OCR
    const handleResumeUpload = useCallback(async (file: File) => {
        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/tiff',
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a PDF, Word document, or image file');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
        }

        setResumeFile(file);
        setUploadStage('uploading');
        setUploadProgress(0);
        setParsedResume(null);

        try {
            const result = await uploadAndParse.mutateAsync({
                file,
                onProgress: (stage, percent) => {
                    setUploadStage(stage);
                    setUploadProgress(percent);
                },
            });

            setParsedResume(result);
            setOcrFileId(result.fileId);
            setUploadStage('complete');

            // Auto-fill form fields from parsed data
            if (result.fields.name) {
                setValue('name', result.fields.name);
            }
            if (result.fields.email) {
                setValue('email', result.fields.email);
            }
            if (result.fields.phone) {
                setValue('phone', result.fields.phone);
            }
            if (result.fields.skills && result.fields.skills.length > 0) {
                setTags(result.fields.skills.slice(0, 10));
            }

            toast.success('Resume processed successfully!');
        } catch (error) {
            console.error('Resume parsing failed:', error);
            setUploadStage('error');
            toast.error('Failed to process resume. You can still enter details manually.');
        }
    }, [uploadAndParse, setValue]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleResumeUpload(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleResumeUpload(file);
        }
    }, [handleResumeUpload]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const resetUpload = () => {
        setResumeFile(null);
        setUploadStage('idle');
        setUploadProgress(0);
        setParsedResume(null);
        setOcrFileId(null);
    };

    const onSubmit = async (data: AddCandidateFormData) => {
        try {
            const candidateData = {
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                roleTitle: data.roleTitle || undefined,
                source: data.source || undefined,
                stage: data.stage || 'applied',
                tags: tags.length > 0 ? tags : undefined,
                notes: data.notes || undefined,
                // Note: resume file linking would need backend DTO update
            };

            await createCandidate.mutateAsync(candidateData);

            toast.success(`Candidate "${data.name}" created successfully`);
            handleClose();
            onSuccess?.();
        } catch (error) {
            toast.error('Failed to create candidate');
        }
    };

    const handleClose = () => {
        reset();
        setTags([]);
        setTagInput('');
        resetUpload();
        setActiveTab('manual');
        onOpenChange(false);
    };

    const isSubmitting = createCandidate.isPending;
    const confidencePercent = parsedResume ? calculateConfidencePercent(parsedResume.confidence) : 0;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-[650px] sm:h-auto sm:max-h-[90vh] sm:rounded-lg flex flex-col gap-0 p-0">
                <DialogHeader className="p-6 pb-2 sm:pb-4 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Add New Candidate
                    </DialogTitle>
                    <DialogDescription>
                        Add a candidate to your hiring pipeline manually or by uploading a resume.
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'upload')} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 border-b">
                        <TabsList className="grid w-full grid-cols-2 h-11">
                            <TabsTrigger value="manual" className="flex items-center gap-2">
                                <PenLine className="h-4 w-4" />
                                Manual Entry
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Upload Resume
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                        {/* Manual Entry Tab */}
                        <TabsContent value="manual" className="flex-1 overflow-y-auto p-6 pt-4 space-y-4 m-0">
                            <CandidateFormFields
                                register={register}
                                errors={errors}
                                watch={watch}
                                setValue={setValue}
                                tags={tags}
                                tagInput={tagInput}
                                setTagInput={setTagInput}
                                handleAddTag={handleAddTag}
                                handleRemoveTag={handleRemoveTag}
                                handleKeyDown={handleKeyDown}
                            />
                        </TabsContent>

                        {/* Upload Resume Tab */}
                        <TabsContent value="upload" className="flex-1 overflow-y-auto p-6 pt-4 space-y-4 m-0">
                            <AnimatePresence mode="wait">
                                {uploadStage === 'idle' && (
                                    <motion.div
                                        key="dropzone"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        {/* Dropzone */}
                                        <div
                                            onDrop={handleDrop}
                                            onDragOver={handleDragOver}
                                            className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer"
                                        >
                                            <label className="cursor-pointer block">
                                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <FileText className="h-8 w-8 text-primary" />
                                                </div>
                                                <p className="text-lg font-medium mb-1">
                                                    Drop your resume here
                                                </p>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    or click to browse
                                                </p>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    <Badge variant="outline">PDF</Badge>
                                                    <Badge variant="outline">DOC</Badge>
                                                    <Badge variant="outline">DOCX</Badge>
                                                    <Badge variant="outline">JPG</Badge>
                                                    <Badge variant="outline">PNG</Badge>
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                                                    onChange={handleFileChange}
                                                />
                                            </label>
                                        </div>
                                    </motion.div>
                                )}

                                {(uploadStage === 'uploading' || uploadStage === 'processing') && (
                                    <motion.div
                                        key="processing"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="text-center py-8"
                                    >
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                        </div>
                                        <p className="text-lg font-medium mb-2">
                                            {uploadStage === 'uploading' ? 'Uploading resume...' : 'Extracting details...'}
                                        </p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {resumeFile?.name}
                                        </p>
                                        <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                                    </motion.div>
                                )}

                                {uploadStage === 'error' && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>
                                                Failed to process resume. Please enter details manually below.
                                            </AlertDescription>
                                        </Alert>
                                        <Button variant="outline" onClick={resetUpload} className="mb-4">
                                            Try Another File
                                        </Button>
                                        <CandidateFormFields
                                            register={register}
                                            errors={errors}
                                            watch={watch}
                                            setValue={setValue}
                                            tags={tags}
                                            tagInput={tagInput}
                                            setTagInput={setTagInput}
                                            handleAddTag={handleAddTag}
                                            handleRemoveTag={handleRemoveTag}
                                            handleKeyDown={handleKeyDown}
                                        />
                                    </motion.div>
                                )}

                                {uploadStage === 'complete' && parsedResume && (
                                    <motion.div
                                        key="complete"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="space-y-4"
                                    >
                                        {/* Success/Warning banner */}
                                        <Alert variant={confidencePercent >= 70 ? 'default' : 'default'} className={confidencePercent >= 70 ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' : 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20'}>
                                            {confidencePercent >= 70 ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                            )}
                                            <AlertDescription className={confidencePercent >= 70 ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}>
                                                {confidencePercent >= 70
                                                    ? 'Resume processed successfully! Please review the extracted details.'
                                                    : 'Some fields may need review. Please verify the extracted information.'}
                                            </AlertDescription>
                                        </Alert>

                                        {/* File info */}
                                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                                <span className="text-sm font-medium truncate max-w-[200px]">
                                                    {resumeFile?.name}
                                                </span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={resetUpload}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Editable form with extracted data */}
                                        <CandidateFormFields
                                            register={register}
                                            errors={errors}
                                            watch={watch}
                                            setValue={setValue}
                                            tags={tags}
                                            tagInput={tagInput}
                                            setTagInput={setTagInput}
                                            handleAddTag={handleAddTag}
                                            handleRemoveTag={handleRemoveTag}
                                            handleKeyDown={handleKeyDown}
                                            highlightExtracted={true}
                                            parsedFields={parsedResume.fields}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </TabsContent>

                        <DialogFooter className="p-6 border-t bg-background mt-auto">
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || uploadStage === 'uploading' || uploadStage === 'processing'}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    'Add Candidate'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

// Extracted form fields component for reuse
interface CandidateFormFieldsProps {
    register: any;
    errors: any;
    watch: any;
    setValue: any;
    tags: string[];
    tagInput: string;
    setTagInput: (v: string) => void;
    handleAddTag: () => void;
    handleRemoveTag: (tag: string) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
    highlightExtracted?: boolean;
    parsedFields?: {
        name?: string;
        email?: string;
        phone?: string;
        skills?: string[];
    };
}

function CandidateFormFields({
    register,
    errors,
    watch,
    setValue,
    tags,
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    highlightExtracted,
    parsedFields,
}: CandidateFormFieldsProps) {
    const isExtracted = (field: string) => highlightExtracted && parsedFields && (parsedFields as any)[field];

    return (
        <>
            {/* Name - Required */}
            <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                    Name <span className="text-destructive">*</span>
                    {isExtracted('name') && (
                        <Badge variant="secondary" className="text-xs">Extracted</Badge>
                    )}
                </Label>
                <Input
                    id="name"
                    placeholder="Full name"
                    {...register('name', { required: 'Name is required' })}
                    className={isExtracted('name') ? 'border-green-500/50' : ''}
                />
                {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
            </div>

            {/* Email & Phone - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                        Email
                        {isExtracted('email') && (
                            <Badge variant="secondary" className="text-xs">Extracted</Badge>
                        )}
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        {...register('email', {
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: 'Invalid email format',
                            },
                        })}
                        className={isExtracted('email') ? 'border-green-500/50' : ''}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                        Phone
                        {isExtracted('phone') && (
                            <Badge variant="secondary" className="text-xs">Extracted</Badge>
                        )}
                    </Label>
                    <Input
                        id="phone"
                        placeholder="+1 (555) 000-0000"
                        {...register('phone')}
                        className={isExtracted('phone') ? 'border-green-500/50' : ''}
                    />
                </div>
            </div>

            {/* Role & Source - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="roleTitle">Role / Position</Label>
                    <Input
                        id="roleTitle"
                        placeholder="e.g. Software Engineer"
                        {...register('roleTitle')}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                        value={watch('source')}
                        onValueChange={(value) => setValue('source', value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                            {SOURCES.map((source) => (
                                <SelectItem key={source} value={source}>
                                    {source}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stage */}
            <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                    value={watch('stage')}
                    onValueChange={(value) => setValue('stage', value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                        {STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                                {stage.charAt(0).toUpperCase() + stage.slice(1)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Tags / Skills */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    Skills / Tags
                    {highlightExtracted && tags.length > 0 && (
                        <Badge variant="secondary" className="text-xs">Extracted</Badge>
                    )}
                </Label>
                <div className="flex gap-2">
                    <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a skill and press Enter"
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                    >
                        Add
                    </Button>
                </div>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="Additional notes about the candidate..."
                    rows={3}
                    {...register('notes')}
                />
            </div>
        </>
    );
}
