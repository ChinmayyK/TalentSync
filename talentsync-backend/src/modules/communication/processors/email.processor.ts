import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../common/prisma.service';
import { COMMUNICATION_QUEUES, MessageJobData } from '../queues';
import { MessageStatus } from '@prisma/client';

@Processor(COMMUNICATION_QUEUES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    super();
    // Configure MailHog transporter (localhost development)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false,
      // No auth for MailHog
    });
  }

  async process(job: Job<MessageJobData>): Promise<void> {
    const { messageLogId, tenantId, recipientEmail, subject, body, context } =
      job.data;
    this.logger.log(
      `Processing email job ${job.id} for message ${messageLogId}`,
    );

    if (!recipientEmail) {
      throw new Error('No recipient email provided');
    }

    try {
      // Send email via MailHog/SMTP
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"TalentSync" <noreply@talentsync.local>',
        to: recipientEmail,
        subject: subject || 'Message from TalentSync',
        html: body,
        text: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
      });

      this.logger.log(`Email sent successfully: ${result.messageId}`);

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
      this.logger.error(`Failed to send email: ${error.message}`);

      // Update MessageLog with error
      await this.prisma.messageLog.update({
        where: { id: messageLogId },
        data: {
          status: MessageStatus.FAILED,
          failedAt: new Date(),
          retryCount: { increment: 1 },
          metadata: { error: error.message },
        },
      });

      throw error; // Rethrow to trigger BullMQ retry
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MessageJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    if (job.attemptsMade >= 3) {
      this.logger.warn(`Job ${job.id} moved to DLQ after max retries`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<MessageJobData>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }
}
