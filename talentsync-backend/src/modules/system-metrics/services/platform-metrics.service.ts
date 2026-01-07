import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

// Redis keys for metrics storage
const KEYS = {
  REQUESTS_24H: 'metrics:requests:24h',
  ERRORS_24H: 'metrics:errors:24h',
  LATENCIES: 'metrics:latencies',
  ACTIVE_TENANTS: 'metrics:active_tenants:7d',
  ACTIVE_USERS: 'metrics:active_users:7d',
};

const TTL_24H = 86400; // 24 hours in seconds
const TTL_7D = 604800; // 7 days in seconds

export interface PlatformMetrics {
  apiRequests24h: number;
  errorRate: number;
  p95Latency: number;
  activeTenants7d: number;
  activeUsers7d: number;
}

@Injectable()
export class PlatformMetricsService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  onModuleInit() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  /**
   * Record a new API request with its latency
   */
  async recordRequest(
    latencyMs: number,
    isError: boolean,
    tenantId?: string,
    userId?: string,
  ): Promise<void> {
    const now = Date.now();
    const pipeline = this.redis.pipeline();

    // Increment request counter with 24h expiry
    pipeline.incr(KEYS.REQUESTS_24H);
    pipeline.expire(KEYS.REQUESTS_24H, TTL_24H);

    // Increment error counter if applicable
    if (isError) {
      pipeline.incr(KEYS.ERRORS_24H);
      pipeline.expire(KEYS.ERRORS_24H, TTL_24H);
    }

    // Store latency in sorted set (score = timestamp, member = latency:timestamp)
    pipeline.zadd(KEYS.LATENCIES, now, `${latencyMs}:${now}`);
    // Remove entries older than 24h
    pipeline.zremrangebyscore(KEYS.LATENCIES, 0, now - TTL_24H * 1000);

    // Track active tenant
    if (tenantId) {
      pipeline.sadd(KEYS.ACTIVE_TENANTS, tenantId);
      pipeline.expire(KEYS.ACTIVE_TENANTS, TTL_7D);
    }

    // Track active user
    if (userId) {
      pipeline.sadd(KEYS.ACTIVE_USERS, userId);
      pipeline.expire(KEYS.ACTIVE_USERS, TTL_7D);
    }

    await pipeline.exec();
  }

  /**
   * Get platform-wide metrics
   */
  async getMetrics(): Promise<PlatformMetrics> {
    const [requests24h, errors24h, latencies, activeTenants, activeUsers] =
      await Promise.all([
        this.redis.get(KEYS.REQUESTS_24H),
        this.redis.get(KEYS.ERRORS_24H),
        this.redis.zrange(KEYS.LATENCIES, 0, -1),
        this.redis.scard(KEYS.ACTIVE_TENANTS),
        this.redis.scard(KEYS.ACTIVE_USERS),
      ]);

    const totalRequests = parseInt(requests24h || '0');
    const totalErrors = parseInt(errors24h || '0');

    // Calculate p95 latency
    const latencyValues = latencies
      .map((entry) => parseFloat(entry.split(':')[0]))
      .sort((a, b) => a - b);

    let p95Latency = 0;
    if (latencyValues.length > 0) {
      const p95Index = Math.floor(latencyValues.length * 0.95);
      p95Latency =
        latencyValues[p95Index] || latencyValues[latencyValues.length - 1];
    }

    return {
      apiRequests24h: totalRequests,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      p95Latency: Math.round(p95Latency),
      activeTenants7d: activeTenants,
      activeUsers7d: activeUsers,
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  async clearMetrics(): Promise<void> {
    await this.redis.del(
      KEYS.REQUESTS_24H,
      KEYS.ERRORS_24H,
      KEYS.LATENCIES,
      KEYS.ACTIVE_TENANTS,
      KEYS.ACTIVE_USERS,
    );
  }
}

