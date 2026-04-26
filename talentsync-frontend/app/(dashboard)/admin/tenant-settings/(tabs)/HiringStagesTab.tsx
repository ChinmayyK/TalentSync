'use client';

import { useState } from 'react';
import {
    useHiringStages,
    useCreateHiringStage,
    useUpdateHiringStage,
    useReorderHiringStages,
    useToggleHiringStage,
    useDeleteHiringStage
} from '@/hooks/use-hiring-stages';
import { HiringStage } from '@/lib/api/hiring-stages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
    GripVertical,
    Plus,
    Pencil,
    Trash2,
    Star,
    Check,
    X,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

// Predefined color palette
const COLOR_PALETTE = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6b7280', '#78716c', '#64748b',
];

export default function HiringStagesTab() {
    const { data: stages, isLoading } = useHiringStages(true);
    const createMutation = useCreateHiringStage();
    const updateMutation = useUpdateHiringStage();
    const reorderMutation = useReorderHiringStages();
    const toggleMutation = useToggleHiringStage();
    const deleteMutation = useDeleteHiringStage();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<HiringStage | null>(null);
    const [deleteStage, setDeleteStage] = useState<HiringStage | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        key: '',
        color: '#6366f1',
        isDefault: false,
    });

    const resetForm = () => {
        setFormData({ name: '', key: '', color: '#6366f1', isDefault: false });
    };

    const handleOpenAdd = () => {
        resetForm();
        setIsAddDialogOpen(true);
    };

    const handleOpenEdit = (stage: HiringStage) => {
        setFormData({
            name: stage.name,
            key: stage.key,
            color: stage.color || '#6366f1',
            isDefault: stage.isDefault,
        });
        setEditingStage(stage);
    };

    const handleCreate = () => {
        createMutation.mutate({
            name: formData.name,
            key: formData.key.toUpperCase().replace(/\s+/g, '_'),
            color: formData.color,
            isDefault: formData.isDefault,
        }, {
            onSuccess: () => {
                setIsAddDialogOpen(false);
                resetForm();
            }
        });
    };

    const handleUpdate = () => {
        if (!editingStage) return;
        updateMutation.mutate({
            id: editingStage.id,
            dto: {
                name: formData.name,
                color: formData.color,
                isDefault: formData.isDefault,
            }
        }, {
            onSuccess: () => {
                setEditingStage(null);
                resetForm();
            }
        });
    };

    const handleDelete = () => {
        if (!deleteStage) return;
        deleteMutation.mutate(deleteStage.id, {
            onSuccess: () => setDeleteStage(null)
        });
    };

    const handleToggle = (stage: HiringStage) => {
        toggleMutation.mutate(stage.id);
    };

    // Simple drag reorder (could be enhanced with dnd-kit)
    const moveStage = (fromIndex: number, direction: 'up' | 'down') => {
        if (!stages) return;
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= stages.length) return;

        const newOrder = [...stages];
        [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
        reorderMutation.mutate(newOrder.map(s => s.id));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-muted-foreground">
                        Configure your recruitment pipeline stages. The order determines the flow of candidates.
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Stage
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Stage</DialogTitle>
                            <DialogDescription>
                                Create a new stage for your hiring pipeline
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Display Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Technical Interview"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="key">Key (Internal)</Label>
                                <Input
                                    id="key"
                                    value={formData.key}
                                    onChange={e => setFormData(prev => ({
                                        ...prev,
                                        key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
                                    }))}
                                    placeholder="e.g., TECHNICAL_INTERVIEW"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Uppercase letters and underscores only
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Color</Label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PALETTE.map(color => (
                                        <button
                                            key={color}
                                            className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === color
                                                ? 'border-foreground scale-110'
                                                : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onCheckedChange={checked => setFormData(prev => ({ ...prev, isDefault: checked }))}
                                />
                                <Label htmlFor="isDefault">Set as default stage for new candidates</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={createMutation.isPending || !formData.name || !formData.key}>
                                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Create Stage
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stages List */}
            <Card>
                <CardHeader>
                    <CardTitle>Pipeline Stages</CardTitle>
                    <CardDescription>
                        Drag to reorder stages. The order determines the flow of your hiring pipeline.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {stages?.map((stage, index) => (
                            <div
                                key={stage.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border ${stage.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'
                                    }`}
                            >
                                {/* Drag Handle */}
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        onClick={() => moveStage(index, 'up')}
                                        disabled={index === 0}
                                        className="p-0.5 hover:bg-accent rounded disabled:opacity-30"
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground rotate-90" />
                                    </button>
                                    <button
                                        onClick={() => moveStage(index, 'down')}
                                        disabled={index === (stages?.length || 0) - 1}
                                        className="p-0.5 hover:bg-accent rounded disabled:opacity-30"
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground -rotate-90" />
                                    </button>
                                </div>

                                {/* Color indicator */}
                                <div
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ backgroundColor: stage.color || '#6b7280' }}
                                />

                                {/* Stage info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{stage.name}</span>
                                        {stage.isDefault && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Star className="h-3 w-3 mr-1" />
                                                Default
                                            </Badge>
                                        )}
                                        {!stage.isActive && (
                                            <Badge variant="outline" className="text-xs">
                                                Disabled
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {stage.key}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={stage.isActive}
                                        onCheckedChange={() => handleToggle(stage)}
                                        disabled={toggleMutation.isPending}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenEdit(stage)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeleteStage(stage)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editingStage} onOpenChange={open => !open && setEditingStage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Stage</DialogTitle>
                        <DialogDescription>
                            Update the stage details. The key cannot be changed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Display Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Key (Read-only)</Label>
                            <Input value={formData.key} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_PALETTE.map(color => (
                                    <button
                                        key={color}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${formData.color === color
                                            ? 'border-foreground scale-110'
                                            : 'border-transparent'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch
                                id="edit-isDefault"
                                checked={formData.isDefault}
                                onCheckedChange={checked => setFormData(prev => ({ ...prev, isDefault: checked }))}
                            />
                            <Label htmlFor="edit-isDefault">Set as default stage</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingStage(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteStage} onOpenChange={open => !open && setDeleteStage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Stage</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteStage?.name}"?
                            This action cannot be undone.
                            <br /><br />
                            <strong>Note:</strong> You can only delete stages that are not in use by any candidates or interviews.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
