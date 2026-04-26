/**
 * Permission Constants
 * Defines granular permissions for the application
 * Used with the @RequirePermission decorator
 */

export const Permissions = {
  // Candidate Management
  CANDIDATES: {
    VIEW: 'candidates:view',
    CREATE: 'candidates:create',
    UPDATE: 'candidates:update',
    DELETE: 'candidates:delete',
    BULK_IMPORT: 'candidates:bulk:import',
    BULK_EXPORT: 'candidates:bulk:export',
  },

  // Interview Scheduling
  SCHEDULING: {
    VIEW: 'scheduling:view',
    CREATE: 'scheduling:create',
    UPDATE: 'scheduling:update',
    DELETE: 'scheduling:delete',
    CANCEL: 'scheduling:cancel',
  },

  // Integrations
  INTEGRATIONS: {
    VIEW: 'integrations:view',
    MANAGE: 'integrations:manage',
    CONNECT: 'integrations:connect',
    DISCONNECT: 'integrations:disconnect',
    VIEW_CREDENTIALS: 'integrations:credentials:view',
    SYNC_TRIGGER: 'integrations:sync:trigger',
  },

  // Reports & Analytics
  REPORTS: {
    VIEW: 'reports:view',
    CREATE: 'reports:create',
    EXPORT: 'reports:export',
  },

  // User Management
  USERS: {
    VIEW: 'users:view',
    CREATE: 'users:create',
    UPDATE: 'users:update',
    DEACTIVATE: 'users:deactivate',
    INVITE: 'users:invite',
    CHANGE_ROLE: 'users:role:change',
  },

  // Team Management
  TEAMS: {
    VIEW: 'teams:view',
    CREATE: 'teams:create',
    UPDATE: 'teams:update',
    DELETE: 'teams:delete',
    MANAGE_MEMBERS: 'teams:members:manage',
  },

  // Settings
  SETTINGS: {
    VIEW: 'settings:view',
    UPDATE: 'settings:update',
    SECURITY: 'settings:security',
    BRANDING: 'settings:branding',
  },

  // Audit
  AUDIT: {
    VIEW: 'audit:view',
    EXPORT: 'audit:export',
  },

  // Bulk Operations
  BULK: {
    OPERATIONS: 'bulk:operations',
  },
} as const;

/**
 * Role to Permission Mapping
 * Defines which permissions each role has
 * '*' means all permissions (superuser)
 */
export const RolePermissions: Record<string, string[]> = {
  SUPERADMIN: ['*'],

  SUPPORT: [
    'candidates:view',
    'scheduling:view',
    'integrations:view',
    'reports:view',
    'users:view',
    'teams:view',
    'audit:view',
  ],

  ADMIN: [
    // All permissions within their tenant
    'candidates:*',
    'scheduling:*',
    'integrations:*',
    'reports:*',
    'users:*',
    'teams:*',
    'settings:*',
    'audit:*',
    'bulk:*',
  ],

  MANAGER: [
    'candidates:view',
    'candidates:create',
    'candidates:update',
    'candidates:bulk:import',
    'candidates:bulk:export',
    'scheduling:view',
    'scheduling:create',
    'scheduling:update',
    'scheduling:cancel',
    'integrations:view',
    'integrations:sync:trigger',
    'reports:view',
    'reports:export',
    'users:view',
    'users:invite',
    'teams:view',
    'teams:create',
    'teams:update',
    'teams:manage_members',
  ],

  RECRUITER: [
    'candidates:view',
    'candidates:create',
    'candidates:update',
    'scheduling:view',
    'scheduling:create',
    'scheduling:update',
    'reports:view',
    'teams:view',
  ],

  INTERVIEWER: [
    'candidates:view', // Limited to assigned candidates
    'scheduling:view', // Limited to their interviews
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const rolePerms = RolePermissions[role];

  if (!rolePerms) {
    return false;
  }

  // Superuser
  if (rolePerms.includes('*')) {
    return true;
  }

  // Exact match
  if (rolePerms.includes(permission)) {
    return true;
  }

  // Wildcard match (e.g., 'candidates:*' matches 'candidates:view')
  const [resource] = permission.split(':');
  if (rolePerms.includes(`${resource}:*`)) {
    return true;
  }

  return false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  const rolePerms = RolePermissions[role];

  if (!rolePerms || rolePerms.includes('*')) {
    // For superuser, return all defined permissions
    return Object.values(Permissions).flatMap((category) =>
      Object.values(category),
    );
  }

  // Expand wildcards
  const expanded: string[] = [];
  for (const perm of rolePerms) {
    if (perm.endsWith(':*')) {
      const resource = perm.replace(':*', '');
      // Find all permissions for this resource
      for (const [, perms] of Object.entries(Permissions)) {
        for (const p of Object.values(perms)) {
          if (p.startsWith(resource + ':')) {
            expanded.push(p);
          }
        }
      }
    } else {
      expanded.push(perm);
    }
  }

  return [...new Set(expanded)];
}
