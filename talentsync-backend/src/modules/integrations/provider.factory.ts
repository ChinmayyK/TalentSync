import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { IntegrationProvider } from './types/provider.interface';

// Zoho
import { ZohoProvider } from './providers/zoho/zoho.provider';
import { ZohoOAuthService } from './providers/zoho/zoho.oauth';
import { ZohoApiService } from './providers/zoho/zoho.api';
import { ZohoSyncHandler } from './providers/zoho/zoho.sync-handler';

// Google Calendar
import { GoogleCalendarProvider } from './providers/google-calendar/google.provider';
import { GoogleOAuthService } from './providers/google-calendar/google.oauth';
import { GoogleCalendarApiService } from './providers/google-calendar/google.calendar.api';

// Outlook Calendar
import { OutlookCalendarProvider } from './providers/outlook-calendar/outlook.provider';
import { OutlookOAuthService } from './providers/outlook-calendar/outlook.oauth';
import { OutlookCalendarApiService } from './providers/outlook-calendar/outlook.api';

// CRM/ATS Providers
import { SalesforceProvider } from './providers/salesforce/salesforce.provider';
import { SalesforceOAuthService } from './providers/salesforce/salesforce.oauth';
import { SalesforceApiService } from './providers/salesforce/salesforce.api';

import { HubspotProvider } from './providers/hubspot/hubspot.provider';
import { HubspotOAuthService } from './providers/hubspot/hubspot.oauth';
import { HubspotApiService } from './providers/hubspot/hubspot.api';
import { HubspotSyncHandler } from './providers/hubspot/hubspot.sync-handler';
import { SyncLogService } from './services/sync-log.service';

import { WorkdayProvider } from './providers/workday/workday.provider';
import { WorkdayAuthService } from './providers/workday/workday.auth';
import { WorkdayApiService } from './providers/workday/workday.api';
import { WorkdaySyncHandler } from './providers/workday/workday.sync-handler';
import { LeverProvider } from './providers/lever/lever.provider';
import { LeverAuthService } from './providers/lever/lever.auth';
import { LeverApiService } from './providers/lever/lever.api';
import { LeverSyncHandler } from './providers/lever/lever.sync-handler';
import { GreenhouseProvider } from './providers/greenhouse/greenhouse.provider';
import { GreenhouseAuthService } from './providers/greenhouse/greenhouse.auth';
import { GreenhouseApiService } from './providers/greenhouse/greenhouse.api';
import { GreenhouseSyncHandler } from './providers/greenhouse/greenhouse.sync-handler';
import { BambooHRProvider } from './providers/bamboohr/bamboohr.provider';
import { BambooHROAuthService } from './providers/bamboohr/bamboohr.oauth';
import { BambooHRApiService } from './providers/bamboohr/bamboohr.api';
import { BambooHRHandoffHandler } from './providers/bamboohr/bamboohr.handoff-handler';

/**
 * Provider Factory
 * Instantiates and returns integration provider instances by name
 */
@Injectable()
export class ProviderFactory {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    // Zoho
    private zohoOAuth: ZohoOAuthService,
    private zohoApi: ZohoApiService,
    private zohoSync: ZohoSyncHandler,
    // Google Calendar
    private googleOAuth: GoogleOAuthService,
    private googleCalendar: GoogleCalendarApiService,
    // Outlook Calendar
    private outlookOAuth: OutlookOAuthService,
    private outlookCalendar: OutlookCalendarApiService,
    // Salesforce
    private salesforceOAuth: SalesforceOAuthService,
    private salesforceApi: SalesforceApiService,
    // HubSpot
    private hubspotOAuth: HubspotOAuthService,
    private hubspotApi: HubspotApiService,
    private hubspotSync: HubspotSyncHandler,
    private syncLogService: SyncLogService,
    // Workday
    private workdayAuth: WorkdayAuthService,
    private workdayApi: WorkdayApiService,
    private workdaySync: WorkdaySyncHandler,
    // Lever
    private leverAuth: LeverAuthService,
    private leverApi: LeverApiService,
    private leverSync: LeverSyncHandler,
    // Greenhouse
    private greenhouseAuth: GreenhouseAuthService,
    private greenhouseApi: GreenhouseApiService,
    private greenhouseSync: GreenhouseSyncHandler,
    // BambooHR
    private bamboohrOAuth: BambooHROAuthService,
    private bamboohrApi: BambooHRApiService,
    private bamboohrHandoff: BambooHRHandoffHandler,
  ) {}

  /**
   * Get provider instance by name
   */
  getProvider(provider: string): IntegrationProvider {
    switch (provider) {
      case 'zoho':
        return new ZohoProvider(
          this.prisma,
          this.zohoOAuth,
          this.zohoApi,
          this.zohoSync,
        );

      case 'google_calendar':
        return new GoogleCalendarProvider(
          this.prisma,
          this.googleOAuth,
          this.googleCalendar,
        );

      case 'outlook_calendar':
        return new OutlookCalendarProvider(
          this.prisma,
          this.outlookOAuth,
          this.outlookCalendar,
        );

      case 'salesforce':
        return new SalesforceProvider(
          this.prisma,
          this.salesforceOAuth,
          this.salesforceApi,
        );

      case 'hubspot':
        return new HubspotProvider(
          this.prisma,
          this.hubspotOAuth,
          this.hubspotApi,
          this.hubspotSync,
          this.syncLogService,
        );

      case 'workday':
        return new WorkdayProvider(
          this.prisma,
          this.workdayAuth,
          this.workdayApi,
          this.workdaySync,
          this.syncLogService,
        );

      case 'lever':
        return new LeverProvider(
          this.prisma,
          this.leverAuth,
          this.leverApi,
          this.leverSync,
          this.syncLogService,
        );

      case 'greenhouse':
        return new GreenhouseProvider(
          this.prisma,
          this.greenhouseAuth,
          this.greenhouseApi,
          this.greenhouseSync,
          this.syncLogService,
        );

      case 'bamboohr':
        return new BambooHRProvider(
          this.prisma,
          this.bamboohrOAuth,
          this.bamboohrApi,
          this.bamboohrHandoff,
          this.syncLogService,
        );

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Get list of supported providers with their categories
   */
  getSupportedProviders(): {
    name: string;
    category: string;
    status: 'ready' | 'skeleton';
  }[] {
    return [
      // CRM
      { name: 'zoho', category: 'CRM', status: 'ready' },
      { name: 'salesforce', category: 'CRM', status: 'ready' },
      { name: 'hubspot', category: 'CRM', status: 'ready' },

      // ATS
      { name: 'lever', category: 'ATS', status: 'ready' },
      { name: 'greenhouse', category: 'ATS', status: 'ready' },
      { name: 'workday', category: 'ATS', status: 'ready' },

      // HRIS
      { name: 'bamboohr', category: 'HRIS', status: 'ready' },

      // Calendar
      { name: 'google_calendar', category: 'Calendar', status: 'ready' },
      { name: 'outlook_calendar', category: 'Calendar', status: 'ready' },
    ];
  }

  /**
   * Get list of provider names
   */
  getProviderNames(): string[] {
    return this.getSupportedProviders().map((p) => p.name);
  }

  /**
   * Check if provider is supported
   */
  isSupported(provider: string): boolean {
    return this.getProviderNames().includes(provider);
  }
}
