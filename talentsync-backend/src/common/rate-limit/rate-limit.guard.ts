/**
 * Production Rate Limit Guard
 * Multi-tenant, user-aware rate limiting with sliding window algorithm
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import {
  RateLimitProfile,
  RateLimitScope,
  RateLimitRule,
  RateLimitCheckResult,
  RATE_LIMIT_PROFILE_KEY,
  RATE_LIMIT_SKIP_KEY,
} from './rate-limit.types';
import { getRateLimitConfig } from './rate-limit.config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Check if rate limiting is skipped
    const skipHandler = this.reflector.get<boolean>(
      RATE_LIMIT_SKIP_KEY,
      handler,
    );
    const skipClass = this.reflector.get<boolean>(
      RATE_LIMIT_SKIP_KEY,
      classRef,
    );
    if (skipHandler || skipClass) {
      return true;
    }

    // Get rate limit profile (method-level overrides class-level)
    const profile =
      this.reflector.get<RateLimitProfile>(RATE_LIMIT_PROFILE_KEY, handler) ||
      this.reflector.get<RateLimitProfile>(RATE_LIMIT_PROFILE_KEY, classRef) ||
      RateLimitProfile.READ; // Default to READ if not specified

    // NONE profile skips rate limiting
    if (profile === RateLimitProfile.NONE) {
      return true;
    }

    const config = getRateLimitConfig(profile);
    if (!config.rules || config.rules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract identifiers from request
    const ip = this.getClientIP(request);
    const userId = request.user?.sub || request.user?.id || null;
    const tenantId = request.tenantId || request.user?.activeTenantId || null;

    // Check all rules for this profile
    let mostRestrictiveResult: RateLimitCheckResult | null = null;

    for (const rule of config.rules) {
      const key = this.buildKey(profile, rule.scope, { ip, userId, tenantId });

      if (!key) {
        // If we can't build a key (e.g., no userId for USER scope), skip this rule
        continue;
      }

      const result = await this.checkLimit(key, rule);

      // Track the most restrictive result for headers
      if (
        !mostRestrictiveResult ||
        result.remaining < mostRestrictiveResult.remaining
      ) {
        mostRestrictiveResult = result;
      }

      if (!result.allowed) {
        // Set rate limit headers
        this.setRateLimitHeaders(response, result);

        this.logger.warn(
          `Rate limit exceeded: profile=${profile}, scope=${rule.scope}, ` +
            `key=${key}, current=${result.current}/${result.limit}`,
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: this.getErrorMessage(profile, rule.scope),
            retryAfter: result.resetInSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Set headers for the most restrictive passing rule
    if (mostRestrictiveResult) {
      this.setRateLimitHeaders(response, mostRestrictiveResult);
    }

    return true;
  }

  /**
   * Build Redis key based on scope
   */
  private buildKey(
    profile: RateLimitProfile,
    scope: RateLimitScope,
    identifiers: { ip: string; userId: string | null; tenantId: string | null },
  ): string | null {
    const prefix = `rl:${profile}`;

    switch (scope) {
      case RateLimitScope.IP:
        return `${prefix}:ip:${identifiers.ip}`;

      case RateLimitScope.USER:
        if (!identifiers.userId) return null;
        return `${prefix}:user:${identifiers.userId}`;

      case RateLimitScope.TENANT:
        if (!identifiers.tenantId) return null;
        return `${prefix}:tenant:${identifiers.tenantId}`;

      case RateLimitScope.USER_AND_TENANT:
        if (!identifiers.userId || !identifiers.tenantId) return null;
        return `${prefix}:ut:${identifiers.tenantId}:${identifiers.userId}`;

      default:
        return null;
    }
  }

  /**
   * Check rate limit using sliding window counter algorithm
   */
  private async checkLimit(
    key: string,
    rule: RateLimitRule,
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;
    const windowKey = `${key}:${Math.floor(now / windowMs)}`;
    const prevWindowKey = `${key}:${Math.floor(now / windowMs) - 1}`;

    try {
      // Get current and previous window counts
      const pipeline = this.redis.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, rule.windowSeconds * 2); // Keep for 2 windows
      pipeline.get(prevWindowKey);

      const results = await pipeline.exec();

      const currentCount = (results?.[0]?.[1] as number) || 0;
      const prevCount = parseInt((results?.[2]?.[1] as string) || '0', 10);

      // Calculate sliding window weight
      const windowProgress = (now % windowMs) / windowMs;
      const weightedCount = Math.floor(
        currentCount + prevCount * (1 - windowProgress),
      );

      const allowed = weightedCount <= rule.max;
      const remaining = Math.max(0, rule.max - weightedCount);
      const resetInSeconds = Math.ceil((windowMs - (now % windowMs)) / 1000);

      return {
        allowed,
        current: weightedCount,
        limit: rule.max,
        remaining,
        resetInSeconds,
        triggeredScope: allowed ? undefined : rule.scope,
      };
    } catch (error) {
      // Fail open - allow request if Redis fails
      this.logger.error(`Rate limit check failed for ${key}:`, error);
      return {
        allowed: true,
        current: 0,
        limit: rule.max,
        remaining: rule.max,
        resetInSeconds: rule.windowSeconds,
      };
    }
  }

  /**
   * Set standard rate limit headers
   */
  private setRateLimitHeaders(
    response: any,
    result: RateLimitCheckResult,
  ): void {
    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(Date.now() / 1000) + result.resetInSeconds,
    );

    if (!result.allowed) {
      response.setHeader('Retry-After', result.resetInSeconds);
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(
    profile: RateLimitProfile,
    scope: RateLimitScope,
  ): string {
    switch (profile) {
      case RateLimitProfile.AUTH:
      case RateLimitProfile.AUTH_SENSITIVE:
        return 'Too many authentication attempts. Please wait before trying again.';
      case RateLimitProfile.BULK:
        return 'Bulk operation limit reached. Please wait before submitting another bulk job.';
      case RateLimitProfile.CALENDAR:
        return 'Calendar availability requests limited. Please try again shortly.';
      case RateLimitProfile.REPORT:
        return 'Report generation limit reached. Please wait before generating more reports.';
      default:
        if (scope === RateLimitScope.TENANT) {
          return 'Organization rate limit exceeded. Please coordinate with your team.';
        }
        return 'Rate limit exceeded. Please slow down your requests.';
    }
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private getClientIP(request: any): string {
    // Check X-Forwarded-For header (for load balancers/proxies)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Check X-Real-IP header
    const realIP = request.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}

