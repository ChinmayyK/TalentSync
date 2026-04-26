import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';

/**
 * Scheduled Import Processor
 *
 * Runs every 5 minutes to check for integrations with scheduled imports enabled.
 * Triggers imports based on the configured importFrequency (hourly or daily).
 *
 * Product Rule: CRMs provide people, TalentSync manages interviews.
 * This only handles inbound candidate imports from CRMs.
 */
@Injectable()
export class ScheduledImportProcessor {
  private readonly logger = new Logger(ScheduledImportProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('integration-sync') private integrationSyncQueue: Queue,
  ) {}

  /**
   * Check for integrations that need scheduled imports every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkScheduledImports() {
    this.logger.debug('Checking for scheduled imports...');

    try {
      // Find all connected CRM integrations
      const integrations = await this.prisma.integration.findMany({
        where: {
          status: 'CONNECTED',
          provider: {
            in: [
              'zoho',
              'salesforce',
              'hubspot',
              'workday',
              'lever',
              'greenhouse',
            ],
          },
        },
      });

      if (integrations.length === 0) {
        return;
      }

      const now = new Date();
      let scheduledCount = 0;

      for (const integration of integrations) {
        const settings = (integration.settings as any) || {};
        const config = settings.config || {};

        // Skip if not in scheduled mode
        if (config.importMode !== 'scheduled') {
          continue;
        }

        const frequency = config.importFrequency || 'daily';
        const lastSync = integration.lastSyncedAt;

        // Determine if import is due
        if (this.isImportDue(lastSync, frequency, now)) {
          this.logger.log(
            `Scheduling import for ${integration.provider} (tenant: ${integration.tenantId})`,
          );

          // Queue the sync job
          await this.integrationSyncQueue.add(
            'sync',
            {
              tenantId: integration.tenantId,
              provider: integration.provider,
              direction: 'full',
              triggeredBy: 'scheduler',
              module: config[`${integration.provider}Module`] || 'all',
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
            },
          );

          scheduledCount++;
        }
      }

      if (scheduledCount > 0) {
        this.logger.log(`Scheduled ${scheduledCount} integration imports`);
      }
    } catch (error) {
      this.logger.error(`Failed to check scheduled imports: ${error.message}`);
    }
  }

  /**
   * Determine if an import is due based on frequency and last sync time
   */
  private isImportDue(
    lastSync: Date | null,
    frequency: string,
    now: Date,
  ): boolean {
    // If never synced, sync now
    if (!lastSync) {
      return true;
    }

    const lastSyncTime = new Date(lastSync).getTime();
    const nowTime = now.getTime();
    const timeSinceLastSync = nowTime - lastSyncTime;

    // Calculate threshold based on frequency
    let thresholdMs: number;
    switch (frequency) {
      case 'hourly':
        thresholdMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
      default:
        thresholdMs = 24 * 60 * 60 * 1000; // 24 hours
        break;
    }

    // Import is due if time since last sync exceeds the threshold
    return timeSinceLastSync >= thresholdMs;
  }
}
