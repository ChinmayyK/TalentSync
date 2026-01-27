'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, LayoutDashboard, Shield, HelpCircle } from 'lucide-react';

type NavView = 'MAIN' | 'ADMIN' | 'OTHERS';

interface ViewOption {
    value: NavView;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
}

interface ViewSelectorProps {
    currentView: NavView;
    onViewChange: (view: NavView) => void;
    collapsed?: boolean;
}

const viewOptions: ViewOption[] = [
    {
        value: 'MAIN',
        label: 'Main Dashboard',
        description: 'Your primary workspace',
        icon: <LayoutDashboard className="w-4 h-4" />,
        color: 'text-blue-600',
        bgGradient: 'from-blue-500/10 to-cyan-500/10',
    },
    {
        value: 'ADMIN',
        label: 'Administration',
        description: 'Control panel & settings',
        icon: <Shield className="w-4 h-4" />,
        color: 'text-purple-600',
        bgGradient: 'from-purple-500/10 to-pink-500/10',
    },
    {
        value: 'OTHERS',
        label: 'Others & Help',
        description: 'Resources & support',
        icon: <HelpCircle className="w-4 h-4" />,
        color: 'text-emerald-600',
        bgGradient: 'from-emerald-500/10 to-teal-500/10',
    },
];

export function ViewSelector({ currentView, onViewChange, collapsed = false }: ViewSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentOption = viewOptions.find((opt) => opt.value === currentView) || viewOptions[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (view: NavView) => {
        onViewChange(view);
        setIsOpen(false);
    };

    if (collapsed) {
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'w-full group relative overflow-hidden',
                    'bg-gradient-to-br', currentOption.bgGradient,
                    'border border-slate-200/80 rounded-xl',
                    'px-4 py-3 transition-all duration-300',
                    'hover:shadow-lg hover:shadow-slate-200/50',
                    'hover:border-slate-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                    isOpen && 'ring-2 ring-blue-500/20 shadow-lg shadow-slate-200/50'
                )}
            >
                {/* Animated background glow */}
                <div
                    className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                        'bg-gradient-to-br from-white/50 to-transparent'
                    )}
                />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Icon with pulse animation */}
                        <div
                            className={cn(
                                'p-2 rounded-lg bg-white/80 backdrop-blur-sm',
                                'transition-transform duration-300',
                                'group-hover:scale-110',
                                isOpen && 'scale-110'
                            )}
                        >
                            <div className={currentOption.color}>{currentOption.icon}</div>
                        </div>

                        {/* Text */}
                        <div className="text-left">
                            <div className="text-sm font-semibold text-slate-800 leading-tight">
                                {currentOption.label}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{currentOption.description}</div>
                        </div>
                    </div>

                    {/* Chevron with rotation animation */}
                    <ChevronDown
                        className={cn(
                            'w-4 h-4 text-slate-400 transition-all duration-300',
                            'group-hover:text-slate-600',
                            isOpen && 'rotate-180 text-blue-600'
                        )}
                    />
                </div>
            </button>

            {/* Dropdown Menu */}
            <div
                className={cn(
                    'absolute top-full left-0 right-0 mt-2 z-50',
                    'transition-all duration-300 origin-top',
                    isOpen
                        ? 'opacity-100 scale-y-100 translate-y-0'
                        : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                )}
            >
                <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden backdrop-blur-xl">
                    {/* Dropdown items */}
                    <div className="p-1.5">
                        {viewOptions.map((option, index) => {
                            const isSelected = option.value === currentView;
                            const isLast = index === viewOptions.length - 1;

                            return (
                                <button
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'w-full group/item relative overflow-hidden',
                                        'rounded-lg px-3 py-2.5',
                                        'transition-all duration-200',
                                        'hover:bg-gradient-to-br',
                                        option.bgGradient,
                                        isSelected && 'bg-gradient-to-br shadow-sm',
                                        !isLast && 'mb-1'
                                    )}
                                    style={{
                                        transitionDelay: isOpen ? `${index * 30}ms` : '0ms',
                                    }}
                                >
                                    {/* Hover effect */}
                                    <div
                                        className={cn(
                                            'absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300',
                                            'bg-gradient-to-r from-white/40 to-transparent'
                                        )}
                                    />

                                    <div className="relative flex items-center gap-3">
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                'p-1.5 rounded-md transition-all duration-200',
                                                isSelected
                                                    ? 'bg-white/90 shadow-sm'
                                                    : 'bg-white/60 group-hover/item:bg-white/90 group-hover/item:shadow-sm'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    option.color,
                                                    'transition-transform duration-200',
                                                    'group-hover/item:scale-110'
                                                )}
                                            >
                                                {option.icon}
                                            </div>
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1 text-left">
                                            <div
                                                className={cn(
                                                    'text-sm font-medium leading-tight transition-colors',
                                                    isSelected ? 'text-slate-900' : 'text-slate-700 group-hover/item:text-slate-900'
                                                )}
                                            >
                                                {option.label}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">{option.description}</div>
                                        </div>

                                        {/* Selected indicator */}
                                        {isSelected && (
                                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

