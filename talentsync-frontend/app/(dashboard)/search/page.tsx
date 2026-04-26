"use client";

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    X,
    Plus,
    ChevronDown,
    Download,
    RefreshCw,
    Columns,
    Save,
    Loader2,
    User,
    Mail,
    Phone,
    Briefcase,
    Tag,
    Calendar,
    Building,
    MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useCandidates } from '@/lib/hooks/useCandidates';
import { format } from 'date-fns';
import Link from 'next/link';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

// Filter types
type FilterOperator = 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_contains' | 'is_empty' | 'is_not_empty';
type FilterField = 'name' | 'email' | 'phone' | 'roleTitle' | 'stage' | 'source' | 'tags' | 'notes' | 'createdAt';

interface SearchFilter {
    id: string;
    field: FilterField;
    operator: FilterOperator;
    value: string;
}

const FILTER_FIELDS: { value: FilterField; label: string; icon: React.ReactNode }[] = [
    { value: 'name', label: 'Name', icon: <User className="h-4 w-4" /> },
    { value: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
    { value: 'phone', label: 'Phone', icon: <Phone className="h-4 w-4" /> },
    { value: 'roleTitle', label: 'Position', icon: <Briefcase className="h-4 w-4" /> },
    { value: 'stage', label: 'Stage', icon: <Tag className="h-4 w-4" /> },
    { value: 'source', label: 'Source', icon: <Building className="h-4 w-4" /> },
    { value: 'tags', label: 'Tags', icon: <Tag className="h-4 w-4" /> },
    { value: 'notes', label: 'Notes', icon: <MapPin className="h-4 w-4" /> },
    { value: 'createdAt', label: 'Created Date', icon: <Calendar className="h-4 w-4" /> },
];

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
];

const DEFAULT_COLUMNS = ['name', 'email', 'phone', 'roleTitle', 'stage', 'source', 'createdAt'];

export default function SearchTalentSyncPage() {
    const [filters, setFilters] = useState<SearchFilter[]>([]);
    const [quickSearch, setQuickSearch] = useState('');
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
    const [selectedRows, setSelectedRows] = useState<string[]>([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState<number | 'all'>(25);

    // Fetch data with pagination
    const isShowingAll = perPage === 'all';
    const { data: candidatesData, isLoading, refetch } = useCandidates({
        page: isShowingAll ? 1 : page,
        perPage: isShowingAll ? 10000 : perPage,
        q: quickSearch || undefined,
    });

    const candidates = candidatesData?.data || [];

    // Apply filters to candidates
    const filteredCandidates = useMemo(() => {
        if (filters.length === 0) return candidates;

        return candidates.filter(candidate => {
            return filters.every(filter => {
                const fieldValue = String((candidate as any)[filter.field] || '').toLowerCase();
                const searchValue = filter.value.toLowerCase();

                switch (filter.operator) {
                    case 'contains':
                        return fieldValue.includes(searchValue);
                    case 'equals':
                        return fieldValue === searchValue;
                    case 'starts_with':
                        return fieldValue.startsWith(searchValue);
                    case 'ends_with':
                        return fieldValue.endsWith(searchValue);
                    case 'not_contains':
                        return !fieldValue.includes(searchValue);
                    case 'is_empty':
                        return !fieldValue || fieldValue.trim() === '';
                    case 'is_not_empty':
                        return fieldValue && fieldValue.trim() !== '';
                    default:
                        return true;
                }
            });
        });
    }, [candidates, filters]);

    // Add a new filter
    const addFilter = () => {
        const newFilter: SearchFilter = {
            id: Date.now().toString(),
            field: 'name',
            operator: 'contains',
            value: '',
        };
        setFilters([...filters, newFilter]);
    };

    // Update a filter
    const updateFilter = (id: string, updates: Partial<SearchFilter>) => {
        setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    // Remove a filter
    const removeFilter = (id: string) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters([]);
        setQuickSearch('');
    };

    // Toggle column visibility
    const toggleColumn = (column: string) => {
        setVisibleColumns(prev =>
            prev.includes(column)
                ? prev.filter(c => c !== column)
                : [...prev, column]
        );
    };

    // Toggle row selection
    const toggleRowSelection = (id: string) => {
        setSelectedRows(prev =>
            prev.includes(id)
                ? prev.filter(r => r !== id)
                : [...prev, id]
        );
    };

    // Select/deselect all
    const toggleAllRows = () => {
        if (selectedRows.length === filteredCandidates.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(filteredCandidates.map(c => c.id));
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = visibleColumns.join(',');
        const rows = filteredCandidates.map(c =>
            visibleColumns.map(col => {
                const value = (c as any)[col];
                if (col === 'createdAt') return format(new Date(value), 'yyyy-MM-dd');
                if (Array.isArray(value)) return value.join(';');
                return String(value || '').replace(/,/g, ';');
            }).join(',')
        );
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `talentsync-search-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Search TalentSync</h1>
                    <p className="text-muted-foreground">Find candidates across all fields</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Quick search across all fields..."
                                value={quickSearch}
                                onChange={(e) => setQuickSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button onClick={addFilter} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Filter
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Columns className="h-4 w-4 mr-2" />
                                    Columns
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {FILTER_FIELDS.map((field) => (
                                    <DropdownMenuCheckboxItem
                                        key={field.value}
                                        checked={visibleColumns.includes(field.value)}
                                        onCheckedChange={() => toggleColumn(field.value)}
                                    >
                                        {field.icon}
                                        <span className="ml-2">{field.label}</span>
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Active Filters */}
                    <AnimatePresence>
                        {filters.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Active Filters ({filters.length})
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        Clear All
                                    </Button>
                                </div>
                                {filters.map((filter, index) => (
                                    <motion.div
                                        key={filter.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                                    >
                                        {index > 0 && (
                                            <Badge variant="outline" className="text-xs">AND</Badge>
                                        )}
                                        <Select
                                            value={filter.field}
                                            onValueChange={(v) => updateFilter(filter.id, { field: v as FilterField })}
                                        >
                                            <SelectTrigger className="w-36">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FILTER_FIELDS.map((f) => (
                                                    <SelectItem key={f.value} value={f.value}>
                                                        <div className="flex items-center gap-2">
                                                            {f.icon}
                                                            {f.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={filter.operator}
                                            onValueChange={(v) => updateFilter(filter.id, { operator: v as FilterOperator })}
                                        >
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FILTER_OPERATORS.map((op) => (
                                                    <SelectItem key={op.value} value={op.value}>
                                                        {op.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                                            <Input
                                                placeholder="Value..."
                                                value={filter.value}
                                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                                                className="flex-1"
                                            />
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeFilter(filter.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Filter Chips Display */}
                    {filters.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {filters.map((filter) => (
                                <Badge
                                    key={filter.id}
                                    variant="secondary"
                                    className="flex items-center gap-1 px-3 py-1"
                                >
                                    {FILTER_FIELDS.find(f => f.value === filter.field)?.label}{' '}
                                    {filter.operator.replace('_', ' ')}{' '}
                                    {filter.value && `"${filter.value}"`}
                                    <X
                                        className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                                        onClick={() => removeFilter(filter.id)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                            Showing {filteredCandidates.length} of {candidates.length} candidates
                        </CardTitle>
                        {selectedRows.length > 0 && (
                            <Badge variant="default">
                                {selectedRows.length} selected
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Search className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No Data Available</p>
                            <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedRows.length === filteredCandidates.length && filteredCandidates.length > 0}
                                                onCheckedChange={toggleAllRows}
                                            />
                                        </TableHead>
                                        {visibleColumns.includes('name') && (
                                            <TableHead>Name</TableHead>
                                        )}
                                        {visibleColumns.includes('email') && (
                                            <TableHead>Email</TableHead>
                                        )}
                                        {visibleColumns.includes('phone') && (
                                            <TableHead>Phone</TableHead>
                                        )}
                                        {visibleColumns.includes('roleTitle') && (
                                            <TableHead>Position</TableHead>
                                        )}
                                        {visibleColumns.includes('stage') && (
                                            <TableHead>Stage</TableHead>
                                        )}
                                        {visibleColumns.includes('source') && (
                                            <TableHead>Source</TableHead>
                                        )}
                                        {visibleColumns.includes('tags') && (
                                            <TableHead>Tags</TableHead>
                                        )}
                                        {visibleColumns.includes('createdAt') && (
                                            <TableHead>Added Time</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCandidates.map((candidate) => (
                                        <TableRow key={candidate.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedRows.includes(candidate.id)}
                                                    onCheckedChange={() => toggleRowSelection(candidate.id)}
                                                />
                                            </TableCell>
                                            {visibleColumns.includes('name') && (
                                                <TableCell>
                                                    <Link
                                                        href={`/candidates/${candidate.id}`}
                                                        className="font-medium hover:underline text-primary"
                                                    >
                                                        {candidate.name}
                                                    </Link>
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('email') && (
                                                <TableCell className="text-muted-foreground">
                                                    {candidate.email || '-'}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('phone') && (
                                                <TableCell className="text-muted-foreground">
                                                    {candidate.phone || '-'}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('roleTitle') && (
                                                <TableCell>{candidate.roleTitle || '-'}</TableCell>
                                            )}
                                            {visibleColumns.includes('stage') && (
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {candidate.stage
                                                            ? candidate.stage.charAt(0).toUpperCase() + candidate.stage.slice(1).toLowerCase()
                                                            : '-'}
                                                    </Badge>
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('source') && (
                                                <TableCell className="text-muted-foreground">
                                                    {candidate.source || '-'}
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('tags') && (
                                                <TableCell>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {candidate.tags?.slice(0, 2).map((tag) => (
                                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {candidate.tags?.length > 2 && (
                                                            <Badge variant="outline" className="text-xs">
                                                                +{candidate.tags.length - 2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                            {visibleColumns.includes('createdAt') && (
                                                <TableCell className="text-muted-foreground">
                                                    {format(new Date(candidate.createdAt), 'MMM d, yyyy')}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="hidden sm:inline">Show</span>
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setPerPage(val === 'all' ? 'all' : Number(val));
                                    setPage(1);
                                }}
                                className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="all">All</option>
                            </select>
                            <span className="hidden sm:inline">per page</span>
                            {candidatesData?.meta && (
                                <span className="text-xs sm:text-sm">
                                    ({candidatesData.meta.total} total)
                                </span>
                            )}
                        </div>

                        {candidatesData?.meta && candidatesData.meta.lastPage > 1 && perPage !== 'all' && (
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            aria-disabled={page <= 1}
                                            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationLink isActive>{page} / {candidatesData.meta.lastPage}</PaginationLink>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setPage(p => Math.min(candidatesData.meta.lastPage, p + 1))}
                                            aria-disabled={page >= candidatesData.meta.lastPage}
                                            className={page >= candidatesData.meta.lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
