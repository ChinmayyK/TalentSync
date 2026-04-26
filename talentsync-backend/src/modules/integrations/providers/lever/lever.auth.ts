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
 * Lever Auth Service
 *
 * Handles OAuth 2.0 authentication for Lever integration.
 *
 * Required environment variables:
 * - LEVER_CLIENT_ID
 * - LEVER_CLIENT_SECRET
 * - LEVER_REDIRECT_URI
 */
@Injectable()
export class LeverAuthService {
  private readonly logger = new Logger(LeverAuthService.name);
  private readonly authUrl = 'https://auth.lever.co/authorize';
  private readonly tokenUrl = 'https://auth.lever.co/oauth/token';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Generate Lever OAuth authorization URL
   */
  getAuthUrl(tenantId: string): string {
    const clientId = this.configService.get<string>('LEVER_CLIENT_ID');
    const redirectUri = this.configService.get<string>('LEVER_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new Error('Lever OAuth credentials not configured');
    }

    const state = generateState(tenantId);

    // Lever OAuth scopes for recruiting data
    const scopes = [
      'opportunities:read:admin',
      'opportunities:write:admin',
      'postings:read:admin',
      'users:read:admin',
    ].join(' ');

    return buildAuthUrl(this.authUrl, {
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      response_type: 'code',
      audience: 'https://api.lever.co/v1/',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(tenantId: string, code: string): Promise<void> {
    const clientId = this.configService.get<string>('LEVER_CLIENT_ID');
    const clientSecret = this.configService.get<string>('LEVER_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('LEVER_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Lever OAuth credentials not configured');
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

      const tokens: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: computeExpiry(expires_in || 3600),
      };

      const encryptedTokens = encryptObject(tokens);

      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: { tenantId, provider: 'lever' },
        },
        create: {
          tenantId,
          provider: 'lever',
          tokens: encryptedTokens,
          status: 'connected',
        },
        update: {
          tokens: encryptedTokens,
          status: 'connected',
          lastError: null,
        },
      });

      this.logger.log(`Lever connected for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to exchange Lever code: ${message}`);

      await this.prisma.integration.upsert({
        where: { tenantId_provider: { tenantId, provider: 'lever' } },
        create: {
          tenantId,
          provider: 'lever',
          status: 'error',
          lastError: `OAuth failed: ${message}`,
        },
        update: {
          status: 'error',
          lastError: `OAuth failed: ${message}`,
        },
      });

      throw new Error(`Lever OAuth failed: ${message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshTokens(tenantId: string): Promise<void> {
    const clientId = this.configService.get<string>('LEVER_CLIENT_ID');
    const clientSecret = this.configService.get<string>('LEVER_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Lever OAuth credentials not configured');
    }

    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'lever' } },
    });

    if (!integration?.tokens) {
      throw new Error('Lever not connected');
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

      const newTokens: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: refresh_token || tokens.refreshToken,
        expiresAt: computeExpiry(expires_in || 3600),
      };

      const encryptedTokens = encryptObject(newTokens);

      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'lever' } },
        data: {
          tokens: encryptedTokens,
          lastError: null,
        },
      });

      this.logger.log(`Lever tokens refreshed for tenant ${tenantId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to refresh Lever tokens: ${message}`);

      await this.prisma.integration.update({
        where: { tenantId_provider: { tenantId, provider: 'lever' } },
        data: {
          status: 'error',
          lastError: `Token refresh failed: ${message}`,
        },
      });

      throw new Error(`Lever token refresh failed: ${message}`);
    }
  }

  /**
   * Get valid access token, refreshing if needed
   */
  async getValidToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'lever' } },
    });

    if (!integration?.tokens) {
      throw new Error('Lever not connected');
    }

    const tokens = decryptObject<OAuthTokenSet>(integration.tokens as string);

    // Check if token expires within 5 minutes
    const expiryBuffer = 5 * 60 * 1000;
    const expiresAt = tokens.expiresAt
      ? new Date(tokens.expiresAt).getTime()
      : 0;
    const now = Date.now();

    if (expiresAt - now < expiryBuffer) {
      this.logger.log('Lever token expiring soon, refreshing...');
      await this.refreshTokens(tenantId);
      return this.getValidToken(tenantId);
    }

    return tokens.accessToken;
  }

  /**
   * Check if connected
   */
  async isConnected(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'lever' } },
    });

    return integration?.status === 'connected' && !!integration.tokens;
  }

  /**
   * Get token info for status endpoint
   */
  async getTokenInfo(
    tenantId: string,
  ): Promise<{ valid: boolean; expiresAt?: Date }> {
    const integration = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'lever' } },
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
