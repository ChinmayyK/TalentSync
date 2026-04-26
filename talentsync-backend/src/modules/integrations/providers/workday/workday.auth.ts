import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../common/prisma.service';
import axios from 'axios';
import { OAuthTokenSet } from '../../types/oauth.interface';
import { encryptObject, decryptObject } from '../../utils/crypto.util';
import {
  generateState,
  computeExpiry,
  buildAuthUrl,
} from '../../utils/oauth.util';

/**
 * Workday Authentication Configuration
 * Stored per-tenant for multi-tenant support
 */
interface WorkdayCredentials extends OAuthTokenSet {
  tenantUrl: string; // Per-tenant Workday URL
  tenantId?: string; // Workday tenant identifier
}

/**
 * Workday Auth Service
 *
 * Handles OAuth 2.0 authentication for Workday integration.
 * Workday uses OAuth 2.0 with custom endpoints per tenant.
 *
 * Required environment variables:
 * - WORKDAY_CLIENT_ID
 * - WORKDAY_CLIENT_SECRET
 * - WORKDAY_REDIRECT_URI
 */
@Injectable()
export class WorkdayAuthService {
  private readonly logger = new Logger(WorkdayAuthService.name);
  private readonly defaultTenantUrl = 'https://wd2-impl-services1.workday.com';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate Workday OAuth authorization URL
   */
  async getAuthUrl(
    tenantId: string,
    workdayTenantUrl?: string,
  ): Promise<string> {
    const clientId = this.configService.get<string>('WORKDAY_CLIENT_ID');
    const redirectUri = this.configService.get<string>('WORKDAY_REDIRECT_URI');
    const tenantUrl =
      workdayTenantUrl ||
      this.configService.get<string>('WORKDAY_TENANT_URL') ||
      this.defaultTenantUrl;

    if (!clientId || !redirectUri) {
      throw new Error('Workday OAuth credentials not configured');
    }

    const state = generateState(tenantId);

    // Workday OAuth 2.0 authorization endpoint
    return buildAuthUrl(`${tenantUrl}/oauth2/${clientId}/authorize`, {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'Recruiting',
    });
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCode(
    tenantId: string,
    code: string,
    workdayTenantUrl?: string,
  ): Promise<void> {
    const clientId = this.configService.get<string>('WORKDAY_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'WORKDAY_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get<string>('WORKDAY_REDIRECT_URI');
    const tenantUrl =
      workdayTenantUrl ||
      this.configService.get<string>('WORKDAY_TENANT_URL') ||
      this.defaultTenantUrl;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Workday OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        `${tenantUrl}/oauth2/${clientId}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      const credentials: WorkdayCredentials = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: computeExpiry(expires_in),
        tenantUrl,
      };

      // Encrypt and store credentials
      const encryptedCredentials = encryptObject(credentials);

      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: { tenantId, provider: 'workday' },
        },
        create: {
          tenantId,
          provider: 'workday',
          tokens: encryptedCredentials,
          settings: { tenantUrl },
          status: 'connected',
        },
        update: {
          tokens: encryptedCredentials,
          settings: { tenantUrl },
          status: 'connected',
          lastError: null,
        },
      });

      this.logger.log(`Workday connected for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to exchange Workday code: ${message}`);

      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: { tenantId, provider: 'workday' },
        },
        create: {
          tenantId,
          provider: 'workday',
          status: 'error',
          lastError: `OAuth failed: ${message}`,
        },
        update: {
          status: 'error',
          lastError: `OAuth failed: ${message}`,
        },
      });

      throw new Error(`Workday OAuth failed: ${message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(tenantId: string): Promise<void> {
    const clientId = this.configService.get<string>('WORKDAY_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'WORKDAY_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new Error('Workday OAuth credentials not configured');
    }

    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'workday' } },
    });

    if (!integration?.tokens) {
      throw new Error('Workday not connected');
    }

    const credentials = decryptObject<WorkdayCredentials>(
      integration.tokens as string,
    );

    if (!credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        `${credentials.tenantUrl}/oauth2/${clientId}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      const newCredentials: WorkdayCredentials = {
        accessToken: access_token,
        refreshToken: refresh_token || credentials.refreshToken,
        expiresAt: computeExpiry(expires_in),
        tenantUrl: credentials.tenantUrl,
      };

      const encryptedCredentials = encryptObject(newCredentials);

      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'workday' } },
        data: {
          tokens: encryptedCredentials,
          lastError: null,
        },
      });

      this.logger.log(`Workday tokens refreshed for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh Workday tokens: ${message}`);

      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'workday' } },
        data: {
          status: 'error',
          lastError: `Token refresh failed: ${message}`,
        },
      });

      throw new Error(`Workday token refresh failed: ${message}`);
    }
  }

  /**
   * Get valid credentials, refreshing if necessary
   */
  async getValidCredentials(
    tenantId: string,
  ): Promise<{ accessToken: string; tenantUrl: string }> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'workday' } },
    });

    if (!integration?.tokens) {
      throw new Error('Workday not connected');
    }

    const credentials = decryptObject<WorkdayCredentials>(
      integration.tokens as string,
    );

    // Check if token expires within 5 minutes
    const expiryBuffer = 5 * 60 * 1000;
    const expiresAt = credentials.expiresAt
      ? new Date(credentials.expiresAt).getTime()
      : 0;
    const now = Date.now();

    if (expiresAt - now < expiryBuffer) {
      this.logger.log('Workday token expiring soon, refreshing...');
      await this.refreshTokens(tenantId);
      return this.getValidCredentials(tenantId);
    }

    return {
      accessToken: credentials.accessToken,
      tenantUrl: credentials.tenantUrl,
    };
  }

  /**
   * Check if Workday is connected for a tenant
   */
  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'workday' } },
    });

    return integration?.status === 'connected' && !!integration.tokens;
  }

  /**
   * Get token info for status endpoint
   */
  async getTokenInfo(
    tenantId: string,
  ): Promise<{ valid: boolean; expiresAt?: Date; tenantUrl?: string }> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'workday' } },
    });

    if (!integration?.tokens) {
      return { valid: false };
    }

    try {
      const credentials = decryptObject<WorkdayCredentials>(
        integration.tokens as string,
      );
      if (!credentials.expiresAt) {
        return { valid: false };
      }
      const expiresAt = new Date(credentials.expiresAt);
      return {
        valid: expiresAt > new Date(),
        expiresAt,
        tenantUrl: credentials.tenantUrl,
      };
    } catch {
      return { valid: false };
    }
  }
}
