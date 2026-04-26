import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { GoogleCalendarOAuthService } from './google-calendar-oauth.service';
import { MicrosoftCalendarOAuthService } from './microsoft-calendar-oauth.service';
import { BusyBlockService } from './busy-block.service';
import axios from 'axios';
import { CalendarSyncAccount } from '@prisma/client';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  status?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

interface MicrosoftCalendarEvent {
  id: string;
  subject?: string;
  start?: { dateTime: string; timeZone: string };
  end?: { dateTime: string; timeZone: string };
  isAllDay?: boolean;
  showAs?: string;
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    private prisma: PrismaService,
    private googleOAuth: GoogleCalendarOAuthService,
    private microsoftOAuth: MicrosoftCalendarOAuthService,
    private busyBlockService: BusyBlockService,
  ) {}

  /**
   * Sync calendar events for a user and create/update BusyBlocks
   */
  async syncCalendar(accountId: string): Promise<{ eventsProcessed: number }> {
    const account = await this.prisma.calendarSyncAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || !account.syncEnabled) {
      this.logger.warn(
        `Sync skipped for account ${accountId}: not found or disabled`,
      );
      return { eventsProcessed: 0 };
    }

    const now = new Date();
    const startDate = now;
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // Sync 30 days ahead

    let events: CalendarEvent[] = [];

    try {
      if (account.provider === 'google') {
        events = await this.fetchGoogleEvents(account, startDate, endDate);
      } else if (account.provider === 'microsoft') {
        events = await this.fetchMicrosoftEvents(account, startDate, endDate);
      }

      // Create busy blocks from events
      await this.createBusyBlocksFromEvents(
        account.tenantId,
        account.userId,
        events,
        account.provider,
      );

      // Update last sync time
      await this.prisma.calendarSyncAccount.update({
        where: { id: accountId },
        data: { lastSyncAt: new Date() },
      });

      this.logger.log(
        `Synced ${events.length} events for account ${accountId}`,
      );
      return { eventsProcessed: events.length };
    } catch (error) {
      this.logger.error(
        `Failed to sync calendar ${accountId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Fetch events from Google Calendar
   */
  private async fetchGoogleEvents(
    account: CalendarSyncAccount,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    const accessToken = await this.googleOAuth.getValidAccessToken(account.id);

    const params = new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });

    const response = await axios.get(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    return (response.data.items || [])
      .filter((event: GoogleCalendarEvent) => event.status !== 'cancelled')
      .map((event: GoogleCalendarEvent) => this.parseGoogleEvent(event));
  }

  private parseGoogleEvent(event: GoogleCalendarEvent): CalendarEvent {
    const start = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start?.date || new Date());
    const end = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end?.date || new Date());

    return {
      id: event.id,
      title: event.summary || 'Busy',
      start,
      end,
      isAllDay: !event.start?.dateTime,
      status: event.status,
    };
  }

  /**
   * Fetch events from Microsoft Calendar
   */
  private async fetchMicrosoftEvents(
    account: CalendarSyncAccount,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    const accessToken = await this.microsoftOAuth.getValidAccessToken(
      account.id,
    );

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/calendarview`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          $top: 250,
          $orderby: 'start/dateTime',
        },
      },
    );

    return (response.data.value || [])
      .filter((event: MicrosoftCalendarEvent) => event.showAs !== 'free')
      .map((event: MicrosoftCalendarEvent) => this.parseMicrosoftEvent(event));
  }

  private parseMicrosoftEvent(event: MicrosoftCalendarEvent): CalendarEvent {
    // Microsoft returns dateTime in the event's timezone
    const start = new Date(event.start?.dateTime || new Date());
    const end = new Date(event.end?.dateTime || new Date());

    return {
      id: event.id,
      title: event.subject || 'Busy',
      start,
      end,
      isAllDay: event.isAllDay,
      status: event.showAs,
    };
  }

  /**
   * Create or update BusyBlocks from calendar events
   */
  private async createBusyBlocksFromEvents(
    tenantId: string,
    userId: string,
    events: CalendarEvent[],
    provider: string,
  ): Promise<void> {
    // Delete existing synced blocks from this provider
    await this.prisma.busyBlock.deleteMany({
      where: {
        tenantId,
        userId,
        source: 'calendar_sync',
        metadata: {
          path: ['provider'],
          equals: provider,
        },
      },
    });

    // Create new busy blocks for each event
    for (const event of events) {
      // Skip all-day events that are just date markers
      if (event.isAllDay) continue;

      await this.prisma.busyBlock.create({
        data: {
          tenantId,
          userId,
          startAt: event.start,
          endAt: event.end,
          reason: event.title,
          source: 'calendar_sync',
          sourceId: event.id,
          metadata: {
            provider,
            originalTitle: event.title,
            syncedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  /**
   * Get all connected calendar accounts for a user
   */
  async getConnectedAccounts(
    tenantId: string,
    userId: string,
  ): Promise<
    Array<{
      id: string;
      provider: string;
      providerAccountId: string;
      syncEnabled: boolean;
      lastSyncAt: Date | null;
    }>
  > {
    const accounts = await this.prisma.calendarSyncAccount.findMany({
      where: { tenantId, userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        syncEnabled: true,
        lastSyncAt: true,
      },
    });

    return accounts;
  }

  /**
   * Toggle sync enabled status
   */
  async toggleSyncEnabled(accountId: string, enabled: boolean): Promise<void> {
    await this.prisma.calendarSyncAccount.update({
      where: { id: accountId },
      data: { syncEnabled: enabled },
    });
  }

  /**
   * Sync all accounts for a tenant (for scheduled sync)
   */
  async syncTenantCalendars(
    tenantId: string,
  ): Promise<{ totalEvents: number; accounts: number }> {
    const accounts = await this.prisma.calendarSyncAccount.findMany({
      where: { tenantId, syncEnabled: true },
    });

    let totalEvents = 0;

    for (const account of accounts) {
      try {
        const result = await this.syncCalendar(account.id);
        totalEvents += result.eventsProcessed;
      } catch (error) {
        this.logger.error(
          `Failed to sync account ${account.id}: ${error.message}`,
        );
      }
    }

    return { totalEvents, accounts: accounts.length };
  }
}
