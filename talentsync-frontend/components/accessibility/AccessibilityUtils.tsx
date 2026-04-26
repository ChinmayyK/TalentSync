"use client";

import { useEffect, useState } from 'react';

/**
 * SkipLinks Component - WCAG 2.1 Level A Requirement
 * 
 * Provides keyboard-accessible skip links for screen reader users
 * to bypass repetitive navigation and jump to main content.
 * 
 * Links are visually hidden until focused via keyboard.
 */
export function SkipLinks() {
    const [isVisible, setIsVisible] = useState(false);

    // Show skip links container when any skip link is focused
    const handleFocus = () => setIsVisible(true);
    const handleBlur = (e: React.FocusEvent) => {
        // Only hide if focus has left all skip links
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsVisible(false);
        }
    };

    return (
        <nav
            aria-label="Skip links"
            className={`
                fixed top-0 left-0 z-[9999] p-2 bg-background border-b shadow-lg
                transition-transform duration-200
                ${isVisible ? 'translate-y-0' : '-translate-y-full'}
                focus-within:translate-y-0
            `}
            onFocus={handleFocus}
            onBlur={handleBlur}
        >
            <ul className="flex gap-2 list-none m-0 p-0">
                <li>
                    <a
                        href="#main-content"
                        className="
                            inline-flex items-center px-4 py-2 text-sm font-medium
                            bg-primary text-primary-foreground rounded-md
                            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                            hover:bg-primary/90 transition-colors
                        "
                    >
                        Skip to main content
                    </a>
                </li>
                <li>
                    <a
                        href="#main-navigation"
                        className="
                            inline-flex items-center px-4 py-2 text-sm font-medium
                            bg-secondary text-secondary-foreground rounded-md
                            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                            hover:bg-secondary/80 transition-colors
                        "
                    >
                        Skip to navigation
                    </a>
                </li>
                <li>
                    <a
                        href="#search"
                        className="
                            inline-flex items-center px-4 py-2 text-sm font-medium
                            bg-secondary text-secondary-foreground rounded-md
                            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                            hover:bg-secondary/80 transition-colors
                        "
                    >
                        Skip to search
                    </a>
                </li>
            </ul>
        </nav>
    );
}

/**
 * LiveRegion Component - WCAG 2.1 Level A Requirement
 * 
 * Provides an ARIA live region for screen reader announcements.
 * Used for dynamic content updates, form validation, and status messages.
 */
interface LiveRegionProps {
    /** The message to announce */
    message: string;
    /** Priority: polite waits for user idle, assertive interrupts */
    priority?: 'polite' | 'assertive';
    /** Type of update */
    role?: 'status' | 'alert' | 'log';
    /** Clear message after announcement */
    clearAfter?: number;
}

export function LiveRegion({
    message,
    priority = 'polite',
    role = 'status',
    clearAfter = 5000,
}: LiveRegionProps) {
    const [announcement, setAnnouncement] = useState(message);

    useEffect(() => {
        setAnnouncement(message);

        if (clearAfter && message) {
            const timer = setTimeout(() => setAnnouncement(''), clearAfter);
            return () => clearTimeout(timer);
        }
    }, [message, clearAfter]);

    return (
        <div
            role={role}
            aria-live={priority}
            aria-atomic="true"
            className="sr-only"
        >
            {announcement}
        </div>
    );
}

/**
 * useLiveAnnouncement Hook
 * 
 * Provides a way to make screen reader announcements programmatically.
 */
let announcementContainer: HTMLDivElement | null = null;

export function useLiveAnnouncement() {
    useEffect(() => {
        // Create container on mount if it doesn't exist
        if (typeof window !== 'undefined' && !announcementContainer) {
            announcementContainer = document.createElement('div');
            announcementContainer.setAttribute('role', 'status');
            announcementContainer.setAttribute('aria-live', 'polite');
            announcementContainer.setAttribute('aria-atomic', 'true');
            announcementContainer.className = 'sr-only';
            document.body.appendChild(announcementContainer);
        }
    }, []);

    const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (!announcementContainer) return;

        // Update priority if needed
        announcementContainer.setAttribute('aria-live', priority);

        // Clear and set message (forces re-announcement)
        announcementContainer.textContent = '';
        requestAnimationFrame(() => {
            announcementContainer!.textContent = message;
        });
    };

    return { announce };
}

/**
 * FocusTrap Component - WCAG 2.1 Level A Requirement
 * 
 * Traps keyboard focus within a container (for modals, dialogs).
 * Press Tab/Shift+Tab to cycle through focusable elements.
 * Press Escape to close (if onEscape provided).
 */
interface FocusTrapProps {
    children: React.ReactNode;
    active?: boolean;
    onEscape?: () => void;
    initialFocus?: string; // CSS selector for initial focus
    returnFocus?: boolean; // Return focus to trigger on unmount
}

export function FocusTrap({
    children,
    active = true,
    onEscape,
    initialFocus,
    returnFocus = true,
}: FocusTrapProps) {
    const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (!active) return;

        // Store the currently focused element
        setTriggerElement(document.activeElement as HTMLElement);

        // Set initial focus
        const container = document.querySelector('[data-focus-trap]') as HTMLElement;
        if (!container) return;

        const focusableElements = getFocusableElements(container);

        if (initialFocus) {
            const initial = container.querySelector(initialFocus) as HTMLElement;
            initial?.focus();
        } else if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Handle keyboard events
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onEscape) {
                e.preventDefault();
                onEscape();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusable = getFocusableElements(container);
            if (focusable.length === 0) return;

            const firstElement = focusable[0];
            const lastElement = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);

            // Return focus to trigger element
            if (returnFocus && triggerElement && triggerElement.focus) {
                triggerElement.focus();
            }
        };
    }, [active, initialFocus, onEscape, returnFocus, triggerElement]);

    if (!active) return <>{children}</>;

    return <div data-focus-trap>{children}</div>;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
        'a[href]:not([disabled]):not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"])',
        'input:not([disabled]):not([tabindex="-1"]):not([type="hidden"])',
        'select:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ].join(',');

    return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * VisuallyHidden Component - WCAG 2.1 Level A Requirement
 * 
 * Hides content visually but keeps it accessible to screen readers.
 */
interface VisuallyHiddenProps {
    children: React.ReactNode;
    as?: keyof JSX.IntrinsicElements;
}

export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps) {
    return (
        <Tag className="sr-only">
            {children}
        </Tag>
    );
}

/**
 * ReducedMotion Hook - WCAG 2.1 Level AAA
 * 
 * Detects user's motion preference and reduces animations accordingly.
 */
export function useReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReduced(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersReduced;
}

/**
 * useHighContrast Hook - WCAG 2.1 Level AAA
 * 
 * Detects user's high contrast preference.
 */
export function useHighContrast(): boolean {
    const [prefersHighContrast, setPrefersHighContrast] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-contrast: more)');
        setPrefersHighContrast(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches);
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return prefersHighContrast;
}
