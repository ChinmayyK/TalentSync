'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, X, Pencil } from 'lucide-react';

interface EditableCellProps {
    /** Current value */
    value: string;
    /** Callback when value is saved */
    onSave: (newValue: string) => Promise<void>;
    /** Field name for accessibility */
    fieldName: string;
    /** Whether editing is allowed */
    editable?: boolean;
    /** Additional class for the display text */
    className?: string;
    /** Placeholder when empty */
    placeholder?: string;
    /** Input type */
    type?: 'text' | 'email';
    /** Validation function */
    validate?: (value: string) => string | null;
}

/**
 * Editable table cell component
 * Click to edit, Enter to save, Escape to cancel
 */
export function EditableCell({
    value,
    onSave,
    fieldName,
    editable = true,
    className,
    placeholder = 'Click to edit',
    type = 'text',
    validate,
}: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update local value when prop changes
    useEffect(() => {
        if (!isEditing) {
            setEditValue(value);
        }
    }, [value, isEditing]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const startEditing = useCallback(() => {
        if (editable && !isSaving) {
            setIsEditing(true);
            setError(null);
        }
    }, [editable, isSaving]);

    const cancelEditing = useCallback(() => {
        setIsEditing(false);
        setEditValue(value);
        setError(null);
    }, [value]);

    const saveValue = useCallback(async () => {
        // Validate if validator provided
        if (validate) {
            const validationError = validate(editValue);
            if (validationError) {
                setError(validationError);
                return;
            }
        }

        // Don't save if unchanged
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(editValue);
            setIsEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    }, [editValue, value, onSave, validate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveValue();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditing();
        }
    }, [saveValue, cancelEditing]);

    const handleBlur = useCallback(() => {
        // Small delay to allow button clicks to register
        setTimeout(() => {
            if (isEditing && !isSaving) {
                cancelEditing();
            }
        }, 150);
    }, [isEditing, isSaving, cancelEditing]);

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <div className="relative flex-1">
                    <Input
                        ref={inputRef}
                        type={type}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        aria-label={`Edit ${fieldName}`}
                        className={cn(
                            "h-8 text-sm",
                            error && "border-red-500 focus-visible:ring-red-500"
                        )}
                    />
                    {error && (
                        <p className="absolute -bottom-5 left-0 text-xs text-red-500">
                            {error}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={saveValue}
                    disabled={isSaving}
                    className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                    aria-label="Save"
                >
                    <Check className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                    aria-label="Cancel"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "group flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 transition-colors",
                editable && "hover:bg-muted/50",
                className
            )}
            onClick={startEditing}
            onKeyDown={(e) => e.key === 'Enter' && startEditing()}
            tabIndex={editable ? 0 : undefined}
            role={editable ? 'button' : undefined}
            aria-label={editable ? `Edit ${fieldName}: ${value || placeholder}` : undefined}
        >
            <span className={cn(!value && "text-muted-foreground italic")}>
                {value || placeholder}
            </span>
            {editable && (
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    );
}

export default EditableCell;
