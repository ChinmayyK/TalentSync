import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CandidatePortalService } from '../../candidate-portal/candidate-portal.service';
import { MessageService } from '../../communication/services/message.service';
import { Channel, RecipientType, PortalLinkStatus } from '@prisma/client';

export interface PortalLinkJobData {
  tenantId: string;
  candidateId: string;
  channel: Channel;
  userId?: string;
}

export interface BulkPortalLinkJobData {
  tenantId: string;
  candidateIds: string[];
  channel: Channel;
  userId?: string;
}

@Processor('portal-link-send')
@Injectable()
export class PortalLinkProcessor extends WorkerHost {
  private readonly logger = new Logger(PortalLinkProcessor.name);

  constructor(
    private prisma: PrismaService,
    private candidatePortalService: CandidatePortalService,
    private messageService: MessageService,
  ) {
    super();
  }

  async process(
    job: Job<PortalLinkJobData | BulkPortalLinkJobData>,
  ): Promise<any> {
    if ('candidateIds' in job.data) {
      return this.processBulk(job as Job<BulkPortalLinkJobData>);
    }
    return this.processSingle(job as Job<PortalLinkJobData>);
  }

  /**
   * Process a single portal link send job
   */
  private async processSingle(
    job: Job<PortalLinkJobData>,
  ): Promise<{ success: boolean; portalUrl?: string; error?: string }> {
    const { tenantId, candidateId, channel, userId } = job.data;
    this.logger.log(`Processing portal link send for candidate ${candidateId}`);

    try {
      // Get candidate
      const candidate = await this.prisma.candidate.findFirst({
        where: { id: candidateId, tenantId, deletedAt: null },
      });

      if (!candidate) {
        return { success: false, error: 'Candidate not found' };
      }

      // Validate channel requirements
      if (channel === Channel.EMAIL && !candidate.email) {
        return { success: false, error: 'Candidate has no email address' };
      }
      if (
        (channel === Channel.WHATSAPP || channel === Channel.SMS) &&
        !candidate.phone
      ) {
        return { success: false, error: 'Candidate has no phone number' };
      }

      // Check for existing active token
      const existingToken = await this.prisma.candidatePortalToken.findFirst({
        where: {
          tenantId,
          candidateId,
          expiresAt: { gt: new Date() },
          revokedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      let rawToken: string;
      let expiresAt: Date;

      if (existingToken) {
        // Generate new token - we can't recover the raw token from hash
        const result = await this.candidatePortalService.generateToken(
          tenantId,
          candidateId,
        );
        rawToken = result.token;
        expiresAt = result.expiresAt;
      } else {
        const result = await this.candidatePortalService.generateToken(
          tenantId,
          candidateId,
        );
        rawToken = result.token;
        expiresAt = result.expiresAt;
      }

      // Construct portal URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const portalUrl = `${baseUrl}/portal/${rawToken}`;

      // Prepare message
      const expiryText = channel === Channel.EMAIL ? '7 days' : '48 hours';
      let subject: string | undefined;
      let body: string;

      if (channel === Channel.EMAIL) {
        subject = 'Complete Your Application';
        body = `Hi ${candidate.name},\n\nPlease upload your documents using the secure link below:\n${portalUrl}\n\nThis link expires in ${expiryText}.\n\n– Hiring Team`;
      } else {
        body = `Hi ${candidate.name}, please upload your documents here: ${portalUrl} (Link expires in ${expiryText})`;
      }

      // Send message
      await this.messageService.send(
        tenantId,
        {
          channel,
          recipientType: RecipientType.CANDIDATE,
          recipientId: candidateId,
          subject,
          body,
        },
        userId,
      );

      // Update portal link status
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: { portalLinkStatus: PortalLinkStatus.SENT },
      });

      // Update token send tracking
      const tokenRecord = await this.prisma.candidatePortalToken.findFirst({
        where: { tenantId, candidateId },
        orderBy: { createdAt: 'desc' },
      });

      if (tokenRecord) {
        await this.prisma.candidatePortalToken.update({
          where: { id: tokenRecord.id },
          data: {
            sendCount: { increment: 1 },
            lastSentAt: new Date(),
            channel,
          },
        });
      }

      this.logger.log(
        `Portal link sent successfully for candidate ${candidateId}`,
      );
      return { success: true, portalUrl };
    } catch (error: any) {
      this.logger.error(
        `Failed to send portal link for ${candidateId}: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Process bulk portal link send job
   */
  private async processBulk(job: Job<BulkPortalLinkJobData>): Promise<{
    total: number;
    sent: number;
    failed: number;
    errors: Array<{ candidateId: string; error: string }>;
  }> {
    const { tenantId, candidateIds, channel, userId } = job.data;
    this.logger.log(
      `Processing bulk portal link send for ${candidateIds.length} candidates`,
    );

    const results = {
      total: candidateIds.length,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ candidateId: string; error: string }>,
    };

    for (const candidateId of candidateIds) {
      try {
        const singleJob: PortalLinkJobData = {
          tenantId,
          candidateId,
          channel,
          userId,
        };
        const result = await this.processSingle({
          data: singleJob,
        } as Job<PortalLinkJobData>);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            candidateId,
            error: result.error || 'Unknown error',
          });
        }

        // Update job progress
        await job.updateProgress(
          Math.round(((results.sent + results.failed) / results.total) * 100),
        );
      } catch (error: any) {
        results.failed++;
        results.errors.push({ candidateId, error: error.message });
      }
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'PORTAL_LINKS_BULK_SEND',
        metadata: {
          total: results.total,
          sent: results.sent,
          failed: results.failed,
          channel,
        },
      },
    });

    this.logger.log(
      `Bulk portal link send complete: ${results.sent}/${results.total} sent`,
    );
    return results;
  }
}
