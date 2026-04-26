import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SyncLogStatus } from '@prisma/client';

export interface IntegrationMetrics {
  provider: string;
  total24h: number;
  success24h: number;
  failed24h: number;
  successRate: number;
  lastSyncAt: Date | null;
  lastError: string | null;
}

export interface IntegrationMetricsSummary {
  totalProviders: number;
  connectedProviders: number;
  totalSyncs24h: number;
  overallSuccessRate: number;
  byProvider: IntegrationMetrics[];
}

/**
 * Integration Metrics Service
 *
 * Provides metrics for ATS/CRM integration sync operations.
 */
@Injectable()
export class IntegrationMetricsService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(): Promise<IntegrationMetricsSummary> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get all integrations
    const integrations = await this.prisma.integration.findMany({
      select: {
        provider: true,
        status: true,
        lastSyncedAt: true,
        lastError: true,
      },
    });

    // Get all logs from last 24h
    const allLogs = await this.prisma.integrationSyncLog.findMany({
      where: { createdAt: { gte: dayAgo } },
      select: { provider: true, status: true },
    });

    // Aggregate by provider
    const providerMap = new Map<
      string,
      { total: number; success: number; failed: number }
    >();

    for (const log of allLogs) {
      const existing = providerMap.get(log.provider) || {
        total: 0,
        success: 0,
        failed: 0,
      };
      existing.total++;
      if (log.status === SyncLogStatus.SUCCESS) existing.success++;
      if (log.status === SyncLogStatus.FAILED) existing.failed++;
      providerMap.set(log.provider, existing);
    }

    // Build provider list
    const providers = [
      ...new Set([
        ...integrations.map((i) => i.provider),
        ...providerMap.keys(),
      ]),
    ];

    const byProvider: IntegrationMetrics[] = providers.map((provider) => {
      const integration = integrations.find((i) => i.provider === provider);
      const stats = providerMap.get(provider) || {
        total: 0,
        success: 0,
        failed: 0,
      };

      return {
        provider,
        total24h: stats.total,
        success24h: stats.success,
        failed24h: stats.failed,
        successRate:
          stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
        lastSyncAt: integration?.lastSyncedAt || null,
        lastError: integration?.lastError || null,
      };
    });

    const totalSyncs = byProvider.reduce((sum, p) => sum + p.total24h, 0);
    const totalSuccess = byProvider.reduce((sum, p) => sum + p.success24h, 0);

    return {
      totalProviders: providers.length,
      connectedProviders: integrations.filter((i) => i.status === 'connected')
        .length,
      totalSyncs24h: totalSyncs,
      overallSuccessRate:
        totalSyncs > 0 ? Math.round((totalSuccess / totalSyncs) * 100) : 0,
      byProvider,
    };
  }

  async getProviderMetrics(
    provider: string,
  ): Promise<IntegrationMetrics | null> {
    const metrics = await this.getMetrics();
    return metrics.byProvider.find((p) => p.provider === provider) || null;
  }
}
