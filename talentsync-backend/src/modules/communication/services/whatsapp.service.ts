import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma.service';
import { Channel } from '@prisma/client';
import { decryptObject } from '../../integrations/utils/crypto.util';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  businessId?: string;
}

/**
 * WhatsApp Cloud API Service
 *
 * Uses Meta's WhatsApp Business Cloud API (graph.facebook.com).
 * Supports per-tenant configuration with fallback to env vars.
 */
@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  // Global fallback credentials (from env)
  private globalPhoneNumberId: string | null = null;
  private globalAccessToken: string | null = null;
  private isMockMode = true;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.globalPhoneNumberId =
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || null;
    this.globalAccessToken =
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || null;

    if (this.globalPhoneNumberId && this.globalAccessToken) {
      this.isMockMode = false;
      this.logger.log('✅ WhatsApp Cloud API enabled (global credentials)');
    } else {
      this.logger.warn(
        '⚠️ WhatsApp credentials not configured. Using mock mode.',
      );
    }
  }

  /**
   * Check if WhatsApp is enabled (globally or per-tenant)
   */
  async isEnabled(tenantId?: string): Promise<boolean> {
    if (tenantId) {
      const creds = await this.getTenantCredentials(tenantId);
      if (creds) return true;
    }
    return !this.isMockMode;
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendMessage(
    to: string,
    body: string,
    tenantId?: string,
  ): Promise<WhatsAppSendResult> {
    const normalizedTo = this.normalizePhoneNumber(to);

    // Get credentials (tenant-specific or global)
    const creds = await this.getCredentials(tenantId);

    if (!creds) {
      return this.mockSend(normalizedTo, body);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${creds.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedTo,
            type: 'text',
            text: { body },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Unknown WhatsApp API error';
        this.logger.error(`WhatsApp API error: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`WhatsApp message sent: ${messageId}`);

      return { success: true, messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send WhatsApp: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Send a template message (for approved templates)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: unknown[],
    tenantId?: string,
  ): Promise<WhatsAppSendResult> {
    const normalizedTo = this.normalizePhoneNumber(to);
    const creds = await this.getCredentials(tenantId);

    if (!creds) {
      return this.mockSend(normalizedTo, `[Template: ${templateName}]`);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${creds.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedTo,
            type: 'template',
            template: {
              name: templateName,
              language: { code: languageCode },
              components: components || [],
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || 'Unknown error';
        return { success: false, error: errorMsg };
      }

      const messageId = data.messages?.[0]?.id;
      this.logger.log(`WhatsApp template sent: ${messageId}`);

      return { success: true, messageId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Test connection
   */
  async testConnection(
    tenantId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const creds = await this.getCredentials(tenantId);

    if (!creds) {
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${creds.phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          message: data.error?.message || 'Connection failed',
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected: ${data.display_phone_number || creds.phoneNumberId}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async getCredentials(
    tenantId?: string,
  ): Promise<WhatsAppCredentials | null> {
    // Try tenant-specific first
    if (tenantId) {
      const tenantCreds = await this.getTenantCredentials(tenantId);
      if (tenantCreds) return tenantCreds;
    }

    // Fall back to global
    if (this.globalPhoneNumberId && this.globalAccessToken) {
      return {
        phoneNumberId: this.globalPhoneNumberId,
        accessToken: this.globalAccessToken,
      };
    }

    return null;
  }

  private async getTenantCredentials(
    tenantId: string,
  ): Promise<WhatsAppCredentials | null> {
    const config = await this.prisma.channelConfig.findFirst({
      where: { tenantId, channel: Channel.WHATSAPP, isActive: true },
    });

    if (!config?.credentials) return null;

    try {
      const rawCreds = config.credentials as any;
      let decrypted: any;

      if (rawCreds?.encrypted) {
        decrypted = decryptObject(rawCreds.encrypted);
      } else {
        decrypted = rawCreds;
      }

      if (decrypted.phoneNumberId && decrypted.accessToken) {
        return {
          phoneNumberId: decrypted.phoneNumberId,
          accessToken: decrypted.accessToken,
          businessId: decrypted.businessId,
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to decrypt WhatsApp credentials for tenant ${tenantId}`,
      );
    }

    return null;
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digits except leading +
    let normalized = phone.replace(/[^\d+]/g, '');
    // Ensure no leading + for WhatsApp API (they expect just digits)
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    return normalized;
  }

  private async mockSend(
    to: string,
    body: string,
  ): Promise<WhatsAppSendResult> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const mockId = `wamid.mock${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    this.logger.debug(
      `[MOCK WhatsApp] To: ${to}, Body: ${body.substring(0, 50)}...`,
    );

    return { success: true, messageId: mockId };
  }

  isValidPhoneNumber(phone: string): boolean {
    const e164Regex = /^\+?[1-9]\d{1,14}$/;
    return e164Regex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}
