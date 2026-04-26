import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { OutlookOAuthService } from './outlook.oauth';

@Injectable()
export class OutlookCalendarApiService {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private outlookOAuth: OutlookOAuthService) {}

  private async createClient(tenantId: string): Promise<AxiosInstance> {
    const accessToken = await this.outlookOAuth.getValidToken(tenantId);

    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async createEvent(tenantId: string, event: any): Promise<any> {
    const client = await this.createClient(tenantId);
    const response = await client.post('/me/events', event);
    return response.data;
  }

  async updateEvent(
    tenantId: string,
    eventId: string,
    event: any,
  ): Promise<any> {
    const client = await this.createClient(tenantId);
    const response = await client.patch(`/me/events/${eventId}`, event);
    return response.data;
  }

  async deleteEvent(tenantId: string, eventId: string): Promise<void> {
    const client = await this.createClient(tenantId);
    await client.delete(`/me/events/${eventId}`);
  }

  async getFreeBusy(
    tenantId: string,
    timeMin: Date,
    timeMax: Date,
    emails: string[],
  ): Promise<any> {
    const client = await this.createClient(tenantId);
    const response = await client.post('/me/calendar/getSchedule', {
      schedules: emails,
      startTime: {
        dateTime: timeMin.toISOString(),
        timeZone: 'UTC',
      },
      endTime: {
        dateTime: timeMax.toISOString(),
        timeZone: 'UTC',
      },
    });
    return response.data;
  }
}
