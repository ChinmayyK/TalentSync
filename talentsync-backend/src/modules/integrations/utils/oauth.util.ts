import * as crypto from 'crypto';
import { OAuthTokenSet } from '../types/oauth.interface';

/**
 * Generate a random state parameter for OAuth flow
 */
export function generateState(tenantId: string): string {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const payload = JSON.stringify({ tenantId, timestamp, nonce: randomBytes });
  return Buffer.from(payload).toString('base64url');
}

/**
 * Parse and validate state parameter
 */
export function parseState(state: string): {
  tenantId: string;
  timestamp: number;
  nonce: string;
  companyDomain?: string;
} {
  try {
    const payload = Buffer.from(state, 'base64url').toString('utf8');
    const parsed = JSON.parse(payload);

    // Validate state is not too old (15 minutes max)
    const age = Date.now() - parsed.timestamp;
    if (age > 15 * 60 * 1000) {
      throw new Error('State parameter expired');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Invalid state parameter: ${error.message}`);
  }
}

/**
 * Compute token expiry timestamp from expires_in seconds
 */
export function computeExpiry(expiresIn: number): number {
  return Date.now() + expiresIn * 1000;
}

/**
 * Check if token set is expired
 */
export function isExpired(tokenSet: OAuthTokenSet): boolean {
  if (!tokenSet.expiresAt) {
    return false; // No expiry set, assume valid
  }

  // Add 5 minute buffer to refresh before actual expiry
  const bufferMs = 5 * 60 * 1000;
  return Date.now() >= tokenSet.expiresAt - bufferMs;
}

/**
 * Build OAuth authorization URL with parameters
 */
export function buildAuthUrl(
  baseUrl: string,
  params: Record<string, string>,
): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  return url.toString();
}

/**
 * Extract authorization code from callback URL
 */
export function extractCodeFromCallback(callbackUrl: string): string | null {
  try {
    const url = new URL(callbackUrl);
    return url.searchParams.get('code');
  } catch {
    return null;
  }
}
