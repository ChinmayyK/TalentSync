import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Role hierarchy levels (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  SUPERADMIN: 100, // Platform-wide administrator (PLATFORM_SUPER_ADMIN)
  SUPPORT: 90, // Platform support staff
  ADMIN: 80, // Tenant administrator (TENANT_ADMIN)
  MANAGER: 60,
  RECRUITER: 40,
  VENDOR: 30,
  INTERVIEWER: 20,
};

/**
 * Roles that can ONLY be assigned by SUPERADMIN (platform admin)
 * These are "protected" roles that tenant admins cannot create/modify
 */
export const PROTECTED_ROLES: Role[] = ['SUPERADMIN', 'SUPPORT', 'ADMIN'];

/**
 * Roles that tenant admins CAN assign
 */
export const ASSIGNABLE_ROLES_BY_TENANT_ADMIN: Role[] = [
  'MANAGER',
  'RECRUITER',
  'INTERVIEWER',
];

/**
 * Check if actor role can manage target role based on hierarchy
 */
export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  const actorLevel = ROLE_HIERARCHY[actorRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  return actorLevel > targetLevel;
}

/**
 * Check if actor can assign the target role
 * - SUPERADMIN can assign any role
 * - Other roles can only assign non-protected roles AND must be higher in hierarchy
 */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  // SUPERADMIN can assign any role
  if (actorRole === 'SUPERADMIN') {
    return true;
  }

  // Protected roles can only be assigned by SUPERADMIN
  if (PROTECTED_ROLES.includes(targetRole)) {
    return false;
  }

  // For non-protected roles, check hierarchy
  return canManageRole(actorRole, targetRole);
}

/**
 * Validate role change and throw if not allowed
 * Enforces:
 * 1. Protected roles (ADMIN, SUPERADMIN, SUPPORT) can only be assigned by SUPERADMIN
 * 2. Actor must be higher in hierarchy than target role
 */
export function validateRoleChange(
  actorRole: Role,
  targetRole: Role,
  currentRole?: Role,
): void {
  // Check if trying to assign a protected role
  if (PROTECTED_ROLES.includes(targetRole) && actorRole !== 'SUPERADMIN') {
    throw new ForbiddenException(
      'Admin role can only be assigned by platform administrators',
    );
  }

  // Check if trying to change FROM a protected role (demoting an admin)
  if (
    currentRole &&
    PROTECTED_ROLES.includes(currentRole) &&
    actorRole !== 'SUPERADMIN'
  ) {
    throw new ForbiddenException(
      'Cannot modify users with admin role. Contact platform administrators.',
    );
  }

  // Check hierarchy for non-protected roles
  if (!canAssignRole(actorRole, targetRole)) {
    throw new ForbiddenException(
      `Role ${actorRole} cannot assign role ${targetRole}`,
    );
  }
}

/**
 * Generate secure 32-byte invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash invitation token with SHA-256
 */
export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get invitation expiry (72 hours from now)
 */
export function getInvitationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 72);
  return expiry;
}

/**
 * Check if invitation token is expired
 */
export function isInvitationExpired(expiry: Date | null): boolean {
  if (!expiry) return true;
  return new Date() > expiry;
}

/**
 * Timing-safe comparison for tokens to prevent timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still perform comparison to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
