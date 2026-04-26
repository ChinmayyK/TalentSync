// Accessibility Types

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type LetterSpacing = 'tight' | 'normal' | 'wide' | 'wider' | 'widest';

export type MandatoryFieldFormat = 'asterisk' | 'text';

export type ColorFilterType =
    | 'none'
    | 'protanopia' // Red-blind
    | 'deuteranopia' // Green-blind
    | 'tritanopia' // Blue-blind
    | 'grayscale'
    | 'high-contrast';

export interface CursorSettings {
    enabled: boolean;
    size: 'small' | 'medium' | 'large' | 'xlarge';
    color: string;
}

export interface ErrorDisplaySettings {
    color: string;
    showIcon: boolean;
}

export interface AccessibilitySettings {
    // Screen Reader
    screenReaderEnabled: boolean;

    // Text Size (xs, sm, md, lg, xl)
    textSize: TextSize;

    // Zoom level (25% to 150%)
    zoomLevel: number;

    // Letter Spacing
    letterSpacing: LetterSpacing;

    // Mandatory Fields Display Format
    mandatoryFieldFormat: MandatoryFieldFormat;

    // Underline Links
    underlineLinks: boolean;

    // Text Magnifier
    textMagnifier: {
        enabled: boolean;
        modifier: 'option' | 'control' | 'shift';
    };

    // Custom Cursor
    customCursor: CursorSettings;

    // Color Filter
    colorFilter: {
        enabled: boolean;
        type: ColorFilterType;
    };

    // Error Message Display
    errorDisplay: ErrorDisplaySettings;
}

export const defaultAccessibilitySettings: AccessibilitySettings = {
    screenReaderEnabled: false,
    textSize: 'md',
    zoomLevel: 100,
    letterSpacing: 'normal',
    mandatoryFieldFormat: 'asterisk',
    underlineLinks: false,
    textMagnifier: {
        enabled: false,
        modifier: 'option',
    },
    customCursor: {
        enabled: false,
        size: 'medium',
        color: '#000000',
    },
    colorFilter: {
        enabled: false,
        type: 'none',
    },
    errorDisplay: {
        color: '#dc2626',
        showIcon: true,
    },
};

// Text size mappings
export const textSizeValues: Record<TextSize, string> = {
    xs: '0.875rem',
    sm: '0.9375rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
};

// Letter spacing mappings
export const letterSpacingValues: Record<LetterSpacing, string> = {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
};

// Cursor size mappings
export const cursorSizeValues: Record<CursorSettings['size'], number> = {
    small: 16,
    medium: 24,
    large: 32,
    xlarge: 48,
};
