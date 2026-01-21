import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { TenantMiddleware } from './common/tenant.middleware';
import { LoggingInterceptor } from './common/logging.interceptor';
import { MetricsInterceptor } from './common/metrics.interceptor';

// Import modules
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EmailModule } from './modules/email/email.module';
import { StorageModule } from './modules/storage/storage.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AutomationModule } from './modules/automation/automation.module';
import { RecycleBinModule } from './modules/recycle-bin/recycle-bin.module';
import { SystemMetricsModule } from './modules/system-metrics/system-metrics.module';
import { SSOModule } from './modules/sso/sso.module';
import { IdentityProviderModule } from './modules/identity-provider/identity-provider.module';
import { SettingsModule } from './modules/settings/settings.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { AdminConsoleModule } from './modules/admin-console/admin-console.module';
import { UsageModule } from './modules/usage/usage.module';
import { RolesModule } from './modules/roles/roles.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { OffersModule } from './modules/offers/offers.module';
import { JobBoardsModule } from './modules/job-boards/job-boards.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ResumeInboxModule } from './modules/resume-inbox/resume-inbox.module';

import { HealthController } from './common/health.controller';
import { S3Service } from './common/s3.service';
import { PrismaService } from './common/prisma.service';
import { GlobalExceptionFilter } from './common/exceptions.filter';

import { AppCommonModule } from './common/app-common.module';
import { RateLimitGuard } from './common/rate-limit';
import { IPAllowlistGuard } from './common/ip-allowlist.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    EventEmitterModule.forRoot(),
    AppCommonModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    CandidatesModule,
    InterviewsModule,
    FeedbackModule,
    ReportsModule,
    AuditModule,
    EmailModule,
    StorageModule,
    CommunicationModule,
    CalendarModule,
    RecycleBinModule,
    SystemMetricsModule,
    AutomationModule,
    SSOModule,
    IdentityProviderModule,
    SettingsModule,
    IntegrationsModule,
    TenantsModule,
    AdminConsoleModule,
    UsageModule,
    RolesModule,
    JobsModule,
    OffersModule,
    JobBoardsModule,
    VendorsModule,
    ResumeInboxModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: IPAllowlistGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

