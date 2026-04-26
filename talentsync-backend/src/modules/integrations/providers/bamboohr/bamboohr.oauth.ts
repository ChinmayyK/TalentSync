import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../common/prisma.service';
import { encryptObject, decryptObject } from '../../utils/crypto.util';
import axios from 'axios';

interface BambooHRTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  companyDomain: string;
  expires_at?: number;
}

/**
 * BambooHR OAuth Service
 * Handles OAuth 2.0 authentication for BambooHR API
 *
 * OAuth URLs:
 * - Auth: https://{companyDomain}.bamboohr.com/authorize.php
 * - Token: https://{companyDomain}.bamboohr.com/token.php
 */
@Injectable()
export class BambooHROAuthService {
  private readonly logger = new Logger(BambooHROAuthService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get OAuth authorization URL
   * Note: BambooHR OAuth requires the company domain in the URL
   * Company domain is configured via BAMBOOHR_COMPANY_DOMAIN env var
   */
  getAuthUrl(tenantId: string, companyDomain?: string): string {
    const clientId = this.configService.get<string>('BAMBOOHR_CLIENT_ID');
    const redirectUri = this.configService.get<string>('BAMBOOHR_REDIRECT_URI');
    const domain =
      companyDomain ||
      this.configService.get<string>('BAMBOOHR_COMPANY_DOMAIN');

    if (!clientId || !redirectUri) {
      throw new Error(
        'BambooHR OAuth credentials not configured. Set BAMBOOHR_CLIENT_ID, BAMBOOHR_CLIENT_SECRET, and BAMBOOHR_REDIRECT_URI.',
      );
    }

    if (!domain) {
      throw new Error(
        'BambooHR company domain not configured. Set BAMBOOHR_COMPANY_DOMAIN to your subdomain (e.g., "acme" for acme.bamboohr.com).',
      );
    }

    // Scopes - must match what's enabled in BambooHR app settings
    // Request write access for employee creation
    // BambooHR requires specific sub-scope format for write access
    const scopes = [
      'openid',
      'email',
      'employee.write', // Request write access to employee
      'employee', // Base employee access
      'offline_access', // For refresh tokens
    ].join('+');

    const state = Buffer.from(
      JSON.stringify({ tenantId, companyDomain: domain }),
    ).toString('base64');

    return (
      `https://${domain}.bamboohr.com/authorize.php?` +
      `request=authorize&response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes}&` +
      `state=${state}`
    );
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    tenantId: string,
    code: string,
    companyDomain: string,
  ): Promise<void> {
    const clientId = this.configService.get<string>('BAMBOOHR_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'BAMBOOHR_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get<string>('BAMBOOHR_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('BambooHR OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        `https://${companyDomain}.bamboohr.com/token.php?request=token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const tokens: BambooHRTokens = {
        ...response.data,
        companyDomain,
        expires_at: Date.now() + response.data.expires_in * 1000,
      };

      await this.storeTokens(tenantId, tokens);
      this.logger.log(`BambooHR OAuth tokens stored for tenant ${tenantId}`);
    } catch (error: any) {
      this.logger.error(
        'Failed to exchange BambooHR code:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to authenticate with BambooHR');
    }
  }

  /**
   * Refresh access token
   */
  async refreshTokens(tenantId: string): Promise<void> {
    const tokens = await this.getTokens(tenantId);
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const clientId = this.configService.get<string>('BAMBOOHR_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'BAMBOOHR_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get<string>('BAMBOOHR_REDIRECT_URI');

    try {
      const response = await axios.post(
        `https://${tokens.companyDomain}.bamboohr.com/token.php?request=token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
          redirect_uri: redirectUri,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const newTokens: BambooHRTokens = {
        ...response.data,
        companyDomain: tokens.companyDomain,
        expires_at: Date.now() + response.data.expires_in * 1000,
      };

      await this.storeTokens(tenantId, newTokens);
      this.logger.log(`BambooHR tokens refreshed for tenant ${tenantId}`);
    } catch (error: any) {
      this.logger.error(
        'Failed to refresh BambooHR tokens:',
        error.response?.data || error.message,
      );
      await this.markAuthFailed(tenantId);
      throw new Error('Failed to refresh BambooHR tokens');
    }
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getValidAccessToken(tenantId: string): Promise<string> {
    const tokens = await this.getTokens(tenantId);
    if (!tokens) {
      throw new Error('BambooHR not connected');
    }

    // Refresh if token expires within 5 minutes
    if (tokens.expires_at && tokens.expires_at < Date.now() + 300000) {
      await this.refreshTokens(tenantId);
      const refreshedTokens = await this.getTokens(tenantId);
      return refreshedTokens!.access_token;
    }

    return tokens.access_token;
  }

  /**
   * Get company domain
   */
  async getCompanyDomain(tenantId: string): Promise<string> {
    const tokens = await this.getTokens(tenantId);
    if (!tokens?.companyDomain) {
      throw new Error('BambooHR not connected');
    }
    return tokens.companyDomain;
  }

  /**
   * Check if connected
   */
  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
    });
    return integration?.status === 'connected' && !!integration.tokens;
  }

  /**
   * Disconnect
   */
  async disconnect(tenantId: string): Promise<void> {
    await this.prisma.integration.update({
      where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
      data: { status: 'disconnected' },
    });
  }

  // =====================
  // Private Methods
  // =====================

  private async getTokens(tenantId: string): Promise<BambooHRTokens | null> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
    });

    if (!integration?.tokens) return null;
    return decryptObject<BambooHRTokens>(integration.tokens as string);
  }

  private async storeTokens(
    tenantId: string,
    tokens: BambooHRTokens,
  ): Promise<void> {
    const encryptedTokens = encryptObject(tokens);

    await this.prisma.integration.upsert({
      where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
      create: {
        tenantId,
        provider: 'bamboohr',
        tokens: encryptedTokens,
        status: 'connected',
      },
      update: {
        tokens: encryptedTokens,
        status: 'connected',
        lastError: null,
      },
    });
  }

  private async markAuthFailed(tenantId: string): Promise<void> {
    await this.prisma.integration.update({
      where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
      data: {
        status: 'error',
        lastError: 'Authentication failed - please reconnect',
      },
    });
  }
}
