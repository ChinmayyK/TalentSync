import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
    SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    FileText,
    Clock,
    MoreHorizontal,
    Edit,
    Trash
} from 'lucide-react';
import { useCandidate } from '@/lib/hooks/useCandidates';
import { getInitials, stageLabels, stageColors } from '@/lib/candidate-constants';
import { format } from 'date-fns';
import { CandidateListItem } from '@/types/candidate-list';

interface CandidateDetailSheetProps {
    candidateId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (id: string) => void;
    onSchedule?: (candidate: any) => void;
}

export function CandidateDetailSheet({
    candidateId,
    open,
    onOpenChange,
    onEdit,
    onSchedule
}: CandidateDetailSheetProps) {
    const router = useRouter();
    const { data: candidate, isLoading } = useCandidate(candidateId || '');

    if (!candidateId) return null;

    const handleViewFullProfile = () => {
        onOpenChange(false);
        router.push(`/candidates/${candidateId}`);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 gap-0">
                {/* Visually hidden title for accessibility */}
                <SheetTitle className="sr-only">Candidate Details</SheetTitle>
                {isLoading ? (
                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : candidate ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-border bg-muted/10">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                            {getInitials(candidate.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-xl font-semibold text-foreground">{candidate.name}</h2>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                            <Briefcase className="h-3.5 w-3.5" />
                                            {candidate.roleTitle || 'No Role'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline" className={stageColors[candidate.stage]}>
                                        {stageLabels[candidate.stage]}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-6">
                                <Button size="sm" onClick={() => onSchedule?.(candidate)} className="flex-1">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Schedule
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onEdit?.(candidate.id)} className="flex-1">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                                <Button size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Content */}
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <Tabs defaultValue="overview" className="w-full">
                                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent mb-6">
                                        <TabsTrigger
                                            value="overview"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                                        >
                                            Overview
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="notes"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                                        >
                                            Notes
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="history"
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                                        >
                                            History
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="overview" className="space-y-6 mt-0">
                                        {/* Contact Info */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-medium text-foreground">Contact Information</h3>
                                            <div className="grid gap-3">
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">
                                                        {candidate.email || 'No email provided'}
                                                    </a>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-foreground">{candidate.phone || 'No phone provided'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">
                                                        Added {format(new Date(candidate.createdAt), 'MMM d, yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Skills */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-foreground">Skills</h3>
                                            <div className="flex flex-wrap gap-1.5">
                                                {candidate.tags && candidate.tags.length > 0 ? (
                                                    candidate.tags.map((tag: string) => (
                                                        <Badge key={tag} variant="secondary" className="font-normal border-transparent bg-secondary/50 hover:bg-secondary/70">
                                                            {tag}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">No skills listed</span>
                                                )}
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Resume */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-foreground">Resume</h3>
                                            {candidate.resumeUrl ? (
                                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-background rounded-md border">
                                                            <FileText className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">Resume.pdf</span>
                                                            <span className="text-xs text-muted-foreground">PDF Document</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">View</a>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">No resume uploaded</p>
                                            )}
                                        </div>

                                        {/* Hiring Context (Deals/Opportunities) */}
                                        {(candidate as any).opportunityLinks && (candidate as any).opportunityLinks.length > 0 && (
                                            <>
                                                <Separator />
                                                <div className="space-y-3">
                                                    <h3 className="text-sm font-medium text-foreground">Hiring Context</h3>
                                                    <p className="text-xs text-muted-foreground">Linked opportunities from connected CRMs (read-only)</p>
                                                    <div className="space-y-3">
                                                        {(candidate as any).opportunityLinks.map((link: any) => {
                                                            const opp = link.opportunityContext;
                                                            return (
                                                                <div key={link.id} className="p-4 border rounded-lg bg-gradient-to-br from-muted/20 to-muted/5">
                                                                    {/* Header */}
                                                                    <div className="flex items-start justify-between mb-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="p-2 bg-primary/10 rounded-md">
                                                                                <Briefcase className="h-4 w-4 text-primary" />
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-sm font-semibold text-foreground">
                                                                                    {opp?.name || 'Unnamed Deal'}
                                                                                </span>
                                                                                {opp?.stageName && (
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        Stage: {opp.stageName}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <Badge variant="outline" className="text-xs shrink-0">
                                                                            {opp?.provider === 'hubspot' ? 'HubSpot' : 'Salesforce'}
                                                                        </Badge>
                                                                    </div>

                                                                    {/* Details Grid */}
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        {opp?.accountName && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-muted-foreground">Company:</span>
                                                                                <span className="font-medium">{opp.accountName}</span>
                                                                            </div>
                                                                        )}
                                                                        {opp?.amount && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-muted-foreground">Value:</span>
                                                                                <span className="font-medium text-green-600">${opp.amount.toLocaleString()}</span>
                                                                            </div>
                                                                        )}
                                                                        {opp?.closeDate && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-muted-foreground">Close Date:</span>
                                                                                <span className="font-medium">
                                                                                    {new Date(opp.closeDate).toLocaleDateString()}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {opp?.ownerName && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-muted-foreground">Owner:</span>
                                                                                <span className="font-medium">{opp.ownerName}</span>
                                                                            </div>
                                                                        )}
                                                                        {opp?.probability && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-muted-foreground">Probability:</span>
                                                                                <span className="font-medium">{opp.probability}%</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="notes" className="mt-0">
                                        <div className="text-center py-8">
                                            <p className="text-sm text-muted-foreground">Notes functionality coming soon.</p>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="history" className="mt-0">
                                        <div className="text-center py-8">
                                            <p className="text-sm text-muted-foreground">Activity history coming soon.</p>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>

                        {/* Footer */}
                        <SheetFooter className="p-6 border-t bg-muted/10 sm:justify-between">
                            <Button variant="ghost" className="text-muted-foreground hover:text-destructive" size="sm">
                                <Trash className="mr-2 h-4 w-4" />
                                Delete Candidate
                            </Button>
                            <Button onClick={handleViewFullProfile}>
                                View Full Profile
                            </Button>
                        </SheetFooter>
                    </>
                ) : (
                    <div className="p-6 text-center">
                        <p>Candidate not found</p>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
