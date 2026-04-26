'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { cn } from '@/lib/utils';
import {
    Search,
    Command,
    ArrowRight,
    Clock,
    TrendingUp,
    Hash,
    Sparkles,
    X,
} from 'lucide-react';
import { NavGroup } from '@/types/navigation';

interface SearchItem {
    id: string;
    title: string;
    description?: string;
    path: string;
    icon: React.ReactNode;
    category: string;
    keywords?: string[];
    badge?: string;
}

interface SidebarSearchProps {
    mainNav: NavGroup;
    adminNav: NavGroup;
    othersNav: NavGroup;
    clientRelatedNav: NavGroup;
    recruiterRelatedNav: NavGroup;
    collapsed: boolean;
}

export function SidebarSearch({
    mainNav,
    adminNav,
    othersNav,
    clientRelatedNav,
    recruiterRelatedNav,
    collapsed,
}: SidebarSearchProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Build searchable items from all nav groups
    const allItems = useMemo(() => {
        const items: SearchItem[] = [];

        const addItems = (group: NavGroup, category: string) => {
            group.items.forEach((item) => {
                items.push({
                    id: item.path || '',
                    title: item.title || '',
                    description: `Navigate to ${item.title}`,
                    path: item.path || '',
                    icon: <Hash className="w-4 h-4" />,
                    category,
                    keywords: [item.title?.toLowerCase() || '', category.toLowerCase()],
                    badge: item.badge ? String(item.badge) : undefined,
                });

                // Add "Add" path if exists
                if (item.addPath) {
                    items.push({
                        id: item.addPath,
                        title: `Add ${item.title}`,
                        description: `Create new ${item.title.toLowerCase()}`,
                        path: item.addPath,
                        icon: <Sparkles className="w-4 h-4" />,
                        category,
                        keywords: ['add', 'create', 'new', item.title.toLowerCase()],
                    });
                }
            });
        };

        addItems(mainNav, 'Main');
        addItems(adminNav, 'Admin');
        addItems(othersNav, 'Others');
        addItems(clientRelatedNav, 'Client Related');
        addItems(recruiterRelatedNav, 'Recruiter Related');

        return items;
    }, [mainNav, adminNav, othersNav, clientRelatedNav, recruiterRelatedNav]);

    // Initialize Fuse.js for fuzzy search
    const fuse = useMemo(() => {
        return new Fuse(allItems, {
            keys: [
                { name: 'title', weight: 0.5 },
                { name: 'category', weight: 0.2 },
                { name: 'keywords', weight: 0.2 },
                { name: 'description', weight: 0.1 },
            ],
            threshold: 0.4, // Lower = more strict, 0.4 allows for typos
            distance: 100,
            minMatchCharLength: 1,
            includeScore: true,
            ignoreLocation: true,
        });
    }, [allItems]);

    // Fuzzy search with Fuse.js
    const filteredItems = useMemo(() => {
        if (!query.trim()) return [];

        const results = fuse.search(query);
        return results
            .map((result) => result.item)
            .slice(0, 8); // Limit results
    }, [query, fuse]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
            } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
                e.preventDefault();
                handleNavigate(filteredItems[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                setQuery('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex]);

    // Click outside to close
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

    // Global keyboard shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleGlobalShortcut = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                inputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleGlobalShortcut);
        return () => window.removeEventListener('keydown', handleGlobalShortcut);
    }, []);

    const handleNavigate = (item: SearchItem) => {
        // Add to recent searches
        setRecentSearches((prev) => {
            const updated = [item.title, ...prev.filter((s) => s !== item.title)].slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(updated));
            return updated;
        });

        router.push(item.path);
        setIsOpen(false);
        setQuery('');
    };

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('recentSearches');
        if (stored) {
            setRecentSearches(JSON.parse(stored));
        }
    }, []);

    if (collapsed) return null;

    const showRecent = isOpen && !query.trim() && recentSearches.length > 0;
    const showResults = isOpen && query.trim() && filteredItems.length > 0;
    const showNoResults = isOpen && query.trim() && filteredItems.length === 0;

    return (
        <div className="px-4 py-3 border-b border-slate-100" ref={dropdownRef}>
            {/* Search Input */}
            <div className="relative">
                <button
                    onClick={() => {
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                    className={cn(
                        'w-full group relative overflow-hidden',
                        'bg-gradient-to-br from-slate-50 to-slate-100/50',
                        'border border-slate-200 rounded-xl',
                        'px-3 py-2.5 transition-all duration-300',
                        'hover:shadow-md hover:shadow-slate-200/50',
                        'hover:border-slate-300',
                        'focus-within:ring-2 focus-within:ring-indigo-500/20',
                        'focus-within:border-indigo-300',
                        isOpen && 'ring-2 ring-indigo-500/20 border-indigo-300 shadow-md'
                    )}
                >
                    {/* Shimmer effect */}
                    <div
                        className={cn(
                            'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700',
                            'bg-gradient-to-r from-transparent via-white/60 to-transparent',
                            'animate-shimmer'
                        )}
                        style={{ backgroundSize: '200% 100%' }}
                    />

                    <div className="relative flex items-center gap-2">
                        {/* Search Icon */}
                        <Search
                            className={cn(
                                'w-4 h-4 transition-colors duration-200',
                                isOpen ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                        />

                        {/* Input */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            onFocus={() => setIsOpen(true)}
                            placeholder="Search or jump to..."
                            className={cn(
                                'flex-1 bg-transparent border-0 outline-none',
                                'text-sm text-slate-700 placeholder:text-slate-400',
                                'focus:placeholder:text-slate-500'
                            )}
                        />

                        {/* Keyboard Shortcut Badge */}
                        {!isOpen && (
                            <div className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 whitespace-nowrap">
                                <Command className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-500 font-medium">K</span>
                            </div>
                        )}

                        {/* Clear Button */}
                        {query && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuery('');
                                    inputRef.current?.focus();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation();
                                        setQuery('');
                                        inputRef.current?.focus();
                                    }
                                }}
                                className="p-1 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                                <X className="w-3 h-3 text-slate-400" />
                            </span>
                        )}
                    </div>
                </button>

                {/* Dropdown Results */}
                {isOpen && (
                    <div
                        className={cn(
                            'absolute top-full left-0 right-0 mt-2 z-50',
                            'bg-white rounded-xl border border-slate-200',
                            'shadow-xl shadow-slate-200/50',
                            'overflow-hidden',
                            'animate-in fade-in slide-in-from-top-2 duration-200'
                        )}
                    >
                        {/* Recent Searches */}
                        {showRecent && (
                            <div className="p-2">
                                <div className="px-3 py-2 flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Recent
                                    </span>
                                </div>
                                {recentSearches.map((search, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            const item = allItems.find((i) => i.title === search);
                                            if (item) handleNavigate(item);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left flex items-center gap-2"
                                    >
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="text-sm text-slate-700">{search}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Search Results */}
                        {showResults && (
                            <div className="p-2 max-h-80 overflow-y-auto">
                                <div className="px-3 py-2 flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Results ({filteredItems.length})
                                    </span>
                                </div>
                                {filteredItems.map((item, index) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavigate(item)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={cn(
                                            'w-full px-3 py-2.5 rounded-lg transition-all duration-150',
                                            'flex items-center gap-3 text-left group/item',
                                            index === selectedIndex
                                                ? 'bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm'
                                                : 'hover:bg-slate-50'
                                        )}
                                        style={{
                                            transitionDelay: `${index * 20}ms`,
                                        }}
                                    >
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                'p-1.5 rounded-md transition-all',
                                                index === selectedIndex
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                                    : 'bg-slate-100 text-slate-600 group-hover/item:bg-slate-200'
                                            )}
                                        >
                                            {item.icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        'text-sm font-medium truncate',
                                                        index === selectedIndex ? 'text-slate-900' : 'text-slate-700'
                                                    )}
                                                >
                                                    {item.title}
                                                </span>
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{item.description}</p>
                                        </div>

                                        {/* Category & Arrow */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400 hidden sm:block">{item.category}</span>
                                            <ArrowRight
                                                className={cn(
                                                    'w-4 h-4 transition-all',
                                                    index === selectedIndex
                                                        ? 'text-indigo-600 translate-x-0 opacity-100'
                                                        : 'text-slate-400 -translate-x-1 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100'
                                                )}
                                            />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* No Results */}
                        {showNoResults && (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Search className="w-5 h-5 text-slate-400" />
                                </div>
                                <p className="text-sm font-medium text-slate-700 mb-1">No results found</p>
                                <p className="text-xs text-slate-500">
                                    Try searching for &quot;dashboard&quot;, &quot;users&quot;, or &quot;settings&quot;
                                </p>
                            </div>
                        )}

                        {/* Footer Hint */}
                        {(showResults || showRecent) && (
                            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">↑↓</kbd>
                                        Navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">↵</kbd>
                                        Select
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs">Esc</kbd>
                                        Close
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Shimmer animation */}
            <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
        </div>
    );
}
