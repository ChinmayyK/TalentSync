import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Processor('integration-dlq')
@Injectable()
export class DlqProcessor extends WorkerHost {
  private readonly logger = new Logger(DlqProcessor.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    super();
  }

  /**
   * Handle jobs that have permanently failed
   */
  async process(job: Job): Promise<any> {
    const { tenantId, provider } = job.data;

    this.logger.error(
      `Job ${job.id} permanently failed for tenant ${tenantId}, provider ${provider}`,
    );

    try {
      // Store error in Integration record
      await this.prisma.integration.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
        data: {
          lastError: `Sync permanently failed after ${job.attemptsMade} attempts: ${job.failedReason}`,
          status: 'error',
        },
      });

      // Create audit log
      await this.auditService.log({
        tenantId,
        userId: null,
        action: 'integration.sync.permanent_failure',
        metadata: {
          provider,
          jobId: job.id,
          attempts: job.attemptsMade,
          error: job.failedReason,
        },
      });

      // Send notification to tenant admins
      const admins = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: 'ADMIN',
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (admins.length > 0) {
        // Log admin notification (in production, this would queue email jobs)
        this.logger.log(
          `Notifying ${admins.length} admin(s) about integration failure: ${admins.map((a) => a.email).join(', ')}`,
        );

        // Create system notification for each admin
        for (const admin of admins) {
          await this.prisma.auditLog.create({
            data: {
              tenantId,
              userId: admin.id,
              action: 'SYSTEM_NOTIFICATION',
              metadata: {
                type: 'integration_failure',
                title: `${provider} Integration Sync Failed`,
                message: `The ${provider} integration has permanently failed after ${job.attemptsMade} attempts. Please check the integration settings.`,
                severity: 'error',
              },
            },
          });
        }
      }

      return { success: true, logged: true, adminsNotified: admins.length };
    } catch (error) {
      this.logger.error(`Failed to process DLQ job ${job.id}`, error);
      throw error;
    }
  }

  /**
   * Listen for failed jobs
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed permanently:`, error.message);
  }
}
