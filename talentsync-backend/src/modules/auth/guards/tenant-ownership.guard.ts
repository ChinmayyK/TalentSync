import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * TenantOwnershipGuard
 *
 * This guard ensures that:
 * 1. A valid tenant context exists (from JWT or header)
 * 2. Requests attempting cross-tenant access are rejected
 *
 * Use this guard on controllers that access tenant-scoped data.
 * The actual resource ownership check should happen in the service layer.
 */
@Injectable()
export class TenantOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const { user, tenantId } = req;

    // Ensure user is authenticated
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPERADMIN can access any tenant
    if (user.role === 'SUPERADMIN') {
      return true;
    }

    // Ensure tenant context exists
    const activeTenantId = tenantId || user.activeTenantId;
    if (!activeTenantId) {
      throw new ForbiddenException(
        'No tenant context - cannot access tenant-scoped resources',
      );
    }

    // Check if user has access to this tenant via roles map
    if (user.roles && typeof user.roles === 'object') {
      if (!user.roles[activeTenantId]) {
        throw new ForbiddenException('You do not have access to this tenant');
      }
    }

    // Check X-Tenant-Id header if provided
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== activeTenantId) {
      // Allow only if user has role in the header tenant as well
      if (user.roles && user.roles[headerTenantId]) {
        // Update request tenantId to use header value
        req.tenantId = headerTenantId;
      } else {
        throw new ForbiddenException(
          'Cannot access resources of a different tenant',
        );
      }
    }

    // Set tenantId on request for downstream use
    req.tenantId = activeTenantId;

    return true;
  }
}
