import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Send, Loader2, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { InterviewNote, UserRole } from '@/types/interview-details';
import { cn } from '@/lib/utils';

interface NotesSectionProps {
  notes: InterviewNote[];
  userRole: UserRole;
  isLoading?: boolean;
  error?: string;
  onAddNote: (content: string) => Promise<void>;
}

export function NotesSection({ notes, userRole, isLoading, error, onAddNote }: NotesSectionProps) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canAddNotes = userRole !== 'interviewer';

  const handleSubmit = async () => {
    if (!newNote.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Internal Notes</h2>
        {notes.length > 0 && (
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Add Note Form */}
        {canAddNotes && (
          <div className="mb-5">
            <Textarea
              placeholder="Add a note for the hiring team..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none bg-background"
              disabled={isSubmitting}
            />
            <div className="flex justify-end mt-2">
              <Button 
                onClick={handleSubmit} 
                disabled={!newNote.trim() || isSubmitting}
                size="sm"
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Add Note
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive">Failed to load notes</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet</p>
            {canAddNotes && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add notes visible only to the hiring team
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="flex gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-secondary-foreground">
                    {note.authorName.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>

                {/* Note Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{note.authorName}</p>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(note.createdAt), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
