/**
 * Default permissions for the capability-based RBAC system
 * These are seeded into the database and used for role assignment
 */
export const DEFAULT_PERMISSIONS = [
  // Candidates
  {
    id: 'candidates.create',
    category: 'candidates',
    description: 'Create new candidates',
    level: 'TENANT',
  },
  {
    id: 'candidates.read',
    category: 'candidates',
    description: 'View candidates',
    level: 'TENANT',
  },
  {
    id: 'candidates.update',
    category: 'candidates',
    description: 'Update candidate information',
    level: 'TENANT',
  },
  {
    id: 'candidates.delete',
    category: 'candidates',
    description: 'Delete candidates',
    level: 'TENANT',
  },
  {
    id: 'candidates.export',
    category: 'candidates',
    description: 'Export candidate data',
    level: 'TENANT',
  },
  {
    id: 'candidates.bulkImport',
    category: 'candidates',
    description: 'Bulk import candidates',
    level: 'TENANT',
  },

  // Interviews
  {
    id: 'interviews.create',
    category: 'interviews',
    description: 'Create interviews',
    level: 'TENANT',
  },
  {
    id: 'interviews.read',
    category: 'interviews',
    description: 'View interviews',
    level: 'TENANT',
  },
  {
    id: 'interviews.update',
    category: 'interviews',
    description: 'Update interviews',
    level: 'TENANT',
  },
  {
    id: 'interviews.delete',
    category: 'interviews',
    description: 'Delete interviews',
    level: 'TENANT',
  },
  {
    id: 'interviews.schedule',
    category: 'interviews',
    description: 'Schedule interviews',
    level: 'TENANT',
  },
  {
    id: 'interviews.feedback',
    category: 'interviews',
    description: 'Submit interview feedback',
    level: 'TENANT',
  },

  // Reports
  {
    id: 'reports.view',
    category: 'reports',
    description: 'View reports and analytics',
    level: 'TENANT',
  },
  {
    id: 'reports.export',
    category: 'reports',
    description: 'Export reports',
    level: 'TENANT',
  },

  // Users
  {
    id: 'users.invite',
    category: 'users',
    description: 'Invite new users',
    level: 'TENANT',
  },
  {
    id: 'users.manage',
    category: 'users',
    description: 'Manage user accounts',
    level: 'TENANT',
  },
  {
    id: 'users.deactivate',
    category: 'users',
    description: 'Deactivate users',
    level: 'TENANT',
  },

  // Teams
  {
    id: 'teams.create',
    category: 'teams',
    description: 'Create teams',
    level: 'TENANT',
  },
  {
    id: 'teams.manage',
    category: 'teams',
    description: 'Manage team members',
    level: 'TENANT',
  },
  {
    id: 'teams.delete',
    category: 'teams',
    description: 'Delete teams',
    level: 'TENANT',
  },

  // Settings
  {
    id: 'settings.view',
    category: 'settings',
    description: 'View tenant settings',
    level: 'TENANT',
  },
  {
    id: 'settings.update',
    category: 'settings',
    description: 'Update tenant settings',
    level: 'TENANT',
  },
  {
    id: 'settings.integrations',
    category: 'settings',
    description: 'Manage integrations',
    level: 'TENANT',
  },

  // Communications
  {
    id: 'communications.templates',
    category: 'communications',
    description: 'Manage message templates',
    level: 'TENANT',
  },
  {
    id: 'communications.send',
    category: 'communications',
    description: 'Send messages to candidates',
    level: 'TENANT',
  },

  // Platform-only (SYSTEM level - cannot be assigned by tenant admins)
  {
    id: 'platform.tenants',
    category: 'platform',
    description: 'Manage tenants',
    level: 'SYSTEM',
  },
  {
    id: 'platform.billing',
    category: 'platform',
    description: 'Manage billing',
    level: 'SYSTEM',
  },
  {
    id: 'platform.users',
    category: 'platform',
    description: 'Platform user management',
    level: 'SYSTEM',
  },
] as const;

/**
 * Default role definitions with their permission sets
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPERADMIN: DEFAULT_PERMISSIONS.map((p) => p.id), // All permissions
  ADMIN: DEFAULT_PERMISSIONS.filter((p) => p.level === 'TENANT').map(
    (p) => p.id,
  ),
  MANAGER: [
    'candidates.read',
    'candidates.update',
    'candidates.export',
    'interviews.read',
    'interviews.update',
    'interviews.schedule',
    'interviews.feedback',
    'reports.view',
    'reports.export',
    'teams.manage',
  ],
  RECRUITER: [
    'candidates.create',
    'candidates.read',
    'candidates.update',
    'candidates.bulkImport',
    'interviews.create',
    'interviews.read',
    'interviews.update',
    'interviews.schedule',
    'communications.send',
  ],
  INTERVIEWER: ['candidates.read', 'interviews.read', 'interviews.feedback'],
};
