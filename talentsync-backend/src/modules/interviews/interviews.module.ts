import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { PrismaService } from '../../common/prisma.service';
import { EmailModule } from '../email/email.module';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { InterviewAutomationService } from './services/interview-automation.service';
import { COMMUNICATION_QUEUES } from '../communication/queues';
import { AvailabilityUtil } from './utils/availability.util';
import { CalendarSyncProcessor } from './processors/calendar-sync.processor';
import { InterviewReminderProcessor } from './processors/interview-reminder.processor';
import { NoShowCheckProcessor } from './processors/no-show-check.processor';
import { Queue } from 'bullmq';
import { RecycleBinModule } from '../recycle-bin/recycle-bin.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'interview-reminder' }),
    BullModule.registerQueue({ name: 'calendar-sync' }),
    BullModule.registerQueue({ name: COMMUNICATION_QUEUES.AUTOMATION }),
    BullModule.registerQueue({ name: 'interviews-queue' }), // Added for the new queue
    EmailModule,
    RecycleBinModule,
    IntegrationsModule,
  ],
  controllers: [InterviewsController],
  providers: [
    InterviewsService,
    AvailabilityUtil,
    InterviewAutomationService,
    CalendarSyncProcessor,
    InterviewReminderProcessor,
    NoShowCheckProcessor,
    PrismaService, // Keep PrismaService if it's still needed
  ],
  exports: [InterviewsService, AvailabilityUtil, InterviewAutomationService],
})
export class InterviewsModule implements OnModuleInit {
  constructor(
    @InjectQueue('interviews-queue') private interviewsQueue: Queue,
  ) {}

  async onModuleInit() {
    // Remove existing repeatable jobs to avoid duplicates (optional safety)
    await this.interviewsQueue.removeRepeatableByKey('check-no-shows');

    // Add repeatable job: Check every hour
    await this.interviewsQueue.add(
      'check-no-shows',
      {},
      {
        repeat: {
          pattern: '0 * * * *', // Every hour
        },
        jobId: 'check-no-shows',
      },
    );
  }
}
