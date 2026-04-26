'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedGetStartedButtonProps {
    text?: string;
    onClick?: () => void;
    className?: string;
}

export const AnimatedGetStartedButton: React.FC<AnimatedGetStartedButtonProps> = ({
    text = 'Get started',
    onClick,
    className,
}) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                'relative bg-blue-600 text-white font-medium text-[17px] px-4 py-[0.35em] pl-5 h-[2.8em] rounded-[0.9em] flex items-center overflow-hidden cursor-pointer shadow-[inset_0_0_1.6em_-0.6em_#1e40af] group',
                className
            )}
        >
            <span className="mr-10 transition-opacity duration-300 group-hover:opacity-0">{text}</span>
            <div className="absolute right-[0.3em] bg-white h-[2.2em] w-[2.2em] rounded-[0.7em] flex items-center justify-center transition-all duration-300 group-hover:w-[calc(100%-0.6em)] shadow-[0.1em_0.1em_0.6em_0.2em_#2563eb] active:scale-95">
                {/* Arrow icon - visible when not hovering */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    className="w-[1.1em] transition-all duration-300 text-blue-600 group-hover:opacity-0 group-hover:translate-x-[0.1em] absolute"
                >
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path
                        fill="currentColor"
                        d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z"
                    />
                </svg>

                {/* Sign Up text - visible when hovering */}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-blue-600 font-medium whitespace-nowrap">
                    Sign Up
                </span>
            </div>
        </button>
    );
};
