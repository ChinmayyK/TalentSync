import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlatformMetricsService } from './services/platform-metrics.service';
import { QueueMetricsService } from './services/queue-metrics.service';
import { CommunicationMetricsService } from './services/communication-metrics.service';
import { SchedulingMetricsService } from './services/scheduling-metrics.service';
import { TenantUsageService } from './services/tenant-usage.service';
import { IntegrationMetricsService } from './services/integration-metrics.service';

@Controller('api/v1/system-metrics')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPERADMIN') // System-wide metrics require SUPERADMIN
export class SystemMetricsController {
  constructor(
    private platformMetrics: PlatformMetricsService,
    private queueMetrics: QueueMetricsService,
    private communicationMetrics: CommunicationMetricsService,
    private schedulingMetrics: SchedulingMetricsService,
    private tenantUsage: TenantUsageService,
    private integrationMetrics: IntegrationMetricsService,
  ) {}

  /**
   * GET /api/v1/system-metrics/platform
   * Returns platform-wide metrics including API requests, error rate, latency, and active users/tenants
   */
  @Get('platform')
  async getPlatformMetrics() {
    return this.platformMetrics.getMetrics();
  }

  /**
   * GET /api/v1/system-metrics/queues
   * Returns metrics for all BullMQ queues
   */
  @Get('queues')
  async getQueueMetrics() {
    return this.queueMetrics.getMetrics();
  }

  /**
   * GET /api/v1/system-metrics/communication
   * Returns communication/messaging metrics from MessageLog
   */
  @Get('communication')
  async getCommunicationMetrics() {
    return this.communicationMetrics.getMetrics();
  }

  /**
   * GET /api/v1/system-metrics/scheduling
   * Returns scheduling/interview metrics
   */
  @Get('scheduling')
  async getSchedulingMetrics() {
    return this.schedulingMetrics.getMetrics();
  }

  /**
   * GET /api/v1/system-metrics/tenant-usage
   * Returns per-tenant usage statistics
   */
  @Get('tenant-usage')
  async getTenantUsageMetrics() {
    return this.tenantUsage.getMetrics();
  }

  /**
   * GET /api/v1/system-metrics/integrations
   * Returns integration sync metrics by provider
   */
  @Get('integrations')
  async getIntegrationMetrics() {
    return this.integrationMetrics.getMetrics();
  }

  /**
   * GET /api/v1/system-metrics/summary
   * Returns combined system health summary
   */
  @Get('summary')
  async getSummary() {
    const [platform, queues, communication, scheduling, integrations] =
      await Promise.all([
        this.platformMetrics.getMetrics(),
        this.queueMetrics.getMetrics(),
        this.communicationMetrics.getMetrics(),
        this.schedulingMetrics.getMetrics(),
        this.integrationMetrics.getMetrics(),
      ]);

    const queueBacklog = queues.reduce(
      (sum, q) => sum + q.waiting + q.active,
      0,
    );
    const queueFailures = queues.reduce((sum, q) => sum + q.failed24h, 0);

    return {
      status:
        platform.errorRate < 5
          ? 'healthy'
          : platform.errorRate < 15
            ? 'degraded'
            : 'unhealthy',
      timestamp: new Date().toISOString(),
      api: {
        requests24h: platform.apiRequests24h,
        errorRate: platform.errorRate,
        p95LatencyMs: platform.p95Latency,
      },
      queues: {
        backlog: queueBacklog,
        failures24h: queueFailures,
      },
      integrations: {
        connected: integrations.connectedProviders,
        syncs24h: integrations.totalSyncs24h,
        successRate: integrations.overallSuccessRate,
      },
      communication: {
        sent24h: communication.messagesToday || 0,
        failed24h: communication.failedCount || 0,
      },
      users: {
        activeTenants7d: platform.activeTenants7d,
        activeUsers7d: platform.activeUsers7d,
      },
    };
  }
}
