import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import axios from 'axios';
import { OAuthTokenSet } from '../../types/oauth.interface';
import { encryptObject, decryptObject } from '../../utils/crypto.util';
import {
  generateState,
  parseState,
  computeExpiry,
  buildAuthUrl,
} from '../../utils/oauth.util';

@Injectable()
export class ZohoOAuthService {
  private readonly authUrl = 'https://accounts.zoho.in/oauth/v2/auth'; // India region
  private readonly tokenUrl = 'https://accounts.zoho.in/oauth/v2/token'; // India region

  constructor(private prisma: PrismaService) {}

  /**
   * Generate Zoho OAuth authorization URL
   */
  async getAuthUrl(tenantId: string): Promise<string> {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('Zoho OAuth credentials not configured');
    }

    const state = generateState(tenantId);

    return buildAuthUrl(this.authUrl, {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL',
      access_type: 'offline',
      state,
    });
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCode(tenantId: string, code: string): Promise<void> {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const redirectUri = process.env.ZOHO_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Zoho OAuth credentials not configured');
    }

    try {
      const response = await axios.post(this.tokenUrl, null, {
        params: {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

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
          tenantId_provider: {
            tenantId,
            provider: 'zoho',
          },
        },
        create: {
          tenantId,
          provider: 'zoho',
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
      await this.prisma.integration.upsert({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'zoho',
          },
        },
        create: {
          tenantId,
          provider: 'zoho',
          status: 'error',
          lastError: error.message,
        },
        update: {
          status: 'error',
          lastError: error.message,
        },
      });
      throw new Error(`Failed to exchange code: ${error.message}`);
    }
  }

  /**
   * Refresh access tokens using refresh token
   */
  async refreshTokens(tenantId: string): Promise<OAuthTokenSet> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'zoho',
        },
      },
    });

    if (!integration || !integration.tokens) {
      throw new Error('No Zoho integration found for tenant');
    }

    const tokenSet: OAuthTokenSet = decryptObject(integration.tokens as string);

    if (!tokenSet.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Zoho OAuth credentials not configured');
    }

    try {
      const response = await axios.post(this.tokenUrl, null, {
        params: {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenSet.refreshToken,
        },
      });

      const { access_token, expires_in } = response.data;

      const newTokenSet: OAuthTokenSet = {
        accessToken: access_token,
        refreshToken: tokenSet.refreshToken, // Keep existing refresh token
        expiresAt: computeExpiry(expires_in),
      };

      // Encrypt and update tokens
      const encryptedTokens = encryptObject(newTokenSet);

      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'zoho',
          },
        },
        data: {
          tokens: encryptedTokens,
          status: 'connected',
          lastError: null,
        },
      });

      return newTokenSet;
    } catch (error) {
      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider: 'zoho',
          },
        },
        data: {
          status: 'error',
          lastError: `Token refresh failed: ${error.message}`,
        },
      });
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  /**
   * Get valid access token (refreshes if expired)
   */
  async getValidToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'zoho',
        },
      },
    });

    if (!integration || !integration.tokens) {
      throw new Error('No Zoho integration found for tenant');
    }

    const tokenSet: OAuthTokenSet = decryptObject(integration.tokens as string);

    // Check if token is expired
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

