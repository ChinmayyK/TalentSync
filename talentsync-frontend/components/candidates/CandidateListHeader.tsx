import { Plus, Upload, FileText, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/navigation';

export type ViewType = 'list' | 'board';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface CandidateListHeaderProps {
  userRole: UserRole;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onAddCandidate: () => void;
  onUploadSpreadsheet: () => void;
  onUploadResume: () => void;
}

export function CandidateListHeader({
  userRole,
  view,
  onViewChange,
  onAddCandidate,
  onUploadSpreadsheet,
  onUploadResume,
}: CandidateListHeaderProps) {
  const canEdit = userRole !== 'interviewer';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Candidates</h1>
        <div className="h-8 w-px bg-border/60" />
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && onViewChange(v as ViewType)}>
          <ToggleGroupItem value="list" aria-label="List View" className="h-8 w-8 p-0">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="board" aria-label="Board View" className="h-8 w-8 p-0">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onAddCandidate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Candidate
          </Button>
          <Button variant="outline" onClick={onUploadSpreadsheet} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Spreadsheet
          </Button>
          <Button variant="ghost" onClick={onUploadResume} className="gap-2">
            <FileText className="h-4 w-4" />
            Upload Resume
          </Button>
        </div>
      )}
    </div>
  );
}
