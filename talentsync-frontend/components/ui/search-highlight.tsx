'use client';

import React from 'react';

interface SearchHighlightProps {
    /** Text to display */
    text: string;
    /** Search query to highlight */
    query: string;
    /** Class for highlighted portion */
    highlightClassName?: string;
}

/**
 * Component to highlight matching search text in results
 * Improves scanning and identification of matches
 */
export function SearchHighlight({
    text,
    query,
    highlightClassName = 'bg-yellow-200 text-yellow-900 rounded px-0.5',
}: SearchHighlightProps) {
    if (!query || !query.trim()) {
        return <>{text}</>;
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                const isMatch = regex.test(part);
                // Reset lastIndex after test
                regex.lastIndex = 0;

                return isMatch ? (
                    <mark key={index} className={highlightClassName}>
                        {part}
                    </mark>
                ) : (
                    <React.Fragment key={index}>{part}</React.Fragment>
                );
            })}
        </>
    );
}

export default SearchHighlight;
