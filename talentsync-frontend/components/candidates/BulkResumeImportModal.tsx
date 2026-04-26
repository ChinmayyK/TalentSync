'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Upload,
    X,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Users,
    RefreshCw,
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useCreateCandidate } from '@/lib/hooks/useCandidates';
import {
    uploadAndParseResume,
    ParsedResumeResult,
    calculateConfidencePercent,
} from '@/lib/api/resume-parser';

interface BulkResumeImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type FileStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error' | 'skipped';

interface FileItem {
    id: string;
    file: File;
    status: FileStatus;
    progress: number;
    result?: ParsedResumeResult;
    error?: string;
    selected: boolean;
}

export function BulkResumeImportModal({
    open,
    onOpenChange,
    onSuccess,
}: BulkResumeImportModalProps) {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    const createCandidate = useCreateCandidate();

    // Handle file selection
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        addFiles(selectedFiles);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
    }, []);

    const addFiles = (newFiles: File[]) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/tiff',
        ];

        const validFiles = newFiles.filter(file => {
            if (!allowedTypes.includes(file.type)) {
                toast.error(`${file.name}: Unsupported file type`);
                return false;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error(`${file.name}: File too large (max 10MB)`);
                return false;
            }
            return true;
        });

        const newFileItems: FileItem[] = validFiles.map(file => ({
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            file,
            status: 'pending',
            progress: 0,
            selected: true,
        }));

        setFiles(prev => [...prev, ...newFileItems]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const toggleFileSelection = (id: string) => {
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, selected: !f.selected } : f
        ));
    };

    const toggleAllSelection = () => {
        const allSelected = files.every(f => f.selected);
        setFiles(prev => prev.map(f => ({ ...f, selected: !allSelected })));
    };

    // Process all files with OCR
    const processFiles = async () => {
        setIsProcessing(true);
        setCurrentFileIndex(0);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.status !== 'pending') continue;

            setCurrentFileIndex(i);
            setFiles(prev => prev.map(f =>
                f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
            ));

            try {
                const result = await uploadAndParseResume(file.file, (stage, percent) => {
                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? { ...f, status: stage, progress: percent } : f
                    ));
                });

                setFiles(prev => prev.map(f =>
                    f.id === file.id ? { ...f, status: 'success', result, progress: 100 } : f
                ));
            } catch (error) {
                setFiles(prev => prev.map(f =>
                    f.id === file.id ? {
                        ...f,
                        status: 'error',
                        error: 'Failed to process',
                        progress: 0,
                    } : f
                ));
            }
        }

        setIsProcessing(false);
    };

    // Import selected candidates
    const importCandidates = async () => {
        const selectedFiles = files.filter(f => f.selected && f.status === 'success' && f.result);
        if (selectedFiles.length === 0) {
            toast.error('No candidates to import');
            return;
        }

        setIsImporting(true);
        let successCount = 0;
        let errorCount = 0;

        for (const file of selectedFiles) {
            if (!file.result?.fields.name) {
                errorCount++;
                continue;
            }

            try {
                await createCandidate.mutateAsync({
                    name: file.result.fields.name,
                    email: file.result.fields.email || undefined,
                    phone: file.result.fields.phone || undefined,
                    tags: file.result.fields.skills || [],
                    stage: 'applied',
                    // Note: resumeFileId would need backend DTO update to link file
                });
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }

        setIsImporting(false);

        if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} candidate(s)`);
            onSuccess?.();
            handleClose();
        }
        if (errorCount > 0) {
            toast.error(`Failed to import ${errorCount} candidate(s)`);
        }
    };

    const handleClose = () => {
        setFiles([]);
        setIsProcessing(false);
        setIsImporting(false);
        setCurrentFileIndex(0);
        onOpenChange(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const successFiles = files.filter(f => f.status === 'success');
    const selectedCount = files.filter(f => f.selected && f.status === 'success').length;
    const hasProcessed = files.some(f => f.status === 'success' || f.status === 'error');

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Bulk Resume Import
                    </DialogTitle>
                    <DialogDescription>
                        Upload multiple resumes to extract candidate information using OCR.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 space-y-4">
                    {/* Dropzone (show when no files or not processing) */}
                    {files.length === 0 && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer"
                        >
                            <label className="cursor-pointer block">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <p className="text-lg font-medium mb-1">
                                    Drop resumes here or click to browse
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Upload multiple PDF, DOC, DOCX, or image files
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
                                    multiple
                                    onChange={handleFileSelect}
                                />
                            </label>
                        </div>
                    )}

                    {/* File list */}
                    {files.length > 0 && (
                        <>
                            {/* Add more files button */}
                            {!isProcessing && !hasProcessed && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">
                                        {files.length} file(s) selected
                                    </span>
                                    <label className="cursor-pointer">
                                        <Button variant="outline" size="sm" asChild>
                                            <span>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Add More
                                            </span>
                                        </Button>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff"
                                            multiple
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Processing progress */}
                            {isProcessing && (
                                <Alert>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <AlertDescription>
                                        Processing file {currentFileIndex + 1} of {files.length}...
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Results table */}
                            <ScrollArea className="h-[400px] border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {hasProcessed && (
                                                <TableHead className="w-12">
                                                    <Checkbox
                                                        checked={files.filter(f => f.status === 'success').every(f => f.selected)}
                                                        onCheckedChange={toggleAllSelection}
                                                    />
                                                </TableHead>
                                            )}
                                            <TableHead>File</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Confidence</TableHead>
                                            {!hasProcessed && <TableHead className="w-12"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence>
                                            {files.map((file) => (
                                                <motion.tr
                                                    key={file.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="border-b"
                                                >
                                                    {hasProcessed && (
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={file.selected}
                                                                onCheckedChange={() => toggleFileSelection(file.id)}
                                                                disabled={file.status !== 'success'}
                                                            />
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                            <span className="truncate max-w-[150px]" title={file.file.name}>
                                                                {file.file.name}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={file.status} progress={file.progress} />
                                                    </TableCell>
                                                    <TableCell>
                                                        {file.result?.fields.name || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {file.result?.fields.email || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {file.result && (
                                                            <ConfidenceBadge confidence={file.result.confidence} />
                                                        )}
                                                    </TableCell>
                                                    {!hasProcessed && (
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeFile(file.id)}
                                                                disabled={isProcessing}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    )}
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            {/* Summary */}
                            {hasProcessed && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {successFiles.length} processed successfully, {selectedCount} selected for import
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFiles([]);
                                            setCurrentFileIndex(0);
                                        }}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Start Over
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    {!hasProcessed ? (
                        <Button
                            onClick={processFiles}
                            disabled={files.length === 0 || isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Process {files.length} Resume(s)
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={importCandidates}
                            disabled={selectedCount === 0 || isImporting}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Users className="h-4 w-4 mr-2" />
                                    Import {selectedCount} Candidate(s)
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Status badge component
function StatusBadge({ status, progress }: { status: FileStatus; progress: number }) {
    switch (status) {
        case 'pending':
            return <Badge variant="outline">Pending</Badge>;
        case 'uploading':
            return (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <Progress value={progress} className="w-16 h-2" />
                </div>
            );
        case 'processing':
            return (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-xs">OCR...</span>
                </div>
            );
        case 'success':
            return (
                <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Success
                </Badge>
            );
        case 'error':
            return (
                <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Failed
                </Badge>
            );
        case 'skipped':
            return <Badge variant="secondary">Skipped</Badge>;
        default:
            return null;
    }
}

// Confidence badge component
function ConfidenceBadge({ confidence }: { confidence: ParsedResumeResult['confidence'] }) {
    const percent = calculateConfidencePercent(confidence);
    return (
        <Badge variant={percent >= 70 ? 'default' : 'secondary'} className={percent >= 70 ? 'bg-green-500' : ''}>
            {percent}%
        </Badge>
    );
}
