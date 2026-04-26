import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { SendMessageDto, ScheduleMessageDto, MessageFilterDto } from '../dto';
import {
  COMMUNICATION_QUEUES,
  MessageJobData,
  QUEUE_RETRY_CONFIG,
} from '../queues';
import {
  Channel,
  MessageStatus,
  RecipientType,
  ScheduleStatus,
} from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue(COMMUNICATION_QUEUES.EMAIL) private emailQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.WHATSAPP) private whatsappQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.SMS) private smsQueue: Queue,
  ) {}

  /**
   * Determine which queue to use based on channel
   */
  private determineQueue(channel: Channel): Queue {
    switch (channel) {
      case Channel.EMAIL:
        return this.emailQueue;
      case Channel.WHATSAPP:
        return this.whatsappQueue;
      case Channel.SMS:
        return this.smsQueue;
      default:
        throw new BadRequestException(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Get paginated message logs with filters
   */
  async findAll(tenantId: string, filters: MessageFilterDto) {
    const {
      channel,
      status,
      recipientType,
      recipientId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit: requestedLimit = 20,
    } = filters;
    const limit = Math.min(requestedLimit, 100); // Cap at 100

    const where: any = { tenantId };

    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (recipientType) where.recipientType = recipientType;
    if (recipientId) where.recipientId = recipientId;

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.messageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.messageLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single message by ID
   */
  async findOne(tenantId: string, id: string) {
    const message = await this.prisma.messageLog.findFirst({
      where: { id, tenantId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  /**
   * Send immediate message - creates log entry and dispatches to queue
   */
  async send(tenantId: string, dto: SendMessageDto, userId?: string) {
    // Resolve recipient details
    const recipientInfo = await this.resolveRecipient(
      tenantId,
      dto.recipientType,
      dto.recipientId,
    );

    // Validate channel-specific requirements
    if (dto.channel === Channel.EMAIL && !recipientInfo.email) {
      throw new BadRequestException('Recipient has no email address');
    }
    if (
      (dto.channel === Channel.WHATSAPP || dto.channel === Channel.SMS) &&
      !recipientInfo.phone
    ) {
      throw new BadRequestException('Recipient has no phone number');
    }

    // Create message log entry
    const messageLog = await this.prisma.messageLog.create({
      data: {
        tenantId,
        channel: dto.channel,
        templateId: dto.templateId,
        recipientType: dto.recipientType,
        recipientId: dto.recipientId,
        recipientEmail: recipientInfo.email,
        recipientPhone: recipientInfo.phone,
        subject: dto.subject || '',
        body: dto.body || '',
        status: MessageStatus.QUEUED,
      },
    });

    // Create job data
    const jobData: MessageJobData = {
      messageLogId: messageLog.id,
      tenantId,
      channel: dto.channel,
      recipientEmail: recipientInfo.email || undefined,
      recipientPhone: recipientInfo.phone || undefined,
      subject: dto.subject,
      body: dto.body || '',
      templateId: dto.templateId,
      context: dto.context,
    };

    // Dispatch to appropriate queue
    const queue = this.determineQueue(dto.channel);
    await queue.add('send', jobData, {
      attempts: QUEUE_RETRY_CONFIG.attempts,
      backoff: QUEUE_RETRY_CONFIG.backoff,
    });

    return messageLog;
  }

  /**
   * Schedule a future message
   */
  async schedule(tenantId: string, dto: ScheduleMessageDto, userId?: string) {
    // Rate limiting for scheduled messages: max 20 per hour per tenant
    const now = Date.now();
    const rateLimitKey = `schedule:${tenantId}`;
    const limit = this.retryRateLimits.get(rateLimitKey);
    if (limit && limit.resetAt > now) {
      if (limit.count >= 20) {
        throw new BadRequestException(
          'Rate limit exceeded: max 20 scheduled messages per hour',
        );
      }
      limit.count++;
    } else {
      this.retryRateLimits.set(rateLimitKey, {
        count: 1,
        resetAt: now + 3600000,
      });
    }

    const recipientInfo = await this.resolveRecipient(
      tenantId,
      dto.recipientType,
      dto.recipientId,
    );

    const scheduled = await this.prisma.scheduledMessage.create({
      data: {
        tenantId,
        channel: dto.channel,
        templateId: dto.templateId,
        recipientType: dto.recipientType,
        recipientId: dto.recipientId,
        scheduledFor: dto.scheduledFor,
        status: ScheduleStatus.PENDING,
        payload: {
          subject: dto.subject,
          body: dto.body,
          context: dto.context,
          recipientEmail: recipientInfo.email,
          recipientPhone: recipientInfo.phone,
        },
        createdById: userId,
      },
    });

    return scheduled;
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduled(tenantId: string, id: string) {
    const scheduled = await this.prisma.scheduledMessage.findFirst({
      where: { id, tenantId, status: ScheduleStatus.PENDING },
    });

    if (!scheduled) {
      throw new NotFoundException(
        'Scheduled message not found or already processed',
      );
    }

    return this.prisma.scheduledMessage.update({
      where: { id },
      data: { status: ScheduleStatus.CANCELLED },
    });
  }

  // Rate limiting map for retries: key = tenantId:messageId, value = { count, resetAt }
  private retryRateLimits = new Map<
    string,
    { count: number; resetAt: number }
  >();

  // Rate limiting constants
  private readonly RETRY_LIMIT_PER_MESSAGE = 5; // Max 5 retries per message per hour
  private readonly RETRY_LIMIT_PER_TENANT = 50; // Max 50 retries per tenant per hour
  private readonly RETRY_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

  /**
   * Check and update rate limit for retries
   * @returns true if rate limited (should block), false if OK
   */
  private checkRetryRateLimit(
    tenantId: string,
    messageId: string,
  ): { limited: boolean; reason?: string } {
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.1) {
      // 10% chance to cleanup on each call
      for (const [key, value] of this.retryRateLimits) {
        if (now > value.resetAt) {
          this.retryRateLimits.delete(key);
        }
      }
    }

    // Check per-message limit
    const messageKey = `msg:${tenantId}:${messageId}`;
    const messageLimit = this.retryRateLimits.get(messageKey);
    if (messageLimit && now < messageLimit.resetAt) {
      if (messageLimit.count >= this.RETRY_LIMIT_PER_MESSAGE) {
        return {
          limited: true,
          reason: `Message retry limit exceeded (max ${this.RETRY_LIMIT_PER_MESSAGE}/hour)`,
        };
      }
      messageLimit.count++;
    } else {
      this.retryRateLimits.set(messageKey, {
        count: 1,
        resetAt: now + this.RETRY_WINDOW_MS,
      });
    }

    // Check per-tenant limit
    const tenantKey = `tenant:${tenantId}`;
    const tenantLimit = this.retryRateLimits.get(tenantKey);
    if (tenantLimit && now < tenantLimit.resetAt) {
      if (tenantLimit.count >= this.RETRY_LIMIT_PER_TENANT) {
        return {
          limited: true,
          reason: `Tenant retry limit exceeded (max ${this.RETRY_LIMIT_PER_TENANT}/hour)`,
        };
      }
      tenantLimit.count++;
    } else {
      this.retryRateLimits.set(tenantKey, {
        count: 1,
        resetAt: now + this.RETRY_WINDOW_MS,
      });
    }

    return { limited: false };
  }

  /**
   * Retry a failed message - resets status and pushes to queue
   * Rate limited to prevent abuse (5 retries per message/hour, 50 per tenant/hour)
   */
  async retry(tenantId: string, id: string) {
    // Check rate limits before proceeding
    const rateLimitCheck = this.checkRetryRateLimit(tenantId, id);
    if (rateLimitCheck.limited) {
      throw new BadRequestException(rateLimitCheck.reason);
    }

    const message = await this.prisma.messageLog.findFirst({
      where: { id, tenantId, status: MessageStatus.FAILED },
    });

    if (!message) {
      throw new NotFoundException('Failed message not found');
    }

    // Check max retry count (hard limit of 10 total retries)
    if (message.retryCount >= 10) {
      throw new BadRequestException(
        'Maximum retry attempts (10) reached for this message',
      );
    }

    // Reset status to QUEUED
    await this.prisma.messageLog.update({
      where: { id },
      data: {
        status: MessageStatus.QUEUED,
        retryCount: { increment: 1 },
        failedAt: null,
      },
    });

    // Create fresh job data
    const jobData: MessageJobData = {
      messageLogId: message.id,
      tenantId,
      channel: message.channel,
      recipientEmail: message.recipientEmail || undefined,
      recipientPhone: message.recipientPhone || undefined,
      subject: message.subject || undefined,
      body: message.body,
      templateId: message.templateId || undefined,
    };

    // Push to queue
    const queue = this.determineQueue(message.channel);
    await queue.add('send', jobData, {
      attempts: QUEUE_RETRY_CONFIG.attempts,
      backoff: QUEUE_RETRY_CONFIG.backoff,
    });

    return { success: true, messageId: message.id };
  }

  /**
   * Get communication stats for dashboard
   */
  async getStats(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [statusCounts, channelCounts, scheduledCount, recentActivity] =
      await Promise.all([
        this.prisma.messageLog.groupBy({
          by: ['status'],
          where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
        }),
        this.prisma.messageLog.groupBy({
          by: ['channel'],
          where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
          _count: true,
        }),
        this.prisma.scheduledMessage.count({
          where: { tenantId, status: ScheduleStatus.PENDING },
        }),
        this.prisma.messageLog.findMany({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            channel: true,
            status: true,
            recipientEmail: true,
            subject: true,
            createdAt: true,
          },
        }),
      ]);

    const statusMap = Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count]),
    );
    const channelMap = Object.fromEntries(
      channelCounts.map((c) => [c.channel.toLowerCase(), c._count]),
    );

    return {
      totalSent:
        (statusMap[MessageStatus.SENT] || 0) +
        (statusMap[MessageStatus.DELIVERED] || 0),
      totalPending:
        (statusMap[MessageStatus.PENDING] || 0) +
        (statusMap[MessageStatus.QUEUED] || 0),
      totalFailed:
        (statusMap[MessageStatus.FAILED] || 0) +
        (statusMap[MessageStatus.BOUNCED] || 0),
      totalScheduled: scheduledCount,
      byChannel: {
        email: channelMap.email || 0,
        whatsapp: channelMap.whatsapp || 0,
        sms: channelMap.sms || 0,
      },
      recentActivity,
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async resolveRecipient(
    tenantId: string,
    type: RecipientType,
    id: string,
  ) {
    switch (type) {
      case RecipientType.CANDIDATE:
        const candidate = await this.prisma.candidate.findFirst({
          where: { id, tenantId, deletedAt: null },
        });
        if (!candidate) throw new BadRequestException('Candidate not found');
        return {
          email: candidate.email,
          phone: candidate.phone,
          name: candidate.name,
        };

      case RecipientType.INTERVIEWER:
      case RecipientType.USER:
        // Check user exists AND has active membership in this tenant
        const userTenant = await this.prisma.userTenant.findFirst({
          where: {
            userId: id,
            tenantId,
            status: 'ACTIVE',
          },
          include: {
            user: {
              select: { email: true, name: true },
            },
          },
        });
        if (!userTenant || !userTenant.user) {
          throw new BadRequestException(
            'User not found or not active in tenant',
          );
        }
        return {
          email: userTenant.user.email,
          phone: null,
          name: userTenant.user.name,
        };

      case RecipientType.EXTERNAL:
        // Validate external email/phone format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[1-9]\d{6,14}$/;
        const isEmail = emailRegex.test(id);
        const isPhone = phoneRegex.test(id);
        if (!isEmail && !isPhone) {
          throw new BadRequestException(
            'External recipient must be a valid email or phone number',
          );
        }
        return {
          email: isEmail ? id : null,
          phone: isPhone ? id : null,
          name: 'External',
        };

      default:
        throw new BadRequestException('Invalid recipient type');
    }
  }
}
