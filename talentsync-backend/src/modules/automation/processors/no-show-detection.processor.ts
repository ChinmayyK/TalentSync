import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * No-Show Detection Processor
 * Automatically marks interviews as no-show if:
 * - Interview time has passed
 * - No feedback has been submitted
 * - Status is still SCHEDULED or CONFIRMED
 */
@Injectable()
@Processor('no-show-detection')
export class NoShowDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(NoShowDetectionProcessor.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
  }

  /**
   * Run no-show detection every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    this.logger.log('Running scheduled no-show detection...');
    await this.detectNoShows();
  }

  /**
   * Process queued no-show detection job
   */
  async process(job: Job<{ interviewId?: string }>) {
    this.logger.log(`Processing no-show detection job: ${job.id}`);

    if (job.data.interviewId) {
      await this.checkSingleInterview(job.data.interviewId);
    } else {
      await this.detectNoShows();
    }

    return { processed: true };
  }

  /**
   * Detect no-shows across all tenants
   * Criteria:
   * - Interview date + duration has passed
   * - Status is SCHEDULED or CONFIRMED
   * - No feedback submitted (hasFeedback = false)
   * - Not already marked as no-show
   * - Grace period of 30 minutes after interview end
   */
  private async detectNoShows() {
    const gracePeriodMinutes = 30;
    const now = new Date();

    // Find interviews that should be checked
    const interviews = await this.prisma.interview.findMany({
      where: {
        isNoShow: false,
        hasFeedback: false,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        deletedAt: null,
        // Interview end time (date + duration) + grace period < now
        date: {
          lte: new Date(now.getTime() - gracePeriodMinutes * 60 * 1000),
        },
      },
      select: {
        id: true,
        tenantId: true,
        candidateId: true,
        date: true,
        durationMins: true,
        status: true,
      },
    });

    this.logger.log(`Found ${interviews.length} potential no-show interviews`);

    let markedCount = 0;

    for (const interview of interviews) {
      // Calculate interview end time
      const interviewEnd = new Date(
        interview.date.getTime() + interview.durationMins * 60 * 1000,
      );
      const checkTime = new Date(
        interviewEnd.getTime() + gracePeriodMinutes * 60 * 1000,
      );

      if (now >= checkTime) {
        await this.markAsNoShow(interview);
        markedCount++;
      }
    }

    this.logger.log(`Marked ${markedCount} interviews as no-show`);
  }

  /**
   * Check a specific interview for no-show
   */
  private async checkSingleInterview(interviewId: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        tenantId: true,
        candidateId: true,
        date: true,
        durationMins: true,
        status: true,
        isNoShow: true,
        hasFeedback: true,
      },
    });

    if (!interview || interview.isNoShow || interview.hasFeedback) {
      return;
    }

    const gracePeriodMinutes = 30;
    const now = new Date();
    const interviewEnd = new Date(
      interview.date.getTime() + interview.durationMins * 60 * 1000,
    );
    const checkTime = new Date(
      interviewEnd.getTime() + gracePeriodMinutes * 60 * 1000,
    );

    if (
      now >= checkTime &&
      ['SCHEDULED', 'CONFIRMED'].includes(interview.status)
    ) {
      await this.markAsNoShow(interview);
    }
  }

  /**
   * Mark interview as no-show and emit event
   */
  private async markAsNoShow(interview: {
    id: string;
    tenantId: string;
    candidateId: string;
  }) {
    await this.prisma.interview.update({
      where: { id: interview.id },
      data: {
        isNoShow: true,
        status: 'NO_SHOW',
      },
    });

    // Delete associated BusyBlocks to free up the time slot
    const deletedBlocks = await this.prisma.busyBlock.deleteMany({
      where: {
        tenantId: interview.tenantId,
        source: 'interview',
        sourceId: interview.id,
      },
    });
    if (deletedBlocks.count > 0) {
      this.logger.log(
        `Deleted ${deletedBlocks.count} BusyBlock(s) for no-show interview ${interview.id}`,
      );
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId: interview.tenantId,
        userId: null, // System action
        action: 'INTERVIEW_NO_SHOW_DETECTED',
        metadata: {
          interviewId: interview.id,
          candidateId: interview.candidateId,
        },
      },
    });

    // Emit event for automation rules
    this.eventEmitter.emit('interview.no_show', {
      tenantId: interview.tenantId,
      interviewId: interview.id,
      candidateId: interview.candidateId,
    });

    this.logger.log(`Marked interview ${interview.id} as no-show`);
  }
}
