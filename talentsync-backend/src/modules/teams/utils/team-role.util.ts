import { Role } from '@prisma/client';

/**
 * Calculate effective role for a user within a team context
 * Team-level overrides take precedence over global roles
 */
export function effectiveRole(
  userGlobalRole: Role,
  teamMemberRole?: string | null,
): Role {
  // Team lead gets MANAGER permissions within team context
  if (teamMemberRole === 'TEAM_LEAD') {
    return 'MANAGER' as Role;
  }

  // Team member or no override - use global role
  return userGlobalRole;
}

/**
 * Check if user is team lead
 */
export function isTeamLead(teamMemberRole?: string | null): boolean {
  return teamMemberRole === 'TEAM_LEAD';
}

/**
 * Check if user has team-level permissions
 */
export function hasTeamPermission(
  userGlobalRole: Role,
  teamMemberRole?: string | null,
  requiredRole: Role = 'MANAGER' as Role,
): boolean {
  const effective = effectiveRole(userGlobalRole, teamMemberRole);

  const roleHierarchy: Record<string, number> = {
    SUPERADMIN: 5,
    SUPPORT: 4,
    ADMIN: 4,
    MANAGER: 3,
    RECRUITER: 2,
    INTERVIEWER: 1,
  };

  return (roleHierarchy[effective] || 0) >= (roleHierarchy[requiredRole] || 0);
}
