import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import axios, { AxiosError } from 'axios';
import { decryptObject } from '../utils/crypto.util';

/**
 * Custom error for authentication failures that require admin re-login
 */
export class ZohoAuthRequiredError extends Error {
  constructor(message: string = 'Zoho authentication required') {
    super(message);
    this.name = 'ZohoAuthRequiredError';
  }
}

@Injectable()
export class ZohoOAuthService {
  private readonly logger = new Logger(ZohoOAuthService.name);
  private clientId = process.env.ZOHO_CLIENT_ID;
  private clientSecret = process.env.ZOHO_CLIENT_SECRET;
  private tokenUrl = 'https://accounts.zoho.in/oauth/v2/token'; // India region

  constructor(private prisma: PrismaService) {}

  /**
   * Check if an error is an authentication error that requires re-login
   */
  isAuthError(error: any): boolean {
    // Check HTTP status
    if (error?.response?.status === 401) return true;
    if (error?.response?.status === 403) return true;

    // Check Zoho error codes
    const zohoError =
      error?.response?.data?.code || error?.response?.data?.error;
    const authErrors = [
      'INVALID_TOKEN',
      'AUTHENTICATION_FAILURE',
      'INVALID_OAUTH_TOKEN',
      'OAUTH_SCOPE_MISMATCH',
      'invalid_grant',
      'access_denied',
    ];
    if (zohoError && authErrors.includes(zohoError)) return true;

    // Check error message
    const message = error?.message?.toLowerCase() || '';
    if (message.includes('invalid token') || message.includes('authentication'))
      return true;

    return false;
  }

  /**
   * Mark integration as requiring authentication
   * This stops all sync operations until admin reconnects
   */
  async markAuthRequired(tenantId: string, reason: string): Promise<void> {
    this.logger.warn(
      `Marking Zoho integration as auth_required for tenant ${tenantId}: ${reason}`,
    );

    await this.prisma.integration.updateMany({
      where: { tenantId, provider: 'zoho' },
      data: {
        status: 'auth_required',
        lastError: reason,
      },
    });
  }

  /**
   * Check if integration requires re-authentication
   */
  async isAuthRequired(tenantId: string): Promise<boolean> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'zoho' },
      select: { status: true },
    });
    return integration?.status === 'auth_required';
  }

  getAuthUrl(tenantId: string, redirectUri: string) {
    return `https://accounts.zoho.in/oauth/v2/auth?scope=ZohoRecruit.modules.ALL&client_id=${this.clientId}&response_type=code&access_type=offline&redirect_uri=${redirectUri}&state=${tenantId}`;
  }

  async exchangeCode(tenantId: string, code: string, redirectUri: string) {
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', this.clientId || ''); // Handle undefined env
    params.append('client_secret', this.clientSecret || '');
    params.append('grant_type', 'authorization_code');

    try {
      const res = await axios.post(this.tokenUrl, params);
      if (!res.data.access_token)
        throw new BadRequestException('Invalid auth code');

      // Clear auth_required status on successful re-auth
      await this.prisma.integration.upsert({
        where: { tenantId_provider: { tenantId, provider: 'zoho' } },
        create: {
          tenantId,
          provider: 'zoho',
          tokens: res.data,
          status: 'connected', // Use 'connected' instead of 'active'
          lastError: null,
        },
        update: {
          tokens: res.data,
          status: 'connected',
          lastError: null,
        },
      });

      this.logger.log(
        `Zoho OAuth tokens exchanged successfully for tenant ${tenantId}`,
      );
      return { success: true, reconnected: true };
    } catch (error: any) {
      this.logger.error(`Failed to exchange Zoho auth code: ${error.message}`);
      throw new BadRequestException(
        `Failed to exchange auth code: ${error.message}`,
      );
    }
  }

  async refreshToken(tenantId: string): Promise<string> {
    // First check if auth is required - don't attempt refresh
    if (await this.isAuthRequired(tenantId)) {
      throw new ZohoAuthRequiredError(
        'Zoho re-authentication required. Admin must reconnect.',
      );
    }

    const integ = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'zoho' },
    });

    const tokens = integ?.tokens as any;
    if (!integ || !tokens?.refresh_token) {
      throw new BadRequestException('No Zoho integration found');
    }

    const params = new URLSearchParams();
    params.append('client_id', this.clientId || '');
    params.append('client_secret', this.clientSecret || '');
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', tokens.refresh_token);

    try {
      const res = await axios.post(this.tokenUrl, params);

      // Update tokens with new access token, keeping old refresh token if not provided
      const newTokens = { ...tokens, access_token: res.data.access_token };
      if (res.data.refresh_token)
        newTokens.refresh_token = res.data.refresh_token;

      await this.prisma.integration.update({
        where: { id: integ.id },
        data: {
          tokens: newTokens,
          status: 'connected',
          lastError: null,
        },
      });

      return newTokens.access_token;
    } catch (error: any) {
      // Check if this is an auth error (token revoked, expired, etc.)
      if (this.isAuthError(error)) {
        const reason =
          'Zoho OAuth token expired or revoked. Admin must reconnect.';
        await this.markAuthRequired(tenantId, reason);
        throw new ZohoAuthRequiredError(reason);
      }

      // Other errors - log and throw
      this.logger.error(`Failed to refresh Zoho token: ${error.message}`);
      throw error;
    }
  }

  async getAccessToken(tenantId: string): Promise<string> {
    // First check if auth is required
    if (await this.isAuthRequired(tenantId)) {
      throw new ZohoAuthRequiredError(
        'Zoho re-authentication required. Admin must reconnect.',
      );
    }

    const integ = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'zoho' },
    });

    if (!integ || !integ.tokens) {
      throw new BadRequestException('Zoho integration not configured');
    }

    const rawTokens = integ.tokens as any;

    // Handle both encrypted (from legacy provider) and plain JSON tokens
    let tokens: any;

    // Check if tokens are encrypted (string format) or plain JSON
    if (typeof rawTokens === 'string') {
      // Encrypted tokens from legacy provider - need to decrypt
      try {
        tokens = decryptObject(rawTokens);
        // Legacy format uses accessToken, not access_token
        if (tokens.accessToken) {
          return tokens.accessToken;
        }
      } catch (e) {
        throw new BadRequestException('Failed to decrypt Zoho tokens');
      }
    } else {
      tokens = rawTokens;
    }

    // Support both legacy format (accessToken) and new format (access_token)
    const accessToken = tokens?.accessToken || tokens?.access_token;
    if (!accessToken) {
      throw new BadRequestException('Zoho access token not found');
    }

    return accessToken;
  }
}

