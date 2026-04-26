import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
// Trusted proxies - only trust x-forwarded-for from these
const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1')
  .split(',')
  .map((p) => p.trim());

/**
 * BruteForceService - Core service for brute force protection
 * Contains all Redis logic for tracking failed attempts and account locking
 */
@Injectable()
export class BruteForceService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  /**
   * Record a failed login attempt
   * @returns locked status, attempts count, and remaining attempts
   */
  async recordFailedAttempt(
    ip: string,
    email: string,
  ): Promise<{ locked: boolean; attempts: number; remainingAttempts: number }> {
    const attemptKey = this.getAttemptKey(ip, email);
    const lockKey = this.getLockKey(ip, email);

    const attempts = await this.redis.incr(attemptKey);

    if (attempts === 1) {
      // Set expiry on first attempt (attempts reset after 15 minutes of no attempts)
      await this.redis.expire(attemptKey, LOCKOUT_DURATION);
    }

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      await this.redis.set(lockKey, '1', 'EX', LOCKOUT_DURATION);
      await this.redis.del(attemptKey); // Clear attempts counter
      return { locked: true, attempts, remainingAttempts: 0 };
    }

    return {
      locked: false,
      attempts,
      remainingAttempts: MAX_FAILED_ATTEMPTS - attempts,
    };
  }

  /**
   * Clear failed attempts on successful login
   */
  async clearFailedAttempts(ip: string, email: string): Promise<void> {
    const attemptKey = this.getAttemptKey(ip, email);
    await this.redis.del(attemptKey);
  }

  /**
   * Check if an IP + email combination is locked
   */
  async isLocked(
    ip: string,
    email: string,
  ): Promise<{ locked: boolean; ttl: number }> {
    const lockKey = this.getLockKey(ip, email);
    const isLocked = await this.redis.get(lockKey);
    const ttl = isLocked ? await this.redis.ttl(lockKey) : 0;
    return { locked: !!isLocked, ttl };
  }

  /**
   * Get detailed lock status for an IP + email combination
   */
  async getLockStatus(
    ip: string,
    email: string,
  ): Promise<{ locked: boolean; ttl: number; attempts: number }> {
    const lockKey = this.getLockKey(ip, email);
    const attemptKey = this.getAttemptKey(ip, email);

    const isLocked = await this.redis.get(lockKey);
    const ttl = isLocked ? await this.redis.ttl(lockKey) : 0;
    const attempts = parseInt((await this.redis.get(attemptKey)) || '0');

    return { locked: !!isLocked, ttl, attempts };
  }

  /**
   * Unlock an account (admin action)
   */
  async unlockAccount(ip: string, email: string): Promise<void> {
    const lockKey = this.getLockKey(ip, email);
    const attemptKey = this.getAttemptKey(ip, email);
    await this.redis.del(lockKey, attemptKey);
  }

  /**
   * Extract client IP from request, handling proxies securely
   */
  getClientIP(request: any): string {
    const connectionIP = request.ip || request.connection?.remoteAddress || '';
    const normalizedConnectionIP = connectionIP.replace(/^::ffff:/, '');

    // Only trust x-forwarded-for if request comes from trusted proxy
    if (TRUSTED_PROXIES.includes(normalizedConnectionIP)) {
      const forwarded = request.headers['x-forwarded-for'];
      if (forwarded) {
        return forwarded.split(',')[0].trim();
      }
    }
    return normalizedConnectionIP || 'unknown';
  }

  // Helper methods for key generation
  private getLockKey(ip: string, email: string): string {
    return `bruteforce:lock:${ip}:${email.toLowerCase()}`;
  }

  private getAttemptKey(ip: string, email: string): string {
    return `bruteforce:attempts:${ip}:${email.toLowerCase()}`;
  }
}

/**
 * BruteForceGuard - NestJS guard that uses BruteForceService
 * Thin wrapper for request-level protection on login endpoints
 */
@Injectable()
export class BruteForceGuard implements CanActivate {
  constructor(private bruteForceService: BruteForceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.bruteForceService.getClientIP(request);

    // Only apply to login endpoints
    if (!this.isLoginEndpoint(request)) {
      return true;
    }

    const email = request.body?.email?.toLowerCase();
    if (!email) {
      return true;
    }

    const lockStatus = await this.bruteForceService.isLocked(ip, email);

    if (lockStatus.locked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Account temporarily locked due to too many failed login attempts. Try again in ${Math.ceil(lockStatus.ttl / 60)} minutes.`,
          retryAfter: lockStatus.ttl,
          code: 'ACCOUNT_LOCKED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private isLoginEndpoint(request: any): boolean {
    const path = request.route?.path || request.url;
    return path.includes('/auth/login') || path.includes('/auth/signin');
  }
}
