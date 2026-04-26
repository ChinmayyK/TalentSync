import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import {
  ChannelConfigDto,
  EmailConfigDto,
  WhatsAppConfigDto,
  SMSConfigDto,
} from '../dto';
import { Channel } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import {
  encryptObject,
  decryptObject,
} from '../../integrations/utils/crypto.util';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all channel configurations for tenant
   */
  async findAll(tenantId: string) {
    const configs = await this.prisma.channelConfig.findMany({
      where: { tenantId },
    });

    // Mask sensitive credentials
    return configs.map((config) => ({
      ...config,
      credentials: this.maskCredentials(config.credentials as any),
    }));
  }

  /**
   * Get single channel configuration
   */
  async findOne(tenantId: string, channel: Channel) {
    const config = await this.prisma.channelConfig.findFirst({
      where: { tenantId, channel },
    });

    if (!config) {
      throw new NotFoundException(`${channel} configuration not found`);
    }

    return {
      ...config,
      credentials: this.maskCredentials(config.credentials as any),
    };
  }

  /**
   * Get raw config (internal use only - for sending)
   * Decrypts credentials before returning
   */
  async getConfigForSending(tenantId: string, channel: Channel) {
    const config = await this.prisma.channelConfig.findFirst({
      where: { tenantId, channel, isActive: true },
    });

    if (!config) return null;

    // Decrypt credentials if encrypted
    const rawCreds = config.credentials as any;
    let decryptedCredentials: any;

    if (rawCreds?.encrypted) {
      try {
        decryptedCredentials = decryptObject(rawCreds.encrypted);
      } catch (error) {
        // Try parsing as plain JSON (legacy data or encryption failure fallback)
        try {
          decryptedCredentials = JSON.parse(rawCreds.encrypted);
        } catch {
          console.error('Failed to decrypt credentials for channel:', channel);
          decryptedCredentials = rawCreds;
        }
      }
    } else {
      // Legacy: plain credentials
      decryptedCredentials = rawCreds;
    }

    return {
      ...config,
      credentials: decryptedCredentials,
    };
  }

  /**
   * Create or update channel configuration
   */
  async upsert(tenantId: string, dto: ChannelConfigDto) {
    const provider = this.getProvider(dto);

    // Encrypt credentials before storing
    let encryptedCredentials: string;
    try {
      encryptedCredentials = encryptObject(dto.credentials);
    } catch (error) {
      // If encryption fails (e.g., ENCRYPTION_KEY not set), store as plain JSON with warning
      console.warn(
        'Credential encryption failed, storing as plain JSON:',
        error.message,
      );
      encryptedCredentials = JSON.stringify(dto.credentials);
    }

    return this.prisma.channelConfig.upsert({
      where: {
        tenantId_channel: { tenantId, channel: dto.channel },
      },
      update: {
        provider,
        credentials: { encrypted: encryptedCredentials } as any,
        settings: dto.settings,
        isVerified: false, // Reset verification on update
      },
      create: {
        tenantId,
        channel: dto.channel,
        provider,
        credentials: { encrypted: encryptedCredentials } as any,
        settings: dto.settings,
      },
    });
  }

  /**
   * Test channel connection
   */
  async test(
    tenantId: string,
    channel: Channel,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.prisma.channelConfig.findFirst({
      where: { tenantId, channel },
    });

    if (!config) {
      throw new NotFoundException(`${channel} configuration not found`);
    }

    try {
      switch (channel) {
        case Channel.EMAIL:
          return await this.testEmail(config.credentials as any);
        case Channel.WHATSAPP:
          return await this.testWhatsApp(config.credentials as any);
        case Channel.SMS:
          return await this.testSms(config.credentials as any);
        default:
          throw new BadRequestException('Unknown channel type');
      }
    } catch (error) {
      // Update config with failed test
      await this.prisma.channelConfig.update({
        where: { id: config.id },
        data: {
          isVerified: false,
          lastTestedAt: new Date(),
        },
      });

      return {
        success: false,
        message: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Delete channel configuration
   */
  async delete(tenantId: string, channel: Channel) {
    const config = await this.prisma.channelConfig.findFirst({
      where: { tenantId, channel },
    });

    if (!config) {
      throw new NotFoundException(`${channel} configuration not found`);
    }

    return this.prisma.channelConfig.delete({ where: { id: config.id } });
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private getProvider(dto: ChannelConfigDto): string {
    switch (dto.channel) {
      case Channel.EMAIL:
        return (dto.credentials as EmailConfigDto).provider || 'smtp';
      case Channel.WHATSAPP:
        return 'whatsapp_cloud';
      case Channel.SMS:
        return (dto.credentials as SMSConfigDto).provider || 'twilio';
      default:
        return 'unknown';
    }
  }

  private maskCredentials(creds: Record<string, any>): Record<string, any> {
    if (!creds) return {};

    const masked: Record<string, any> = {};
    const sensitiveKeys = [
      'password',
      'accessToken',
      'authToken',
      'apiKey',
      'secret',
    ];

    for (const [key, value] of Object.entries(creds)) {
      if (
        sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
      ) {
        masked[key] = value ? '••••••••' : null;
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  private async testEmail(
    creds: EmailConfigDto,
  ): Promise<{ success: boolean; message: string }> {
    if (creds.provider === 'ses') {
      // SES connection test - verify credentials by calling SES API
      if (!creds.accessKeyId || !creds.secretAccessKey || !creds.region) {
        throw new BadRequestException(
          'SES requires accessKeyId, secretAccessKey, and region',
        );
      }

      try {
        // Use AWS SDK to verify SES credentials by getting send quota
        const { SESClient, GetSendQuotaCommand } =
          await import('@aws-sdk/client-ses');
        const sesClient = new SESClient({
          region: creds.region,
          credentials: {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
          },
        });

        const result = await sesClient.send(new GetSendQuotaCommand({}));
        return {
          success: true,
          message: `SES connected. Daily quota: ${result.Max24HourSend}, Used: ${result.SentLast24Hours}`,
        };
      } catch (error: any) {
        throw new BadRequestException(
          `SES connection failed: ${error.message}`,
        );
      }
    }

    // SMTP test
    if (!creds.host) {
      throw new BadRequestException('SMTP host is required');
    }

    const transporter = nodemailer.createTransport({
      host: creds.host,
      port: creds.port || 587,
      secure: creds.secure || false,
      auth: creds.username
        ? {
            user: creds.username,
            pass: creds.password,
          }
        : undefined,
    });

    await transporter.verify();

    // Update config as verified
    return { success: true, message: 'SMTP connection successful' };
  }

  private async testWhatsApp(
    creds: WhatsAppConfigDto,
  ): Promise<{ success: boolean; message: string }> {
    if (!creds.businessId || !creds.phoneNumberId || !creds.accessToken) {
      throw new BadRequestException('Missing required WhatsApp credentials');
    }

    // WhatsApp Business API health check - verify phone number exists
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${creds.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new BadRequestException(
          `WhatsApp API error: ${error.error?.message || 'Unknown error'}`,
        );
      }

      const data = await response.json();
      return {
        success: true,
        message: `WhatsApp connected. Phone: ${data.display_phone_number || creds.phoneNumberId}`,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `WhatsApp connection failed: ${error.message}`,
      );
    }
  }

  private async testSms(
    creds: SMSConfigDto,
  ): Promise<{ success: boolean; message: string }> {
    if (!creds.accountSid || !creds.authToken || !creds.fromNumber) {
      throw new BadRequestException('Missing required SMS credentials');
    }

    // Twilio account verification - fetch account info
    try {
      const authString = Buffer.from(
        `${creds.accountSid}:${creds.authToken}`,
      ).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${authString}`,
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Invalid Twilio credentials');
      }

      const data = await response.json();
      return {
        success: true,
        message: `Twilio connected. Account: ${data.friendly_name}, Status: ${data.status}`,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Twilio connection failed: ${error.message}`,
      );
    }
  }
}
