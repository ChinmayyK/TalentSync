import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { COMMUNICATION_QUEUES, MessageJobData } from '../queues';
import { ScheduleStatus, Channel } from '@prisma/client';

@Injectable()
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(COMMUNICATION_QUEUES.EMAIL) private emailQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.WHATSAPP) private whatsappQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.SMS) private smsQueue: Queue,
  ) {}

  /**
   * Runs every minute to check for due scheduled messages
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueMessages() {
    const now = new Date();
    this.logger.debug('Checking for due scheduled messages...');

    // Find all pending messages that are due
    const dueMessages = await this.prisma.scheduledMessage.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledFor: { lte: now },
      },
      take: 100, // Process in batches
    });

    if (dueMessages.length === 0) {
      return;
    }

    this.logger.log(`Found ${dueMessages.length} due scheduled messages`);

    for (const scheduled of dueMessages) {
      try {
        const payload = scheduled.payload as any;

        // Create MessageLog entry
        const messageLog = await this.prisma.messageLog.create({
          data: {
            tenantId: scheduled.tenantId,
            channel: scheduled.channel,
            templateId: scheduled.templateId,
            recipientType: scheduled.recipientType,
            recipientId: scheduled.recipientId,
            recipientEmail: payload.recipientEmail,
            recipientPhone: payload.recipientPhone,
            subject: payload.subject || '',
            body: payload.body || '',
            status: 'QUEUED',
            scheduledFor: scheduled.scheduledFor,
          },
        });

        // Create job data
        const jobData: MessageJobData = {
          messageLogId: messageLog.id,
          tenantId: scheduled.tenantId,
          channel: scheduled.channel,
          recipientEmail: payload.recipientEmail,
          recipientPhone: payload.recipientPhone,
          subject: payload.subject,
          body: payload.body,
          templateId: scheduled.templateId || undefined,
          context: payload.context,
        };

        // Dispatch to appropriate queue
        await this.dispatchToQueue(scheduled.channel, jobData);

        // Mark as sent
        await this.prisma.scheduledMessage.update({
          where: { id: scheduled.id },
          data: { status: ScheduleStatus.SENT },
        });

        this.logger.log(`Dispatched scheduled message ${scheduled.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled message ${scheduled.id}: ${error.message}`,
        );

        // Mark as failed
        await this.prisma.scheduledMessage.update({
          where: { id: scheduled.id },
          data: { status: ScheduleStatus.FAILED },
        });
      }
    }
  }

  private async dispatchToQueue(channel: Channel, jobData: MessageJobData) {
    const queue = this.getQueueForChannel(channel);
    await queue.add('send', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  private getQueueForChannel(channel: Channel): Queue {
    switch (channel) {
      case Channel.EMAIL:
        return this.emailQueue;
      case Channel.WHATSAPP:
        return this.whatsappQueue;
      case Channel.SMS:
        return this.smsQueue;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }
}
