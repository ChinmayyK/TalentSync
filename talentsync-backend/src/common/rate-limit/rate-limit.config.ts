/**
 * Rate Limit Configuration
 * Defines limits for each profile per the SOW requirements
 *
 * NOTE: In development (NODE_ENV !== 'production'), limits are 10x higher
 */

import {
  RateLimitProfile,
  RateLimitProfileConfig,
  RateLimitScope,
} from './rate-limit.types';

const isDev = process.env.NODE_ENV !== 'production';
const devMultiplier = isDev ? 10 : 1; // 10x limits in development

/**
 * Rate limit configurations for all profiles
 */
export const RATE_LIMIT_CONFIGS: Record<
  RateLimitProfile,
  RateLimitProfileConfig
> = {
  /**
   * AUTH: Login endpoint
   * Production: 5 requests / minute / IP
   * Development: 50 requests / minute / IP
   */
  [RateLimitProfile.AUTH]: {
    profile: RateLimitProfile.AUTH,
    description: 'Authentication endpoints (login)',
    rules: [
      { max: 5 * devMultiplier, windowSeconds: 60, scope: RateLimitScope.IP },
    ],
  },

  /**
   * AUTH_SENSITIVE: Password reset, OTP, verification
   * Production: 3 requests / minute / IP
   * Development: 30 requests / minute / IP
   */
  [RateLimitProfile.AUTH_SENSITIVE]: {
    profile: RateLimitProfile.AUTH_SENSITIVE,
    description: 'Sensitive auth endpoints (password reset, OTP)',
    rules: [
      { max: 3 * devMultiplier, windowSeconds: 60, scope: RateLimitScope.IP },
    ],
  },

  /**
   * READ: Standard read APIs
   * Production: 300 requests / minute / user, 3000 / tenant
   * Development: 3000 requests / minute / user, 30000 / tenant
   */
  [RateLimitProfile.READ]: {
    profile: RateLimitProfile.READ,
    description:
      'Standard read APIs (GET candidates, interviews, calendar, messages)',
    rules: [
      {
        max: 300 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.USER,
      },
      {
        max: 3000 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.TENANT,
      },
    ],
  },

  /**
   * WRITE: Mutating APIs
   * Production: 60 requests / minute / user, 600 / tenant
   * Development: 600 requests / minute / user, 6000 / tenant
   */
  [RateLimitProfile.WRITE]: {
    profile: RateLimitProfile.WRITE,
    description:
      'Write/mutating APIs (create/update candidate, schedule interview)',
    rules: [
      {
        max: 60 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.USER,
      },
      {
        max: 600 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.TENANT,
      },
    ],
  },

  /**
   * CALENDAR: Expensive calendar operations
   * Production: 60 requests / minute / user, 300 / tenant
   * Development: 600 requests / minute / user, 3000 / tenant
   */
  [RateLimitProfile.CALENDAR]: {
    profile: RateLimitProfile.CALENDAR,
    description: 'Calendar availability and suggestions (expensive)',
    rules: [
      {
        max: 60 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.USER,
      },
      {
        max: 300 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.TENANT,
      },
    ],
  },

  /**
   * BULK: Bulk operations
   * Production: 5 jobs / hour / tenant
   * Development: 50 jobs / hour / tenant
   */
  [RateLimitProfile.BULK]: {
    profile: RateLimitProfile.BULK,
    description: 'Bulk operations (bulk upload, bulk scheduling)',
    rules: [
      {
        max: 5 * devMultiplier,
        windowSeconds: 3600,
        scope: RateLimitScope.TENANT,
      },
    ],
  },

  /**
   * REPORT: Reporting APIs
   * Production: 20 requests / minute / user
   * Development: 200 requests / minute / user
   */
  [RateLimitProfile.REPORT]: {
    profile: RateLimitProfile.REPORT,
    description: 'Reporting and analytics APIs',
    rules: [
      {
        max: 20 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.USER,
      },
    ],
  },

  /**
   * WEBHOOK: High throughput webhook endpoints
   * Production: 1000 requests / minute / tenant
   * Development: 10000 requests / minute / tenant
   */
  [RateLimitProfile.WEBHOOK]: {
    profile: RateLimitProfile.WEBHOOK,
    description: 'Webhook endpoints (WhatsApp, SES, Twilio)',
    rules: [
      {
        max: 1000 * devMultiplier,
        windowSeconds: 60,
        scope: RateLimitScope.TENANT,
      },
    ],
  },

  /**
   * NONE: No rate limiting
   */
  [RateLimitProfile.NONE]: {
    profile: RateLimitProfile.NONE,
    description: 'No rate limiting applied',
    rules: [],
  },
};

/**
 * Get configuration for a profile
 */
export function getRateLimitConfig(
  profile: RateLimitProfile,
): RateLimitProfileConfig {
  return (
    RATE_LIMIT_CONFIGS[profile] || RATE_LIMIT_CONFIGS[RateLimitProfile.READ]
  );
}
