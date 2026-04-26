import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ComponentStatus } from '@prisma/client';
import Redis from 'ioredis';

export interface HealthCheckResult {
  componentKey: string;
  status: ComponentStatus;
  latencyMs?: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private redis: Redis | null = null;

  constructor(private prisma: PrismaService) {}

  private getRedis(): Redis {
    if (!this.redis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }
    return this.redis;
  }

  /**
   * Run all health checks and persist results
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const components = await this.prisma.systemComponent.findMany({
      where: { isMonitored: true },
    });

    const results: HealthCheckResult[] = [];

    for (const component of components) {
      try {
        const result = await this.checkComponent(component.key);
        results.push(result);

        // Persist result
        await this.prisma.healthCheckResult.create({
          data: {
            componentId: component.id,
            status: result.status,
            latencyMs: result.latencyMs,
            message: result.message,
            metadata: result.metadata as object,
          },
        });
      } catch (error) {
        this.logger.error(`Health check failed for ${component.key}:`, error);
        results.push({
          componentKey: component.key,
          status: ComponentStatus.MAJOR_OUTAGE,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Check a specific component
   */
  async checkComponent(key: string): Promise<HealthCheckResult> {
    switch (key) {
      case 'api':
        return this.checkApi();
      case 'database':
        return this.checkDatabase();
      case 'redis':
        return this.checkRedis();
      case 'calendar':
        return this.checkCalendarService();
      case 'communication':
        return this.checkCommunicationService();
      case 'integrations':
        return this.checkIntegrationServices();
      default:
        return {
          componentKey: key,
          status: ComponentStatus.OPERATIONAL,
          message: 'No specific check defined',
        };
    }
  }

  /**
   * API Server health check - always operational if we reach this code
   */
  private async checkApi(): Promise<HealthCheckResult> {
    const start = Date.now();
    return {
      componentKey: 'api',
      status: ComponentStatus.OPERATIONAL,
      latencyMs: Date.now() - start,
      message: 'API server is running',
      metadata: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed,
      },
    };
  }

  /**
   * Database health check with latency measurement
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;

      // Degraded if latency > 500ms
      const status =
        latencyMs > 500
          ? ComponentStatus.DEGRADED
          : ComponentStatus.OPERATIONAL;

      return {
        componentKey: 'database',
        status,
        latencyMs,
        message:
          status === ComponentStatus.DEGRADED
            ? 'High latency detected'
            : 'Database is responsive',
      };
    } catch (error) {
      return {
        componentKey: 'database',
        status: ComponentStatus.MAJOR_OUTAGE,
        latencyMs: Date.now() - start,
        message:
          error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Redis health check
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const redis = this.getRedis();
      await redis.connect().catch(() => {}); // Ignore if already connected
      const pong = await redis.ping();
      const latencyMs = Date.now() - start;

      if (pong !== 'PONG') {
        return {
          componentKey: 'redis',
          status: ComponentStatus.DEGRADED,
          latencyMs,
          message: 'Unexpected PING response',
        };
      }

      return {
        componentKey: 'redis',
        status:
          latencyMs > 100
            ? ComponentStatus.DEGRADED
            : ComponentStatus.OPERATIONAL,
        latencyMs,
        message: 'Redis is responsive',
      };
    } catch (error) {
      return {
        componentKey: 'redis',
        status: ComponentStatus.MAJOR_OUTAGE,
        latencyMs: Date.now() - start,
        message:
          error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  /**
   * Calendar service health check - verify sync accounts exist and have valid tokens
   */
  private async checkCalendarService(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Check if any calendar sync accounts exist and are enabled
      const syncAccounts = await this.prisma.calendarSyncAccount.count({
        where: { syncEnabled: true },
      });

      // Check for recent syncs (last 24h)
      const recentSyncs = await this.prisma.calendarSyncAccount.count({
        where: {
          syncEnabled: true,
          lastSyncAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const latencyMs = Date.now() - start;

      if (syncAccounts === 0) {
        return {
          componentKey: 'calendar',
          status: ComponentStatus.OPERATIONAL,
          latencyMs,
          message: 'No calendar accounts configured',
          metadata: { syncAccounts: 0, recentSyncs: 0 },
        };
      }

      // Degraded if less than 50% of accounts synced recently
      const syncRate = recentSyncs / syncAccounts;
      const status =
        syncRate < 0.5 ? ComponentStatus.DEGRADED : ComponentStatus.OPERATIONAL;

      return {
        componentKey: 'calendar',
        status,
        latencyMs,
        message:
          status === ComponentStatus.DEGRADED
            ? 'Some calendars not syncing'
            : 'Calendar sync active',
        metadata: { syncAccounts, recentSyncs, syncRate },
      };
    } catch (error) {
      return {
        componentKey: 'calendar',
        status: ComponentStatus.MAJOR_OUTAGE,
        latencyMs: Date.now() - start,
        message:
          error instanceof Error
            ? error.message
            : 'Calendar service check failed',
      };
    }
  }

  /**
   * Communication service health check - verify channel configs are active
   */
  private async checkCommunicationService(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const activeChannels = await this.prisma.channelConfig.count({
        where: { isActive: true },
      });

      const verifiedChannels = await this.prisma.channelConfig.count({
        where: { isActive: true, isVerified: true },
      });

      // Check recent message failures (last 24h)
      const recentMessages = await this.prisma.messageLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      const failedMessages = await this.prisma.messageLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: { in: ['FAILED', 'BOUNCED'] },
        },
      });

      const latencyMs = Date.now() - start;
      const failureRate =
        recentMessages > 0 ? failedMessages / recentMessages : 0;

      let status: ComponentStatus = ComponentStatus.OPERATIONAL;
      let message = 'Communication services operational';

      if (failureRate > 0.1) {
        status = ComponentStatus.DEGRADED;
        message = 'High message failure rate detected';
      } else if (activeChannels > 0 && verifiedChannels === 0) {
        status = ComponentStatus.DEGRADED;
        message = 'No verified channels available';
      }

      return {
        componentKey: 'communication',
        status,
        latencyMs,
        message,
        metadata: {
          activeChannels,
          verifiedChannels,
          recentMessages,
          failedMessages,
          failureRate,
        },
      };
    } catch (error) {
      return {
        componentKey: 'communication',
        status: ComponentStatus.MAJOR_OUTAGE,
        latencyMs: Date.now() - start,
        message:
          error instanceof Error
            ? error.message
            : 'Communication service check failed',
      };
    }
  }

  /**
   * Integration services health check - verify connected integrations
   */
  private async checkIntegrationServices(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const integrations = await this.prisma.integration.findMany({
        select: {
          provider: true,
          status: true,
          lastError: true,
          lastSyncedAt: true,
        },
      });

      const connected = integrations.filter(
        (i) => i.status === 'connected',
      ).length;
      const errored = integrations.filter(
        (i) => i.status === 'error' || i.lastError,
      ).length;
      const total = integrations.length;

      // Check recent sync logs for failures
      const recentFailures = await this.prisma.integrationSyncLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: 'FAILED',
        },
      });

      const latencyMs = Date.now() - start;

      let status: ComponentStatus = ComponentStatus.OPERATIONAL;
      let message = 'All integrations operational';

      if (total === 0) {
        return {
          componentKey: 'integrations',
          status: ComponentStatus.OPERATIONAL,
          latencyMs,
          message: 'No integrations configured',
          metadata: { total: 0, connected: 0, errored: 0, recentFailures: 0 },
        };
      }

      if (errored > 0 || recentFailures > 10) {
        status = ComponentStatus.DEGRADED;
        message = 'Some integrations have issues';
      }

      if (connected === 0 && total > 0) {
        status = ComponentStatus.PARTIAL_OUTAGE;
        message = 'No integrations connected';
      }

      return {
        componentKey: 'integrations',
        status,
        latencyMs,
        message,
        metadata: { total, connected, errored, recentFailures },
      };
    } catch (error) {
      return {
        componentKey: 'integrations',
        status: ComponentStatus.MAJOR_OUTAGE,
        latencyMs: Date.now() - start,
        message:
          error instanceof Error ? error.message : 'Integration check failed',
      };
    }
  }

  /**
   * Get the last N health check results for a component
   */
  async getRecentChecks(
    componentId: string,
    count = 90,
  ): Promise<{ checkedAt: Date; status: ComponentStatus }[]> {
    return this.prisma.healthCheckResult.findMany({
      where: { componentId },
      orderBy: { checkedAt: 'desc' },
      take: count,
      select: { checkedAt: true, status: true },
    });
  }

  /**
   * Cleanup old health check results (keep last 90 days)
   */
  async cleanupOldResults(): Promise<number> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.healthCheckResult.deleteMany({
      where: { checkedAt: { lt: cutoff } },
    });
    return result.count;
  }
}
