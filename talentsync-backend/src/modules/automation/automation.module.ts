import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AutomationService } from './automation.service';
import { RuleProcessor } from './rule-processor.service';
import { NoShowDetectionProcessor } from './processors/no-show-detection.processor';
import { PrismaService } from '../../common/prisma.service';
import { CommunicationModule } from '../communication/communication.module';
import { CandidatesModule } from '../candidates/candidates.module';

@Global()
@Module({
  imports: [
    CommunicationModule,
    CandidatesModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'no-show-detection' }),
  ],
  providers: [
    AutomationService,
    RuleProcessor,
    NoShowDetectionProcessor,
    PrismaService,
  ],
  exports: [AutomationService, RuleProcessor],
})
export class AutomationModule {}
