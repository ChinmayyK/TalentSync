/**
 * Tenant Context Service
 *
 * Manages tenant context for Row Level Security (RLS) in PostgreSQL.
 * Works with AsyncLocalStorage to maintain tenant context across async operations.
 */
import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  userId?: string;
  isSuperAdmin: boolean;
}

// Global async local storage instance
const asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantContextService {
  /**
   * Get the current tenant ID from context
   */
  getCurrentTenantId(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.tenantId || null;
  }

  /**
   * Get the current user ID from context
   */
  getCurrentUserId(): string | null {
    const context = asyncLocalStorage.getStore();
    return context?.userId || null;
  }

  /**
   * Check if current context is superadmin
   */
  isSuperAdmin(): boolean {
    const context = asyncLocalStorage.getStore();
    return context?.isSuperAdmin || false;
  }

  /**
   * Run a callback within a tenant context
   */
  runWithTenant<T>(
    tenantId: string,
    userId: string | undefined,
    callback: () => T,
  ): T {
    return asyncLocalStorage.run(
      { tenantId, userId, isSuperAdmin: false },
      callback,
    );
  }

  /**
   * Run a callback as superadmin (bypasses RLS)
   */
  runAsSuperAdmin<T>(callback: () => T): T {
    return asyncLocalStorage.run(
      { tenantId: '__superadmin__', isSuperAdmin: true },
      callback,
    );
  }

  /**
   * Set tenant context synchronously (for guards/interceptors)
   */
  setContext(tenantId: string, userId?: string, isSuperAdmin = false) {
    asyncLocalStorage.enterWith({ tenantId, userId, isSuperAdmin });
  }
}

// Export the storage for direct access
export { asyncLocalStorage as tenantAsyncStorage };
