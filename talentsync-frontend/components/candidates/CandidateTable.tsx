import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, ChevronsUpDown, Star } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CandidateListItem } from '@/types/candidate-list';
import { CandidateDetailSheet } from './CandidateDetailSheet';
import { CandidateRowMenu } from './CandidateRowMenu';
import { CandidateMobileCard } from './CandidateMobileCard';
import { stageLabels, stageColors, getInitials } from '@/lib/candidate-constants';
import { UserRole } from '@/types/navigation';
import { cn } from '@/lib/utils';
import { EditableSelect } from '@/components/ui/editable-select';

interface CandidateTableProps {
  candidates: CandidateListItem[];
  selectedIds: string[];
  userRole: UserRole;
  onSelectionChange: (ids: string[]) => void;
  onChangeStage: (candidate: CandidateListItem) => void;
  onScheduleInterview: (candidate: CandidateListItem) => void;
  onSendEmail: (candidate: CandidateListItem) => void;
  onSendWhatsApp: (candidate: CandidateListItem) => void;
  onSendSMS: (candidate: CandidateListItem) => void;
  onDelete: (candidate: CandidateListItem) => void;
  /** Callback for inline updates */
  onUpdateCandidate?: (id: string, updates: Partial<CandidateListItem>) => Promise<void>;
}

type SortField = 'name' | 'stage' | 'role' | 'recruiter' | 'lastActivity' | 'dateAdded';
type SortDirection = 'asc' | 'desc';

// Stage options for EditableSelect
const stageOptions = Object.entries(stageLabels).map(([value, label]) => ({
  value,
  label,
  color: stageColors[value],
}));



export function CandidateTable({
  candidates,
  selectedIds,
  userRole,
  onSelectionChange,
  onChangeStage,
  onScheduleInterview,
  onSendEmail,
  onSendWhatsApp,
  onSendSMS,
  onDelete,
  onUpdateCandidate,
}: CandidateTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < candidates.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(candidates.map((c) => c.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'stage':
        comparison = a.stage.localeCompare(b.stage);
        break;
      case 'role':
        comparison = a.role.localeCompare(b.role);
        break;
      case 'recruiter':
        comparison = a.recruiterName.localeCompare(b.recruiterName);
        break;
      case 'lastActivity':
        comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
        break;
      case 'dateAdded':
        comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  // ... existing code ...

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const handleRowClick = (candidate: CandidateListItem, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('[role="checkbox"]') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }
    setSelectedCandidateId(candidate.id);
    setSheetOpen(true);
  };



  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Mobile View */}
      <div className="md:hidden">
        <div className="p-3 border-b border-border bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                }
              }}
              onCheckedChange={handleSelectAll}
              aria-label="Select all candidates"
            />
            <span className="text-sm font-medium text-muted-foreground">Select All</span>
          </div>
          {/* Add sort dropdown for mobile if needed later */}
        </div>

        <div className="divide-y divide-border">
          {sortedCandidates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No candidates found</p>
            </div>
          ) : (
            sortedCandidates.map((candidate) => (
              <CandidateMobileCard
                key={candidate.id}
                candidate={candidate}
                isSelected={selectedIds.includes(candidate.id)}
                userRole={userRole}
                onSelect={handleSelectOne}
                onClick={handleRowClick}
                onViewProfile={(c) => router.push(`/candidate/${c.id}`)}
                onScheduleInterview={onScheduleInterview}
                onChangeStage={onChangeStage}
                onSendEmail={onSendEmail}
                onSendWhatsApp={onSendWhatsApp}
                onSendSMS={onSendSMS}
                onDelete={onDelete}
                onUpdateCandidate={onUpdateCandidate}
                stageOptions={stageOptions}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[1800px]">
          <TableHeader className="sticky top-0 z-10 bg-muted/50">
            <TableRow className="hover:bg-transparent text-xs">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all candidates"
                />
              </TableHead>
              <TableHead className="w-16 text-center">Rating</TableHead>
              <TableHead className="w-32">Candidate ID</TableHead>
              <TableHead className="w-44">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Candidate Name
                  <SortIcon field="name" />
                </button>
              </TableHead>
              <TableHead className="w-36">
                <button
                  onClick={() => handleSort('stage')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Candidate Status
                  <SortIcon field="stage" />
                </button>
              </TableHead>
              <TableHead className="w-28">City</TableHead>
              <TableHead className="w-36">
                <button
                  onClick={() => handleSort('dateAdded')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Created Time
                  <SortIcon field="dateAdded" />
                </button>
              </TableHead>
              <TableHead className="w-36">
                <button
                  onClick={() => handleSort('lastActivity')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Modified Time
                  <SortIcon field="lastActivity" />
                </button>
              </TableHead>
              <TableHead className="w-28">Current Salary</TableHead>
              <TableHead className="w-36">Current Employer</TableHead>
              <TableHead className="w-28">Mobile</TableHead>
              <TableHead className="w-28">Associated Tags</TableHead>
              <TableHead className="w-36">
                <button
                  onClick={() => handleSort('role')}
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  Current Job Title
                  <SortIcon field="role" />
                </button>
              </TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-36">Highest Qualification</TableHead>
              <TableHead className="w-28">Expected Salary</TableHead>
              <TableHead className="w-24">Notice Period</TableHead>
              <TableHead className="w-48">Email</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCandidates.map((candidate) => {
              const isSelected = selectedIds.includes(candidate.id);
              const stageColor = stageColors[candidate.stage] || stageColors.received;
              const createdDate = candidate.dateAdded ? new Date(candidate.dateAdded) : null;
              const modifiedDate = candidate.modifiedTime ? new Date(candidate.modifiedTime) : (candidate.lastActivity ? new Date(candidate.lastActivity) : null);

              return (
                <TableRow
                  key={candidate.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted text-xs',
                    isSelected && 'bg-primary/5'
                  )}
                  onClick={(e) => handleRowClick(candidate, e)}
                >
                  {/* Checkbox */}
                  <TableCell className="py-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectOne(candidate.id)}
                      aria-label={`Select ${candidate.name}`}
                    />
                  </TableCell>

                  {/* Rating */}
                  <TableCell className="text-center py-2">
                    <div className="flex justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3 w-3",
                            (candidate.rating || 0) >= star
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </TableCell>

                  {/* Candidate ID */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {candidate.candidateId || `ZR_${candidate.id.slice(-6).toUpperCase()}_CAND`}
                    </span>
                  </TableCell>

                  {/* Candidate Name */}
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-primary hover:underline">{candidate.name}</span>
                    </div>
                  </TableCell>

                  {/* Candidate Status */}
                  <TableCell onClick={(e) => e.stopPropagation()} className="py-2">
                    {onUpdateCandidate && userRole !== 'interviewer' ? (
                      <EditableSelect
                        value={candidate.stage}
                        options={stageOptions}
                        onSave={async (newStage) => {
                          await onUpdateCandidate(candidate.id, { stage: newStage as any });
                        }}
                        fieldName="stage"
                        editable={true}
                      />
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn('cursor-pointer transition-colors text-xs', stageColor)}
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
                  </TableCell>

                  {/* City */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
                      {candidate.city || '-'}
                    </span>
                  </TableCell>

                  {/* Created Time */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {createdDate ? format(createdDate, 'dd/MM/yyyy hh:mm a') : '-'}
                    </span>
                  </TableCell>

                  {/* Modified Time */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {modifiedDate ? format(modifiedDate, 'dd/MM/yyyy hh:mm a') : '-'}
                    </span>
                  </TableCell>

                  {/* Current Salary */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {candidate.currentSalary || '-'}
                    </span>
                  </TableCell>

                  {/* Current Employer */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                      {candidate.currentEmployer || '-'}
                    </span>
                  </TableCell>

                  {/* Mobile */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {candidate.mobile || candidate.phone || '-'}
                    </span>
                  </TableCell>

                  {/* Associated Tags */}
                  <TableCell className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills?.slice(0, 2).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {(candidate.skills?.length || 0) > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{(candidate.skills?.length || 0) - 2}</span>
                      )}
                      {(!candidate.skills || candidate.skills.length === 0) && '-'}
                    </div>
                  </TableCell>

                  {/* Current Job Title */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                      {candidate.currentJobTitle || candidate.role || '-'}
                    </span>
                  </TableCell>

                  {/* Source */}
                  <TableCell className="py-2">
                    {candidate.source === 'ZOHO_CRM' || candidate.source === 'zoho' ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                        Zoho
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">{candidate.source || '-'}</span>
                    )}
                  </TableCell>

                  {/* Highest Qualification */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                      {candidate.highestQualification || '-'}
                    </span>
                  </TableCell>

                  {/* Expected Salary */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {candidate.expectedSalary || '-'}
                    </span>
                  </TableCell>

                  {/* Notice Period */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground">
                      {candidate.noticePeriod || '-'}
                    </span>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="py-2">
                    <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
                      {candidate.email || '-'}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-2">
                    <CandidateRowMenu
                      candidate={candidate}
                      userRole={userRole}
                      onViewProfile={(c) => router.push(`/candidate/${c.id}`)}
                      onScheduleInterview={onScheduleInterview}
                      onChangeStage={onChangeStage}
                      onSendEmail={onSendEmail}
                      onSendWhatsApp={onSendWhatsApp}
                      onSendSMS={onSendSMS}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {sortedCandidates.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No candidates found</p>
          </div>
        )}
      </div>
      <CandidateDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        candidateId={selectedCandidateId}
        onSchedule={(c) => onScheduleInterview(c as CandidateListItem)}
        onEdit={(id) => router.push(`/candidates/${id}/edit`)}
      />
    </div>
  );
}
