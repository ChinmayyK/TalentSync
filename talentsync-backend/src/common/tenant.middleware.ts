import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: any;
    }
  }
}

/**
 * TenantMiddleware
 *
 * Extracts tenant context from:
 * 1. X-Tenant-Id header (for explicit API requests)
 * 2. JWT token's activeTenantId claim (fallback)
 *
 * Note: JWT verification happens in AuthGuard (CanActivate), which runs AFTER middleware.
 * This middleware does a soft decode (without verification) to populate req.tenantId early.
 * The actual verified value comes from the JWT guard.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Check X-Tenant-Id header first (highest priority for API calls)
    const headerTenant = req.headers['x-tenant-id'];
    if (typeof headerTenant === 'string' && headerTenant.trim()) {
      req.tenantId = headerTenant.trim();
    }

    // 2. If no header, try to extract from JWT (soft decode without verification)
    // This is for context hints only - actual auth happens in guards
    if (!req.tenantId && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '').trim();
      const decoded = this.decodeToken(token);
      if (decoded && decoded['activeTenantId']) {
        req.tenantId = decoded['activeTenantId'];
      }
    }

    next();
  }

  /**
   * Decode JWT payload without verification
   * Used only for early context population - NOT for auth decisions
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }
}
