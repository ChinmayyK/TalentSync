import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { ZohoModule } from './zoho/zoho.module';

// Controllers
import { IntegrationsController } from './integrations.controller';
import { OAuthCallbackController } from './oauth-callback.controller';
import { WebhookController } from './webhooks/webhook.controller';

// Services
import { IntegrationsService } from './integrations.service';
import { WebhookService } from './webhooks/webhook.service';
import { ProviderFactory } from './provider.factory';
import { SyncLogService } from './services/sync-log.service';
import { IntegrationEventsService } from './services/integration-events.service';

// Zoho Provider
import { ZohoProvider } from './providers/zoho/zoho.provider';
import { ZohoOAuthService } from './providers/zoho/zoho.oauth';
import { ZohoApiService } from './providers/zoho/zoho.api';
import { ZohoSyncHandler } from './providers/zoho/zoho.sync-handler';
import { ZohoSyncService } from './zoho/zoho.sync.service';

// Google Calendar Provider
import { GoogleCalendarProvider } from './providers/google-calendar/google.provider';
import { GoogleOAuthService } from './providers/google-calendar/google.oauth';
import { GoogleCalendarApiService } from './providers/google-calendar/google.calendar.api';

// Outlook Calendar Provider
import { OutlookCalendarProvider } from './providers/outlook-calendar/outlook.provider';
import { OutlookOAuthService } from './providers/outlook-calendar/outlook.oauth';
import { OutlookCalendarApiService } from './providers/outlook-calendar/outlook.api';

// Salesforce Provider
import { SalesforceProvider } from './providers/salesforce/salesforce.provider';
import { SalesforceOAuthService } from './providers/salesforce/salesforce.oauth';
import { SalesforceApiService } from './providers/salesforce/salesforce.api';
import { SalesforceSyncHandler } from './providers/salesforce/salesforce.sync-handler';

// HubSpot Provider
import { HubspotProvider } from './providers/hubspot/hubspot.provider';
import { HubspotOAuthService } from './providers/hubspot/hubspot.oauth';
import { HubspotApiService } from './providers/hubspot/hubspot.api';
import { HubspotSyncHandler } from './providers/hubspot/hubspot.sync-handler';

// ATS/HRIS Providers
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
// BambooHR
import { BambooHRProvider } from './providers/bamboohr/bamboohr.provider';
import { BambooHROAuthService } from './providers/bamboohr/bamboohr.oauth';
import { BambooHRApiService } from './providers/bamboohr/bamboohr.api';
import { BambooHRHandoffHandler } from './providers/bamboohr/bamboohr.handoff-handler';

// Zoho Recruit
import { ZohoRecruitApiService } from './providers/zoho-recruit/zoho-recruit.api';
import { ZohoRecruitOAuthService } from './providers/zoho-recruit/zoho-recruit.oauth';
import { ZohoRecruitSyncService } from './providers/zoho-recruit/zoho-recruit.sync';

// Processors
import { SyncProcessor } from './processors/sync.processor';
import { DlqProcessor } from './processors/dlq.processor';
import { ScheduledImportProcessor } from './processors/scheduled-import.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'integration-sync' },
      { name: 'integration-dlq' },
      { name: 'zoho-sync' },
    ),
    AuditModule,
    ConfigModule,
    ZohoModule,
  ],
  controllers: [
    IntegrationsController,
    OAuthCallbackController,
    WebhookController,
  ],
  providers: [
    PrismaService,
    IntegrationsService,
    WebhookService,
    ProviderFactory,
    SyncLogService,
    IntegrationEventsService,

    // Zoho
    ZohoProvider,
    ZohoOAuthService,
    ZohoApiService,
    ZohoSyncHandler,
    // ZohoSyncService is exported from ZohoModule

    // Google Calendar
    GoogleCalendarProvider,
    GoogleOAuthService,
    GoogleCalendarApiService,

    // Outlook Calendar
    OutlookCalendarProvider,
    OutlookOAuthService,
    OutlookCalendarApiService,

    // Salesforce
    SalesforceProvider,
    SalesforceOAuthService,
    SalesforceApiService,
    SalesforceSyncHandler,

    // HubSpot
    HubspotProvider,
    HubspotOAuthService,
    HubspotApiService,
    HubspotSyncHandler,

    // Workday
    WorkdayProvider,
    WorkdayAuthService,
    WorkdayApiService,
    WorkdaySyncHandler,

    // Lever
    LeverProvider,
    LeverAuthService,
    LeverApiService,
    LeverSyncHandler,

    // Greenhouse
    GreenhouseProvider,
    GreenhouseAuthService,
    GreenhouseApiService,
    GreenhouseSyncHandler,

    // BambooHR
    BambooHRProvider,
    BambooHROAuthService,
    BambooHRApiService,
    BambooHRHandoffHandler,

    // Zoho Recruit
    ZohoRecruitApiService,
    ZohoRecruitOAuthService,
    ZohoRecruitSyncService,

    // Processors
    SyncProcessor,
    DlqProcessor,
    ScheduledImportProcessor,
  ],
  exports: [
    IntegrationsService,
    ProviderFactory,
    IntegrationEventsService,
    ZohoRecruitSyncService,
  ],
})
export class IntegrationsModule {}
