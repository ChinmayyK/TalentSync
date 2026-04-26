import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface CreateSyncLogDto {
  tenantId: string;
  provider: string;
  eventType: string;
  direction: 'OUTBOUND' | 'INBOUND';
  entityType: string;
  entityId?: string;
  externalId?: string;
  payload?: unknown;
}

export interface SyncLogSummary {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
}

/**
 * Service for managing integration sync logs
 * Provides persistent logging for all sync attempts
 */
@Injectable()
export class SyncLogService {
  private readonly logger = new Logger(SyncLogService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new sync log entry
   */
  async createLog(data: CreateSyncLogDto) {
    return this.prisma.integrationSyncLog.create({
      data: {
        tenantId: data.tenantId,
        provider: data.provider,
        eventType: data.eventType,
        direction: data.direction,
        entityType: data.entityType,
        entityId: data.entityId,
        externalId: data.externalId,
        payload: data.payload as object,
        status: 'PENDING',
      },
    });
  }

  /**
   * Mark log as in progress
   */
  async markInProgress(logId: string) {
    return this.prisma.integrationSyncLog.update({
      where: { id: logId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  /**
   * Mark log as successful
   */
  async markSuccess(logId: string, response?: unknown, externalId?: string) {
    return this.prisma.integrationSyncLog.update({
      where: { id: logId },
      data: {
        status: 'SUCCESS',
        response: response as object,
        externalId,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark log as failed
   */
  async markFailed(logId: string, errorMessage: string, retryCount: number) {
    return this.prisma.integrationSyncLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        errorMessage,
        retryCount,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Mark log as retrying
   */
  async markRetrying(logId: string, retryCount: number) {
    return this.prisma.integrationSyncLog.update({
      where: { id: logId },
      data: {
        status: 'RETRYING',
        retryCount,
      },
    });
  }

  /**
   * Get recent sync logs for a provider
   */
  async getRecentLogs(tenantId: string, provider: string, limit = 50) {
    return this.prisma.integrationSyncLog.findMany({
      where: { tenantId, provider },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed logs for a provider
   */
  async getFailedLogs(tenantId: string, provider: string, limit = 50) {
    return this.prisma.integrationSyncLog.findMany({
      where: {
        tenantId,
        provider,
        status: 'FAILED',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get sync summary for last 24 hours
   */
  async getSummary24h(
    tenantId: string,
    provider: string,
  ): Promise<SyncLogSummary> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const logs = await this.prisma.integrationSyncLog.groupBy({
      by: ['status'],
      where: {
        tenantId,
        provider,
        createdAt: { gte: since },
      },
      _count: true,
    });

    let total = 0;
    let success = 0;
    let failed = 0;
    let pending = 0;

    for (const log of logs) {
      total += log._count;
      if (log.status === 'SUCCESS') success = log._count;
      if (log.status === 'FAILED') failed = log._count;
      if (log.status === 'PENDING' || log.status === 'IN_PROGRESS') {
        pending += log._count;
      }
    }

    return {
      total,
      success,
      failed,
      pending,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }

  /**
   * Get error summary - groups errors by message
   */
  async getErrorSummary(tenantId: string, provider: string, limit = 10) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const errors = await this.prisma.integrationSyncLog.findMany({
      where: {
        tenantId,
        provider,
        status: 'FAILED',
        createdAt: { gte: since },
      },
      select: {
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by error message
    const errorMap = new Map<string, { count: number; lastOccurred: Date }>();

    for (const error of errors) {
      const message = error.errorMessage || 'Unknown error';
      const existing = errorMap.get(message);
      if (existing) {
        existing.count++;
        if (error.createdAt > existing.lastOccurred) {
          existing.lastOccurred = error.createdAt;
        }
      } else {
        errorMap.set(message, { count: 1, lastOccurred: error.createdAt });
      }
    }

    // Convert to array and sort by count
    const result = Array.from(errorMap.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return {
      recentErrors: result,
      totalFailures24h: errors.length,
    };
  }

  /**
   * Clean up old logs (retention policy)
   */
  async cleanupOldLogs(daysToKeep = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.integrationSyncLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        status: { in: ['SUCCESS', 'FAILED'] },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old sync logs`);
    return result.count;
  }
}
