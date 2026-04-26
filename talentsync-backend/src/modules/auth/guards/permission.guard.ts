import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../common/prisma.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../../roles/permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 * Usage: @RequirePermissions('candidates.create', 'candidates.update')
 */
export const RequirePermissions = (...permissions: string[]) =>
  Reflect.metadata(PERMISSIONS_KEY, permissions);

/**
 * Guard that checks if user has required permissions
 * Works with both system roles (ADMIN, MANAGER, etc.) and custom roles
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user, tenantId } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // SUPERADMIN has all permissions
    if (user.role === 'SUPERADMIN') {
      return true;
    }

    // Get permissions from system role
    const systemRolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];

    // Get permissions from custom roles
    const customRolePermissions = await this.getCustomRolePermissions(
      user.sub,
      tenantId || user.tenantId,
    );

    // Combine all permissions
    const allPermissions = new Set([
      ...systemRolePermissions,
      ...customRolePermissions,
    ]);

    // Check if user has ALL required permissions
    return requiredPermissions.every((perm) => allPermissions.has(perm));
  }

  /**
   * Get permissions from custom roles assigned to user
   */
  private async getCustomRolePermissions(
    userId: string,
    tenantId: string,
  ): Promise<string[]> {
    if (!userId || !tenantId) {
      return [];
    }

    const assignments = await this.prisma.userCustomRole.findMany({
      where: { userId, tenantId },
      include: { role: true },
    });

    const permissions: string[] = [];
    for (const assignment of assignments) {
      permissions.push(...assignment.role.permissions);
    }

    return permissions;
  }
}

/**
 * Utility function to check if user has a specific permission
 * Can be used in services for programmatic permission checks
 */
export async function hasPermission(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  userRole: string,
  permission: string,
): Promise<boolean> {
  // SUPERADMIN has all permissions
  if (userRole === 'SUPERADMIN') {
    return true;
  }

  // Check system role permissions
  const systemPermissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
  if (systemPermissions.includes(permission)) {
    return true;
  }

  // Check custom role permissions
  const assignments = await prisma.userCustomRole.findMany({
    where: { userId, tenantId },
    include: { role: true },
  });

  for (const assignment of assignments) {
    if (assignment.role.permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all permissions for a user (system + custom roles)
 */
export async function getUserPermissions(
  prisma: PrismaService,
  userId: string,
  tenantId: string,
  userRole: string,
): Promise<string[]> {
  // SUPERADMIN gets all permissions
  if (userRole === 'SUPERADMIN') {
    return Object.values(DEFAULT_ROLE_PERMISSIONS).flat();
  }

  // Start with system role permissions
  const permissions = new Set<string>(DEFAULT_ROLE_PERMISSIONS[userRole] || []);

  // Add custom role permissions
  const assignments = await prisma.userCustomRole.findMany({
    where: { userId, tenantId },
    include: { role: true },
  });

  for (const assignment of assignments) {
    for (const perm of assignment.role.permissions) {
      permissions.add(perm);
    }
  }

  return Array.from(permissions);
}
