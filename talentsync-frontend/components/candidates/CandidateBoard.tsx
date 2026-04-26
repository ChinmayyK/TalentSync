'use client';

import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
} from '@dnd-kit/core';
import { useState } from 'react';
import { CandidateListItem } from '@/types/candidate-list';
import { InterviewStage } from '@/types/interview';
import { BoardColumn } from './BoardColumn';
import { BoardCard } from './BoardCard';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { CandidateDetailSheet } from './CandidateDetailSheet';

interface CandidateBoardProps {
    candidates: CandidateListItem[];
    onStageChange: (candidateId: string, newStage: InterviewStage) => void;
    onCandidateClick?: (candidate: CandidateListItem) => void;
}

const COLUMNS: { id: InterviewStage; title: string }[] = [
    { id: 'applied', title: 'Applied' },
    { id: 'screening', title: 'Screening' },
    { id: 'interview-1', title: 'Interview 1' },
    { id: 'interview-2', title: 'Interview 2' },
    { id: 'hr-round', title: 'HR Round' },
    { id: 'offer', title: 'Offer' },
];

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export function CandidateBoard({ candidates, onStageChange, onCandidateClick }: CandidateBoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
    const router = useRouter();

    const handleCardClick = (candidate: CandidateListItem) => {
        setSelectedCandidateId(candidate.id);
        setSheetOpen(true);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const candidateId = active.id as string;
        // The over.id will be the column ID (stage name) because we set droppable id to stage
        // OR it could be another card ID if dropping on top of a card. 
        // We need to robustly handle finding the target stage.

        let newStage = over.id as string;

        // If dropped on a card, find that card's stage?
        // Actually, BoardColumn uses droppable id = stage.
        // But SortableContext item uses candidate id.
        // So dropping ON a card means over.id is a candidate ID.
        // Dropping on empty space in column means over.id is stage ID.

        const overCandidate = candidates.find(c => c.id === over.id);
        if (overCandidate) {
            newStage = overCandidate.stage;
        }

        const activeCandidate = candidates.find(c => c.id === candidateId);

        if (activeCandidate && activeCandidate.stage !== newStage && COLUMNS.some(col => col.id === newStage)) {
            onStageChange(candidateId, newStage as InterviewStage);
        }
    };

    const activeCandidate = activeId ? candidates.find(c => c.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start">
                {COLUMNS.map((col) => (
                    <div key={col.id} className="min-w-[280px] h-full">
                        <BoardColumn
                            id={col.id}
                            title={col.title}
                            candidates={candidates.filter((c) => c.stage === col.id)}
                            onCardClick={handleCardClick}
                        />
                    </div>
                ))}
            </div>

            {typeof window !== 'undefined' && createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeCandidate && (
                        <BoardCard candidate={activeCandidate} />
                    )}
                </DragOverlay>,
                document.body
            )}

            <CandidateDetailSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                candidateId={selectedCandidateId}
                onEdit={(id) => router.push(`/candidates/${id}/edit`)}
            />
        </DndContext>
    );
}
