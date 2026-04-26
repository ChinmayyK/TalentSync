import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { encryptObject, decryptObject } from '../../utils/crypto.util';

interface GreenhouseCredentials {
  apiKey: string;
  onBehalfOfUserId?: string;
}

/**
 * Greenhouse Auth Service
 *
 * Greenhouse uses API key authentication (Harvest API).
 * API keys don't expire but should be stored encrypted.
 */
@Injectable()
export class GreenhouseAuthService {
  private readonly logger = new Logger(GreenhouseAuthService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get configuration URL (Greenhouse uses API key, not OAuth)
   */
  getConfigUrl(tenantId: string): string {
    return `/integrations/greenhouse/configure?tenantId=${tenantId}`;
  }

  /**
   * Store API key (called when admin enters key)
   */
  async storeApiKey(
    tenantId: string,
    apiKey: string,
    onBehalfOfUserId?: string,
  ): Promise<void> {
    const credentials: GreenhouseCredentials = {
      apiKey,
      onBehalfOfUserId,
    };

    const encrypted = encryptObject(credentials);

    await this.prisma.integration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
      create: {
        tenantId,
        provider: 'greenhouse',
        tokens: encrypted,
        status: 'connected',
      },
      update: {
        tokens: encrypted,
        status: 'connected',
        lastError: null,
      },
    });

    this.logger.log(`Greenhouse API key stored for tenant ${tenantId}`);
  }

  /**
   * Get API key for requests
   */
  async getApiKey(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
    });

    if (!integration?.tokens) {
      throw new Error('Greenhouse not connected');
    }

    const credentials = decryptObject<GreenhouseCredentials>(
      integration.tokens as string,
    );
    return credentials.apiKey;
  }

  /**
   * Get On-Behalf-Of user ID if configured
   */
  async getOnBehalfOfUserId(tenantId: string): Promise<string | undefined> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
    });

    if (!integration?.tokens) {
      return undefined;
    }

    try {
      const credentials = decryptObject<GreenhouseCredentials>(
        integration.tokens as string,
      );
      return credentials.onBehalfOfUserId;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if connected
   */
  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
    });

    return integration?.status === 'connected' && !!integration.tokens;
  }

  /**
   * Get credential info for status endpoint
   */
  async getCredentialInfo(
    tenantId: string,
  ): Promise<{ valid: boolean; hasOnBehalfOf: boolean }> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'greenhouse' } },
    });

    if (!integration?.tokens) {
      return { valid: false, hasOnBehalfOf: false };
    }

    try {
      const credentials = decryptObject<GreenhouseCredentials>(
        integration.tokens as string,
      );
      return {
        valid: !!credentials.apiKey,
        hasOnBehalfOf: !!credentials.onBehalfOfUserId,
      };
    } catch {
      return { valid: false, hasOnBehalfOf: false };
    }
  }
}
