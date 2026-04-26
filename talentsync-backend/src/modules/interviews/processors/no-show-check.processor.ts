import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
@Processor('interviews-queue') // Utilizing existing interview queue or creating a specialized one?
// Actually, for Cron, we often use a dedicated queue or just 'scheduler'.
// Let's assume we use 'interviews-queue' for now, but configured for cron.
// Or better, 'scheduler' queue which dispatches jobs.
// For simplicity here, I'll assume this processor is triggered by a scheduler/CRON (e.g. system-cron or SchedulerService dispatching a job).
// Let's defined it as a worker for 'scheduler' queue that handles 'check-no-show'.
export class NoShowCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(NoShowCheckProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'check-no-shows') {
      await this.checkNoShows();
    }
  }

  private async checkNoShows() {
    this.logger.log('Running No-Show check...');
    const now = new Date();
    const bufferTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour buffer after end time?
    // Let's say if (endTime + buffer) < now AND status != COMPLETED AND !hasFeedback

    // Finds interviews that:
    // 1. Are past their date/duration
    // 2. Are not COMPLETED or CANCELLED
    // 3. Have no feedback
    // 4. Not already marked no-show

    // Prisma doesn't easily support "date + duration < now" in where clause without raw query or iterating.
    // We'll approximate: "date" < (now - duration_max). Assuming max interview is 4 hours, let's look for interviews > 5 hours ago.

    const threshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Or we use raw query for precision.
    // Let's stick to simple "started more than 24h ago" for safety first, or iterate.
    // User req: "interview_time passed + no attendance record" (attendance=feedback?)

    const candidates = await this.prisma.interview.findMany({
      where: {
        date: { lt: threshold },
        status: 'SCHEDULED', // Only scheduled ones
        hasFeedback: false,
        isNoShow: false,
      },
      take: 100, // Batch size
    });

    this.logger.log(`Found ${candidates.length} potential no-shows.`);

    for (const interview of candidates) {
      // Calculate exact end time
      const endTime = new Date(
        interview.date.getTime() + interview.durationMins * 60000,
      );

      // If strictly past end time + buffer (e.g. 1 hour)
      if (endTime.getTime() + 3600000 < now.getTime()) {
        await this.prisma.interview.update({
          where: { id: interview.id },
          data: {
            isNoShow: true,
            status: 'NO_SHOW', // Should we add this status enum?
            // Schema has String status. We can set it to "NO_SHOW".
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

        this.logger.log(`Marked interview ${interview.id} as NO_SHOW`);
      }
    }
  }
}
