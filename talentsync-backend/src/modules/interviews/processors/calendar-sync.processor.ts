import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Processor('calendar-sync')
@Injectable()
export class CalendarSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(CalendarSyncProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<{ interviewId: string; tenantId: string }>,
  ): Promise<any> {
    // Stub for future integration
    this.logger.log(`Syncing calendar for interview ${job.data.interviewId}`);
    // Would call IntegrationsService to push event to Google/Outlook
  }
}
