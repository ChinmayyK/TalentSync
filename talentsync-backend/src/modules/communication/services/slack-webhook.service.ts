import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../../common/prisma.service';

interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  accessory?: any;
}

interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: { title: string; value: string; short?: boolean }[];
  footer?: string;
  ts?: number;
}

/**
 * Slack Webhook Service
 *
 * Sends notifications to Slack channels via incoming webhooks.
 *
 * Setup:
 * 1. Create a Slack App: https://api.slack.com/apps
 * 2. Enable Incoming Webhooks
 * 3. Add webhook URL to tenant settings or env: SLACK_WEBHOOK_URL
 */
@Injectable()
export class SlackWebhookService {
  private readonly logger = new Logger(SlackWebhookService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get webhook URL for tenant (from integration config or fallback to env)
   */
  private async getWebhookUrl(tenantId: string): Promise<string | null> {
    // Try tenant-specific integration config first
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'slack' },
      select: { settings: true },
    });

    const settings = integration?.settings as any;
    if (settings?.webhookUrl) {
      return settings.webhookUrl;
    }

    // Fallback to environment variable
    return this.configService.get<string>('SLACK_WEBHOOK_URL') || null;
  }

  /**
   * Send a simple text message to Slack
   */
  async sendMessage(tenantId: string, text: string): Promise<boolean> {
    return this.send(tenantId, { text });
  }

  /**
   * Send a rich notification for interview scheduled
   */
  async notifyInterviewScheduled(
    tenantId: string,
    data: {
      candidateName: string;
      interviewerName: string;
      dateTime: Date;
      stage: string;
      meetingLink?: string;
    },
  ): Promise<boolean> {
    const message: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📅 Interview Scheduled',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.candidateName}* has an interview scheduled`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              `*Stage:* ${data.stage}`,
              `*Interviewer:* ${data.interviewerName}`,
              `*Time:* ${data.dateTime.toLocaleString()}`,
              data.meetingLink
                ? `*Link:* <${data.meetingLink}|Join Meeting>`
                : '',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        },
      ],
    };

    return this.send(tenantId, message);
  }

  /**
   * Send notification for candidate stage change
   */
  async notifyCandidateStageChanged(
    tenantId: string,
    data: {
      candidateName: string;
      previousStage: string;
      newStage: string;
      changedBy: string;
    },
  ): Promise<boolean> {
    const emoji = this.getStageEmoji(data.newStage);

    const message: SlackMessage = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${data.candidateName}* moved from _${data.previousStage}_ → *${data.newStage}*`,
          },
        },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `Changed by ${data.changedBy}` }],
        },
      ],
    };

    return this.send(tenantId, message);
  }

  /**
   * Send notification for new candidate added
   */
  async notifyNewCandidate(
    tenantId: string,
    data: {
      candidateName: string;
      source: string;
      roleTitle?: string;
    },
  ): Promise<boolean> {
    const message: SlackMessage = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `👤 New candidate: *${data.candidateName}*${data.roleTitle ? ` for ${data.roleTitle}` : ''}`,
          },
        },
        {
          type: 'context',
          elements: [{ type: 'mrkdwn', text: `Source: ${data.source}` }],
        },
      ],
    };

    return this.send(tenantId, message);
  }

  /**
   * Send notification for feedback submitted
   */
  async notifyFeedbackSubmitted(
    tenantId: string,
    data: {
      candidateName: string;
      interviewerName: string;
      rating: number;
      recommendation: string;
    },
  ): Promise<boolean> {
    const ratingEmoji = '⭐'.repeat(Math.min(data.rating, 5));

    const message: SlackMessage = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📝 Feedback submitted for *${data.candidateName}*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              `*Rating:* ${ratingEmoji} (${data.rating}/5)`,
              `*Recommendation:* ${data.recommendation}`,
              `*By:* ${data.interviewerName}`,
            ].join('\n'),
          },
        },
      ],
    };

    return this.send(tenantId, message);
  }

  /**
   * Send a custom webhook message
   */
  async send(tenantId: string, message: SlackMessage): Promise<boolean> {
    const webhookUrl = await this.getWebhookUrl(tenantId);

    if (!webhookUrl) {
      this.logger.warn(
        `No Slack webhook URL configured for tenant ${tenantId}`,
      );
      return false;
    }

    try {
      await axios.post(webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      this.logger.log(`Slack notification sent for tenant ${tenantId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send Slack notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Test webhook configuration
   */
  async testConnection(
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    const webhookUrl = await this.getWebhookUrl(tenantId);

    if (!webhookUrl) {
      return { success: false, message: 'No Slack webhook URL configured' };
    }

    try {
      await axios.post(webhookUrl, {
        text: '✅ TalentSync connection test successful!',
      });
      return { success: true, message: 'Slack webhook is working' };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  private getStageEmoji(stage: string): string {
    const emojiMap: Record<string, string> = {
      applied: '📥',
      screening: '🔍',
      interview: '🎤',
      interview_1: '1️⃣',
      interview_2: '2️⃣',
      hr_round: '👥',
      offer: '💼',
      hired: '🎉',
      rejected: '❌',
    };
    return emojiMap[stage.toLowerCase()] || '📋';
  }
}
