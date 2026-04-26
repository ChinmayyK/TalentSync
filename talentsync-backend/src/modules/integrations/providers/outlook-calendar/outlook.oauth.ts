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
export class OutlookOAuthService {
  private readonly authUrl =
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
  private readonly tokenUrl =
    'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  constructor(private prisma: PrismaService) {}

  async getAuthUrl(tenantId: string): Promise<string> {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('Outlook OAuth credentials not configured');
    }

    const state = generateState(tenantId);

    return buildAuthUrl(this.authUrl, {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'Calendars.ReadWrite offline_access',
      state,
    });
  }

  async exchangeCode(tenantId: string, code: string): Promise<void> {
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const redirectUri = process.env.OUTLOOK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Outlook OAuth credentials not configured');
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
        }),
      );

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
            provider: 'outlook_calendar',
          },
        },
        create: {
          tenantId,
          provider: 'outlook_calendar',
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

  async refreshTokens(tenantId: string): Promise<OAuthTokenSet> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'outlook_calendar',
        },
      },
    });

    if (!integration || !integration.tokens) {
      throw new Error('No Outlook Calendar integration found');
    }

    const tokenSet: OAuthTokenSet = decryptObject(integration.tokens as string);

    if (!tokenSet.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const clientId = process.env.OUTLOOK_CLIENT_ID;
      const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId!);
      params.append('client_secret', clientSecret!);
      params.append('refresh_token', tokenSet.refreshToken);

      const response = await axios.post(this.tokenUrl, params);

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
            provider: 'outlook_calendar',
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

  async getValidToken(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'outlook_calendar',
        },
      },
    });

    if (!integration || !integration.tokens) {
      throw new Error('No Outlook Calendar integration found');
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
