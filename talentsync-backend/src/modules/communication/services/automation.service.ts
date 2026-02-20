import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CreateAutomationDto, UpdateAutomationDto } from '../dto';
import {
  AutomationTrigger,
  Channel,
  RecipientType,
  ScheduleStatus,
} from '@prisma/client';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all automation rules for tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.automationRule.findMany({
      where: { tenantId },
      include: { template: true },
      orderBy: { trigger: 'asc' },
    });
  }

  /**
   * Get single automation rule
   */
  async findOne(tenantId: string, id: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, tenantId },
      include: { template: true },
    });

    if (!rule) {
      throw new NotFoundException('Automation rule not found');
    }

    return rule;
  }

  /**
   * Create new automation rule
   */
  async create(tenantId: string, dto: CreateAutomationDto, userId?: string) {
    // Check for duplicate trigger+channel combination
    const existing = await this.prisma.automationRule.findFirst({
      where: { tenantId, trigger: dto.trigger, channel: dto.channel },
    });

    if (existing) {
      throw new ConflictException(
        'An automation rule already exists for this trigger and channel combination',
      );
    }

    // Verify template exists and matches channel
    const template = await this.prisma.messageTemplate.findFirst({
      where: { id: dto.templateId, tenantId },
    });

    if (!template) {
      throw new BadRequestException('Template not found');
    }

    if (template.channel !== dto.channel) {
      throw new BadRequestException(
        'Template channel does not match rule channel',
      );
    }

    return this.prisma.automationRule.create({
      data: {
        tenantId,
        name: dto.name,
        trigger: dto.trigger,
        channel: dto.channel,
        templateId: dto.templateId,
        delay: dto.delay || 0,
        conditions: dto.conditions,
        createdById: userId,
      },
      include: { template: true },
    });
  }

  /**
   * Update automation rule
   */
  async update(tenantId: string, id: string, dto: UpdateAutomationDto) {
    const rule = await this.findOne(tenantId, id);

    // Verify template if changing
    if (dto.templateId && dto.templateId !== rule.templateId) {
      const template = await this.prisma.messageTemplate.findFirst({
        where: { id: dto.templateId, tenantId },
      });

      if (!template) {
        throw new BadRequestException('Template not found');
      }

      if (template.channel !== rule.channel) {
        throw new BadRequestException(
          'Template channel does not match rule channel',
        );
      }
    }

    return this.prisma.automationRule.update({
      where: { id },
      data: dto,
      include: { template: true },
    });
  }

  /**
   * Delete automation rule
   */
  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.automationRule.delete({ where: { id } });
  }

  /**
   * Toggle automation rule active status
   */
  async toggle(tenantId: string, id: string) {
    const rule = await this.findOne(tenantId, id);

    return this.prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
      include: { template: true },
    });
  }

  /**
   * Get active rules for a specific trigger
   */
  async getActiveRulesForTrigger(tenantId: string, trigger: AutomationTrigger) {
    return this.prisma.automationRule.findMany({
      where: {
        tenantId,
        trigger,
        isActive: true,
      },
      include: { template: true },
    });
  }

  /**
   * Process an automation trigger event
   * Called by interview/candidate lifecycle hooks
   */
  async processTrigger(
    tenantId: string,
    trigger: AutomationTrigger,
    context: {
      candidateId?: string;
      interviewId?: string;
      userId?: string;
      data?: Record<string, any>;
    },
  ) {
    const rules = await this.getActiveRulesForTrigger(tenantId, trigger);

    if (rules.length === 0) {
      return { processed: 0, queued: 0 };
    }

    this.logger.log(
      `Processing trigger ${trigger} for tenant ${tenantId}: ${rules.length} rules`,
    );

    let queued = 0;

    for (const rule of rules) {
      try {
        // Resolve recipient based on context
        let recipientId: string | null = null;
        let recipientType: RecipientType = RecipientType.CANDIDATE;

        if (context.candidateId) {
          recipientId = context.candidateId;
          recipientType = RecipientType.CANDIDATE;
        } else if (context.userId) {
          recipientId = context.userId;
          recipientType = RecipientType.USER;
        }

        if (!recipientId) {
          this.logger.warn(`No recipient found for rule ${rule.id}, skipping`);
          continue;
        }

        // Calculate scheduled time (apply delay if configured)
        const scheduledFor = new Date(
          Date.now() + (rule.delay || 0) * 60 * 1000,
        );

        // Ensure channel is not null
        if (!rule.channel) {
          this.logger.warn(`Rule ${rule.id} has no channel, skipping`);
          continue;
        }

        // Create scheduled message
        await this.prisma.scheduledMessage.create({
          data: {
            tenantId,
            channel: rule.channel,
            recipientType,
            recipientId,
            templateId: rule.templateId,
            payload: context.data || {},
            scheduledFor,
            status: ScheduleStatus.PENDING,
          },
        });

        queued++;
        this.logger.log(
          `Queued message for rule ${rule.name} to ${recipientId}, scheduled for ${scheduledFor}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to queue message for rule ${rule.id}:`,
          error,
        );
      }
    }

    return { processed: rules.length, queued };
  }

  /**
   * Get available triggers with descriptions
   */
  getAvailableTriggers() {
    return [
      {
        trigger: AutomationTrigger.INTERVIEW_SCHEDULED,
        description: 'When an interview is scheduled',
      },
      {
        trigger: AutomationTrigger.INTERVIEW_REMINDER_24H,
        description: '24 hours before interview',
      },
      {
        trigger: AutomationTrigger.INTERVIEW_REMINDER_1H,
        description: '1 hour before interview',
      },
      {
        trigger: AutomationTrigger.INTERVIEW_RESCHEDULED,
        description: 'When an interview is rescheduled',
      },
      {
        trigger: AutomationTrigger.INTERVIEW_CANCELLED,
        description: 'When an interview is cancelled',
      },
      {
        trigger: AutomationTrigger.INTERVIEW_COMPLETED,
        description: 'When an interview is completed',
      },
      {
        trigger: AutomationTrigger.FEEDBACK_SUBMITTED,
        description: 'When feedback is submitted',
      },
      {
        trigger: AutomationTrigger.CANDIDATE_STAGE_CHANGED,
        description: 'When candidate stage changes',
      },
      {
        trigger: AutomationTrigger.OFFER_EXTENDED,
        description: 'When an offer is extended',
      },
    ];
  }
}
