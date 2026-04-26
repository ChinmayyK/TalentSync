import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import { ProviderCapabilities } from '../../types/standard-entities';
import { GoogleOAuthService } from './google.oauth';
import { GoogleCalendarApiService } from './google.calendar.api';

@Injectable()
export class GoogleCalendarProvider implements IntegrationProvider {
  constructor(
    private prisma: PrismaService,
    private googleOAuth: GoogleOAuthService,
    private googleCalendar: GoogleCalendarApiService,
  ) {}

  /**
   * Get provider capabilities
   */
  getCapabilities(): ProviderCapabilities {
    return {
      candidateSync: 'none',
      jobSync: 'none',
      interviewSync: 'write',
      supportsWebhooks: true,
    };
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    return this.googleOAuth.getAuthUrl(tenantId);
  }

  async exchangeCode(tenantId: string, code: string): Promise<void> {
    await this.googleOAuth.exchangeCode(tenantId, code);
  }

  async refreshTokens(tenantId: string): Promise<void> {
    await this.googleOAuth.refreshTokens(tenantId);
  }

  /**
   * Create a calendar event for an interview
   */
  async createCalendarEvent(tenantId: string, interview: any): Promise<any> {
    const event = {
      summary: `Interview: ${interview.candidateName} - ${interview.role}`,
      description: `Interview with ${interview.candidateName} for ${interview.role}`,
      start: {
        dateTime: interview.date,
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(
          new Date(interview.date).getTime() + interview.durationMins * 60000,
        ).toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: interview.candidateEmail },
        ...interview.interviewerEmails.map((email: string) => ({ email })),
      ],
      conferenceData: {
        createRequest: {
          requestId: interview.id,
        },
      },
    };

    return this.googleCalendar.createEvent(tenantId, event);
  }

  /**
   * Update a calendar event
   */
  async updateCalendarEvent(tenantId: string, interview: any): Promise<any> {
    // Assume interview.calendarEventId is stored
    const event = {
      summary: `Interview: ${interview.candidateName} - ${interview.role}`,
      start: {
        dateTime: interview.date,
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(
          new Date(interview.date).getTime() + interview.durationMins * 60000,
        ).toISOString(),
        timeZone: 'UTC',
      },
    };

    return this.googleCalendar.updateEvent(
      tenantId,
      interview.calendarEventId,
      event,
    );
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(
    tenantId: string,
    interviewId: string,
  ): Promise<any> {
    // Fetch interview to get calendarEventId
    // For now, placeholder implementation
    await this.googleCalendar.deleteEvent(tenantId, interviewId);
  }

  /**
   * Handle webhook from Google Calendar
   */
  async handleWebhook(tenantId: string, event: any): Promise<void> {
    // Google Calendar push notifications
    console.log(`Google Calendar webhook for tenant ${tenantId}`, event);
  }
}
