import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../../common/prisma.service';
import type { ReceiptJobData } from '../queues';
import { MessageStatus } from '@prisma/client';

/**
 * Webhook receiver for delivery receipts from messaging providers
 * Handles: WhatsApp, SES (email), Twilio (SMS)
 */
@ApiTags('Communication Webhooks')
@Controller('api/v1/webhooks/communication')
export class ReceiptController {
  private readonly logger = new Logger(ReceiptController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * WhatsApp Cloud API webhook
   */
  @Post('whatsapp')
  @ApiOperation({ summary: 'WhatsApp delivery webhook' })
  async handleWhatsAppWebhook(@Body() payload: any) {
    this.logger.log('Received WhatsApp webhook');

    // Handle verification challenge (WhatsApp requires this)
    if (payload['hub.mode'] === 'subscribe') {
      return payload['hub.challenge'];
    }

    // Process status updates
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const statuses = changes?.value?.statuses;

    if (statuses) {
      for (const status of statuses) {
        await this.updateMessageStatus({
          provider: 'whatsapp',
          externalId: status.id,
          status: this.mapWhatsAppStatus(status.status),
          timestamp: status.timestamp,
        });
      }
    }

    return { success: true };
  }

  /**
   * AWS SES webhook (via SNS)
   */
  @Post('ses')
  @ApiOperation({ summary: 'AWS SES delivery webhook' })
  async handleSesWebhook(@Body() payload: any) {
    this.logger.log('Received SES webhook');

    // Handle SNS subscription confirmation
    if (payload.Type === 'SubscriptionConfirmation') {
      this.logger.log('SES subscription confirmation received');
      // In production, confirm the subscription
      return { success: true };
    }

    // Parse SNS message
    const message =
      typeof payload.Message === 'string'
        ? JSON.parse(payload.Message)
        : payload.Message;

    if (message?.eventType) {
      const messageId = message.mail?.messageId;
      if (messageId) {
        await this.updateMessageStatus({
          provider: 'ses',
          externalId: messageId,
          status: this.mapSesStatus(message.eventType),
          timestamp: message.mail?.timestamp,
          metadata: message,
        });
      }
    }

    return { success: true };
  }

  /**
   * Twilio SMS webhook
   */
  @Post('twilio')
  @ApiOperation({ summary: 'Twilio SMS delivery webhook' })
  async handleTwilioWebhook(@Body() payload: any) {
    this.logger.log('Received Twilio webhook');

    const messageSid = payload.MessageSid;
    const messageStatus = payload.MessageStatus;

    if (messageSid && messageStatus) {
      await this.updateMessageStatus({
        provider: 'twilio',
        externalId: messageSid,
        status: this.mapTwilioStatus(messageStatus),
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  }

  /**
   * Mock webhook for testing
   */
  @Post('mock')
  @ApiOperation({ summary: 'Mock delivery webhook for testing' })
  async handleMockWebhook(@Body() payload: ReceiptJobData) {
    this.logger.log('Received mock webhook', payload);

    await this.updateMessageStatus(payload);

    return { success: true, processed: payload.externalId };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private async updateMessageStatus(data: ReceiptJobData) {
    const { externalId, status, timestamp, metadata } = data;

    // Find MessageLog by externalId
    const messageLog = await this.prisma.messageLog.findFirst({
      where: { externalId },
    });

    if (!messageLog) {
      this.logger.warn(`MessageLog not found for externalId: ${externalId}`);
      return;
    }

    // Update based on status
    const updateData: any = {
      metadata: {
        ...((messageLog.metadata as any) || {}),
        lastWebhook: { status, timestamp, ...metadata },
      },
    };

    switch (status) {
      case 'delivered':
        updateData.status = MessageStatus.DELIVERED;
        updateData.deliveredAt = new Date(timestamp);
        break;
      case 'read':
        updateData.status = MessageStatus.READ;
        updateData.readAt = new Date(timestamp);
        break;
      case 'failed':
        updateData.status = MessageStatus.FAILED;
        updateData.failedAt = new Date(timestamp);
        break;
      case 'bounced':
        updateData.status = MessageStatus.BOUNCED;
        updateData.failedAt = new Date(timestamp);
        break;
    }

    await this.prisma.messageLog.update({
      where: { id: messageLog.id },
      data: updateData,
    });

    this.logger.log(`Updated MessageLog ${messageLog.id} status to ${status}`);
  }

  private mapWhatsAppStatus(status: string): ReceiptJobData['status'] {
    switch (status) {
      case 'delivered':
        return 'delivered';
      case 'read':
        return 'read';
      case 'failed':
        return 'failed';
      default:
        return 'delivered';
    }
  }

  private mapSesStatus(eventType: string): ReceiptJobData['status'] {
    switch (eventType) {
      case 'Delivery':
        return 'delivered';
      case 'Bounce':
        return 'bounced';
      case 'Complaint':
        return 'failed';
      case 'Reject':
        return 'failed';
      default:
        return 'delivered';
    }
  }

  private mapTwilioStatus(status: string): ReceiptJobData['status'] {
    switch (status) {
      case 'delivered':
        return 'delivered';
      case 'undelivered':
      case 'failed':
        return 'failed';
      default:
        return 'delivered';
    }
  }
}
