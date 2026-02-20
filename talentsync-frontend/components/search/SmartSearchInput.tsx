"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, User, Briefcase, Tag, Clock, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { client } from '@/lib/api/client';
import { BooleanSearchHelp } from './BooleanSearchHelp';

interface SearchSuggestion {
    text: string;
    category: 'candidate' | 'skill' | 'role' | 'recent' | 'field';
    count?: number;
}

interface SmartSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    searchMode?: 'simple' | 'boolean';
    onSearchModeChange?: (mode: 'simple' | 'boolean') => void;
    placeholder?: string;
    className?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    candidate: <User className="h-3.5 w-3.5" />,
    skill: <Tag className="h-3.5 w-3.5" />,
    role: <Briefcase className="h-3.5 w-3.5" />,
    recent: <Clock className="h-3.5 w-3.5" />,
    field: <ChevronRight className="h-3.5 w-3.5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
    candidate: 'Candidates',
    skill: 'Skills',
    role: 'Roles',
    recent: 'Recent',
    field: 'Fields',
};

export function SmartSearchInput({
    value,
    onChange,
    searchMode = 'simple',
    onSearchModeChange,
    placeholder,
    className,
}: SmartSearchInputProps) {
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentSearches');
        if (stored) {
            setRecentSearches(JSON.parse(stored));
        }
    }, []);

    // Save search to recent
    const saveRecentSearch = useCallback((search: string) => {
        if (!search || search.length < 3) return;
        const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    }, [recentSearches]);

    // Fetch suggestions from API with debounce
    useEffect(() => {
        if (!value || value.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const result = await client.get<SearchSuggestion[]>('/api/v1/candidates/search/suggestions', {
                    params: { q: value, limit: 10 }
                });
                setSuggestions(result as SearchSuggestion[]);
                setIsOpen(true);
                setSelectedIndex(-1);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                setSuggestions([]);
            }
            setLoading(false);
        }, 200);

        return () => clearTimeout(timer);
    }, [value]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    handleSelectSuggestion(suggestions[selectedIndex]);
                } else if (value) {
                    saveRecentSearch(value);
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
        const newValue = suggestion.text;
        onChange(newValue);
        saveRecentSearch(newValue);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                !inputRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Group suggestions by category
    const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
        if (!acc[suggestion.category]) {
            acc[suggestion.category] = [];
        }
        acc[suggestion.category].push(suggestion);
        return acc;
    }, {} as Record<string, SearchSuggestion[]>);

    const defaultPlaceholder = searchMode === 'boolean'
        ? 'e.g. python AND java, skills:react, "senior developer"...'
        : 'Search candidates, skills, roles...';

    return (
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => value.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
                placeholder={placeholder || defaultPlaceholder}
                className={cn(
                    "pl-10 pr-24 bg-background",
                    searchMode === 'boolean' && "ring-1 ring-primary/30",
                    className
                )}
            />

            {/* Mode toggle and help */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {searchMode === 'boolean' && <BooleanSearchHelp />}
                {onSearchModeChange && (
                    <button
                        onClick={() => onSearchModeChange(searchMode === 'boolean' ? 'simple' : 'boolean')}
                        className={cn(
                            "h-7 px-2 text-xs gap-1 rounded-md flex items-center transition-colors",
                            searchMode === 'boolean'
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                        )}
                    >
                        <Sparkles className="h-3 w-3" />
                        {searchMode === 'boolean' ? 'Advanced' : 'Simple'}
                    </button>
                )}
            </div>

            {/* Suggestions dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                    {Object.entries(groupedSuggestions).map(([category, items]) => (
                        <div key={category}>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2">
                                {CATEGORY_ICONS[category]}
                                {CATEGORY_LABELS[category] || category}
                            </div>
                            {items.map((suggestion, index) => {
                                const globalIndex = suggestions.indexOf(suggestion);
                                return (
                                    <button
                                        key={`${category}-${index}`}
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/50 transition-colors",
                                            globalIndex === selectedIndex && "bg-muted"
                                        )}
                                    >
                                        <span>{suggestion.text}</span>
                                        {suggestion.count && (
                                            <span className="text-xs text-muted-foreground">
                                                {suggestion.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* Loading indicator */}
            {loading && (
                <div className="absolute right-24 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

