import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface TenantUsageMetrics {
  tenantId: string;
  tenantName: string;
  candidates: number;
  interviews: number;
  messageVolume30d: number;
  storageUsedMb: number;
}

@Injectable()
export class TenantUsageService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(): Promise<TenantUsageMetrics[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all tenants
    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Get aggregated metrics for each tenant
    const results = await Promise.all(
      tenants.map(async (tenant) => {
        const [candidateCount, interviewCount, messageCount, storageSum] =
          await Promise.all([
            // Candidate count
            this.prisma.candidate.count({
              where: { tenantId: tenant.id },
            }),

            // Interview count
            this.prisma.interview.count({
              where: { tenantId: tenant.id },
            }),

            // Message volume (last 30 days)
            this.prisma.messageLog.count({
              where: {
                tenantId: tenant.id,
                createdAt: { gte: thirtyDaysAgo },
              },
            }),

            // Storage used (sum of FileObject.size)
            this.prisma.fileObject.aggregate({
              where: {
                tenantId: tenant.id,
                status: 'active',
              },
              _sum: { size: true },
            }),
          ]);

        // Convert bytes to MB
        const storageMb = (storageSum._sum.size || 0) / (1024 * 1024);

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          candidates: candidateCount,
          interviews: interviewCount,
          messageVolume30d: messageCount,
          storageUsedMb: Math.round(storageMb * 100) / 100,
        };
      }),
    );

    // Sort by most active (candidates + interviews)
    return results.sort(
      (a, b) => b.candidates + b.interviews - (a.candidates + a.interviews),
    );
  }

  /**
   * Get usage metrics for a specific tenant
   */
  async getTenantMetrics(tenantId: string): Promise<TenantUsageMetrics | null> {
    const metrics = await this.getMetrics();
    return metrics.find((m) => m.tenantId === tenantId) || null;
  }
}
