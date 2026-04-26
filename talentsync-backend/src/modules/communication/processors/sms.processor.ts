import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { COMMUNICATION_QUEUES, MessageJobData } from '../queues';
import { MessageStatus } from '@prisma/client';
import { TwilioService } from '../services/twilio.service';

@Processor(COMMUNICATION_QUEUES.SMS)
@Injectable()
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private twilioService: TwilioService,
  ) {
    super();
  }

  async process(job: Job<MessageJobData>): Promise<void> {
    const { messageLogId, tenantId, recipientPhone, body } = job.data;
    this.logger.log(`Processing SMS job ${job.id} for message ${messageLogId}`);

    if (!recipientPhone) {
      throw new Error('No recipient phone provided');
    }

    if (!this.twilioService.isValidPhoneNumber(recipientPhone)) {
      this.logger.warn(`Invalid phone number format: ${recipientPhone}`);
    }

    try {
      // Use TwilioService (real or mock based on config)
      const result = await this.twilioService.sendSms(recipientPhone, body);

      if (!result.success) {
        throw new Error(result.error || 'SMS send failed');
      }

      this.logger.log(`SMS sent: ${result.messageId}`);

      // Update MessageLog status
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: MessageStatus.SENT,
          sentAt: new Date(),
          externalId: result.messageId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);

      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: MessageStatus.FAILED,
          failedAt: new Date(),
          retryCount: { increment: 1 },
          metadata: { error: error.message },
        },
      });

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MessageJobData>, error: Error) {
    this.logger.error(`SMS job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<MessageJobData>) {
    this.logger.log(`SMS job ${job.id} completed`);
  }
}
