/**
 * Rate Limiting Types and Interfaces
 * Production-grade rate limiting for multi-tenant SaaS
 */

/**
 * Rate limit profiles for different endpoint groups
 */
export enum RateLimitProfile {
  /** Authentication endpoints - IP based, strict */
  AUTH = 'AUTH',

  /** Sensitive auth endpoints (password reset, OTP) - IP based, very strict */
  AUTH_SENSITIVE = 'AUTH_SENSITIVE',

  /** Standard read APIs - user + tenant based */
  READ = 'READ',

  /** Write/mutating APIs - user + tenant based */
  WRITE = 'WRITE',

  /** Calendar & availability - expensive operations */
  CALENDAR = 'CALENDAR',

  /** Bulk operations - job based, per tenant per hour */
  BULK = 'BULK',

  /** Reporting APIs - user based */
  REPORT = 'REPORT',

  /** Webhook endpoints - high throughput, tenant based */
  WEBHOOK = 'WEBHOOK',

  /** No rate limiting */
  NONE = 'NONE',
}

/**
 * Scope determines what identifier is used for rate limiting
 */
export enum RateLimitScope {
  /** Rate limit by IP address */
  IP = 'IP',

  /** Rate limit by user ID */
  USER = 'USER',

  /** Rate limit by tenant ID */
  TENANT = 'TENANT',

  /** Rate limit by both user and tenant (dual check) */
  USER_AND_TENANT = 'USER_AND_TENANT',
}

/**
 * Configuration for a single rate limit rule
 */
export interface RateLimitRule {
  /** Maximum requests allowed in the window */
  max: number;

  /** Window size in seconds */
  windowSeconds: number;

  /** Scope for this rule */
  scope: RateLimitScope;
}

/**
 * Full configuration for a rate limit profile
 */
export interface RateLimitProfileConfig {
  /** Profile identifier */
  profile: RateLimitProfile;

  /** Description of what this profile covers */
  description: string;

  /** Rules to apply (can have multiple for dual-scope checks) */
  rules: RateLimitRule[];
}

/**
 * Result of a rate limit check
 */
export interface RateLimitCheckResult {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Current request count in window */
  current: number;

  /** Maximum allowed in window */
  limit: number;

  /** Remaining requests in window */
  remaining: number;

  /** Seconds until window resets */
  resetInSeconds: number;

  /** Which scope triggered the limit (if blocked) */
  triggeredScope?: RateLimitScope;
}

/**
 * Metadata key for storing rate limit profile on handlers
 */
export const RATE_LIMIT_PROFILE_KEY = 'rateLimit:profile';
export const RATE_LIMIT_SKIP_KEY = 'rateLimit:skip';
