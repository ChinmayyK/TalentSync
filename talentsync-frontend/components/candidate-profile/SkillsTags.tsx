import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRole } from '@/types/candidate';

interface SkillsTagsProps {
  tags: string[];
  userRole: UserRole;
  isLoading?: boolean;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function SkillsTags({ tags, userRole, isLoading, onAddTag, onRemoveTag }: SkillsTagsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const canEdit = userRole !== 'interviewer';

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim());
      setNewTag('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTag('');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Skills & Tags</h2>
        {canEdit && !isAdding && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAdding(true)}
            className="gap-1 h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-xs group pr-1.5"
            >
              {tag}
              {canEdit && (
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}

          {isAdding && (
            <div className="flex items-center gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tag..."
                className="h-7 w-24 text-xs"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={handleAddTag}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => {
                  setIsAdding(false);
                  setNewTag('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {tags.length === 0 && !isAdding && (
            <p className="text-sm text-muted-foreground">No tags added</p>
          )}
        </div>
      </div>
    </div>
  );
}
