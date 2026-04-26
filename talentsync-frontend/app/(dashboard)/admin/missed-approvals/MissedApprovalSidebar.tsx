'use client';

import { ApprovalRequest, approveRequest, rejectRequest } from '@/lib/api/approvals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle, XCircle, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface MissedApprovalSidebarProps {
    approval: ApprovalRequest | null;
    isOpen: boolean;
    onClose: () => void;
    onActionComplete: () => void;
}

function DetailRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
    const displayValue = value === null || value === undefined || value === ''
        ? '-'
        : typeof value === 'boolean'
            ? value ? 'Yes' : 'No'
            : String(value);

    return (
        <div className="flex justify-between py-2 border-b border-muted/30 last:border-0">
            <span className="text-muted-foreground text-sm">{label}</span>
            <span className="text-sm font-medium text-right max-w-[60%] break-words">{displayValue}</span>
        </div>
    );
}

function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function MissedApprovalSidebar({
    approval,
    isOpen,
    onClose,
    onActionComplete,
}: MissedApprovalSidebarProps) {
    const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);

    if (!approval) return null;

    const metadata = approval.metadata || {};

    const handleApprove = async () => {
        setActionLoading('approve');
        try {
            await approveRequest(approval.id, {});
            onActionComplete();
            onClose();
        } catch (error) {
            console.error('Failed to approve:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        setActionLoading('reject');
        try {
            await rejectRequest(approval.id, {});
            onActionComplete();
            onClose();
        } catch (error) {
            console.error('Failed to reject:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const zohoUrl = metadata.zohoRecruitRecordId
        ? `https://recruit.zoho.com/recruit/org/Candidate/${metadata.zohoRecruitRecordId}`
        : null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[550px] sm:max-w-[550px] p-0 flex flex-col">
                <SheetHeader className="p-6 pr-12 pb-4 border-b">
                    <div className="flex items-center gap-2">
                        <SheetTitle className="text-xl">
                            {approval.candidateFirstName} {approval.candidateLastName}
                        </SheetTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">Missed Approval - Interview date has passed</p>
                </SheetHeader>

                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        {/* Candidate History Header */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Candidate History</h3>
                            <div className="space-y-1">
                                <DetailRow label="Client Name" value={approval.clientName} />
                                <DetailRow label="Submit Time" value={formatDateTime(approval.submittedAt)} />
                                <DetailRow label="Available Positions" value={metadata.availablePositions} />
                                <DetailRow label="Date Of Interview" value={formatDate(metadata.dateOfInterview || approval.interviewDate)} />
                                <DetailRow label="Added in Google Sheet?" value={metadata.addedInGoogleSheet} />
                                <div className="flex justify-between py-2 border-b border-muted/30">
                                    <span className="text-muted-foreground text-sm">Approval</span>
                                    <Badge className="bg-yellow-500 text-white">Pending Approval</Badge>
                                </div>
                                <DetailRow label="City Of Interview" value={metadata.cityOfInterview} />
                                <DetailRow label="Remarks" value={approval.remarks} />
                                <DetailRow label="Status Change Time" value={metadata.statusChangeTime} />
                                <DetailRow label="Feedback Pending" value={metadata.feedbackPending} />
                                <DetailRow label="Zoho Recruit Record ID" value={metadata.zohoRecruitRecordId} />
                                <DetailRow label="Recruiters" value={approval.recruiterName} />
                                <DetailRow label="Position" value={approval.positionAppliedFor} />
                                <DetailRow label="Candidate ID" value={approval.candidateId} />
                                <DetailRow label="View Candidate History" value={metadata.viewCandidateHistory} />
                                <DetailRow label="Industry" value={metadata.industry} />
                                <DetailRow label="Date Of Birth" value={metadata.dateOfBirth} />
                                <DetailRow label="Age" value={metadata.age} />
                                <DetailRow label="IDFC Portal's Candidate ID" value={metadata.idfcPortalCandidateId} />
                                <DetailRow label="Added In IDFC Portal?" value={metadata.addedInPortal} />
                                <DetailRow label="Candidate's Pan Card Number" value={metadata.panCardNumber} />
                                <DetailRow label="Interview" value={approval.interviewId} />
                                <DetailRow label="Interview Identification Number (Old)" value={metadata.interviewIdOld} />
                                <DetailRow label="Highest Qualification Held" value={metadata.highestQualification} />
                                <DetailRow label="Current Role" value={metadata.currentRole} />
                                <DetailRow label="Total Experience" value={metadata.totalExperience} />
                                <DetailRow label="Current Fixed Annual CTC" value={metadata.currentCtc} />
                                <DetailRow label="Expected CTC" value={metadata.expectedCtc} />
                                <DetailRow label="Location Of Residence" value={metadata.locationResidence} />
                                <DetailRow label="Reason for job change" value={metadata.reasonForChange} />
                                <DetailRow label="Portfolio size" value={metadata.portfolioSize} />
                                <DetailRow label="First Name" value={approval.candidateFirstName} />
                                <DetailRow label="Last Name" value={approval.candidateLastName} />
                                <DetailRow label="Gender" value={metadata.gender} />
                                <DetailRow label="Candidate Email" value={approval.candidateEmail} />
                                <DetailRow label="Secondary Email" value={metadata.secondaryEmail} />
                                <DetailRow label="Phone Number" value={metadata.phone} />
                                <DetailRow label="Mobile Number" value={metadata.mobile} />
                                <DetailRow label="Current Organization" value={metadata.currentOrganization} />
                                <DetailRow label="Currently Working?" value={metadata.currentlyWorking} />
                                <DetailRow label="Notice Period" value={metadata.noticePeriod} />
                                <DetailRow label="Recruiter's Comment (Visible to Client)" value={metadata.recruiterComment} />
                                <DetailRow label="Location Applied For" value={metadata.locationAppliedFor} />
                                <DetailRow label="Total Experience of Banking/BFSI" value={metadata.bfsiExperience} />
                                <DetailRow label="Year of Passing" value={metadata.yearOfPassing} />
                                <DetailRow label="Grade" value={metadata.grade} />
                                <DetailRow label="Catchment Area" value={metadata.catchmentArea} />
                                <DetailRow label="Last 4 years Appraisal Ratings" value={metadata.appraisalRatings} />
                                <DetailRow label="Achievements" value={metadata.achievements} />
                                <DetailRow label="Branch Manager Experience (Years)" value={metadata.branchManagerExperience} />
                                <DetailRow label="Branches managing & Book Size" value={metadata.branchesManaging} />
                                <DetailRow label="Current cluster managing" value={metadata.currentCluster} />
                                <DetailRow label="Cluster Ratings" value={metadata.clusterRatings} />
                                <DetailRow label="Interview in last 1 year for this company?" value={metadata.interviewedLastYear} />
                                <DetailRow label="Focused or Main Products of Candidate" value={metadata.focusedProducts} />
                                <DetailRow label="Specific branch location within the city" value={metadata.specificBranchLocation} />
                                <DetailRow label="Mumbai LINE (if applicable)" value={metadata.selectLine} />
                                <DetailRow label="BSC Ranking in Zone or Country" value={metadata.bscRanking} />
                                <DetailRow label="Branch Location with Size break-up" value={metadata.branchLocationSize} />
                                <DetailRow label="Two wheeler with driving license" value={metadata.twoWheelerLicense} />
                                <DetailRow label="Interview in last 3 months for this company?" value={metadata.interviewedLast3Months} />
                                <DetailRow label="Status" value={approval.submissionStatus} />
                                <DetailRow label="Confirm Submit" value={metadata.confirmSubmit} />
                                <DetailRow label="Send Whatsapp Invite?" value={metadata.sendWhatsappInvite} />
                            </div>
                        </div>

                        <Separator />

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg">Actions</h3>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleApprove}
                                    disabled={actionLoading !== null}
                                >
                                    {actionLoading === 'approve' ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Approve
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleReject}
                                    disabled={actionLoading !== null}
                                >
                                    {actionLoading === 'reject' ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <XCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Reject
                                </Button>
                            </div>

                            {zohoUrl && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    asChild
                                >
                                    <a href={zohoUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Open Candidate In Zoho
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
