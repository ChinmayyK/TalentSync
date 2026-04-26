'use client';

import React, { useState, useCallback } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface EditableSelectOption {
    value: string;
    label: string;
    color?: string;
}

interface EditableSelectProps {
    /** Current value */
    value: string;
    /** Options to choose from */
    options: EditableSelectOption[];
    /** Callback when value is saved */
    onSave: (newValue: string) => Promise<void>;
    /** Field name for accessibility */
    fieldName: string;
    /** Whether editing is allowed */
    editable?: boolean;
    /** Additional class for the trigger */
    className?: string;
}

/**
 * Editable select component for inline table editing
 * Automatically saves on selection change
 */
export function EditableSelect({
    value,
    options,
    onSave,
    fieldName,
    editable = true,
    className,
}: EditableSelectProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [savedValue, setSavedValue] = useState<string | null>(null);

    const currentOption = options.find(opt => opt.value === value);

    const handleValueChange = useCallback(async (newValue: string) => {
        if (newValue === value || !editable) return;

        setIsSaving(true);
        setSavedValue(null);

        try {
            await onSave(newValue);
            setSavedValue(newValue);
            // Clear saved indicator after a moment
            setTimeout(() => setSavedValue(null), 1500);
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [value, editable, onSave]);

    if (!editable) {
        return (
            <span className={cn(currentOption?.color, className)}>
                {currentOption?.label || value}
            </span>
        );
    }

    return (
        <div className="relative inline-flex items-center gap-1">
            <Select value={value} onValueChange={handleValueChange} disabled={isSaving}>
                <SelectTrigger
                    className={cn(
                        "h-7 w-auto min-w-[100px] text-xs font-medium border",
                        currentOption?.color,
                        className
                    )}
                    aria-label={`Select ${fieldName}`}
                >
                    <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            <span className={cn("text-xs", option.color)}>
                                {option.label}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {isSaving && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            {savedValue && (
                <Check className="h-3 w-3 text-green-600 animate-in fade-in" />
            )}
        </div>
    );
}

export default EditableSelect;
