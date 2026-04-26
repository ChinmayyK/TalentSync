import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { Channel, MessageStatus } from '@prisma/client';

export interface CommunicationMetrics {
  messagesToday: number;
  successRate: number;
  failedCount: number;
  channelBreakdown: {
    email: number;
    whatsapp: number;
    sms: number;
  };
  topTemplates: {
    templateName: string;
    usageCount: number;
  }[];
  recentFailures: {
    id: string;
    channel: string;
    recipientEmail?: string;
    recipientPhone?: string;
    status: string;
    failedAt?: Date;
    metadata?: any;
  }[];
}

@Injectable()
export class CommunicationMetricsService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(): Promise<CommunicationMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's message counts
    const [
      messagesToday,
      successfulMessages,
      failedMessages,
      channelCounts,
      topTemplatesRaw,
      recentFailures,
    ] = await Promise.all([
      // Total messages today
      this.prisma.messageLog.count({
        where: { createdAt: { gte: today } },
      }),

      // Successful messages today (SENT, DELIVERED, READ)
      this.prisma.messageLog.count({
        where: {
          createdAt: { gte: today },
          status: {
            in: [
              MessageStatus.SENT,
              MessageStatus.DELIVERED,
              MessageStatus.READ,
            ],
          },
        },
      }),

      // Failed messages today
      this.prisma.messageLog.count({
        where: {
          createdAt: { gte: today },
          status: { in: [MessageStatus.FAILED, MessageStatus.BOUNCED] },
        },
      }),

      // Channel breakdown
      this.prisma.messageLog.groupBy({
        by: ['channel'],
        where: { createdAt: { gte: today } },
        _count: true,
      }),

      // Top 5 templates by usage (last 30 days)
      this.prisma.messageLog.groupBy({
        by: ['templateId'],
        where: {
          templateId: { not: null },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: true,
        orderBy: { _count: { templateId: 'desc' } },
        take: 5,
      }),

      // Recent 10 failed messages
      this.prisma.messageLog.findMany({
        where: {
          status: { in: [MessageStatus.FAILED, MessageStatus.BOUNCED] },
        },
        orderBy: { failedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          channel: true,
          recipientEmail: true,
          recipientPhone: true,
          status: true,
          failedAt: true,
          metadata: true,
        },
      }),
    ]);

    // Process channel breakdown
    const channelBreakdown = {
      email: 0,
      whatsapp: 0,
      sms: 0,
    };
    for (const count of channelCounts) {
      const key = count.channel.toLowerCase() as keyof typeof channelBreakdown;
      if (key in channelBreakdown) {
        channelBreakdown[key] = count._count;
      }
    }

    // Get template names
    const templateIds = topTemplatesRaw
      .map((t) => t.templateId)
      .filter((id): id is string => id !== null);

    const templates = await this.prisma.messageTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true },
    });

    const templateNameMap = new Map(templates.map((t) => [t.id, t.name]));

    const topTemplates = topTemplatesRaw.map((t) => ({
      templateName: templateNameMap.get(t.templateId!) || 'Unknown Template',
      usageCount: t._count,
    }));

    // Calculate success rate
    const totalProcessed = successfulMessages + failedMessages;
    const successRate =
      totalProcessed > 0 ? (successfulMessages / totalProcessed) * 100 : 0;

    return {
      messagesToday,
      successRate: Math.round(successRate * 100) / 100,
      failedCount: failedMessages,
      channelBreakdown,
      topTemplates,
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        channel: f.channel.toString(),
        recipientEmail: f.recipientEmail ?? undefined,
        recipientPhone: f.recipientPhone ?? undefined,
        status: f.status.toString(),
        failedAt: f.failedAt ?? undefined,
        metadata: f.metadata,
      })),
    };
  }
}
