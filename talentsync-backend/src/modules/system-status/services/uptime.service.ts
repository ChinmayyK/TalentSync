import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ComponentStatus } from '@prisma/client';

export interface UptimeData {
  componentId: string;
  componentKey: string;
  period: string;
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
  dailyData: DailyUptime[];
}

export interface DailyUptime {
  date: string; // YYYY-MM-DD
  status: ComponentStatus;
  uptimePercentage: number;
  checksCount: number;
}

type Period = '24h' | '7d' | '30d' | '90d';

@Injectable()
export class UptimeService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate uptime percentage for a component over a specified period
   */
  async getUptime(
    componentId: string,
    period: Period = '90d',
  ): Promise<UptimeData> {
    const component = await this.prisma.systemComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new Error('Component not found');
    }

    const periodMs = this.getPeriodMs(period);
    const startDate = new Date(Date.now() - periodMs);

    const checks = await this.prisma.healthCheckResult.findMany({
      where: {
        componentId,
        checkedAt: { gte: startDate },
      },
      orderBy: { checkedAt: 'asc' },
    });

    const totalChecks = checks.length;
    const successfulChecks = checks.filter(
      (c) =>
        c.status === ComponentStatus.OPERATIONAL ||
        c.status === ComponentStatus.MAINTENANCE,
    ).length;

    const uptimePercentage =
      totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

    // Group by day for daily data
    const dailyData = this.aggregateDailyData(checks, period);

    return {
      componentId,
      componentKey: component.key,
      period,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      totalChecks,
      successfulChecks,
      dailyData,
    };
  }

  /**
   * Get uptime for all monitored components
   */
  async getAllComponentsUptime(period: Period = '90d'): Promise<UptimeData[]> {
    const components = await this.prisma.systemComponent.findMany({
      where: { isMonitored: true },
      orderBy: { order: 'asc' },
    });

    return Promise.all(components.map((c) => this.getUptime(c.id, period)));
  }

  /**
   * Get overall system uptime (average of all components)
   */
  async getOverallUptime(
    period: Period = '90d',
  ): Promise<{ uptimePercentage: number; status: ComponentStatus }> {
    const componentUptimes = await this.getAllComponentsUptime(period);

    if (componentUptimes.length === 0) {
      return { uptimePercentage: 100, status: ComponentStatus.OPERATIONAL };
    }

    const avgUptime =
      componentUptimes.reduce((sum, c) => sum + c.uptimePercentage, 0) /
      componentUptimes.length;

    // Determine overall status based on average uptime
    let status: ComponentStatus;
    if (avgUptime >= 99.9) {
      status = ComponentStatus.OPERATIONAL;
    } else if (avgUptime >= 99) {
      status = ComponentStatus.DEGRADED;
    } else if (avgUptime >= 95) {
      status = ComponentStatus.PARTIAL_OUTAGE;
    } else {
      status = ComponentStatus.MAJOR_OUTAGE;
    }

    return {
      uptimePercentage: Math.round(avgUptime * 100) / 100,
      status,
    };
  }

  private getPeriodMs(period: Period): number {
    const periods: Record<Period, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    return periods[period];
  }

  private aggregateDailyData(
    checks: { checkedAt: Date; status: ComponentStatus }[],
    period: Period,
  ): DailyUptime[] {
    const days =
      period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const dailyMap = new Map<
      string,
      { statuses: ComponentStatus[]; count: number }
    >();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { statuses: [], count: 0 });
    }

    // Aggregate checks by day
    for (const check of checks) {
      const dateStr = check.checkedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.statuses.push(check.status);
        existing.count++;
      }
    }

    // Convert to array with uptime calculation
    const result: DailyUptime[] = [];

    for (const [date, data] of dailyMap.entries()) {
      const successCount = data.statuses.filter(
        (s) =>
          s === ComponentStatus.OPERATIONAL ||
          s === ComponentStatus.MAINTENANCE,
      ).length;

      const worstStatus = this.getWorstStatus(data.statuses);

      result.push({
        date,
        status: worstStatus,
        uptimePercentage:
          data.count > 0 ? (successCount / data.count) * 100 : 100,
        checksCount: data.count,
      });
    }

    // Sort by date ascending
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  private getWorstStatus(statuses: ComponentStatus[]): ComponentStatus {
    if (statuses.length === 0) return ComponentStatus.OPERATIONAL;

    const priorities: Record<ComponentStatus, number> = {
      [ComponentStatus.MAJOR_OUTAGE]: 4,
      [ComponentStatus.PARTIAL_OUTAGE]: 3,
      [ComponentStatus.DEGRADED]: 2,
      [ComponentStatus.MAINTENANCE]: 1,
      [ComponentStatus.OPERATIONAL]: 0,
    };

    let worst: ComponentStatus = ComponentStatus.OPERATIONAL;
    let worstPriority = 0;

    for (const status of statuses) {
      if (priorities[status] > worstPriority) {
        worstPriority = priorities[status];
        worst = status;
      }
    }

    return worst;
  }
}

