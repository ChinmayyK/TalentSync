import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../common/prisma.service';
import axios from 'axios';
import { OAuthTokenSet } from '../../types/oauth.interface';
import { encryptObject, decryptObject } from '../../utils/crypto.util';
import { generateState, computeExpiry, buildAuthUrl } from '../../utils/oauth.util';

/**
 * Workday OAuth Service
 * Handles OAuth2 flow for Workday integration
 *
 * Required environment variables:
 * - WORKDAY_CLIENT_ID
 * - WORKDAY_CLIENT_SECRET
 * - WORKDAY_REDIRECT_URI
 * - WORKDAY_AUTH_URL (tenant-specific)
 * - WORKDAY_TOKEN_URL (tenant-specific)
 */
@Injectable()
export class WorkdayOAuthService {
    private readonly logger = new Logger(WorkdayOAuthService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) { }

    /**
     * Generate Workday OAuth authorization URL
     * Note: Workday OAuth URLs are tenant-specific
     */
    async getAuthUrl(tenantId: string): Promise<string> {
        const clientId = this.configService.get<string>('WORKDAY_CLIENT_ID');
        const redirectUri = this.configService.get<string>('WORKDAY_REDIRECT_URI');
        const authUrl = this.configService.get<string>('WORKDAY_AUTH_URL');

        if (!clientId || !redirectUri || !authUrl) {
            throw new Error('Workday OAuth credentials not configured');
        }

        const state = generateState(tenantId);

        // Workday required scopes for recruiting access
        const scopes = [
            'Recruiting',
            'Staffing',
        ].join(' ');

        return buildAuthUrl(authUrl, {
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            state,
        });
    }

    /**
     * Exchange authorization code for access/refresh tokens
     */
    async exchangeCode(tenantId: string, code: string): Promise<void> {
        const clientId = this.configService.get<string>('WORKDAY_CLIENT_ID');
        const clientSecret = this.configService.get<string>('WORKDAY_CLIENT_SECRET');
        const redirectUri = this.configService.get<string>('WORKDAY_REDIRECT_URI');
        const tokenUrl = this.configService.get<string>('WORKDAY_TOKEN_URL');

        if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
            throw new Error('Workday OAuth credentials not configured');
        }

        try {
            const response = await axios.post(
                tokenUrl,
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
                    tenantId_provider: { tenantId, provider: 'workday' },
                },
                create: {
                    tenantId,
                    provider: 'workday',
                    tokens: encryptedTokens,
                    status: 'connected',
                },
                update: {
                    tokens: encryptedTokens,
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
        const clientSecret = this.configService.get<string>('WORKDAY_CLIENT_SECRET');
        const tokenUrl = this.configService.get<string>('WORKDAY_TOKEN_URL');

        if (!clientId || !clientSecret || !tokenUrl) {
            throw new Error('Workday OAuth credentials not configured');
        }

        const integration = await this.prisma.integration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'workday' } },
        });

        if (!integration?.tokens) {
            throw new Error('Workday not connected');
        }

        const tokens = decryptObject<OAuthTokenSet>(integration.tokens as string);

        if (!tokens.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await axios.post(
                tokenUrl,
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
                where: { tenantId_provider: { tenantId, provider: 'workday' } },
                data: {
                    tokens: encryptedTokens,
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
     * Get valid access token, refreshing if necessary
     */
    async getValidToken(tenantId: string): Promise<string> {
        const integration = await this.prisma.integration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'workday' } },
        });

        if (!integration?.tokens) {
            throw new Error('Workday not connected');
        }

        const tokens = decryptObject<OAuthTokenSet>(integration.tokens as string);

        // Check if token expires within 5 minutes
        const expiryBuffer = 5 * 60 * 1000;
        const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt).getTime() : 0;
        const now = Date.now();

        if (expiresAt - now < expiryBuffer) {
            this.logger.log('Workday token expiring soon, refreshing...');
            await this.refreshTokens(tenantId);
            return this.getValidToken(tenantId);
        }

        return tokens.accessToken;
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
}
