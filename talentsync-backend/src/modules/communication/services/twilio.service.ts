import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class TwilioService implements OnModuleInit {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio | null = null;
  private fromNumber: string | null = null;
  private isMockMode = true;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber =
      this.configService.get<string>('TWILIO_FROM_NUMBER') || null;

    if (accountSid && authToken && this.fromNumber) {
      try {
        this.client = new Twilio(accountSid, authToken);
        this.isMockMode = false;
        this.logger.log('✅ Twilio SMS integration enabled');
      } catch (error) {
        this.logger.warn(
          `⚠️ Twilio initialization failed: ${error.message}. Using mock mode.`,
        );
        this.isMockMode = true;
      }
    } else {
      this.logger.warn(
        '⚠️ Twilio credentials not configured. SMS will be mocked.',
      );
      this.isMockMode = true;
    }
  }

  /**
   * Check if Twilio is properly configured for production use
   */
  isEnabled(): boolean {
    return !this.isMockMode && !!this.client;
  }

  /**
   * Send an SMS message
   */
  async sendSms(to: string, body: string): Promise<SmsSendResult> {
    // Normalize phone number (ensure it starts with +)
    const normalizedTo = to.startsWith('+') ? to : `+${to}`;

    if (this.isMockMode) {
      return this.mockSend(normalizedTo, body);
    }

    try {
      const message = await this.client!.messages.create({
        body,
        to: normalizedTo,
        from: this.fromNumber!,
      });

      this.logger.log(`SMS sent successfully: ${message.sid}`);

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${normalizedTo}: ${error.message}`,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mock SMS send for development/testing
   */
  private async mockSend(to: string, body: string): Promise<SmsSendResult> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    const mockSid = `SM${Date.now()}${Math.random().toString(36).substring(2, 9)}`;

    this.logger.debug(
      `[MOCK SMS] To: ${to}, Body: ${body.substring(0, 50)}...`,
    );

    return {
      success: true,
      messageId: mockSid,
    };
  }

  /**
   * Validate a phone number format
   */
  isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    return e164Regex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}
