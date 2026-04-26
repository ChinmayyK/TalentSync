import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../common/prisma.service';
import axios from 'axios';

/**
 * Custom error for authentication failures that require admin re-login
 */
export class SalesforceAuthRequiredError extends Error {
  constructor(message: string = 'Salesforce authentication required') {
    super(message);
    this.name = 'SalesforceAuthRequiredError';
  }
}

/**
 * Salesforce OAuth Service
 * Handles OAuth2 flow for Salesforce integration
 *
 * Required environment variables:
 * - SALESFORCE_CLIENT_ID
 * - SALESFORCE_CLIENT_SECRET
 */
@Injectable()
export class SalesforceOAuthService {
  private readonly logger = new Logger(SalesforceOAuthService.name);
  private readonly loginUrl = 'https://login.salesforce.com';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private get clientId(): string {
    return this.configService.get<string>('SALESFORCE_CLIENT_ID') || '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('SALESFORCE_CLIENT_SECRET') || '';
  }

  /**
   * Check if an error is an authentication error that requires re-login
   */
  isAuthError(error: any): boolean {
    if (error?.response?.status === 401) return true;
    if (error?.response?.status === 403) return true;

    const sfError =
      error?.response?.data?.[0]?.errorCode || error?.response?.data?.error;
    const authErrors = [
      'INVALID_SESSION_ID',
      'INVALID_AUTH_HEADER',
      'INVALID_GRANT',
      'invalid_grant',
      'Session expired or invalid',
    ];
    if (sfError && authErrors.some((e) => sfError.includes(e))) return true;

    const message = error?.message?.toLowerCase() || '';
    if (
      message.includes('invalid session') ||
      message.includes('session expired')
    )
      return true;

    return false;
  }

  /**
   * Mark integration as requiring authentication
   */
  async markAuthRequired(tenantId: string, reason: string): Promise<void> {
    this.logger.warn(
      `Marking Salesforce integration as auth_required for tenant ${tenantId}: ${reason}`,
    );

    await this.prisma.integration.updateMany({
      where: { tenantId, provider: 'salesforce' },
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
      where: { tenantId, provider: 'salesforce' },
      select: { status: true },
    });
    return integration?.status === 'auth_required';
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(tenantId: string, redirectUri: string): string {
    const scopes = 'api refresh_token offline_access';
    return `${this.loginUrl}/services/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${tenantId}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<{ success: boolean; instanceUrl: string }> {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('redirect_uri', redirectUri);

    try {
      const res = await axios.post(
        `${this.loginUrl}/services/oauth2/token`,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      if (!res.data.access_token) {
        throw new BadRequestException('Invalid authorization code');
      }

      await this.prisma.integration.upsert({
        where: { tenantId_provider: { tenantId, provider: 'salesforce' } },
        create: {
          tenantId,
          provider: 'salesforce',
          tokens: {
            access_token: res.data.access_token,
            refresh_token: res.data.refresh_token,
            token_type: res.data.token_type,
            issued_at: res.data.issued_at,
          },
          instanceUrl: res.data.instance_url,
          status: 'connected',
          lastError: null,
        },
        update: {
          tokens: {
            access_token: res.data.access_token,
            refresh_token: res.data.refresh_token,
            token_type: res.data.token_type,
            issued_at: res.data.issued_at,
          },
          instanceUrl: res.data.instance_url,
          status: 'connected',
          lastError: null,
        },
      });

      this.logger.log(
        `Salesforce OAuth tokens exchanged successfully for tenant ${tenantId}`,
      );
      return { success: true, instanceUrl: res.data.instance_url };
    } catch (error: any) {
      this.logger.error(
        `Failed to exchange Salesforce auth code: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to exchange auth code: ${error.response?.data?.error_description || error.message}`,
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(tenantId: string): Promise<string> {
    if (await this.isAuthRequired(tenantId)) {
      throw new SalesforceAuthRequiredError(
        'Salesforce re-authentication required. Admin must reconnect.',
      );
    }

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'salesforce' },
    });

    const tokens = integration?.tokens as any;
    if (!integration || !tokens?.refresh_token) {
      throw new BadRequestException('No Salesforce integration found');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', tokens.refresh_token);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    try {
      const res = await axios.post(
        `${this.loginUrl}/services/oauth2/token`,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const newTokens = {
        ...tokens,
        access_token: res.data.access_token,
        issued_at: res.data.issued_at,
      };

      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          tokens: newTokens,
          instanceUrl: res.data.instance_url || integration.instanceUrl,
          status: 'connected',
          lastError: null,
        },
      });

      return res.data.access_token;
    } catch (error: any) {
      if (this.isAuthError(error)) {
        const reason =
          'Salesforce OAuth token expired or revoked. Admin must reconnect.';
        await this.markAuthRequired(tenantId, reason);
        throw new SalesforceAuthRequiredError(reason);
      }

      this.logger.error(`Failed to refresh Salesforce token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get access token (refresh if needed)
   */
  async getAccessToken(
    tenantId: string,
  ): Promise<{ accessToken: string; instanceUrl: string }> {
    if (await this.isAuthRequired(tenantId)) {
      throw new SalesforceAuthRequiredError(
        'Salesforce re-authentication required. Admin must reconnect.',
      );
    }

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'salesforce' },
    });

    if (!integration || !integration.tokens || !integration.instanceUrl) {
      throw new BadRequestException('Salesforce integration not configured');
    }

    const tokens = integration.tokens as any;
    const accessToken = tokens?.access_token;

    if (!accessToken) {
      throw new BadRequestException('Salesforce access token not found');
    }

    return {
      accessToken,
      instanceUrl: integration.instanceUrl,
    };
  }

  /**
   * Get instance URL for API calls
   */
  async getInstanceUrl(tenantId: string): Promise<string> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: 'salesforce' },
    });
    return integration?.instanceUrl || 'https://login.salesforce.com';
  }
}
