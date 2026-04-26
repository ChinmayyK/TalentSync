'use client';

import { useAccessibility } from '@/lib/accessibility-context';
import {
    TextSize,
    LetterSpacing,
    ColorFilterType,
    CursorSettings,
} from '@/types/accessibility';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Volume2,
    Type,
    ZoomIn,
    ALargeSmall,
    Asterisk,
    Link2,
    Search,
    MousePointer2,
    Palette,
    AlertCircle,
    RotateCcw,
    Command,
} from 'lucide-react';

const textSizeOptions: { value: TextSize; label: string }[] = [
    { value: 'xs', label: 'Aa' },
    { value: 'sm', label: 'Aa' },
    { value: 'md', label: 'Aa' },
    { value: 'lg', label: 'Aa' },
    { value: 'xl', label: 'Aa' },
];

const letterSpacingOptions: { value: LetterSpacing; label: string }[] = [
    { value: 'tight', label: 'Tight' },
    { value: 'normal', label: 'Normal' },
    { value: 'wide', label: 'Wide' },
    { value: 'wider', label: 'Wider' },
    { value: 'widest', label: 'Widest' },
];

const colorFilterOptions: { value: ColorFilterType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
    { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
    { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' },
    { value: 'grayscale', label: 'Grayscale' },
    { value: 'high-contrast', label: 'High Contrast' },
];

const cursorSizeOptions: { value: CursorSettings['size']; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'Extra Large' },
];

const cursorColorOptions = [
    '#000000',
    '#ffffff',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
];

const errorColorOptions = [
    '#dc2626',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#000000',
];

export function AccessibilitySettingsPanel() {
    const { settings, updateSettings, resetSettings } = useAccessibility();

    return (
        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-6 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Accessibility Settings</h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetSettings}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                    </Button>
                </div>

                <Separator />

                {/* Screen Reader */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Volume2 className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Screen Reader</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Reads content out loud (only in live mode) and is compatible with screen reader extensions on your browser or computer.
                            </p>
                        </div>
                        <Switch
                            checked={settings.screenReaderEnabled}
                            onCheckedChange={(checked) =>
                                updateSettings({ screenReaderEnabled: checked })
                            }
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                        <Command className="h-3 w-3" />
                        <span>+</span>
                        <span className="font-mono">F5</span>
                    </div>
                </div>

                <Separator />

                {/* Text Size */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Type className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Text Size</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Choose your preferred text size for comfortable readability and visual clarity.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSettings({ textSize: 'md' })}
                            className="text-xs"
                        >
                            Reset
                        </Button>
                    </div>
                    <div className="flex items-center justify-between gap-1 bg-muted/50 rounded-lg p-1">
                        {textSizeOptions.map((option, index) => (
                            <button
                                key={option.value}
                                onClick={() => updateSettings({ textSize: option.value })}
                                className={cn(
                                    'flex-1 py-2 rounded-md transition-all font-serif',
                                    settings.textSize === option.value
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'hover:bg-muted'
                                )}
                                style={{
                                    fontSize: `${12 + index * 4}px`,
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Zoom */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <ZoomIn className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Zoom</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Zooms content only in the live mode from 25% to 150% and is compatible with your browser's zoom functionality.
                            </p>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                            {settings.zoomLevel}%
                        </span>
                    </div>
                    <Slider
                        value={[settings.zoomLevel]}
                        onValueChange={([value]) => updateSettings({ zoomLevel: value })}
                        min={25}
                        max={150}
                        step={5}
                        className="w-full"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                        <Command className="h-3 w-3" />
                        <span>+</span>
                        <span className="font-mono">+</span>
                        <span className="mx-1">/</span>
                        <Command className="h-3 w-3" />
                        <span>+</span>
                        <span className="font-mono">-</span>
                    </div>
                </div>

                <Separator />

                {/* Letter Spacing */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <ALargeSmall className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Letter Spacing</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Choose your preferred letter spacing for optimal readability and text clarity.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-1 bg-muted/50 rounded-lg p-1">
                        {letterSpacingOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => updateSettings({ letterSpacing: option.value })}
                                className={cn(
                                    'flex-1 py-2 px-2 rounded-md transition-all text-xs',
                                    settings.letterSpacing === option.value
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'hover:bg-muted'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Mandatory Fields Display Format */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Asterisk className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Mandatory Fields Display Format</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Choose your preferred format to visually indicate mandatory form fields.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateSettings({ mandatoryFieldFormat: 'asterisk' })}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all',
                                settings.mandatoryFieldFormat === 'asterisk'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted hover:border-muted-foreground/20'
                            )}
                        >
                            <Asterisk className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium">Asterisk</span>
                        </button>
                        <button
                            onClick={() => updateSettings({ mandatoryFieldFormat: 'text' })}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all',
                                settings.mandatoryFieldFormat === 'text'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted hover:border-muted-foreground/20'
                            )}
                        >
                            <span className="text-sm font-medium">Mandatory Text</span>
                        </button>
                    </div>
                    <div className="bg-muted/50 rounded-md px-3 py-2">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <div className="mt-1 text-sm">
                            Single Line{' '}
                            {settings.mandatoryFieldFormat === 'asterisk' ? (
                                <span className="text-destructive">*</span>
                            ) : (
                                <span className="text-destructive text-xs">(Mandatory)</span>
                            )}
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Underline Links */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Link2 className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Underline Links</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Adds an underline to hyperlinks for better visibility and accessibility.
                            </p>
                        </div>
                        <Switch
                            checked={settings.underlineLinks}
                            onCheckedChange={(checked) =>
                                updateSettings({ underlineLinks: checked })
                            }
                        />
                    </div>
                </div>

                <Separator />

                {/* Text Magnifier */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Text Magnifier</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Magnifies texts when hovering over it, with the following key pressed.
                            </p>
                        </div>
                        <Switch
                            checked={settings.textMagnifier.enabled}
                            onCheckedChange={(checked) =>
                                updateSettings({
                                    textMagnifier: { ...settings.textMagnifier, enabled: checked },
                                })
                            }
                        />
                    </div>
                    {settings.textMagnifier.enabled && (
                        <Select
                            value={settings.textMagnifier.modifier}
                            onValueChange={(value: 'option' | 'control' | 'shift') =>
                                updateSettings({
                                    textMagnifier: { ...settings.textMagnifier, modifier: value },
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select modifier key" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="option">Option</SelectItem>
                                <SelectItem value="control">Control</SelectItem>
                                <SelectItem value="shift">Shift</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <Separator />

                {/* Custom Cursor */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <MousePointer2 className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Custom Cursor</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Customize the size and color of your cursor for better visibility and easier tracking on the screen.
                            </p>
                        </div>
                        <Switch
                            checked={settings.customCursor.enabled}
                            onCheckedChange={(checked) =>
                                updateSettings({
                                    customCursor: { ...settings.customCursor, enabled: checked },
                                })
                            }
                        />
                    </div>
                    {settings.customCursor.enabled && (
                        <div className="space-y-4 pl-8">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Size</Label>
                                <Select
                                    value={settings.customCursor.size}
                                    onValueChange={(value: CursorSettings['size']) =>
                                        updateSettings({
                                            customCursor: { ...settings.customCursor, size: value },
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cursorSizeOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Color</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {cursorColorOptions.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() =>
                                                updateSettings({
                                                    customCursor: { ...settings.customCursor, color },
                                                })
                                            }
                                            className={cn(
                                                'w-8 h-8 rounded-full border-2 transition-all',
                                                settings.customCursor.color === color
                                                    ? 'border-primary scale-110'
                                                    : 'border-transparent hover:scale-105'
                                            )}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Color Filter */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Color Filter</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Modify screen colors to enhance visibility and assist color perception.
                            </p>
                        </div>
                        <Switch
                            checked={settings.colorFilter.enabled}
                            onCheckedChange={(checked) =>
                                updateSettings({
                                    colorFilter: { ...settings.colorFilter, enabled: checked },
                                })
                            }
                        />
                    </div>
                    {settings.colorFilter.enabled && (
                        <Select
                            value={settings.colorFilter.type}
                            onValueChange={(value: ColorFilterType) =>
                                updateSettings({
                                    colorFilter: { ...settings.colorFilter, type: value },
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select filter type" />
                            </SelectTrigger>
                            <SelectContent>
                                {colorFilterOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <Separator />

                {/* Error Message Display Format */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="font-medium">Error Message Display Format</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Customize the color of error messages or add an error icon for improved visibility and faster resolution.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4 pl-8">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Error message color</Label>
                            <div className="flex gap-2 flex-wrap">
                                {errorColorOptions.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() =>
                                            updateSettings({
                                                errorDisplay: { ...settings.errorDisplay, color },
                                            })
                                        }
                                        className={cn(
                                            'w-8 h-8 rounded-full border-2 transition-all',
                                            settings.errorDisplay.color === color
                                                ? 'border-primary scale-110'
                                                : 'border-transparent hover:scale-105'
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Show error icon with message</Label>
                            <Switch
                                checked={settings.errorDisplay.showIcon}
                                onCheckedChange={(checked) =>
                                    updateSettings({
                                        errorDisplay: { ...settings.errorDisplay, showIcon: checked },
                                    })
                                }
                            />
                        </div>
                        <div className="bg-muted/50 rounded-md px-3 py-2">
                            <Label className="text-xs text-muted-foreground">Preview</Label>
                            <div className="mt-2 space-y-1">
                                <div className="text-sm">
                                    Single Line{' '}
                                    {settings.mandatoryFieldFormat === 'asterisk' ? (
                                        <span className="text-destructive">*</span>
                                    ) : (
                                        <span className="text-destructive text-xs">(Mandatory)</span>
                                    )}
                                </div>
                                <div
                                    className="text-xs flex items-center gap-1"
                                    style={{ color: settings.errorDisplay.color }}
                                >
                                    {settings.errorDisplay.showIcon && (
                                        <AlertCircle className="h-3 w-3" />
                                    )}
                                    This field is mandatory.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
