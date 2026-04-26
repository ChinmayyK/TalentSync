import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableSelect } from '@/components/ui/editable-select';
import { cn } from '@/lib/utils';
import { CandidateListItem } from '@/types/candidate-list';
import { formatDistanceToNow } from 'date-fns';
import { CandidateRowMenu } from './CandidateRowMenu';
import { UserRole } from '@/types/navigation';
import { stageColors, stageLabels, getInitials } from '@/lib/candidate-constants';

interface CandidateMobileCardProps {
    candidate: CandidateListItem;
    isSelected: boolean;
    userRole: UserRole;
    onSelect: (id: string) => void;
    onClick: (candidate: CandidateListItem, e: React.MouseEvent) => void;
    onViewProfile: (c: CandidateListItem) => void;
    onScheduleInterview: (c: CandidateListItem) => void;
    onChangeStage: (c: CandidateListItem) => void;
    onSendEmail: (c: CandidateListItem) => void;
    onSendWhatsApp: (c: CandidateListItem) => void;
    onSendSMS: (c: CandidateListItem) => void;
    onDelete: (c: CandidateListItem) => void;
    onUpdateCandidate?: (id: string, updates: Partial<CandidateListItem>) => Promise<void>;
    stageOptions: { value: string; label: string; color: string }[];
}

export function CandidateMobileCard({
    candidate,
    isSelected,
    userRole,
    onSelect,
    onClick,
    onViewProfile,
    onScheduleInterview,
    onChangeStage,
    onSendEmail,
    onSendWhatsApp,
    onSendSMS,
    onDelete,
    onUpdateCandidate,
    stageOptions
}: CandidateMobileCardProps) {
    const stageColor = stageColors[candidate.stage] || stageColors.received;

    return (
        <div
            className={cn(
                "bg-card p-4 border-b border-border last:border-0",
                isSelected && "bg-primary/5"
            )}
            onClick={(e) => onClick(candidate, e)}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelect(candidate.id)}
                        className="mt-1"
                    />
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(candidate.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-foreground">{candidate.name}</h3>
                            <p className="text-sm text-muted-foreground">{candidate.role}</p>
                        </div>
                    </div>
                </div>

                <CandidateRowMenu
                    candidate={candidate}
                    userRole={userRole}
                    onViewProfile={onViewProfile}
                    onScheduleInterview={onScheduleInterview}
                    onChangeStage={onChangeStage}
                    onSendEmail={onSendEmail}
                    onSendWhatsApp={onSendWhatsApp}
                    onSendSMS={onSendSMS}
                    onDelete={onDelete}
                />
            </div>

            <div className="pl-[2.75rem] space-y-3">
                <div className="flex items-center justify-between">
                    {onUpdateCandidate && userRole !== 'interviewer' ? (
                        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[180px]">
                            <EditableSelect
                                value={candidate.stage}
                                options={stageOptions}
                                onSave={async (newStage) => {
                                    await onUpdateCandidate(candidate.id, { stage: newStage as any });
                                }}
                                fieldName="stage"
                                editable={true}
                            />
                        </div>
                    ) : (
                        <Badge
                            variant="outline"
                            className={cn('cursor-pointer transition-colors', stageColor)}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (userRole !== 'interviewer') {
                                    onChangeStage(candidate);
                                }
                            }}
                        >
                            {stageLabels[candidate.stage]}
                        </Badge>
                    )}

                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(candidate.lastActivity), { addSuffix: true })}
                    </span>
                </div>
            </div>
        </div>
    );
}
