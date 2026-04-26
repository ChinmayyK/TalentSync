import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CommunicationController } from './communication.controller';
import { ReceiptController } from './webhooks/receipt.controller';
import { MessageService } from './services/message.service';
import { TemplateService } from './services/template.service';
import { AutomationService } from './services/automation.service';
import { ChannelService } from './services/channel.service';
import { SchedulerService } from './services/scheduler.service';
import { VariableResolverService } from './services/variable-resolver.service';
import { TwilioService } from './services/twilio.service';
import { WhatsAppService } from './services/whatsapp.service';
import { EmailProcessor } from './processors/email.processor';
import { WhatsAppProcessor } from './processors/whatsapp.processor';
import { SmsProcessor } from './processors/sms.processor';
import { SchedulerProcessor } from './processors/scheduler.processor';
import { AutomationProcessor } from './processors/automation.processor';
import { PrismaService } from '../../common/prisma.service';
import { COMMUNICATION_QUEUES, QUEUE_RETRY_CONFIG } from './queues';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    BullModule.registerQueue(
      {
        name: COMMUNICATION_QUEUES.EMAIL,
        defaultJobOptions: {
          attempts: QUEUE_RETRY_CONFIG.attempts,
          backoff: QUEUE_RETRY_CONFIG.backoff,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: COMMUNICATION_QUEUES.WHATSAPP,
        defaultJobOptions: {
          attempts: QUEUE_RETRY_CONFIG.attempts,
          backoff: QUEUE_RETRY_CONFIG.backoff,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: COMMUNICATION_QUEUES.SMS,
        defaultJobOptions: {
          attempts: QUEUE_RETRY_CONFIG.attempts,
          backoff: QUEUE_RETRY_CONFIG.backoff,
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: COMMUNICATION_QUEUES.AUTOMATION,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      },
      {
        name: COMMUNICATION_QUEUES.SCHEDULER,
      },
      {
        name: COMMUNICATION_QUEUES.DLQ,
      },
    ),
  ],
  controllers: [CommunicationController, ReceiptController],
  providers: [
    PrismaService,
    MessageService,
    TemplateService,
    AutomationService,
    ChannelService,
    SchedulerService,
    VariableResolverService,
    TwilioService,
    WhatsAppService,
    EmailProcessor,
    WhatsAppProcessor,
    SmsProcessor,
    SchedulerProcessor,
    AutomationProcessor,
  ],
  exports: [
    MessageService,
    TemplateService,
    AutomationService,
    ChannelService,
    VariableResolverService,
    TwilioService,
    WhatsAppService,
  ],
})
export class CommunicationModule {}
