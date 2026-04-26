import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import axios from 'axios';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at?: number;
}

@Injectable()
export class GoogleCalendarOAuthService {
  private readonly logger = new Logger(GoogleCalendarOAuthService.name);
  private readonly clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
  ].join(' ');

  constructor(private prisma: PrismaService) {}

  /**
   * Generate OAuth authorization URL for Google Calendar
   */
  getAuthUrl(tenantId: string, userId: string, redirectUri: string): string {
    const state = Buffer.from(JSON.stringify({ tenantId, userId })).toString(
      'base64',
    );
    const params = new URLSearchParams({
      client_id: this.clientId || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    tenantId: string,
    userId: string,
    code: string,
    redirectUri: string,
  ): Promise<{ success: boolean; accountId: string }> {
    const params = new URLSearchParams({
      code,
      client_id: this.clientId || '',
      client_secret: this.clientSecret || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    try {
      const res = await axios.post(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (!res.data.access_token) {
        throw new BadRequestException('Invalid authorization code');
      }

      const tokens: GoogleTokens = {
        ...res.data,
        expires_at: Date.now() + res.data.expires_in * 1000,
      };

      // Get user info to get the Google account ID
      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );

      const account = await this.prisma.calendarSyncAccount.upsert({
        where: {
          tenantId_userId_provider: { tenantId, userId, provider: 'google' },
        },
        create: {
          tenantId,
          userId,
          provider: 'google',
          providerAccountId: userInfo.data.id || userInfo.data.email,
          credentials: tokens as any,
          syncEnabled: true,
        },
        update: {
          providerAccountId: userInfo.data.id || userInfo.data.email,
          credentials: tokens as any,
          syncEnabled: true,
        },
      });

      this.logger.log(
        `Connected Google Calendar for user ${userId} in tenant ${tenantId}`,
      );
      return { success: true, accountId: account.id };
    } catch (error) {
      this.logger.error(
        `Failed to exchange Google OAuth code: ${error.message}`,
      );
      throw new BadRequestException('Failed to connect Google Calendar');
    }
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken(accountId: string): Promise<string> {
    const account = await this.prisma.calendarSyncAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== 'google') {
      throw new BadRequestException('Google Calendar account not found');
    }

    const tokens = account.credentials as unknown as GoogleTokens;
    if (!tokens?.refresh_token) {
      throw new BadRequestException('No refresh token available');
    }

    const params = new URLSearchParams({
      client_id: this.clientId || '',
      client_secret: this.clientSecret || '',
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    });

    try {
      const res = await axios.post(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const newTokens: GoogleTokens = {
        ...tokens,
        access_token: res.data.access_token,
        expires_in: res.data.expires_in,
        expires_at: Date.now() + res.data.expires_in * 1000,
      };

      await this.prisma.calendarSyncAccount.update({
        where: { id: accountId },
        data: { credentials: newTokens as any },
      });

      return newTokens.access_token;
    } catch (error) {
      this.logger.error(`Failed to refresh Google token: ${error.message}`);
      throw new BadRequestException('Failed to refresh Google Calendar token');
    }
  }

  /**
   * Get a valid access token (refreshing if needed)
   */
  async getValidAccessToken(accountId: string): Promise<string> {
    const account = await this.prisma.calendarSyncAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== 'google') {
      throw new BadRequestException('Google Calendar account not found');
    }

    const tokens = account.credentials as unknown as GoogleTokens;
    if (!tokens?.access_token) {
      throw new BadRequestException('No access token available');
    }

    // Refresh if token expires within 5 minutes
    const expiresAt = tokens.expires_at || 0;
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      return this.refreshAccessToken(accountId);
    }

    return tokens.access_token;
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(tenantId: string, userId: string): Promise<void> {
    await this.prisma.calendarSyncAccount.deleteMany({
      where: { tenantId, userId, provider: 'google' },
    });
    this.logger.log(
      `Disconnected Google Calendar for user ${userId} in tenant ${tenantId}`,
    );
  }

  /**
   * Get busy slots using Google Calendar FreeBusy API.
   * Returns only start/end times - no event metadata.
   * Never throws - returns empty result on failure for graceful degradation.
   */
  async getBusySlots(
    accountId: string,
    from: Date,
    to: Date,
  ): Promise<{
    busySlots: Array<{
      start: Date;
      end: Date;
      source: 'google';
      reason?: string;
    }>;
    success: boolean;
    error?: string;
  }> {
    try {
      const accessToken = await this.getValidAccessToken(accountId);

      // Use FreeBusy API - only returns busy/free status, not event details
      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/freeBusy',
        {
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          items: [{ id: 'primary' }],
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const busySlots: Array<{
        start: Date;
        end: Date;
        source: 'google';
        reason?: string;
      }> = [];

      // Extract busy periods from primary calendar
      const calendars = response.data.calendars || {};
      const primaryBusy = calendars.primary?.busy || [];

      for (const period of primaryBusy) {
        busySlots.push({
          start: new Date(period.start),
          end: new Date(period.end),
          source: 'google',
          reason: 'Google Calendar: Busy',
        });
      }

      this.logger.debug(
        `Fetched ${busySlots.length} busy slots from Google Calendar for account ${accountId}`,
      );
      return { busySlots, success: true };
    } catch (error: any) {
      // Graceful failure - log error but don't block scheduling
      this.logger.warn(
        `Failed to fetch Google Calendar busy slots for account ${accountId}: ${error.message}`,
      );

      return {
        busySlots: [],
        success: false,
        error: error.message || 'Failed to fetch Google Calendar availability',
      };
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  async isTokenExpired(accountId: string): Promise<boolean> {
    try {
      const account = await this.prisma.calendarSyncAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) return true;

      const tokens = account.credentials as unknown as GoogleTokens;
      const expiresAt = tokens?.expires_at || 0;

      // Consider expired if within 5 minutes
      return expiresAt - Date.now() < 5 * 60 * 1000;
    } catch {
      return true;
    }
  }
}
