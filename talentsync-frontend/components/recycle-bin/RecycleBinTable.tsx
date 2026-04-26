import { formatDistanceToNow } from 'date-fns';
import { RefreshCcw, Trash2, User, FileText, Calendar, Eye } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RecycleBinItem } from '@/lib/api/recycle-bin';

interface RecycleBinTableProps {
    items: RecycleBinItem[];
    onRestore: (item: RecycleBinItem) => void;
    onPurge: (item: RecycleBinItem) => void;
    isRestoring?: string | null;
    isPurging?: string | null;
    isAdmin?: boolean;
}

export function RecycleBinTable({
    items,
    onRestore,
    onPurge,
    isRestoring,
    isPurging,
    isAdmin = false,
}: RecycleBinTableProps) {
    const getIcon = (module: string) => {
        switch (module) {
            case 'candidate':
                return <User className="h-4 w-4 text-blue-500" />;
            case 'interview':
                return <Calendar className="h-4 w-4 text-orange-500" />;
            case 'file':
            case 'template':
                return <FileText className="h-4 w-4 text-gray-500" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getDisplayName = (item: RecycleBinItem) => {
        const snapshot = item.itemSnapshot as any;
        if (!snapshot) return item.itemId;

        if (item.module === 'candidate') {
            return snapshot.name || snapshot.email || 'Unnamed Candidate';
        }
        if (item.module === 'interview') {
            const candidateName = snapshot.candidate?.name || '';
            const date = snapshot.date ? new Date(snapshot.date).toLocaleDateString() : '';
            return candidateName ? `${candidateName} - ${date}` : `Interview on ${date}`;
        }
        return snapshot.name || snapshot.filename || item.itemId;
    };

    const getModuleLabel = (module: string) => {
        const labels: Record<string, string> = {
            candidate: 'Candidate',
            interview: 'Interview',
            file: 'File',
            template: 'Template'
        };
        return labels[module] || module;
    };

    const getModuleBadgeColor = (module: string) => {
        const colors: Record<string, string> = {
            candidate: 'bg-blue-100 text-blue-700',
            interview: 'bg-orange-100 text-orange-700',
            file: 'bg-gray-100 text-gray-700',
            template: 'bg-purple-100 text-purple-700'
        };
        return colors[module] || 'bg-gray-100 text-gray-700';
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/5">
                <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No items in recycle bin</p>
                <p className="text-sm text-muted-foreground/70">
                    Deleted items will appear here
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Mobile View: Cards */}
            <div className="block sm:hidden space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
                                {getIcon(item.module)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{getDisplayName(item)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 ${getModuleBadgeColor(item.module)}`}>
                                        {getModuleLabel(item.module)}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 text-xs"
                                onClick={() => onRestore(item)}
                                disabled={!!isRestoring || !!isPurging}
                            >
                                {isRestoring === item.id ? (
                                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                                ) : (
                                    <RefreshCcw className="h-3 w-3 mr-1" />
                                )}
                                Restore
                            </Button>
                            {isAdmin && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1 h-9 text-xs"
                                    onClick={() => onPurge(item)}
                                    disabled={!!isRestoring || !!isPurging}
                                >
                                    {isPurging === item.id ? (
                                        <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                                    ) : (
                                        <Trash2 className="h-3 w-3 mr-1" />
                                    )}
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden sm:block rounded-lg border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[500px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[60px]">Type</TableHead>
                                <TableHead>Name / Details</TableHead>
                                <TableHead className="hidden lg:table-cell">Deleted</TableHead>
                                {isAdmin && <TableHead className="hidden xl:table-cell">Deleted By</TableHead>}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id} className="group">
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                                                    {getIcon(item.module)}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {getModuleLabel(item.module)}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-medium">{getDisplayName(item)}</span>
                                            <Badge variant="secondary" className={`w-fit text-xs ${getModuleBadgeColor(item.module)}`}>
                                                {getModuleLabel(item.module)}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="flex flex-col">
                                            <span className="text-sm">
                                                {new Date(item.deletedAt).toLocaleDateString()}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(item.deletedAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                                            {item.deletedBy || 'Unknown'}
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onRestore(item)}
                                                disabled={!!isRestoring || !!isPurging}
                                            >
                                                {isRestoring === item.id ? (
                                                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                                                ) : (
                                                    <RefreshCcw className="h-3 w-3 mr-1" />
                                                )}
                                                Restore
                                            </Button>
                                            {isAdmin && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => onPurge(item)}
                                                    disabled={!!isRestoring || !!isPurging}
                                                >
                                                    {isPurging === item.id ? (
                                                        <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                                                    ) : (
                                                        <Trash2 className="h-3 w-3 mr-1" />
                                                    )}
                                                    Delete Forever
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </>
    );
}
