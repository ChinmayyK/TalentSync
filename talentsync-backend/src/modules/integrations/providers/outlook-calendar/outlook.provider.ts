import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { IntegrationProvider } from '../../types/provider.interface';
import { ProviderCapabilities } from '../../types/standard-entities';
import { OutlookOAuthService } from './outlook.oauth';
import { OutlookCalendarApiService } from './outlook.api';

@Injectable()
export class OutlookCalendarProvider implements IntegrationProvider {
  constructor(
    private prisma: PrismaService,
    private outlookOAuth: OutlookOAuthService,
    private outlookCalendar: OutlookCalendarApiService,
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
    return this.outlookOAuth.getAuthUrl(tenantId);
  }

  async exchangeCode(tenantId: string, code: string): Promise<void> {
    await this.outlookOAuth.exchangeCode(tenantId, code);
  }

  async refreshTokens(tenantId: string): Promise<void> {
    await this.outlookOAuth.refreshTokens(tenantId);
  }

  async createCalendarEvent(tenantId: string, interview: any): Promise<any> {
    const event = {
      subject: `Interview: ${interview.candidateName} - ${interview.role}`,
      body: {
        contentType: 'HTML',
        content: `Interview with ${interview.candidateName} for ${interview.role}`,
      },
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
        {
          emailAddress: { address: interview.candidateEmail },
          type: 'required',
        },
        ...interview.interviewerEmails.map((email: string) => ({
          emailAddress: { address: email },
          type: 'required',
        })),
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    };

    return this.outlookCalendar.createEvent(tenantId, event);
  }

  async updateCalendarEvent(tenantId: string, interview: any): Promise<any> {
    const event = {
      subject: `Interview: ${interview.candidateName} - ${interview.role}`,
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

    return this.outlookCalendar.updateEvent(
      tenantId,
      interview.calendarEventId,
      event,
    );
  }

  async deleteCalendarEvent(
    tenantId: string,
    interviewId: string,
  ): Promise<any> {
    await this.outlookCalendar.deleteEvent(tenantId, interviewId);
  }

  async handleWebhook(tenantId: string, event: any): Promise<void> {
    console.log(`Outlook Calendar webhook for tenant ${tenantId}`, event);
  }
}
