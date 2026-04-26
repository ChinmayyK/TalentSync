import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../../common/prisma.service';

interface TeamsAdaptiveCard {
  type: 'AdaptiveCard';
  $schema: string;
  version: string;
  body: TeamsCardElement[];
  actions?: TeamsAction[];
}

interface TeamsCardElement {
  type: string;
  text?: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  facts?: { title: string; value: string }[];
  items?: TeamsCardElement[];
  columns?: { type: string; width: string; items: TeamsCardElement[] }[];
}

interface TeamsAction {
  type: string;
  title: string;
  url?: string;
}

interface TeamsMessage {
  type: 'message';
  attachments: {
    contentType: 'application/vnd.microsoft.card.adaptive';
    contentUrl: null;
    content: TeamsAdaptiveCard;
  }[];
}

/**
 * Microsoft Teams Webhook Service
 *
 * Sends notifications to Teams channels via incoming webhooks.
 * Uses Adaptive Cards for rich formatting.
 *
 * Setup:
 * 1. In Teams channel, click ⋯ → Connectors → Incoming Webhook
 * 2. Configure and copy the webhook URL
 * 3. Add webhook URL to tenant settings or env: TEAMS_WEBHOOK_URL
 */
@Injectable()
export class TeamsWebhookService {
  private readonly logger = new Logger(TeamsWebhookService.name);
  private readonly cardSchema =
    'http://adaptivecards.io/schemas/adaptive-card.json';
  private readonly cardVersion = '1.4';

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
      where: { tenantId, provider: 'teams' },
      select: { settings: true },
    });

    const settings = integration?.settings as any;
    if (settings?.webhookUrl) {
      return settings.webhookUrl;
    }

    // Fallback to environment variable
    return this.configService.get<string>('TEAMS_WEBHOOK_URL') || null;
  }

  /**
   * Send a simple text message
   */
  async sendMessage(tenantId: string, text: string): Promise<boolean> {
    const card = this.createCard([{ type: 'TextBlock', text, wrap: true }]);
    return this.send(tenantId, card);
  }

  /**
   * Notify about scheduled interview
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
    const card = this.createCard(
      [
        {
          type: 'TextBlock',
          text: '📅 Interview Scheduled',
          size: 'Large',
          weight: 'Bolder',
          color: 'Accent',
        },
        {
          type: 'TextBlock',
          text: `**${data.candidateName}** has an interview scheduled`,
          wrap: true,
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Stage', value: data.stage },
            { title: 'Interviewer', value: data.interviewerName },
            { title: 'Time', value: data.dateTime.toLocaleString() },
          ],
        },
      ],
      data.meetingLink
        ? [
            {
              type: 'Action.OpenUrl',
              title: 'Join Meeting',
              url: data.meetingLink,
            },
          ]
        : undefined,
    );

    return this.send(tenantId, card);
  }

  /**
   * Notify about candidate stage change
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
    const color = this.getStageColor(data.newStage);

    const card = this.createCard([
      {
        type: 'TextBlock',
        text: '📋 Stage Changed',
        size: 'Medium',
        weight: 'Bolder',
      },
      {
        type: 'TextBlock',
        text: `**${data.candidateName}**`,
        size: 'Large',
      },
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [
              { type: 'TextBlock', text: data.previousStage, color: 'Default' },
            ],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [{ type: 'TextBlock', text: '→' }],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'TextBlock',
                text: data.newStage,
                weight: 'Bolder',
                color,
              },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        text: `Changed by ${data.changedBy}`,
        size: 'Small',
        color: 'Default',
      },
    ]);

    return this.send(tenantId, card);
  }

  /**
   * Notify about new candidate
   */
  async notifyNewCandidate(
    tenantId: string,
    data: {
      candidateName: string;
      source: string;
      roleTitle?: string;
    },
  ): Promise<boolean> {
    const card = this.createCard([
      {
        type: 'TextBlock',
        text: '👤 New Candidate',
        size: 'Medium',
        weight: 'Bolder',
        color: 'Good',
      },
      {
        type: 'TextBlock',
        text: `**${data.candidateName}**${data.roleTitle ? ` for ${data.roleTitle}` : ''}`,
        wrap: true,
      },
      {
        type: 'FactSet',
        facts: [{ title: 'Source', value: data.source }],
      },
    ]);

    return this.send(tenantId, card);
  }

  /**
   * Notify about feedback submitted
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
    const ratingStars = '⭐'.repeat(Math.min(data.rating, 5));
    const recColor = data.recommendation.toLowerCase().includes('hire')
      ? 'Good'
      : 'Default';

    const card = this.createCard([
      {
        type: 'TextBlock',
        text: '📝 Feedback Submitted',
        size: 'Medium',
        weight: 'Bolder',
      },
      {
        type: 'TextBlock',
        text: `For **${data.candidateName}**`,
        wrap: true,
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Rating', value: `${ratingStars} (${data.rating}/5)` },
          { title: 'Recommendation', value: data.recommendation },
          { title: 'Interviewer', value: data.interviewerName },
        ],
      },
    ]);

    return this.send(tenantId, card);
  }

  /**
   * Send the adaptive card to Teams
   */
  async send(tenantId: string, card: TeamsAdaptiveCard): Promise<boolean> {
    const webhookUrl = await this.getWebhookUrl(tenantId);

    if (!webhookUrl) {
      this.logger.warn(
        `No Teams webhook URL configured for tenant ${tenantId}`,
      );
      return false;
    }

    const message: TeamsMessage = {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: card,
        },
      ],
    };

    try {
      await axios.post(webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      this.logger.log(`Teams notification sent for tenant ${tenantId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send Teams notification: ${error.message}`);
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
      return { success: false, message: 'No Teams webhook URL configured' };
    }

    try {
      const card = this.createCard([
        {
          type: 'TextBlock',
          text: '✅ TalentSync connection test successful!',
          size: 'Medium',
          weight: 'Bolder',
          color: 'Good',
        },
      ]);

      await this.send(tenantId, card);
      return { success: true, message: 'Teams webhook is working' };
    } catch (error: any) {
      return { success: false, message: `Failed: ${error.message}` };
    }
  }

  /**
   * Create an Adaptive Card
   */
  private createCard(
    body: TeamsCardElement[],
    actions?: TeamsAction[],
  ): TeamsAdaptiveCard {
    return {
      type: 'AdaptiveCard',
      $schema: this.cardSchema,
      version: this.cardVersion,
      body,
      actions,
    };
  }

  private getStageColor(stage: string): string {
    const colorMap: Record<string, string> = {
      hired: 'Good',
      offer: 'Good',
      rejected: 'Attention',
      interview: 'Accent',
    };
    return colorMap[stage.toLowerCase()] || 'Default';
  }
}
