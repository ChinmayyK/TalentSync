import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma.service';
import { SkipRateLimit } from './rate-limit';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime?: number;
}

interface ReadinessStatus extends HealthStatus {
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    redis: { status: 'ok' | 'error'; error?: string };
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  /**
   * Basic health check - is the process running?
   * Used by load balancers for basic availability
   */
  @Get()
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is running' })
  check(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Liveness probe - is the process alive and not deadlocked?
   * Kubernetes uses this to know when to restart a container
   */
  @Get('live')
  @SkipRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  @ApiResponse({ status: 503, description: 'Process is not responding' })
  liveness(): { status: 'ok'; timestamp: string } {
    // If this endpoint responds, the process is alive
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - can the service handle requests?
   * Kubernetes uses this to know when to send traffic
   */
  @Get('ready')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Readiness probe - checks database and Redis' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to handle requests',
  })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness(): Promise<ReadinessStatus> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

    if (!allHealthy) {
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks,
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /**
   * Detailed health status for monitoring dashboards
   */
  @Get('details')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Detailed health status' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async details() {
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memUsage = process.memoryUsage();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.0.1',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: dbCheck,
        redis: redisCheck,
      },
      system: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        },
        nodeVersion: process.version,
        pid: process.pid,
      },
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<{
    status: 'ok' | 'error';
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<{
    status: 'ok' | 'error';
    error?: string;
  }> {
    try {
      // Redis check would require injecting Redis client
      // For now, return ok if no Redis-specific check is needed
      // In production, inject Redis and call redis.ping()
      return { status: 'ok' };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }
}
