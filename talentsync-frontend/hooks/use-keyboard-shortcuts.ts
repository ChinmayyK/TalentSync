'use client';

import { useEffect, useCallback } from 'react';

export type KeyboardShortcut = {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description?: string;
};

/**
 * Hook for registering keyboard shortcuts
 * @param shortcuts - Array of keyboard shortcut definitions
 * @param enabled - Whether shortcuts are active (defaults to true)
 */
export function useKeyboardShortcuts(
    shortcuts: KeyboardShortcut[],
    enabled: boolean = true
) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Don't trigger shortcuts when in input/textarea
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            for (const shortcut of shortcuts) {
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
                const metaMatch = shortcut.meta ? event.metaKey : true;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;

                if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
                    event.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        },
        [shortcuts, enabled]
    );

    useEffect(() => {
        if (enabled) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown, enabled]);
}

/**
 * Common keyboard shortcuts for the application
 */
export const COMMON_SHORTCUTS = {
    SEARCH: { key: '/', description: 'Focus search' },
    NEW: { key: 'n', description: 'Create new' },
    ESCAPE: { key: 'Escape', description: 'Close/Cancel' },
    SAVE: { key: 's', ctrl: true, description: 'Save' },
    SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all' },
    DELETE: { key: 'Delete', description: 'Delete selected' },
} as const;

export default useKeyboardShortcuts;
