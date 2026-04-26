import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { GoogleOAuthService } from './google.oauth';

@Injectable()
export class GoogleCalendarApiService {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(private googleOAuth: GoogleOAuthService) {}

  /**
   * Create axios client with auth headers
   */
  private async createClient(tenantId: string): Promise<AxiosInstance> {
    const accessToken = await this.googleOAuth.getValidToken(tenantId);

    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a calendar event
   */
  async createEvent(tenantId: string, event: any): Promise<any> {
    const client = await this.createClient(tenantId);
    const response = await client.post('/calendars/primary/events', event);
    return response.data;
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    tenantId: string,
    eventId: string,
    event: any,
  ): Promise<any> {
    const client = await this.createClient(tenantId);
    const response = await client.put(
      `/calendars/primary/events/${eventId}`,
      event,
    );
    return response.data;
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(tenantId: string, eventId: string): Promise<void> {
    const client = await this.createClient(tenantId);
    await client.delete(`/calendars/primary/events/${eventId}`);
  }

  /**
   * Get free/busy information (placeholder)
   */
  async getFreeBusy(
    tenantId: string,
    timeMin: Date,
    timeMax: Date,
    calendars: string[],
  ): Promise<any> {
    const client = await this.createClient(tenantId);
    const response = await client.post('/freeBusy', {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendars.map((id) => ({ id })),
    });
    return response.data;
  }
}
