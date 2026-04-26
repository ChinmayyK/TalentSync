import { X, ArrowRightCircle, Mail, Tag, UserPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CandidateBulkAction } from '@/types/candidate-list';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: CandidateBulkAction) => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedCount, onAction, onClearSelection }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-card rounded-lg shadow-lg border border-border px-4 py-3">
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('change-stage')}
            className="gap-2"
          >
            <ArrowRightCircle className="h-4 w-4" />
            Change Stage
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('add-tag')}
            className="gap-2"
          >
            <Tag className="h-4 w-4" />
            Add Tag
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('assign-recruiter')}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Assign Recruiter
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAction('delete')}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
