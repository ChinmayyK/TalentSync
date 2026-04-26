import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import axios from 'axios';

/**
 * Zoho Recruit OAuth Service
 *
 * Manages OAuth tokens for Zoho Recruit integration.
 * Stores tokens in the Integration table with provider='zoho_recruit'.
 *
 * Note: Zoho Recruit uses different OAuth scopes than Zoho CRM:
 * - ZohoRecruit.modules.ALL (read/write access to all modules)
 * - ZohoRecruit.settings.ALL (read access to settings)
 */
@Injectable()
export class ZohoRecruitOAuthService {
  private readonly logger = new Logger(ZohoRecruitOAuthService.name);

  // Zoho OAuth endpoints (India region)
  private readonly authUrl = 'https://accounts.zoho.in/oauth/v2/auth';
  private readonly tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';

  // Required scopes for Zoho Recruit
  private readonly scopes = [
    'ZohoRecruit.modules.ALL',
    'ZohoRecruit.settings.ALL',
    'ZohoRecruit.users.READ',
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      scope: this.scopes.join(','),
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await axios.post(this.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = response.data;

    if (data.error) {
      throw new Error(`OAuth error: ${data.error}`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 3600,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const response = await axios.post(this.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = response.data;

    if (data.error) {
      throw new Error(`Token refresh error: ${data.error}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    };
  }

  /**
   * Get a valid access token for a tenant
   * Automatically refreshes if expired
   */
  async getAccessToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'zoho_recruit' },
      },
    });

    if (!integration) {
      throw new Error('Zoho Recruit integration not found for this tenant');
    }

    const tokens = integration.tokens as any;
    const settings = integration.settings as any;

    if (!tokens?.accessToken) {
      throw new Error('No access token found. Please reconnect Zoho Recruit.');
    }

    // Check if token is expired
    const expiresAt = tokens.accessTokenExpiresAt
      ? new Date(tokens.accessTokenExpiresAt)
      : null;

    const isExpired = expiresAt && expiresAt < new Date();

    if (isExpired && tokens.refreshToken) {
      this.logger.log(
        `Access token expired for tenant ${tenantId}, refreshing...`,
      );

      const { accessToken, expiresIn } = await this.refreshAccessToken(
        tokens.refreshToken,
        settings.clientId,
        settings.clientSecret,
      );

      // Update stored token
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          tokens: {
            ...tokens,
            accessToken,
            accessTokenExpiresAt: new Date(
              Date.now() + expiresIn * 1000,
            ).toISOString(),
          },
        },
      });

      return accessToken;
    }

    return tokens.accessToken;
  }

  /**
   * Store OAuth tokens for a tenant
   */
  async storeTokens(
    tenantId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.integration.upsert({
      where: {
        tenantId_provider: { tenantId, provider: 'zoho_recruit' },
      },
      create: {
        tenantId,
        provider: 'zoho_recruit',
        status: 'connected',
        tokens: {
          accessToken,
          refreshToken,
          accessTokenExpiresAt: expiresAt.toISOString(),
        },
        settings: {
          clientId,
          clientSecret,
        },
      },
      update: {
        status: 'connected',
        tokens: {
          accessToken,
          refreshToken,
          accessTokenExpiresAt: expiresAt.toISOString(),
        },
        settings: {
          clientId,
          clientSecret,
        },
      },
    });
  }

  /**
   * Revoke tokens and disconnect integration
   */
  async disconnect(tenantId: string): Promise<void> {
    await this.prisma.integration.updateMany({
      where: { tenantId, provider: 'zoho_recruit' },
      data: {
        status: 'disconnected',
        tokens: {},
      },
    });
  }
}
