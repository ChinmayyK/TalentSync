import { Button } from '@/components/ui/button';
import { Plus, Users, Upload, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface QuickActionsProps {
  onSchedule?: () => void;
  onBulkSchedule?: () => void;
  onAddCandidate?: () => void;
  onUpload?: () => void;
}

export function QuickActions({ onSchedule, onBulkSchedule, onAddCandidate, onUpload }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary Action */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={onSchedule} className="gap-1.5 sm:gap-2 shadow-sm text-sm" size="sm">
            <Calendar className="h-4 w-4" />
            <span className="hidden xs:inline">Schedule</span>
            <span className="hidden sm:inline"> Interview</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Schedule a new interview session</TooltipContent>
      </Tooltip>

      {/* Secondary Actions - hidden on very small screens */}
      <div className="hidden sm:flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onBulkSchedule} variant="secondary" className="gap-2" size="sm">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">Bulk Schedule</span>
              <span className="md:hidden">Bulk</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Schedule multiple interviews at once</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onAddCandidate} variant="secondary" className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">Add Candidate</span>
              <span className="md:hidden">Add</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add a new candidate to the pipeline</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onUpload} variant="outline" className="gap-2 border-dashed" size="sm">
              <Upload className="h-4 w-4" />
              <span className="hidden lg:inline">Import</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import candidates from spreadsheet</TooltipContent>
        </Tooltip>
      </div>

      {/* Mobile: icon-only buttons */}
      <div className="flex sm:hidden gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onBulkSchedule} variant="secondary" size="icon" className="h-8 w-8">
              <Users className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bulk Schedule</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onAddCandidate} variant="secondary" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Candidate</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onUpload} variant="outline" size="icon" className="h-8 w-8 border-dashed">
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import Candidates</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
