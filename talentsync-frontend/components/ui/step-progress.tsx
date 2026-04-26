'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
    id: string | number;
    label: string;
    description?: string;
}

interface StepProgressProps {
    /** Steps to display */
    steps: Step[];
    /** Current active step (0-indexed) */
    currentStep: number;
    /** Called when a step is clicked (optional) */
    onStepClick?: (stepIndex: number) => void;
    /** Orientation */
    orientation?: 'horizontal' | 'vertical';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Step progress indicator for multi-step flows
 * Shows completed, current, and upcoming steps
 */
export function StepProgress({
    steps,
    currentStep,
    onStepClick,
    orientation = 'horizontal',
    size = 'md',
}: StepProgressProps) {
    const isHorizontal = orientation === 'horizontal';

    const sizeClasses = {
        sm: { circle: 'h-6 w-6 text-xs', text: 'text-xs', gap: 'gap-1' },
        md: { circle: 'h-8 w-8 text-sm', text: 'text-sm', gap: 'gap-2' },
        lg: { circle: 'h-10 w-10 text-base', text: 'text-base', gap: 'gap-3' },
    };

    const sizes = sizeClasses[size];

    return (
        <div
            className={cn(
                'flex',
                isHorizontal ? 'flex-row items-center' : 'flex-col',
                sizes.gap
            )}
            role="navigation"
            aria-label="Progress"
        >
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isClickable = onStepClick && index <= currentStep;

                return (
                    <React.Fragment key={step.id}>
                        {/* Step */}
                        <div
                            className={cn(
                                'flex items-center',
                                isHorizontal ? 'flex-col' : 'flex-row',
                                sizes.gap
                            )}
                        >
                            {/* Circle */}
                            <button
                                type="button"
                                onClick={() => isClickable && onStepClick?.(index)}
                                disabled={!isClickable}
                                className={cn(
                                    'flex items-center justify-center rounded-full border-2 font-medium transition-all duration-200',
                                    sizes.circle,
                                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                                    isCurrent && 'border-primary text-primary bg-primary/10',
                                    !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground',
                                    isClickable && 'cursor-pointer hover:scale-110',
                                    !isClickable && 'cursor-default'
                                )}
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                {isCompleted ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </button>

                            {/* Label */}
                            <div className={cn(
                                'text-center',
                                isHorizontal ? 'max-w-[80px]' : 'ml-3 text-left'
                            )}>
                                <p className={cn(
                                    'font-medium leading-tight',
                                    sizes.text,
                                    isCurrent && 'text-primary',
                                    !isCurrent && !isCompleted && 'text-muted-foreground'
                                )}>
                                    {step.label}
                                </p>
                                {step.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                                        {step.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Connector */}
                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    'transition-colors duration-200',
                                    isHorizontal
                                        ? 'flex-1 h-0.5 min-w-[20px]'
                                        : 'w-0.5 min-h-[20px] ml-4',
                                    index < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                                )}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export default StepProgress;
