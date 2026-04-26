import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { MessageService } from './message.service';
import { ScheduleStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private messageService: MessageService,
  ) {}

  /**
   * Process due scheduled messages
   * Called by cron job every minute
   */
  async processDueMessages() {
    const now = new Date();

    // Find all pending messages that are due
    const dueMessages = await this.prisma.scheduledMessage.findMany({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledFor: { lte: now },
      },
      take: 100, // Process in batches
    });

    const results = {
      processed: 0,
      failed: 0,
    };

    for (const scheduled of dueMessages) {
      try {
        // Send the message
        const payload = scheduled.payload as any;

        await this.messageService.send(scheduled.tenantId, {
          channel: scheduled.channel,
          recipientType: scheduled.recipientType,
          recipientId: scheduled.recipientId,
          templateId: scheduled.templateId || undefined,
          subject: payload.subject,
          body: payload.body,
          context: payload.context,
        });

        // Mark as sent
        await this.prisma.scheduledMessage.update({
          where: { id: scheduled.id },
          data: { status: ScheduleStatus.SENT },
        });

        results.processed++;
      } catch (error) {
        this.logger.error(
          `Failed to send scheduled message ${scheduled.id}:`,
          error,
        );

        // Mark as failed
        await this.prisma.scheduledMessage.update({
          where: { id: scheduled.id },
          data: { status: ScheduleStatus.FAILED },
        });

        results.failed++;
      }
    }

    return results;
  }

  /**
   * Get upcoming scheduled messages
   */
  async getUpcoming(tenantId: string, limit = 20) {
    return this.prisma.scheduledMessage.findMany({
      where: {
        tenantId,
        status: ScheduleStatus.PENDING,
        scheduledFor: { gt: new Date() },
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    });
  }

  /**
   * Get scheduled message by ID
   */
  async findOne(tenantId: string, id: string) {
    return this.prisma.scheduledMessage.findFirst({
      where: { id, tenantId },
    });
  }
}
