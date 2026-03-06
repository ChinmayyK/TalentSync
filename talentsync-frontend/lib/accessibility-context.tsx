'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    AccessibilitySettings,
    defaultAccessibilitySettings,
    textSizeValues,
    letterSpacingValues,
    cursorSizeValues,
} from '@/types/accessibility';

interface AccessibilityContextType {
    settings: AccessibilitySettings;
    updateSettings: (partial: Partial<AccessibilitySettings>) => void;
    resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'talentsync-accessibility-settings';

// CSS filter values for color blindness simulation
const colorFilterCSS: Record<string, string> = {
    none: 'none',
    protanopia: 'url(#protanopia)',
    deuteranopia: 'url(#deuteranopia)',
    tritanopia: 'url(#tritanopia)',
    grayscale: 'grayscale(100%)',
    'high-contrast': 'contrast(150%)',
};

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(defaultAccessibilitySettings);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setSettings({ ...defaultAccessibilitySettings, ...parsed });
            }
        } catch (error) {
            console.error('Failed to load accessibility settings:', error);
        }
        setIsInitialized(true);
    }, []);

    // Save settings to localStorage when they change
    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch (error) {
                console.error('Failed to save accessibility settings:', error);
            }
        }
    }, [settings, isInitialized]);

    // Apply settings to document
    useEffect(() => {
        if (!isInitialized) return;

        const root = document.documentElement;
        const body = document.body;

        // Text Size
        root.style.setProperty('--accessibility-text-size', textSizeValues[settings.textSize]);
        root.style.fontSize = textSizeValues[settings.textSize];

        // Zoom Level
        if (settings.zoomLevel !== 100) {
            body.style.transform = `scale(${settings.zoomLevel / 100})`;
            body.style.transformOrigin = 'top left';
            body.style.width = `${100 / (settings.zoomLevel / 100)}%`;
        } else {
            body.style.transform = '';
            body.style.transformOrigin = '';
            body.style.width = '';
        }

        // Letter Spacing
        root.style.setProperty('--accessibility-letter-spacing', letterSpacingValues[settings.letterSpacing]);
        root.style.letterSpacing = letterSpacingValues[settings.letterSpacing];

        // Underline Links
        if (settings.underlineLinks) {
            root.classList.add('accessibility-underline-links');
        } else {
            root.classList.remove('accessibility-underline-links');
        }

        // Custom Cursor
        if (settings.customCursor.enabled) {
            const size = cursorSizeValues[settings.customCursor.size];
            const color = settings.customCursor.color;
            // Create a custom cursor using SVG data URI
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9-9-9z"/></svg>`;
            const encoded = btoa(svg);
            root.style.cursor = `url(data:image/svg+xml;base64,${encoded}), auto`;
        } else {
            root.style.cursor = '';
        }

        // Color Filter
        if (settings.colorFilter.enabled && settings.colorFilter.type !== 'none') {
            root.style.filter = colorFilterCSS[settings.colorFilter.type];
        } else {
            root.style.filter = '';
        }

        // Error Display Color
        root.style.setProperty('--accessibility-error-color', settings.errorDisplay.color);

        // Screen Reader announcement
        if (settings.screenReaderEnabled) {
            root.setAttribute('aria-live', 'polite');
        } else {
            root.removeAttribute('aria-live');
        }

        // Mandatory Field Format
        root.setAttribute('data-mandatory-format', settings.mandatoryFieldFormat);
        root.setAttribute('data-error-icon', settings.errorDisplay.showIcon ? 'true' : 'false');

    }, [settings, isInitialized]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + F5 for screen reader
            if ((e.metaKey || e.ctrlKey) && e.key === 'F5') {
                e.preventDefault();
                setSettings(prev => ({
                    ...prev,
                    screenReaderEnabled: !prev.screenReaderEnabled,
                }));
            }

            // Cmd/Ctrl + Plus for zoom in
            if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                setSettings(prev => ({
                    ...prev,
                    zoomLevel: Math.min(150, prev.zoomLevel + 10),
                }));
            }

            // Cmd/Ctrl + Minus for zoom out
            if ((e.metaKey || e.ctrlKey) && e.key === '-') {
                e.preventDefault();
                setSettings(prev => ({
                    ...prev,
                    zoomLevel: Math.max(25, prev.zoomLevel - 10),
                }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const updateSettings = useCallback((partial: Partial<AccessibilitySettings>) => {
        setSettings(prev => ({ ...prev, ...partial }));
    }, []);

    const resetSettings = useCallback(() => {
        setSettings(defaultAccessibilitySettings);
    }, []);

    return (
        <AccessibilityContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {/* SVG filters for color blindness simulation - only render on client to avoid hydration mismatch */}
            {isInitialized && (
                <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
                    <defs>
                        {/* Protanopia (Red-Blind) */}
                        <filter id="protanopia">
                            <feColorMatrix type="matrix" values="
              0.567, 0.433, 0,     0, 0
              0.558, 0.442, 0,     0, 0
              0,     0.242, 0.758, 0, 0
              0,     0,     0,     1, 0
            "/>
                        </filter>
                        {/* Deuteranopia (Green-Blind) */}
                        <filter id="deuteranopia">
                            <feColorMatrix type="matrix" values="
              0.625, 0.375, 0,   0, 0
              0.7,   0.3,   0,   0, 0
              0,     0.3,   0.7, 0, 0
              0,     0,     0,   1, 0
            "/>
                        </filter>
                        {/* Tritanopia (Blue-Blind) */}
                        <filter id="tritanopia">
                            <feColorMatrix type="matrix" values="
              0.95, 0.05,  0,     0, 0
              0,    0.433, 0.567, 0, 0
              0,    0.475, 0.525, 0, 0
              0,    0,     0,     1, 0
            "/>
                        </filter>
                    </defs>
                </svg>
            )}
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}

