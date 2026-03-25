import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ManualSubmissionResponseDto } from './dto';

interface SubmissionFailure {
  interviewId: string;
  candidateId?: string;
  reason: string;
}

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Run manual submission for eligible interviews scheduled for today.
   *
   * Eligibility criteria:
   * 1. Interview status != CANCELLED
   * 2. Interview date = TODAY
   * 3. ApprovalRequest.approvalStatus = APPROVED
   * 4. ApprovalRequest.submissionStatus != 'SUBMITTED' (not already submitted)
   */
  async runManualSubmission(
    tenantId: string,
    userId: string,
    userName?: string,
    remarks?: string,
  ): Promise<ManualSubmissionResponseDto> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const runTimestamp = new Date().toISOString();

    this.logger.log(
      `Starting manual submission run: ${runId} by user ${userId}`,
    );

    // Get today's date range (start of day to end of day)
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999,
    );

    // Find all eligible approval requests for today's interviews
    // Criteria:
    // - tenantId matches
    // - interviewDate is TODAY
    // - approvalStatus is APPROVED
    // - submissionStatus is NOT 'SUBMITTED'
    const eligibleApprovals = await this.prisma.approvalRequest.findMany({
      where: {
        tenantId,
        interviewDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        approvalStatus: 'APPROVED',
        submissionStatus: {
          not: 'SUBMITTED',
        },
      },
      orderBy: {
        interviewDate: 'asc',
      },
    });

    // Also check that the associated interview is not CANCELLED
    const validApprovals: typeof eligibleApprovals = [];
    const skippedApprovals: typeof eligibleApprovals = [];
    const failures: SubmissionFailure[] = [];

    for (const approval of eligibleApprovals) {
      // Check if interview exists and is not cancelled
      if (approval.interviewId) {
        const interview = await this.prisma.interview.findFirst({
          where: {
            id: approval.interviewId,
            tenantId,
            status: {
              not: 'CANCELLED',
            },
            deletedAt: null,
          },
        });

        if (interview) {
          validApprovals.push(approval);
        } else {
          skippedApprovals.push(approval);
          this.logger.debug(
            `Skipping approval ${approval.id}: interview cancelled or not found`,
          );
        }
      } else {
        skippedApprovals.push(approval);
        this.logger.debug(`Skipping approval ${approval.id}: no interview ID`);
      }
    }

    // Process valid approvals - mark as SUBMITTED
    let submittedCount = 0;
    for (const approval of validApprovals) {
      try {
        await this.prisma.approvalRequest.update({
          where: { id: approval.id },
          data: {
            submissionStatus: 'SUBMITTED',
            metadata: {
              ...((approval.metadata as Record<string, unknown>) || {}),
              manualSubmission: {
                runId,
                submittedAt: new Date().toISOString(),
                submittedBy: userId,
                remarks,
              },
            },
          },
        });
        submittedCount++;
        this.logger.debug(
          `Submitted approval ${approval.id} for interview ${approval.interviewId}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        failures.push({
          interviewId: approval.interviewId || 'unknown',
          candidateId: approval.candidateId || undefined,
          reason: message,
        });
        this.logger.error(
          `Failed to submit approval ${approval.id}: ${message}`,
        );
      }
    }

    // Create audit log entry
    await this.prisma.submissionRun.create({
      data: {
        id: runId,
        tenantId,
        triggeredBy: userId,
        triggeredAt: new Date(runTimestamp),
        totalScanned: eligibleApprovals.length,
        totalSubmitted: submittedCount,
        totalSkipped: skippedApprovals.length,
        errors:
          failures.length > 0 ? JSON.parse(JSON.stringify(failures)) : null,
        remarks,
        completedAt: new Date(),
      },
    });

    // Also create an audit log in the main audit log table
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'MANUAL_SUBMISSION_RUN',
        metadata: {
          runId,
          totalScanned: eligibleApprovals.length,
          submitted: submittedCount,
          skipped: skippedApprovals.length,
          failures: failures.length,
          remarks,
        },
      },
    });

    this.logger.log(
      `Manual submission run ${runId} complete: ` +
        `scanned=${eligibleApprovals.length}, submitted=${submittedCount}, ` +
        `skipped=${skippedApprovals.length}, failures=${failures.length}`,
    );

    return {
      runId,
      runTimestamp,
      triggeredBy: userId,
      totalScanned: eligibleApprovals.length,
      submitted: submittedCount,
      skipped: skippedApprovals.length,
      failures,
    };
  }

  /**
   * Get history of submission runs for a tenant
   */
  async getRunHistory(tenantId: string, limit = 20) {
    return this.prisma.submissionRun.findMany({
      where: { tenantId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }
}

