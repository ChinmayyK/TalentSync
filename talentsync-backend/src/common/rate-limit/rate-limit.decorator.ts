/**
 * Rate Limit Decorators
 * Apply to controller methods to specify rate limit profile
 */

import { SetMetadata } from '@nestjs/common';
import {
  RateLimitProfile,
  RATE_LIMIT_PROFILE_KEY,
  RATE_LIMIT_SKIP_KEY,
} from './rate-limit.types';

/**
 * Apply a rate limit profile to a controller or method
 *
 * @example
 * // Apply to entire controller
 * @RateLimitProfile(RateLimitProfile.READ)
 * @Controller('candidates')
 * export class CandidatesController {}
 *
 * @example
 * // Apply to specific method (overrides controller-level)
 * @RateLimitProfile(RateLimitProfile.WRITE)
 * @Post()
 * create() {}
 */
export const RateLimited = (profile: RateLimitProfile) =>
  SetMetadata(RATE_LIMIT_PROFILE_KEY, profile);

/**
 * Skip rate limiting for a specific endpoint
 * Use for internal health checks, BullMQ workers, etc.
 *
 * @example
 * @SkipRateLimit()
 * @Get('health')
 * healthCheck() {}
 */
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_SKIP_KEY, true);

/**
 * Convenience decorators for common profiles
 */
export const AuthRateLimit = () => RateLimited(RateLimitProfile.AUTH);
export const AuthSensitiveRateLimit = () =>
  RateLimited(RateLimitProfile.AUTH_SENSITIVE);
export const ReadRateLimit = () => RateLimited(RateLimitProfile.READ);
export const WriteRateLimit = () => RateLimited(RateLimitProfile.WRITE);
export const CalendarRateLimit = () => RateLimited(RateLimitProfile.CALENDAR);
export const BulkRateLimit = () => RateLimited(RateLimitProfile.BULK);
export const ReportRateLimit = () => RateLimited(RateLimitProfile.REPORT);
export const WebhookRateLimit = () => RateLimited(RateLimitProfile.WEBHOOK);
