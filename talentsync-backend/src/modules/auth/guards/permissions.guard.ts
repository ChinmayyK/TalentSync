import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '../permissions.constants';

export const PERMISSION_KEY = 'required_permission';

/**
 * Decorator to require a specific permission
 * Usage: @RequirePermission('candidates:create')
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

/**
 * Decorator to require any of the specified permissions
 * Usage: @RequireAnyPermission('candidates:create', 'candidates:update')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSION_KEY, permissions);

/**
 * Permission Guard
 * Checks if the user has the required permission based on their role
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission required
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user, tenantId } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user's role in the active tenant
    const activeTenantId = tenantId || user.activeTenantId;

    // SUPERADMIN bypass
    if (user.role === 'SUPERADMIN') {
      return true;
    }

    // Get role from token's roles map
    let userRole: string | undefined;

    if (user.roles && typeof user.roles === 'object') {
      if (activeTenantId) {
        userRole = user.roles[activeTenantId];
      } else {
        // No tenant context - check if admin in any tenant
        const adminRole = Object.entries(user.roles).find(
          ([, role]) => role === 'ADMIN' || role === 'SUPERADMIN',
        );
        if (adminRole) {
          userRole = adminRole[1] as string;
        }
      }
    } else {
      // Fallback to legacy role
      userRole = user.role;
    }

    if (!userRole) {
      throw new ForbiddenException('No role in active tenant');
    }

    // Check permission(s)
    const permissions = Array.isArray(required) ? required : [required];

    for (const permission of permissions) {
      if (hasPermission(userRole, permission)) {
        return true;
      }
    }

    throw new ForbiddenException(
      `Insufficient permissions. Required: ${permissions.join(' or ')}`,
    );
  }
}
