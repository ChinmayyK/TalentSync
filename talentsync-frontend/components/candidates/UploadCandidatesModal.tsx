'use client';

import { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X,
    ChevronLeft, ChevronRight, AlertTriangle, Edit2, Check, Copy
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useBulkImportCandidates, BulkImportRow } from '@/lib/hooks/useCandidates';
import { cn } from '@/lib/utils';

// Maximum number of candidates per import
const MAX_ROWS = 1000;
const ROWS_PER_PAGE = 20;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Candidate fields that can be mapped
const CANDIDATE_FIELDS = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'roleTitle', label: 'Role/Position', required: false },
    { key: 'source', label: 'Source', required: false },
    { key: 'stage', label: 'Stage', required: false },
    { key: 'tags', label: 'Tags (comma-separated)', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'resumeUrl', label: 'Resume URL', required: false },
];

// Validation helpers
const isValidEmail = (email: string): boolean => {
    if (!email) return true; // Empty is valid (not required)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
};

const isValidPhone = (phone: string): boolean => {
    if (!phone) return true; // Empty is valid (not required)
    // Allow various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
    const phoneRegex = /^[\d\s\-\+\(\)\.]{7,20}$/;
    return phoneRegex.test(phone.trim());
};

type FieldMapping = Record<string, string>; // CSV header -> candidate field

interface UploadCandidatesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type UploadStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface RowValidation {
    isValid: boolean;
    hasWarnings: boolean;
    errors: string[];
    warnings: string[];
    isDuplicate: boolean;
}

interface EditingCell {
    rowIndex: number;
    field: string;
}

export function UploadCandidatesModal({ open, onOpenChange, onSuccess }: UploadCandidatesModalProps) {
    const [step, setStep] = useState<UploadStep>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
    const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
    const [currentPage, setCurrentPage] = useState(0);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
    const [importResult, setImportResult] = useState<{
        success: number;
        failed: number;
        duplicates: string[];
        errors: Array<{ row: number; message: string }>;
    } | null>(null);

    const bulkImport = useBulkImportCandidates();

    // Get mapped data for validation and preview
    const getMappedData = useCallback((): BulkImportRow[] => {
        return csvData.map((row) => {
            const mappedRow: Record<string, string> = {};
            Object.entries(fieldMapping).forEach(([csvHeader, candidateField]) => {
                if (candidateField && row[csvHeader]) {
                    mappedRow[candidateField] = row[csvHeader];
                }
            });
            return mappedRow as unknown as BulkImportRow;
        });
    }, [csvData, fieldMapping]);

    // Validate all rows and detect duplicates
    const rowValidations = useMemo((): RowValidation[] => {
        const mappedData = getMappedData();
        const emailCounts = new Map<string, number>();

        // Count email occurrences for duplicate detection
        mappedData.forEach((row) => {
            const email = (row.email || '').toLowerCase().trim();
            if (email) {
                emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
            }
        });

        return mappedData.map((row) => {
            const errors: string[] = [];
            const warnings: string[] = [];

            // Check required fields
            if (!row.name || !row.name.trim()) {
                errors.push('Name is required');
            }

            // Validate email format
            if (row.email && !isValidEmail(row.email)) {
                errors.push('Invalid email format');
            }

            // Validate phone format
            if (row.phone && !isValidPhone(row.phone)) {
                warnings.push('Phone format may be invalid');
            }

            // Check for duplicates within import
            const email = (row.email || '').toLowerCase().trim();
            const isDuplicate = email ? (emailCounts.get(email) || 0) > 1 : false;
            if (isDuplicate) {
                warnings.push('Duplicate email in import');
            }

            return {
                isValid: errors.length === 0,
                hasWarnings: warnings.length > 0,
                errors,
                warnings,
                isDuplicate,
            };
        });
    }, [getMappedData]);

    // Summary stats
    const validationStats = useMemo(() => {
        const valid = rowValidations.filter(v => v.isValid && !v.hasWarnings).length;
        const warnings = rowValidations.filter(v => v.isValid && v.hasWarnings).length;
        const errors = rowValidations.filter(v => !v.isValid).length;
        const duplicates = rowValidations.filter(v => v.isDuplicate).length;
        return { valid, warnings, errors, duplicates };
    }, [rowValidations]);

    // Pagination
    const totalPages = Math.ceil(csvData.length / ROWS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = currentPage * ROWS_PER_PAGE;
        return getMappedData().slice(start, start + ROWS_PER_PAGE);
    }, [getMappedData, currentPage]);
    const paginatedValidations = useMemo(() => {
        const start = currentPage * ROWS_PER_PAGE;
        return rowValidations.slice(start, start + ROWS_PER_PAGE);
    }, [rowValidations, currentPage]);

    // Cell editing handlers
    const startEditing = (rowIndex: number, field: string, currentValue: string) => {
        setEditingCell({ rowIndex, field });
        setEditValue(currentValue || '');
    };

    const saveEdit = () => {
        if (!editingCell) return;

        const actualRowIndex = currentPage * ROWS_PER_PAGE + editingCell.rowIndex;
        const csvHeader = Object.entries(fieldMapping).find(([_, v]) => v === editingCell.field)?.[0];

        if (csvHeader) {
            const newData = [...csvData];
            newData[actualRowIndex] = {
                ...newData[actualRowIndex],
                [csvHeader]: editValue,
            };
            setCsvData(newData);
            setEditedCells(prev => new Set(prev).add(`${actualRowIndex}-${editingCell.field}`));
        }

        setEditingCell(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const handleFileSelect = useCallback((selectedFile: File) => {
        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }

        setFile(selectedFile);
        setCurrentPage(0);
        setEditedCells(new Set());

        const isExcel = selectedFile.name.endsWith('.xlsx') ||
            selectedFile.name.endsWith('.xls') ||
            selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            selectedFile.type === 'application/vnd.ms-excel';

        if (isExcel) {
            // Handle Excel files
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

                    if (jsonData.length === 0) {
                        toast.error('File contains no data rows');
                        return;
                    }

                    // Get headers from first row keys
                    const headers = Object.keys(jsonData[0] || {});
                    let rows = jsonData.map(row => {
                        const result: Record<string, string> = {};
                        headers.forEach(h => {
                            result[h] = String(row[h] || '').trim();
                        });
                        return result;
                    });

                    // Validate row limit
                    if (rows.length > MAX_ROWS) {
                        toast.error(`File contains more than ${MAX_ROWS} rows. Please split your file.`);
                        rows = rows.slice(0, MAX_ROWS);
                        toast.info(`Only the first ${MAX_ROWS} rows will be imported.`);
                    }

                    setCsvHeaders(headers);
                    setCsvData(rows);

                    // Auto-map based on header names
                    const autoMapping: FieldMapping = {};
                    headers.forEach((header) => {
                        const lowerHeader = header.toLowerCase().trim();
                        CANDIDATE_FIELDS.forEach((field) => {
                            if (
                                lowerHeader === field.key.toLowerCase() ||
                                lowerHeader === field.label.toLowerCase() ||
                                lowerHeader.includes(field.key.toLowerCase())
                            ) {
                                autoMapping[header] = field.key;
                            }
                        });
                    });
                    setFieldMapping(autoMapping);
                    setStep('mapping');
                } catch (error: any) {
                    toast.error(`Failed to parse Excel file: ${error.message}`);
                }
            };
            reader.onerror = () => {
                toast.error('Failed to read file');
            };
            reader.readAsBinaryString(selectedFile);
        } else {
            // Handle CSV files with PapaParse
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                preview: MAX_ROWS + 1,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    let data = results.data as Record<string, string>[];

                    if (data.length > MAX_ROWS) {
                        toast.error(`File contains more than ${MAX_ROWS} rows. Please split your file.`);
                        data = data.slice(0, MAX_ROWS);
                        toast.info(`Only the first ${MAX_ROWS} rows will be imported.`);
                    }

                    setCsvHeaders(headers);
                    setCsvData(data);

                    const autoMapping: FieldMapping = {};
                    headers.forEach((header) => {
                        const lowerHeader = header.toLowerCase().trim();
                        CANDIDATE_FIELDS.forEach((field) => {
                            if (
                                lowerHeader === field.key.toLowerCase() ||
                                lowerHeader === field.label.toLowerCase() ||
                                lowerHeader.includes(field.key.toLowerCase())
                            ) {
                                autoMapping[header] = field.key;
                            }
                        });
                    });
                    setFieldMapping(autoMapping);
                    setStep('mapping');
                },
                error: (error) => {
                    toast.error(`Failed to parse CSV: ${error.message}`);
                },
            });
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            const validTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            const validExtensions = ['.csv', '.xlsx', '.xls'];
            const hasValidType = validTypes.includes(droppedFile?.type || '');
            const hasValidExt = validExtensions.some(ext => droppedFile?.name.endsWith(ext));

            if (droppedFile && (hasValidType || hasValidExt)) {
                handleFileSelect(droppedFile);
            } else {
                toast.error('Please upload a CSV or Excel file');
            }
        },
        [handleFileSelect]
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFileSelect(selectedFile);
        }
    };

    const handleMappingChange = (csvHeader: string, candidateField: string) => {
        setFieldMapping((prev) => ({
            ...prev,
            [csvHeader]: candidateField === 'skip' ? '' : candidateField,
        }));
    };

    const handleImport = async () => {
        const mappedData = getMappedData();

        // Validate required fields
        const invalidRows = mappedData.filter((row) => !row.name);
        if (invalidRows.length > 0) {
            toast.error(`${invalidRows.length} rows are missing the required "Name" field`);
            return;
        }

        setStep('importing');

        try {
            const result = await bulkImport.mutateAsync(mappedData);
            setImportResult(result);
            setStep('complete');
        } catch (error) {
            toast.error('Import failed. Please try again.');
            setStep('preview');
        }
    };

    const handleClose = () => {
        setStep('upload');
        setFile(null);
        setCsvHeaders([]);
        setCsvData([]);
        setFieldMapping({});
        setImportResult(null);
        setCurrentPage(0);
        setEditingCell(null);
        setEditedCells(new Set());
        onOpenChange(false);
    };

    const handleComplete = () => {
        handleClose();
        onSuccess?.();
    };

    const isMappingValid = Object.values(fieldMapping).includes('name');
    const mappedFields = CANDIDATE_FIELDS.filter((f) => Object.values(fieldMapping).includes(f.key));

    // Get validation status icon
    const getStatusIcon = (validation: RowValidation) => {
        if (!validation.isValid) {
            return (
                <Tooltip>
                    <TooltipTrigger>
                        <X className="h-4 w-4 text-red-500" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                        <ul className="text-xs space-y-1">
                            {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
                        </ul>
                    </TooltipContent>
                </Tooltip>
            );
        }
        if (validation.hasWarnings) {
            return (
                <Tooltip>
                    <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                        <ul className="text-xs space-y-1">
                            {validation.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                        </ul>
                    </TooltipContent>
                </Tooltip>
            );
        }
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    };

    // Get cell styling based on validation
    const getCellStyle = (field: string, value: string, rowIndex: number) => {
        const actualRowIndex = currentPage * ROWS_PER_PAGE + rowIndex;
        const isEdited = editedCells.has(`${actualRowIndex}-${field}`);

        let borderColor = '';
        if (field === 'email' && value && !isValidEmail(value)) {
            borderColor = 'border-l-2 border-l-red-500';
        } else if (field === 'phone' && value && !isValidPhone(value)) {
            borderColor = 'border-l-2 border-l-yellow-500';
        } else if (field === 'name' && !value) {
            borderColor = 'border-l-2 border-l-red-500';
        }

        return cn(borderColor, isEdited && 'bg-blue-50 dark:bg-blue-950/30');
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="w-screen h-[100dvh] max-w-none sm:max-w-[900px] sm:h-auto sm:max-h-[90vh] sm:rounded-lg flex flex-col gap-0 p-0">
                <DialogHeader className="p-6 pb-2 sm:pb-6 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Import Candidates from CSV
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'upload' && 'Upload a CSV file to import candidates in bulk'}
                        {step === 'mapping' && 'Map CSV columns to candidate fields'}
                        {step === 'preview' && 'Review the data before importing'}
                        {step === 'importing' && 'Importing candidates...'}
                        {step === 'complete' && 'Import complete!'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2 sm:pt-0">
                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div
                            className="relative group border-2 border-dashed border-primary/30 rounded-2xl p-10 text-center cursor-pointer bg-gradient-to-b from-primary/5 via-transparent to-transparent hover:border-primary/60 hover:from-primary/10 transition-all duration-300 ease-out"
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add('border-primary', 'from-primary/15', 'scale-[1.01]');
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-primary', 'from-primary/15', 'scale-[1.01]');
                            }}
                            onDrop={(e) => {
                                e.currentTarget.classList.remove('border-primary', 'from-primary/15', 'scale-[1.01]');
                                handleDrop(e);
                            }}
                        >
                            <label className="cursor-pointer block">
                                {/* Animated icon container */}
                                <div className="relative mx-auto w-20 h-20 mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl transform rotate-6 group-hover:rotate-12 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-2xl transform -rotate-3 group-hover:-rotate-6 transition-transform duration-300" />
                                    <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
                                        <Upload className="h-9 w-9 text-white group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-semibold text-foreground mb-2">
                                    Drop your spreadsheet here
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    or <span className="text-primary font-medium hover:underline">click to browse</span> your files
                                </p>

                                {/* File type badges */}
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        CSV
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 text-xs font-medium">
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        XLSX
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        XLS
                                    </span>
                                </div>

                                {/* Limit info */}
                                <p className="text-xs text-muted-foreground/70">
                                    Maximum {MAX_ROWS.toLocaleString()} candidates per import
                                </p>

                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".csv,.xlsx,.xls,text/csv,application/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>
                    )}

                    {/* Step 2: Mapping */}
                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    File: {file?.name} ({csvData.length} rows)
                                </span>
                                <Badge variant={isMappingValid ? 'default' : 'destructive'}>
                                    {isMappingValid ? 'Ready' : 'Map "Name" field'}
                                </Badge>
                            </div>

                            <ScrollArea className="h-[300px] border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-1/2">CSV Column</TableHead>
                                            <TableHead className="w-1/2">Map to Field</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {csvHeaders.map((header) => (
                                            <TableRow key={header}>
                                                <TableCell className="font-mono text-sm">
                                                    {header}
                                                    <span className="text-muted-foreground ml-2">
                                                        (e.g. "{csvData[0]?.[header]?.slice(0, 20) || 'empty'}"...)
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={fieldMapping[header] || 'skip'}
                                                        onValueChange={(value) =>
                                                            handleMappingChange(header, value)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Skip" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="skip">
                                                                Skip this column
                                                            </SelectItem>
                                                            {CANDIDATE_FIELDS.map((field) => (
                                                                <SelectItem
                                                                    key={field.key}
                                                                    value={field.key}
                                                                >
                                                                    {field.label}
                                                                    {field.required && ' *'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-lg font-bold text-green-600">{validationStats.valid}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Valid</p>
                                </div>
                                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                        <span className="text-lg font-bold text-yellow-600">{validationStats.warnings}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Warnings</p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                                    <div className="flex items-center gap-2">
                                        <X className="h-4 w-4 text-red-600" />
                                        <span className="text-lg font-bold text-red-600">{validationStats.errors}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Errors</p>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                                    <div className="flex items-center gap-2">
                                        <Copy className="h-4 w-4 text-blue-600" />
                                        <span className="text-lg font-bold text-blue-600">{validationStats.duplicates}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Duplicates</p>
                                </div>
                            </div>

                            {validationStats.errors > 0 && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Fix errors before importing</AlertTitle>
                                    <AlertDescription>
                                        {validationStats.errors} rows have errors that must be fixed. Click on a cell to edit.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Data Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <ScrollArea className="h-[320px]">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-12 text-center">#</TableHead>
                                                <TableHead className="w-12 text-center">Status</TableHead>
                                                {mappedFields.map((field) => (
                                                    <TableHead key={field.key} className="min-w-[120px]">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedData.map((row, idx) => {
                                                const validation = paginatedValidations[idx];
                                                const actualRowNum = currentPage * ROWS_PER_PAGE + idx + 1;

                                                return (
                                                    <TableRow
                                                        key={idx}
                                                        className={cn(
                                                            idx % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                                                            !validation?.isValid && 'bg-red-50/50 dark:bg-red-950/20',
                                                            validation?.isDuplicate && 'bg-yellow-50/50 dark:bg-yellow-950/20'
                                                        )}
                                                    >
                                                        <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                                            {actualRowNum}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {validation && getStatusIcon(validation)}
                                                        </TableCell>
                                                        {mappedFields.map((field) => {
                                                            const value = (row as any)[field.key] || '';
                                                            const isEditing = editingCell?.rowIndex === idx && editingCell?.field === field.key;

                                                            return (
                                                                <TableCell
                                                                    key={field.key}
                                                                    className={cn(
                                                                        'p-1',
                                                                        getCellStyle(field.key, value, idx)
                                                                    )}
                                                                >
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                value={editValue}
                                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                                className="h-7 text-sm"
                                                                                autoFocus
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') saveEdit();
                                                                                    if (e.key === 'Escape') cancelEdit();
                                                                                }}
                                                                            />
                                                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}>
                                                                                <Check className="h-3 w-3" />
                                                                            </Button>
                                                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                                                                                <X className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className="group flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                                                                            onClick={() => startEditing(idx, field.key, value)}
                                                                        >
                                                                            <span className={cn(
                                                                                'text-sm truncate max-w-[150px]',
                                                                                !value && 'text-muted-foreground italic'
                                                                            )}>
                                                                                {value || 'empty'}
                                                                            </span>
                                                                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 ml-1 flex-shrink-0" />
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {currentPage * ROWS_PER_PAGE + 1} - {Math.min((currentPage + 1) * ROWS_PER_PAGE, csvData.length)} of {csvData.length} rows
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                            disabled={currentPage === 0}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground px-2">
                                            Page {currentPage + 1} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={currentPage >= totalPages - 1}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Importing */}
                    {step === 'importing' && (
                        <div className="py-12 text-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                            <p className="text-lg font-medium">Importing candidates...</p>
                            <Progress value={50} className="w-2/3 mx-auto" />
                        </div>
                    )}

                    {/* Step 5: Complete */}
                    {step === 'complete' && importResult && (
                        <div className="space-y-4">
                            <div className="py-6 text-center">
                                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                                <p className="text-lg font-medium">Import Complete!</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">
                                        {importResult.success}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Imported</p>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {importResult.duplicates.length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Duplicates</p>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                                    <p className="text-2xl font-bold text-red-600">
                                        {importResult.failed}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Some rows failed</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc pl-4 mt-2">
                                            {importResult.errors.slice(0, 5).map((err, idx) => (
                                                <li key={idx}>
                                                    Row {err.row}: {err.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 border-t bg-background mt-auto flex-shrink-0">
                    {step === 'upload' && (
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                    )}

                    {step === 'mapping' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Back
                            </Button>
                            <Button onClick={() => setStep('preview')} disabled={!isMappingValid}>
                                Continue to Preview
                            </Button>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('mapping')}>
                                Back to Mapping
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={validationStats.errors > 0}
                            >
                                Import {csvData.length - validationStats.errors} Candidates
                            </Button>
                        </>
                    )}

                    {step === 'complete' && (
                        <Button onClick={handleComplete}>Done</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
