import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import axios from 'axios';
import { OAuthTokenSet } from '../../types/oauth.interface';
import { encryptObject, decryptObject } from '../../utils/crypto.util';
import {
  generateState,
  computeExpiry,
  buildAuthUrl,
} from '../../utils/oauth.util';

@Injectable()
export class GoogleOAuthService {
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';

  constructor(private prisma: PrismaService) {}

  /**
   * Generate Google OAuth authorization URL
   */
  async getAuthUrl(tenantId: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('Google OAuth credentials not configured');
    }

    const state = generateState(tenantId);

    return buildAuthUrl(this.authUrl, {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCode(tenantId: string, code: string): Promise<void> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials not configured');
    }

    try {
      const response = await axios.post(this.tokenUrl, {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      const tokenSet: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: computeExpiry(expires_in),
      };

      const encryptedTokens = encryptObject(tokenSet);

      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'google_calendar',
          },
        },
        create: {
          tenantId,
          provider: 'google_calendar',
          tokens: encryptedTokens,
          status: 'connected',
        },
        update: {
          tokens: encryptedTokens,
          status: 'connected',
          lastError: null,
        },
      });
    } catch (error) {
      throw new Error(`Failed to exchange code: ${error.message}`);
    }
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(tenantId: string): Promise<OAuthTokenSet> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_calendar',
        },
      },
    });

    if (!integration || !integration.tokens) {
      throw new Error('No Google Calendar integration found');
    }

    const tokenSet: OAuthTokenSet = decryptObject(integration.tokens as string);

    if (!tokenSet.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    try {
      const response = await axios.post(this.tokenUrl, {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenSet.refreshToken,
      });

      const { access_token, expires_in } = response.data;

      const newTokenSet: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: tokenSet.refreshToken,
        expiresAt: computeExpiry(expires_in),
      };

      const encryptedTokens = encryptObject(newTokenSet);

      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'google_calendar',
          },
        },
        data: {
          tokens: encryptedTokens,
        },
      });

      return newTokenSet;
    } catch (error) {
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  /**
   * Get valid access token
   */
  async getValidToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google_calendar',
        },
      },
    });

    if (!integration || !integration.tokens) {
      throw new Error('No Google Calendar integration found');
    }

    const tokenSet: OAuthTokenSet = decryptObject(integration.tokens as string);

    if (
      tokenSet.expiresAt &&
      Date.now() >= tokenSet.expiresAt - 5 * 60 * 1000
    ) {
      const refreshed = await this.refreshTokens(tenantId);
      return refreshed.accessToken;
    }

    return tokenSet.accessToken;
  }
}
