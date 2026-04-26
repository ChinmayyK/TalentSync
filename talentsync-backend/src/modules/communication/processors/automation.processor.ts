import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import { VariableResolverService } from '../services/variable-resolver.service';
import {
  COMMUNICATION_QUEUES,
  AutomationJobData,
  MessageJobData,
} from '../queues';
import { AutomationTrigger, Channel, ScheduleStatus } from '@prisma/client';

@Processor(COMMUNICATION_QUEUES.AUTOMATION)
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private variableResolver: VariableResolverService,
    @InjectQueue(COMMUNICATION_QUEUES.EMAIL) private emailQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.WHATSAPP) private whatsappQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.SMS) private smsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<AutomationJobData>): Promise<void> {
    const { tenantId, trigger, entityId, entityType, data } = job.data;
    this.logger.log(
      `Processing automation trigger: ${trigger} for ${entityType} ${entityId}`,
    );

    // Load all active rules for this trigger
    const rules = await this.prisma.automationRule.findMany({
      where: {
        tenantId,
        trigger: trigger as AutomationTrigger,
        isActive: true,
      },
      include: { template: true },
    });

    if (rules.length === 0) {
      this.logger.debug(`No active automation rules for trigger ${trigger}`);
      return;
    }

    this.logger.log(`Found ${rules.length} automation rules to execute`);

    // Resolve variables for interview-related triggers
    let resolvedVars: Record<string, any> = { ...data };
    if (entityType === 'INTERVIEW') {
      try {
        const vars = await this.variableResolver.resolveForInterview(
          tenantId,
          entityId,
        );
        resolvedVars = {
          ...resolvedVars,
          ...this.variableResolver.flatten(vars),
        };
      } catch (e) {
        this.logger.warn(
          `Could not resolve variables for interview ${entityId}: ${e.message}`,
        );
      }
    }

    // Get recipient info based on entity type
    const recipientInfo = await this.resolveRecipient(
      tenantId,
      entityType,
      entityId,
      data,
    );

    for (const rule of rules) {
      // Skip if no template (handled by new RuleProcessor or valid for non-comm actions)
      if (!rule.template) continue;

      try {
        // Render template with context
        const renderedBody = this.renderTemplate(
          rule.template.body,
          resolvedVars,
        );
        const renderedSubject = rule.template.subject
          ? this.renderTemplate(rule.template.subject, resolvedVars)
          : undefined;

        // Calculate scheduled time based on trigger type
        const scheduledFor = this.calculateScheduledTime(
          trigger,
          data,
          rule.delay,
        );

        if (rule.delay === 0 || scheduledFor <= new Date()) {
          // Send immediately
          await this.sendImmediate(
            tenantId,
            rule,
            recipientInfo,
            renderedSubject,
            renderedBody,
            { interviewId: entityId, trigger },
          );
        } else {
          // Schedule for later
          await this.scheduleMessage(
            tenantId,
            rule,
            recipientInfo,
            renderedSubject,
            renderedBody,
            scheduledFor,
            { interviewId: entityId, trigger },
          );
        }

        this.logger.log(`Processed automation rule ${rule.id} for ${trigger}`);
      } catch (error) {
        this.logger.error(
          `Failed to process automation rule ${rule.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Calculate when to send based on trigger type and delay
   */
  private calculateScheduledTime(
    trigger: string,
    data: Record<string, any>,
    delay: number,
  ): Date {
    const interviewDate = data.interviewDate
      ? new Date(data.interviewDate)
      : null;

    // For reminder triggers, schedule relative to interview time
    if (trigger === 'INTERVIEW_REMINDER_24H' && interviewDate) {
      return new Date(interviewDate.getTime() - 24 * 60 * 60 * 1000);
    }
    if (trigger === 'INTERVIEW_REMINDER_1H' && interviewDate) {
      return new Date(interviewDate.getTime() - 60 * 60 * 1000);
    }

    // For other triggers, schedule based on delay (in minutes)
    if (delay > 0) {
      return new Date(Date.now() + delay * 60 * 1000);
    }

    return new Date(); // Send now
  }

  private async sendImmediate(
    tenantId: string,
    rule: any,
    recipientInfo: any,
    subject: string | undefined,
    body: string,
    metadata: { interviewId?: string; trigger?: string } = {},
  ) {
    // Create MessageLog with interview context
    const messageLog = await this.prisma.messageLog.create({
      data: {
        tenantId,
        channel: rule.channel,
        templateId: rule.templateId,
        recipientType: recipientInfo.type,
        recipientId: recipientInfo.id,
        recipientEmail: recipientInfo.email,
        recipientPhone: recipientInfo.phone,
        subject: subject || '',
        body,
        status: 'QUEUED',
        metadata: metadata as any,
      },
    });

    // Dispatch to queue
    const jobData: MessageJobData = {
      messageLogId: messageLog.id,
      tenantId,
      channel: rule.channel,
      recipientEmail: recipientInfo.email,
      recipientPhone: recipientInfo.phone,
      subject,
      body,
      templateId: rule.templateId,
    };

    const queue = this.getQueueForChannel(rule.channel);
    await queue.add('send', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  private async scheduleMessage(
    tenantId: string,
    rule: any,
    recipientInfo: any,
    subject: string | undefined,
    body: string,
    scheduledFor: Date,
    metadata: { interviewId?: string; trigger?: string } = {},
  ) {
    await this.prisma.scheduledMessage.create({
      data: {
        tenantId,
        channel: rule.channel,
        templateId: rule.templateId,
        recipientType: recipientInfo.type,
        recipientId: recipientInfo.id,
        scheduledFor,
        status: ScheduleStatus.PENDING,
        payload: {
          subject,
          body,
          recipientEmail: recipientInfo.email,
          recipientPhone: recipientInfo.phone,
          ...metadata,
        },
      },
    });

    this.logger.log(`Scheduled message for ${scheduledFor.toISOString()}`);
  }

  private async resolveRecipient(
    tenantId: string,
    entityType: string,
    entityId: string,
    data: Record<string, any>,
  ) {
    if (entityType === 'INTERVIEW') {
      const interview = await this.prisma.interview.findFirst({
        where: { id: entityId, tenantId },
        include: { candidate: true },
      });

      if (interview?.candidate) {
        return {
          type: 'CANDIDATE',
          id: interview.candidate.id,
          email: interview.candidate.email,
          phone: interview.candidate.phone,
          name: interview.candidate.name,
        };
      }
    }

    if (entityType === 'CANDIDATE') {
      const candidate = await this.prisma.candidate.findFirst({
        where: { id: entityId, tenantId },
      });

      if (candidate) {
        return {
          type: 'CANDIDATE',
          id: candidate.id,
          email: candidate.email,
          phone: candidate.phone,
          name: candidate.name,
        };
      }
    }

    // Fallback to data provided in job
    return {
      type: data.recipientType || 'EXTERNAL',
      id: data.recipientId || entityId,
      email: data.recipientEmail,
      phone: data.recipientPhone,
      name: data.recipientName || 'Unknown',
    };
  }

  private renderTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    // Handlebars-like variable replacement with nested support
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = trimmedKey
        .split('.')
        .reduce((obj: any, k: string) => obj?.[k], context);
      return value !== undefined ? String(value) : match;
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

  @OnWorkerEvent('failed')
  onFailed(job: Job<AutomationJobData>, error: Error) {
    this.logger.error(`Automation job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<AutomationJobData>) {
    this.logger.log(`Automation job ${job.id} completed`);
  }
}
