import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SystemMetricsController } from './system-metrics.controller';
import { PlatformMetricsService } from './services/platform-metrics.service';
import { QueueMetricsService } from './services/queue-metrics.service';
import { CommunicationMetricsService } from './services/communication-metrics.service';
import { SchedulingMetricsService } from './services/scheduling-metrics.service';
import { TenantUsageService } from './services/tenant-usage.service';
import { IntegrationMetricsService } from './services/integration-metrics.service';
import { PrismaService } from '../../common/prisma.service';
import { COMMUNICATION_QUEUES } from '../communication/queues';

@Module({
  imports: [
    // Import all communication queues for metrics access
    BullModule.registerQueue(
      { name: COMMUNICATION_QUEUES.EMAIL },
      { name: COMMUNICATION_QUEUES.WHATSAPP },
      { name: COMMUNICATION_QUEUES.SMS },
      { name: COMMUNICATION_QUEUES.AUTOMATION },
      { name: COMMUNICATION_QUEUES.SCHEDULER },
      { name: COMMUNICATION_QUEUES.DLQ },
    ),
  ],
  controllers: [SystemMetricsController],
  providers: [
    PrismaService,
    PlatformMetricsService,
    QueueMetricsService,
    CommunicationMetricsService,
    SchedulingMetricsService,
    TenantUsageService,
    IntegrationMetricsService,
  ],
  exports: [PlatformMetricsService],
})
export class SystemMetricsModule {}
