import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

const RATE_LIMIT_WINDOW = 60; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

// Decorator to customize rate limits for specific routes
export const RateLimit = (max: number, windowSeconds?: number) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata('rateLimit:max', max, descriptor?.value || target);
    if (windowSeconds) {
      Reflect.defineMetadata(
        'rateLimit:window',
        windowSeconds,
        descriptor?.value || target,
      );
    }
    return descriptor || target;
  };
};

// Decorator to skip rate limiting
export const SkipRateLimit = () => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata('rateLimit:skip', true, descriptor?.value || target);
    return descriptor || target;
  };
};

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Check if rate limiting is skipped
    const skipRateLimit = this.reflector.get<boolean>(
      'rateLimit:skip',
      handler,
    );
    if (skipRateLimit) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIP(request);
    const route = `${request.method}:${request.route?.path || request.url}`;
    const tenantId = request.tenantId || 'global';

    // Get custom rate limits from decorator, or use defaults
    const maxRequests =
      this.reflector.get<number>('rateLimit:max', handler) || RATE_LIMIT_MAX;
    const windowSeconds =
      this.reflector.get<number>('rateLimit:window', handler) ||
      RATE_LIMIT_WINDOW;

    // Build tenant-aware throttle key: tenant:ip:route
    const key = `${tenantId}:${ip}:${route}`;

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      // Get TTL for response headers
      const ttl = await this.redis.ttl(key);

      // Set rate limit headers
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', maxRequests);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, maxRequests - current),
      );
      response.setHeader(
        'X-RateLimit-Reset',
        Math.ceil(Date.now() / 1000) + ttl,
      );

      if (current > maxRequests) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Please try again later.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      // If Redis fails, allow the request (fail open for availability)
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Rate limiter Redis error:', error.message);
      return true;
    }
  }

  private getClientIP(request: any): string {
    // Check for forwarded IPs (behind proxy/load balancer)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }
}
