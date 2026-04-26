'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBorderButtonProps {
    text?: string;
    onClick?: () => void;
    className?: string;
}

export const AnimatedBorderButton: React.FC<AnimatedBorderButtonProps> = ({
    text = 'Hover Me',
    onClick,
    className,
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                'bg-white text-blue-600 border border-blue-500 border-b-4 font-medium overflow-hidden relative px-4 py-2 rounded-md hover:brightness-110 hover:border-t-4 hover:border-b active:opacity-75 outline-none duration-300 group shadow-sm',
                className
            )}
        >
            <span className="bg-blue-500 shadow-blue-500 absolute -top-[150%] left-0 inline-flex w-80 h-[5px] rounded-md opacity-50 group-hover:top-[150%] duration-500 shadow-[0_0_10px_10px_rgba(0,0,0,0.3)]" />
            {text}
        </button>
    );
};
