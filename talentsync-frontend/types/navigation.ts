export type UserRole = 'interviewer' | 'recruiter' | 'manager' | 'admin';

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  tenantId: string;
}

export interface NavItem {
  title: string;
  path?: string;
  addPath?: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
  requiredRole?: UserRole[];
}
