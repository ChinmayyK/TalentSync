'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CandidateListItem } from '@/types/candidate-list';
import { formatDistanceToNow } from 'date-fns';
import { GripVertical } from 'lucide-react';

interface BoardCardProps {
    candidate: CandidateListItem;
    onClick?: (candidate: CandidateListItem) => void;
}

export function BoardCard({ candidate, onClick }: BoardCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: candidate.id, data: { candidate } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const initials = candidate.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div ref={setNodeRef} style={style} className="mb-3 touch-none group">
            <Card
                className={`
                    hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer 
                    bg-card/95 backdrop-blur-sm border-border/60
                    ${isDragging ? 'shadow-xl border-primary/50 ring-2 ring-primary/10 rotate-2 scale-[1.02] z-50' : ''}
                `}
                onClick={() => onClick?.(candidate)}
            >
                <CardHeader className="p-3.5 pb-2 flex flex-row items-start justify-between space-y-0">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-9 w-9 border border-border/50 shadow-sm shrink-0">
                            <AvatarFallback className="text-xs font-semibold bg-primary/5 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 min-w-0">
                            <CardTitle className="text-sm font-semibold leading-tight truncate pr-1">
                                {candidate.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground truncate font-medium">
                                {candidate.role}
                            </p>
                        </div>
                    </div>

                    {/* Grip handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="text-border hover:text-muted-foreground cursor-grab active:cursor-grabbing p-1.5 -mr-1.5 -mt-1.5 hover:bg-muted/50 rounded-md transition-colors"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                </CardHeader>

                <CardContent className="p-3.5 pt-1">
                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-3.5">
                        {candidate.skills.slice(0, 3).map((skill) => (
                            <Badge
                                key={skill}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-5 bg-secondary/50 hover:bg-secondary/80 border-transparent text-secondary-foreground font-normal"
                            >
                                {skill}
                            </Badge>
                        ))}
                        {candidate.skills.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-dashed text-muted-foreground font-normal">
                                +{candidate.skills.length - 3}
                            </Badge>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
                        <div className="flex items-center gap-2">
                            {candidate.source === 'ZOHO_CRM' || candidate.source === 'zoho' ? (
                                <Badge variant="outline" className="bg-red-50/50 text-red-700 border-red-200/60 text-[10px] px-1.5 py-0 h-5 font-normal">
                                    Zoho Recruit
                                </Badge>
                            ) : (
                                <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 bg-muted/30 rounded-full capitalize">
                                    {candidate.source}
                                </span>
                            )}
                        </div>

                        <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <span>{formatDistanceToNow(new Date(candidate.lastActivity))} ago</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

