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
 * HubSpot OAuth Service
 * Handles OAuth2 flow for HubSpot integration
 *
 * Required environment variables:
 * - HUBSPOT_CLIENT_ID
 * - HUBSPOT_CLIENT_SECRET
 * - HUBSPOT_REDIRECT_URI
 */
@Injectable()
export class HubspotOAuthService {
  private readonly logger = new Logger(HubspotOAuthService.name);
  private readonly authUrl = 'https://app.hubspot.com/oauth/authorize';
  private readonly tokenUrl = 'https://api.hubapi.com/oauth/v1/token';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate HubSpot OAuth authorization URL
   */
  async getAuthUrl(tenantId: string): Promise<string> {
    const clientId = this.configService.get<string>('HUBSPOT_CLIENT_ID');
    const redirectUri = this.configService.get<string>('HUBSPOT_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new Error('HubSpot OAuth credentials not configured');
    }

    const state = generateState(tenantId);

    // HubSpot required scopes for CRM access
    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.objects.deals.read',
      'crm.objects.deals.write',
      'crm.objects.companies.read',
      'timeline',
    ].join(' ');

    return buildAuthUrl(this.authUrl, {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    });
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCode(tenantId: string, code: string): Promise<void> {
    const clientId = this.configService.get<string>('HUBSPOT_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'HUBSPOT_CLIENT_SECRET',
    );
    const redirectUri = this.configService.get<string>('HUBSPOT_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('HubSpot OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      const tokenSet: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: computeExpiry(expires_in),
      };

      // Encrypt and store tokens
      const encryptedTokens = encryptObject(tokenSet);

      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: { tenantId, provider: 'hubspot' },
        },
        create: {
          tenantId,
          provider: 'hubspot',
          tokens: encryptedTokens,
          status: 'connected',
        },
        update: {
          tokens: encryptedTokens,
          status: 'connected',
          lastError: null,
        },
      });

      this.logger.log(`HubSpot connected for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to exchange HubSpot code: ${message}`);

      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: { tenantId, provider: 'hubspot' },
        },
        create: {
          tenantId,
          provider: 'hubspot',
          status: 'error',
          lastError: `OAuth failed: ${message}`,
        },
        update: {
          status: 'error',
          lastError: `OAuth failed: ${message}`,
        },
      });

      throw new Error(`HubSpot OAuth failed: ${message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(tenantId: string): Promise<void> {
    const clientId = this.configService.get<string>('HUBSPOT_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'HUBSPOT_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      throw new Error('HubSpot OAuth credentials not configured');
    }

    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
    });

    if (!integration?.tokens) {
      throw new Error('HubSpot not connected');
    }

    const tokens = decryptObject<OAuthTokenSet>(integration.tokens as string);

    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refreshToken,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      const tokenSet: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: refresh_token || tokens.refreshToken,
        expiresAt: computeExpiry(expires_in),
      };

      const encryptedTokens = encryptObject(tokenSet);

      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
        data: {
          tokens: encryptedTokens,
          lastError: null,
        },
      });

      this.logger.log(`HubSpot tokens refreshed for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh HubSpot tokens: ${message}`);

      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
        data: {
          status: 'error',
          lastError: `Token refresh failed: ${message}`,
        },
      });

      throw new Error(`HubSpot token refresh failed: ${message}`);
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   * Proactively refreshes if token expires within 5 minutes
   */
  async getValidToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
    });

    if (!integration?.tokens) {
      throw new Error('HubSpot not connected');
    }

    const tokens = decryptObject<OAuthTokenSet>(integration.tokens as string);

    // Check if token expires within 5 minutes
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const expiresAt = tokens.expiresAt
      ? new Date(tokens.expiresAt).getTime()
      : 0;
    const now = Date.now();

    if (expiresAt - now < expiryBuffer) {
      this.logger.log('HubSpot token expiring soon, refreshing...');
      await this.refreshTokens(tenantId);
      return this.getValidToken(tenantId);
    }

    return tokens.accessToken;
  }

  /**
   * Check if HubSpot is connected for a tenant
   */
  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
    });

    return integration?.status === 'connected' && !!integration.tokens;
  }

  /**
   * Get token expiry info for status endpoint
   */
  async getTokenInfo(
    tenantId: string,
  ): Promise<{ valid: boolean; expiresAt?: Date }> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'hubspot' } },
    });

    if (!integration?.tokens) {
      return { valid: false };
    }

    try {
      const tokens = decryptObject<OAuthTokenSet>(integration.tokens as string);
      if (!tokens.expiresAt) {
        return { valid: false };
      }
      const expiresAt = new Date(tokens.expiresAt);
      return {
        valid: expiresAt > new Date(),
        expiresAt,
      };
    } catch {
      return { valid: false };
    }
  }
}

