import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import * as dns from 'dns/promises';
import axios from 'axios';

@Processor('domain-verification')
@Injectable()
export class DomainVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(DomainVerificationProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<{ tenantId: string; domain: string; token: string }>,
  ): Promise<any> {
    const { tenantId, domain, token } = job.data;
    this.logger.log(
      `Starting domain verification for tenant ${tenantId} domain ${domain}`,
    );

    try {
      // 1. DNS TXT Check
      const txtRecord = `_talentsync-verification.${domain}`;
      try {
        const records = await dns.resolveTxt(txtRecord);
        const flatRecords = records.flat();
        if (flatRecords.includes(token)) {
          await this.verifySuccess(tenantId);
          return { success: true, method: 'dns' };
        }
      } catch (e) {
        this.logger.debug(`DNS Check failed for ${domain}: ${e.message}`);
      }

      // 2. HTTP File Check
      const url = `https://${domain}/.well-known/talentsync-verification.txt`;
      try {
        const response = await axios.get(url, { timeout: 5000 });
        if (response.data && response.data.trim().includes(token)) {
          await this.verifySuccess(tenantId);
          return { success: true, method: 'http' };
        }
      } catch (e) {
        this.logger.debug(`HTTP Check failed for ${domain}: ${e.message}`);
      }

      throw new Error('Verification failed: Token not found in DNS or HTTP');
    } catch (error) {
      this.logger.error(
        `Verification failed for ${tenantId}: ${error.message}`,
      );
      // Log failure in AuditLog via service or direct DB access? Direct DB for simplicity here or could inject service if circular dep avoided.
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DOMAIN_VERIFICATION_FAILED',
          metadata: { domain, error: error.message },
        },
      });
      throw error; // Retry via BullMQ
    }
  }

  private async verifySuccess(tenantId: string) {
    // Clear token and set verified
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) return;

    const settings = (tenant.settings as any) || {};
    if (settings.domainVerification) {
      delete settings.domainVerification;
    }

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { domainVerified: true, settings } as any, // Type assertion for pending schema update definition
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DOMAIN_VERIFICATION_SUCCESS',
          metadata: { domain: tenant.domain },
        },
      }),
    ]);
    this.logger.log(`Domain verified for tenant ${tenantId}`);
  }
}
