import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ZohoController } from './zoho.controller';
import { ZohoOAuthService } from './zoho.oauth.service';
import { ZohoSyncService } from './zoho.sync.service';
import { ZohoFieldMapService } from './zoho.fieldmap.service';
import { ZohoWebhookService } from './zoho.webhook.service';
import { PrismaService } from '../../../common/prisma.service';

/**
 * Zoho CRM Integration Module
 *
 * IMPORTANT: This module uses a DEMAND-DRIVEN sync strategy.
 * - NO automatic cron/scheduled polling
 * - Sync only when user triggers via UI or webhook arrives
 * - Respects API rate limits for free/low-tier accounts
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'zoho-sync' })],
  controllers: [ZohoController],
  providers: [
    PrismaService,
    ZohoOAuthService,
    ZohoSyncService,
    ZohoFieldMapService,
    ZohoWebhookService,
  ],
  exports: [ZohoSyncService],
})
export class ZohoModule {}
