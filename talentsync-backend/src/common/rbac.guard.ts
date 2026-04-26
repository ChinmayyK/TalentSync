import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    // Get the user's role for the active tenant
    // JWT stores roles as { tenantId: role } map
    let userRole: string | undefined;

    if (user.roles && typeof user.roles === 'object' && user.activeTenantId) {
      // New JWT format: roles map
      userRole = user.roles[user.activeTenantId];
    } else if (user.role) {
      // Legacy/fallback: direct role field
      userRole = user.role;
    }

    // SUPERADMIN has global access to all endpoints
    // Check if user is SUPERADMIN in any tenant
    if (user.roles && typeof user.roles === 'object') {
      const isSuperAdmin = Object.values(user.roles).includes('SUPERADMIN');
      if (isSuperAdmin) {
        // Set role on request for downstream use
        req.user.role = 'SUPERADMIN';
        return true;
      }
    }

    if (!userRole) {
      throw new ForbiddenException('No role found for active tenant');
    }

    // Set the resolved role on the request for downstream controllers
    req.user.role = userRole;

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
