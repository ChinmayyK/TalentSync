import { Tenant, CurrentUser, NavGroup } from '@/types/navigation';

export const mockTenants: Tenant[] = [
  { id: 'tenant_123', name: 'TalentSync', logo: undefined },
];

export const mockCurrentUser: CurrentUser = {
  id: 'user-001',
  name: 'Chinmay Kudalkar',
  email: 'admin@talentsync.com',
  role: 'admin',
  avatarUrl: undefined,
  tenantId: 'tenant_123',
};

export const currentUserRole = mockCurrentUser.role;

export const mainNavItems: NavGroup = {
  items: [
    { title: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { title: 'Interviews', path: '/interviews', icon: 'Video' },
    { title: 'Calendar', path: '/calendar', icon: 'Calendar' },
    { title: 'Candidates', path: '/candidates', icon: 'Users' },
    { title: 'Reports', path: '/reports', icon: 'BarChart3' },
    { title: 'Communication', path: '/communication', icon: 'MessageSquare' },
    { title: 'Recycle Bin', path: '/recycle-bin', icon: 'Trash2' },
  ],
};

export const adminNavItems: NavGroup = {
  label: 'Admin',
  requiredRole: ['admin'],
  items: [
    { title: 'Vendors', path: '/admin/vendors', icon: 'Building2' },
    { title: 'Users & Teams', path: '/admin/users-and-teams', icon: 'UserCog' },
    { title: 'Tenant Settings', path: '/admin/tenant-settings', icon: 'Settings' },
    { title: 'Integrations', path: '/integrations', icon: 'Plug' },
    { title: 'System Metrics', path: '/admin/metrics', icon: 'Activity' },
  ],
};

export const othersNavItems: NavGroup = {
  label: 'Others',
  items: [
    {
      title: 'Jobs',
      path: '/others/jobs',
      addPath: '/others/jobs/new',
      icon: 'Briefcase'
    },
    {
      title: 'Offers',
      path: '/others/offers',
      addPath: '/others/offers/new',
      icon: 'FileText'
    },
    {
      title: 'Statuses',
      path: '/others/statuses/all',
      addPath: '/others/statuses/add',
      icon: 'CheckCircle2'
    },
    {
      title: 'Field Links',
      path: '/others/field-links/all',
      addPath: '/others/field-links/add',
      icon: 'Link2'
    },
    {
      title: 'Position Category',
      path: '/others/position-category/all',
      addPath: '/others/position-category/add',
      icon: 'FolderOpen'
    },
    {
      title: 'Address',
      path: '/others/address/all',
      addPath: '/others/address/add',
      icon: 'MapPin'
    },
    {
      title: 'Dashboard',
      path: '/others/dashboard',
      icon: 'LayoutDashboard'
    },
  ],
};

export const clientRelatedNavItems: NavGroup = {
  label: 'Client Related',
  requiredRole: ['admin'],
  items: [
    {
      title: 'Clients',
      path: '/admin/clients/all',
      addPath: '/admin/clients/add',
      icon: 'Building2'
    },
    {
      title: 'Contacts',
      path: '/admin/contacts/all',
      addPath: '/admin/contacts/add',
      icon: 'Users'
    },
    {
      title: 'Client HR SPOC',
      path: '/admin/client-hr-spoc/all',
      addPath: '/admin/client-hr-spoc/add',
      icon: 'UserCheck'
    },
    {
      title: 'Positions',
      path: '/admin/positions/all',
      addPath: '/admin/positions/add',
      icon: 'Briefcase'
    },
  ],
};

export const recruiterRelatedNavItems: NavGroup = {
  label: 'Recruiter Related',
  requiredRole: ['admin'],
  items: [
    {
      title: 'Recruiter',
      path: '/admin/recruiter/all',
      addPath: '/admin/recruiter/add',
      icon: 'UserPlus'
    },
    {
      title: 'Tracking Template',
      path: '/admin/tracking-template/all',
      addPath: '/admin/tracking-template/add',
      icon: 'FileSpreadsheet'
    },
  ],
};

export const vendorNavItems: NavGroup = {
  label: 'Vendor Portal',
  items: [
    { title: 'Dashboard', path: '/portal/vendor/dashboard', icon: 'LayoutDashboard' },
    { title: 'My Jobs', path: '/portal/vendor/jobs', icon: 'Briefcase' },
    { title: 'Submitted Candidates', path: '/portal/vendor/candidates', icon: 'Users' },
  ]
};
