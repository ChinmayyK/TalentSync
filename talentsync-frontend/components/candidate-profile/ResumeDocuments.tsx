import { format, parseISO } from 'date-fns';
import { FileText, Download, ExternalLink, Upload, File, Image, Award, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CandidateDocument, UserRole } from '@/types/candidate';
import { cn } from '@/lib/utils';

interface ResumeDocumentsProps {
  documents: CandidateDocument[];
  userRole: UserRole;
  isLoading?: boolean;
  error?: string;
  onUpload: () => void;
}

const documentIcons: Record<string, typeof FileText> = {
  resume: FileText,
  cover_letter: File,
  portfolio: Image,
  certificate: Award,
  other: File,
};

const documentLabels: Record<string, string> = {
  resume: 'Resume',
  cover_letter: 'Cover Letter',
  portfolio: 'Portfolio',
  certificate: 'Certificate',
  other: 'Document',
};

export function ResumeDocuments({ documents, userRole, isLoading, error, onUpload }: ResumeDocumentsProps) {
  const canEdit = userRole !== 'interviewer';
  const resume = documents.find((d) => d.type === 'resume');
  const otherDocs = documents.filter((d) => d.type !== 'resume');

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Resume & Documents</h2>
        </div>
        <div className="p-5 flex flex-col items-center justify-center py-8">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">Failed to load documents</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Resume & Documents</h2>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={onUpload} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        )}
      </div>
      <div className="p-5 space-y-5">
        {/* Resume Preview */}
        {resume ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resume</p>
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Inline PDF Preview */}
              <div className="bg-muted/30 h-48 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">{resume.name}</p>
                  <p className="text-xs text-muted-foreground">{resume.size}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border-t border-border bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Uploaded {format(parseISO(resume.uploadedAt), 'MMM d, yyyy')}
                </span>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={resume.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Open in new tab</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={resume.url} download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resume</p>
            <div className="flex items-center justify-center p-8 rounded-lg border border-dashed border-border">
              <div className="text-center">
                <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No resume uploaded</p>
                {canEdit && (
                  <Button variant="link" size="sm" onClick={onUpload} className="mt-2">
                    Upload Resume
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other Documents */}
        {otherDocs.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Other Documents ({otherDocs.length})
              </p>
              <div className="space-y-2">
                {otherDocs.map((doc) => {
                  const Icon = documentIcons[doc.type] || File;
                  return (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {documentLabels[doc.type]} · {doc.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={doc.url} download>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {otherDocs.length === 0 && resume && (
          <>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-center p-4 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">No additional documents</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
