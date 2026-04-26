import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { COMMUNICATION_QUEUES, MessageJobData } from '../queues';
import { MessageStatus } from '@prisma/client';
import { WhatsAppService } from '../services/whatsapp.service';

@Processor(COMMUNICATION_QUEUES.WHATSAPP)
@Injectable()
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
  ) {
    super();
  }

  async process(job: Job<MessageJobData>): Promise<void> {
    const { messageLogId, tenantId, recipientPhone, body } = job.data;
    this.logger.log(
      `Processing WhatsApp job ${job.id} for message ${messageLogId}`,
    );

    if (!recipientPhone) {
      throw new Error('No recipient phone provided');
    }

    if (!this.whatsAppService.isValidPhoneNumber(recipientPhone)) {
      this.logger.warn(`Invalid phone number format: ${recipientPhone}`);
    }

    try {
      // Use WhatsAppService (real or mock based on config)
      const result = await this.whatsAppService.sendMessage(
        recipientPhone,
        body,
        tenantId,
      );

      if (!result.success) {
        throw new Error(result.error || 'WhatsApp send failed');
      }

      this.logger.log(`WhatsApp message sent: ${result.messageId}`);

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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send WhatsApp message: ${errorMessage}`);

      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: MessageStatus.FAILED,
          failedAt: new Date(),
          retryCount: { increment: 1 },
          metadata: { error: errorMessage },
        },
      });

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MessageJobData>, error: Error) {
    this.logger.error(`WhatsApp job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<MessageJobData>) {
    this.logger.log(`WhatsApp job ${job.id} completed`);
  }
}
