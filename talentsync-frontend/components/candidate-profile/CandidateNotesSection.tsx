import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Send, ChevronDown, ChevronUp, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CandidateNote, UserRole } from '@/types/candidate';
import { cn } from '@/lib/utils';

interface CandidateNotesSectionProps {
  notes: CandidateNote[];
  userRole: UserRole;
  isLoading?: boolean;
  error?: string;
  onAddNote: (content: string) => void;
}

const MAX_NOTE_LENGTH = 150;

export function CandidateNotesSection({ notes, userRole, isLoading, error, onAddNote }: CandidateNotesSectionProps) {
  const [newNote, setNewNote] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const canEdit = userRole !== 'interviewer';

  const handleSubmit = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Internal Notes</h2>
        </div>
        <div className="p-5 flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Failed to load notes</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">Internal Notes</h2>
      </div>
      <div className="p-5 space-y-5">
        {/* Note Editor */}
        {canEdit && (
          <div className="space-y-3">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this candidate..."
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSubmit} 
                disabled={!newNote.trim()}
                size="sm"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Add Note
              </Button>
            </div>
          </div>
        )}

        {canEdit && notes.length > 0 && <div className="h-px bg-border" />}

        {/* Notes List */}
        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => {
              const isLong = note.content.length > MAX_NOTE_LENGTH;
              const isExpanded = expandedNotes.has(note.id);
              const displayContent = isLong && !isExpanded 
                ? note.content.slice(0, MAX_NOTE_LENGTH) + '...'
                : note.content;

              return (
                <div 
                  key={note.id}
                  className="p-4 rounded-lg border border-border bg-muted/20"
                >
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {displayContent}
                  </p>
                  
                  {isLong && (
                    <button
                      onClick={() => toggleNoteExpansion(note.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show more
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span className="font-medium">{note.authorName}</span>
                    <span>·</span>
                    <span>{format(parseISO(note.createdAt), 'MMM d, yyyy · h:mm a')}</span>
                    {note.updatedAt && (
                      <>
                        <span>·</span>
                        <span className="italic">edited</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canEdit ? 'Add the first note about this candidate' : 'No notes have been added'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
