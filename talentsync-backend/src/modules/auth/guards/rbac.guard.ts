import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user, tenantId } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // SUPERADMIN has access to everything
    if (user.role === 'SUPERADMIN') return true;

    // Check if user has roles map from token
    if (user.roles && typeof user.roles === 'object') {
      // Get role for active tenant
      const activeTenantId = tenantId || user.activeTenantId;

      // For platform-wide endpoints (like system-metrics), check if user is ADMIN in ANY tenant
      if (!activeTenantId && requiredRoles.includes('ADMIN')) {
        const hasAdminInAnyTenant = Object.values(user.roles).some(
          (role: unknown) => role === 'ADMIN' || role === 'SUPERADMIN',
        );
        if (hasAdminInAnyTenant) {
          return true;
        }
      }

      if (!activeTenantId) {
        throw new ForbiddenException('No active tenant context');
      }

      const roleInTenant = user.roles[activeTenantId];

      if (!roleInTenant) {
        throw new ForbiddenException('No role in active tenant');
      }

      // Check role hierarchy
      if (this.hasRequiredRole(roleInTenant, requiredRoles)) {
        return true;
      }

      throw new ForbiddenException('Insufficient permissions for this action');
    }

    // Fallback to legacy single role check
    if (user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }

  /**
   * Check if user's role satisfies any of the required roles
   * Implements role hierarchy: SUPERADMIN > ADMIN > MANAGER > RECRUITER > INTERVIEWER
   */
  private hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
    const roleHierarchy: Record<string, number> = {
      SUPERADMIN: 100,
      SUPPORT: 90,
      ADMIN: 80,
      MANAGER: 60,
      RECRUITER: 40,
      INTERVIEWER: 20,
      VENDOR: 10,
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;

    // Check if user's role level is >= any required role level
    for (const requiredRole of requiredRoles) {
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      if (userRoleLevel >= requiredLevel) {
        return true;
      }
    }

    return false;
  }
}
