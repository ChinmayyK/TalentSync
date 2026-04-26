'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';

interface UndoableAction<T> {
    /** Execute the action */
    execute: () => Promise<T>;
    /** Undo the action */
    undo: () => Promise<void>;
    /** Description for the toast */
    description: string;
    /** How long to wait before action is final (ms) */
    timeout?: number;
}

interface UseUndoToastReturn {
    /** Execute an undoable action */
    executeWithUndo: <T>(action: UndoableAction<T>) => Promise<T | undefined>;
    /** Whether an action is pending undo */
    isPending: boolean;
}

/**
 * Hook for showing undo toast after destructive actions
 * Gives users a chance to undo before action is finalized
 */
export function useUndoToast(): UseUndoToastReturn {
    const [isPending, setIsPending] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const undoRef = useRef<(() => Promise<void>) | null>(null);

    const executeWithUndo = useCallback(async function <T>(action: UndoableAction<T>): Promise<T | undefined> {
        setIsPending(true);
        const timeout = action.timeout || 5000;

        try {
            // Execute the action
            const result = await action.execute();

            // Store undo function
            undoRef.current = action.undo;

            // Show toast with undo button
            const { dismiss } = toast({
                title: 'Action completed',
                description: (
                    <div className="flex items-center justify-between gap-4">
                        <span>{action.description}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2"
                            onClick={async () => {
                                // Clear timeout
                                if (timeoutRef.current) {
                                    clearTimeout(timeoutRef.current);
                                }

                                // Execute undo
                                if (undoRef.current) {
                                    try {
                                        await undoRef.current();
                                        toast({
                                            title: 'Undone',
                                            description: 'Action was reversed successfully.',
                                        });
                                    } catch (error) {
                                        toast({
                                            title: 'Undo failed',
                                            description: 'Could not reverse the action.',
                                            variant: 'destructive',
                                        });
                                    }
                                }

                                dismiss();
                                setIsPending(false);
                            }}
                        >
                            <Undo2 className="h-3.5 w-3.5 mr-1" />
                            Undo
                        </Button>
                    </div>
                ),
                duration: timeout,
            });

            // Set timeout to finalize action
            timeoutRef.current = setTimeout(() => {
                undoRef.current = null;
                setIsPending(false);
            }, timeout);

            return result;
        } catch (error) {
            setIsPending(false);
            throw error;
        }
    }, []);

    return { executeWithUndo, isPending };
}

export default useUndoToast;
