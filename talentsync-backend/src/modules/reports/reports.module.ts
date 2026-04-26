import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from '../../common/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { ScheduledReportsProcessor } from './processors/scheduled-reports.processor';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'reports-refresh' },
      { name: 'scheduled-reports' },
    ),
    EmailModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService, ScheduledReportsProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
