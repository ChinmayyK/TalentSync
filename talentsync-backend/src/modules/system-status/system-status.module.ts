import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SystemStatusController } from './system-status.controller';
import { ComponentService } from './services/component.service';
import { HealthCheckService } from './services/health-check.service';
import { UptimeService } from './services/uptime.service';
import { IncidentService } from './services/incident.service';
import { HealthCheckProcessor } from './processors/health-check.processor';
import { PrismaService } from '../../common/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'health-checks',
    }),
  ],
  controllers: [SystemStatusController],
  providers: [
    PrismaService,
    ComponentService,
    HealthCheckService,
    UptimeService,
    IncidentService,
    HealthCheckProcessor,
  ],
  exports: [
    ComponentService,
    HealthCheckService,
    UptimeService,
    IncidentService,
  ],
})
export class SystemStatusModule {}
