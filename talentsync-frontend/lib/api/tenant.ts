import { toast } from "sonner";
import { client } from "./client";

// Types
export interface BrandingSettings {
  organizationName: string;
  address: string;
  supportEmail: string;
  primaryColor: string;
  accentColor: string;
  logos: {
    main?: File | null;
    favicon?: File | null;
    lightTheme?: File | null;
    darkTheme?: File | null;
  };
}

export interface DomainSettings {
  subdomain: string;
  customDomain: string;
  customDomainVerified: boolean;
  customDomainSSLStatus: "pending" | "verified" | "error";
  webhookCallbackURL: string;
  domainRedirectRules: Array<{
    from: string;
    to: string;
  }>;
}

export interface AuthenticationSettings {
  defaultLoginMethod: "password" | "google" | "microsoft" | "azure" | "saml";
  allowPasswordLogin: boolean;
  forceSSO: boolean;
  ssoConfig: {
    identityProviderName: string;
    loginURL: string;
    logoutURL: string;
    certificateUpload?: File | null;
    entityID: string;
    audienceURI: string;
    acsURL: string;
  };
  ssoConnectionStatus: "connected" | "not_connected";
}

export interface SecuritySettings {
  enable2FA: boolean;
  require2FAForAllUsers: boolean;
  sessionTimeout: "15m" | "30m" | "1h" | "4h" | "24h";
  passwordPolicy: {
    minLength: number;
    requireSymbol: boolean;
    requireUppercase: boolean;
    requireNumber: boolean;
  };
  ipAllowlist: Array<{
    id: string;
    ip: string;
    description: string;
    addedAt: string;
  }>;
  geographicalRestrictions: boolean;
  notifyOnNewLogin: boolean;
  notifyOnFailedSSO: boolean;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  replyToEmail: string;
  configured: boolean;
}

export interface APIKey {
  id: string;
  label: string;
  key: string; // masked like: sk_test_****...****
  scopes: ("read" | "write" | "admin")[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  active: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  metadata: Record<string, any>;
  ipAddress: string;
  severity: "info" | "warning" | "error";
}

// Mock data
const mockBrandingSettings: BrandingSettings = {
  organizationName: "Acme Corp",
  address: "123 Business St, San Francisco, CA 94102",
  supportEmail: "support@acme.com",
  primaryColor: "#0066CC",
  accentColor: "#00CC88",
  logos: {
    main: null,
    favicon: null,
    lightTheme: null,
    darkTheme: null,
  },
};

const mockDomainSettings: DomainSettings = {
  subdomain: "acme",
  customDomain: "careers.acme.com",
  customDomainVerified: true,
  customDomainSSLStatus: "verified",
  webhookCallbackURL: "https://api.example.com/webhooks/tenant-events",
  domainRedirectRules: [
    {
      from: "*.acme.com",
      to: "careers.acme.com",
    },
  ],
};

const mockAuthenticationSettings: AuthenticationSettings = {
  defaultLoginMethod: "password",
  allowPasswordLogin: true,
  forceSSO: false,
  ssoConfig: {
    identityProviderName: "Azure AD",
    loginURL: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    logoutURL: "https://login.microsoftonline.com/common/oauth2/v2.0/logout",
    entityID: "https://app.example.com/saml/metadata",
    audienceURI: "https://app.example.com/saml/acs",
    acsURL: "https://app.example.com/saml/acs",
  },
  ssoConnectionStatus: "not_connected",
};

const mockSecuritySettings: SecuritySettings = {
  enable2FA: true,
  require2FAForAllUsers: false,
  sessionTimeout: "1h",
  passwordPolicy: {
    minLength: 12,
    requireSymbol: true,
    requireUppercase: true,
    requireNumber: true,
  },
  ipAllowlist: [
    {
      id: "1",
      ip: "192.168.1.1",
      description: "Office network",
      addedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      ip: "10.0.0.0/8",
      description: "VPN network",
      addedAt: "2024-01-05T00:00:00Z",
    },
  ],
  geographicalRestrictions: false,
  notifyOnNewLogin: true,
  notifyOnFailedSSO: true,
};

const mockEmailSettings: EmailSettings = {
  smtpHost: "smtp.sendgrid.net",
  smtpPort: 587,
  smtpUsername: "apikey",
  smtpPassword: "SG.xxxxxxxxxxxxxxxxxxxxxxxxx",
  fromEmail: "noreply@acme.com",
  replyToEmail: "support@acme.com",
  configured: true,
};

const mockAPIKeys: APIKey[] = [
  {
    id: "1",
    label: "Production API Key",
    key: "sk_live_****...****",
    scopes: ["read", "write", "admin"],
    createdAt: "2024-01-01T00:00:00Z",
    lastUsedAt: "2024-01-15T10:30:00Z",
    expiresAt: "2025-01-01T00:00:00Z",
    active: true,
  },
  {
    id: "2",
    label: "Test API Key",
    key: "sk_test_****...****",
    scopes: ["read"],
    createdAt: "2024-01-10T00:00:00Z",
    lastUsedAt: undefined,
    expiresAt: undefined,
    active: true,
  },
];

const mockAuditLogs: AuditLog[] = [
  {
    id: "1",
    timestamp: "2024-01-15T14:30:00Z",
    user: "john.doe@acme.com",
    action: "Updated branding settings",
    metadata: { changedFields: ["primaryColor"] },
    ipAddress: "192.168.1.100",
    severity: "info",
  },
  {
    id: "2",
    timestamp: "2024-01-15T13:15:00Z",
    user: "jane.smith@acme.com",
    action: "Verified custom domain",
    metadata: { domain: "careers.acme.com" },
    ipAddress: "10.0.0.50",
    severity: "info",
  },
  {
    id: "3",
    timestamp: "2024-01-15T12:00:00Z",
    user: "bob.wilson@acme.com",
    action: "SSO login failed",
    metadata: { provider: "Azure AD", errorCode: "INVALID_ASSERTION" },
    ipAddress: "203.0.113.45",
    severity: "warning",
  },
  {
    id: "4",
    timestamp: "2024-01-15T11:30:00Z",
    user: "alice.johnson@acme.com",
    action: "Created API key",
    metadata: { label: "Integration Key" },
    ipAddress: "192.168.1.100",
    severity: "info",
  },
  {
    id: "5",
    timestamp: "2024-01-14T15:45:00Z",
    user: "john.doe@acme.com",
    action: "User login",
    metadata: { fromNewLocation: true },
    ipAddress: "203.0.113.99",
    severity: "warning",
  },
];

// API Functions - Connected to real backend
export const tenantApi = {
  // Branding - Connected to real backend
  async getBrandingSettings() {
    console.log("[API] GET /api/v1/settings");
    const settings = await client.get<any>("/settings");
    const branding = settings.branding || {};
    return {
      organizationName: branding.organizationName || "",
      address: branding.address || "",
      supportEmail: branding.supportEmail || "",
      primaryColor: branding.primaryColor || "#0066CC",
      accentColor: branding.accentColor || "#00CC88",
      logos: branding.logos || {}
    };
  },

  async updateBrandingSettings(settings: Partial<BrandingSettings>) {
    console.log("[API] PATCH /api/v1/settings/branding", settings);
    await client.patch("/settings/branding", settings);
    toast.success("Branding settings saved successfully");
    return { ...mockBrandingSettings, ...settings };
  },

  async resetBranding() {
    console.log("[API] PATCH /api/v1/settings/branding (reset)");
    await client.patch("/settings/branding", {
      organizationName: "",
      primaryColor: "#0066CC",
      accentColor: "#00CC88"
    });
    toast.success("Branding reset to default");
    return mockBrandingSettings;
  },

  // Domain - Connected to real backend
  async getDomainSettings(): Promise<DomainSettings> {
    console.log("[API] GET /api/v1/settings");
    const settings = await client.get<any>("/settings");
    const domain = settings.domain || {};
    return {
      subdomain: domain.subdomain || "",
      customDomain: domain.customDomain || "",
      customDomainVerified: domain.customDomainVerified || false,
      customDomainSSLStatus: domain.customDomainSSLStatus || "pending",
      webhookCallbackURL: domain.webhookCallbackURL || "",
      domainRedirectRules: domain.domainRedirectRules || [],
    };
  },

  async updateDomainSettings(settings: Partial<DomainSettings>) {
    console.log("[API] PATCH /api/v1/settings/domain", settings);
    try {
      const result = await client.patch<DomainSettings>("/settings/domain", {
        customDomain: settings.customDomain,
        domainRedirectRules: settings.domainRedirectRules,
      });
      toast.success("Domain settings saved");
      return result;
    } catch (err) {
      console.error("Failed to update domain settings", err);
      toast.error("Failed to save domain settings");
      throw err;
    }
  },

  async verifyDomain(domain: string) {
    console.log("[API] POST /api/v1/tenants/:id/domain/verify", { domain });
    try {
      // Get current tenant ID from localStorage
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('activeTenantId') : null;
      if (!tenantId) {
        throw new Error("No active tenant");
      }
      const result = await client.post<{ verified: boolean; sslStatus: string }>(`/tenants/${tenantId}/domain/verify`, { token: domain });
      toast.success("Domain verified successfully");
      return { verified: result.verified, sslStatus: result.sslStatus || "verified" };
    } catch (err) {
      console.error("Failed to verify domain", err);
      toast.error("Domain verification failed");
      throw err;
    }
  },

  // Authentication - Connected to real backend
  async getAuthenticationSettings() {
    console.log("[API] GET /api/v1/settings/authentication");
    try {
      const settings = await client.get<any>("/settings");
      const auth = settings.authentication || {};
      return {
        defaultLoginMethod: auth.defaultLoginMethod || "password",
        allowPasswordLogin: auth.allowPasswordLogin !== false,
        forceSSO: auth.forceSSO || false,
        ssoConfig: {
          identityProviderName: auth.ssoConfig?.identityProviderName || "",
          loginURL: auth.ssoConfig?.loginURL || "",
          logoutURL: auth.ssoConfig?.logoutURL || "",
          entityID: auth.ssoConfig?.entityID || "",
          audienceURI: auth.ssoConfig?.audienceURI || "",
          acsURL: auth.ssoConfig?.acsURL || "",
        },
        ssoConnectionStatus: auth.ssoConnectionStatus || "not_connected",
      };
    } catch (err) {
      console.error("Failed to fetch authentication settings", err);
      return { ...mockAuthenticationSettings };
    }
  },

  async updateAuthenticationSettings(
    settings: Partial<AuthenticationSettings>,
  ) {
    console.log("[API] PATCH /api/v1/settings/authentication", settings);
    try {
      await client.patch("/settings/authentication", settings);
      toast.success("Authentication settings updated");
      return { ...mockAuthenticationSettings, ...settings };
    } catch (err) {
      console.error("Failed to update authentication settings", err);
      toast.error("Failed to save authentication settings");
      throw err;
    }
  },

  async testSSO(config: AuthenticationSettings["ssoConfig"]) {
    console.log("[API] POST /api/v1/sso/test", config);
    try {
      const result = await client.post<{ status: string }>("/sso/test", config);
      toast.success("SSO connection successful");
      return { status: result.status || "connected" };
    } catch (err) {
      console.error("SSO test failed", err);
      toast.error("SSO connection failed");
      throw err;
    }
  },

  // Security - Connected to real backend
  async getSecuritySettings() {
    console.log("[API] GET /api/v1/settings/security");
    try {
      const policy = await client.get<any>("/settings/security");
      if (!policy || Object.keys(policy).length === 0) {
        return { ...mockSecuritySettings };
      }
      return {
        enable2FA: policy.require2FA || false,
        require2FAForAllUsers: policy.require2FA || false,
        sessionTimeout: policy.sessionTimeout || "1h",
        passwordPolicy: {
          minLength: policy.passwordMinLength || 12,
          requireSymbol: policy.passwordRequireSymbol || true,
          requireUppercase: policy.passwordRequireUppercase || true,
          requireNumber: policy.passwordRequireNumber || true,
        },
        ipAllowlist: (policy.ipAllowlist || []).map((ip: string, i: number) => ({
          id: String(i),
          ip,
          description: "Allowed IP",
          addedAt: new Date().toISOString()
        })),
        geographicalRestrictions: false,
        notifyOnNewLogin: policy.enforceMFA || false,
        notifyOnFailedSSO: false
      };
    } catch {
      return { ...mockSecuritySettings };
    }
  },

  async updateSecuritySettings(settings: Partial<SecuritySettings>) {
    console.log("[API] PATCH /api/v1/settings/security", settings);
    await client.patch("/settings/security", {
      require2FA: settings.enable2FA,
      sessionTimeout: settings.sessionTimeout,
      passwordMinLength: settings.passwordPolicy?.minLength,
      passwordRequireSymbol: settings.passwordPolicy?.requireSymbol,
      passwordRequireUppercase: settings.passwordPolicy?.requireUppercase,
      passwordRequireNumber: settings.passwordPolicy?.requireNumber,
      ipAllowlist: settings.ipAllowlist?.map(ip => ip.ip)
    });
    toast.success("Security settings updated");
    return { ...mockSecuritySettings, ...settings };
  },

  async addIPToAllowlist(ip: string, description: string) {
    // Get current settings and add IP
    const current = await this.getSecuritySettings();
    const newAllowlist = [...current.ipAllowlist, { id: Date.now().toString(), ip, description, addedAt: new Date().toISOString() }];
    await this.updateSecuritySettings({ ...current, ipAllowlist: newAllowlist });
    toast.success(`IP ${ip} added to allowlist`);
    return { id: Date.now().toString(), ip, description, addedAt: new Date().toISOString() };
  },

  async removeIPFromAllowlist(id: string) {
    const current = await this.getSecuritySettings();
    const newAllowlist = current.ipAllowlist.filter((ip: any) => ip.id !== id);
    await this.updateSecuritySettings({ ...current, ipAllowlist: newAllowlist });
    toast.success("IP removed from allowlist");
    return { success: true };
  },

  // Email
  async getEmailSettings() {
    console.log("[API] GET /api/tenant/email");
    const settings = await client.get<any>("/settings");
    return {
      ...(settings.smtp || { configured: false }),
      configured: !!settings.smtp?.host,
      smtpHost: settings.smtp?.host,
      smtpPort: settings.smtp?.port,
      smtpUsername: settings.smtp?.username,
      // password not retrievable usually, but we need structure match
      smtpPassword: "",
      fromEmail: settings.smtp?.fromAddress,
      replyToEmail: settings.smtp?.replyToAddress, // Assuming backend has this or similar
    };
  },

  async updateEmailSettings(settings: Partial<EmailSettings>) {
    console.log("[API] PATCH /api/tenant/email", settings);

    await client.patch("/settings/smtp", {
      host: settings.smtpHost,
      port: settings.smtpPort,
      username: settings.smtpUsername,
      password: settings.smtpPassword,
      secure: settings.smtpPort === 465, // simple heuristic or add UI toggle
      fromAddress: settings.fromEmail,
    });

    toast.success("Email settings updated");
    return { ...mockEmailSettings, ...settings, configured: true };
  },

  async testEmailSettings(toEmail: string) {
    console.log("[API] POST /api/tenant/email/test", { toEmail });
    await client.post("/settings/smtp/test", { to: toEmail });
    toast.success(`Test email sent to ${toEmail}`);
    return { success: true, message: "Test email sent" };
  },

  // API Keys - Connected to real backend
  async getAPIKeys() {
    console.log("[API] GET /api/v1/settings/apikeys");
    const keys = await client.get<any[]>("/settings/apikeys");
    return keys.map(k => ({
      id: k.id,
      label: k.name,
      key: "***" + k.id.substring(0, 8),
      scopes: k.scopes || [],
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsed,
      active: k.active
    }));
  },

  async createAPIKey(
    label: string,
    scopes: ("read" | "write" | "admin")[],
    expiresIn?: "30d" | "90d" | "1yr" | "never",
  ) {
    console.log("[API] POST /api/v1/settings/apikeys", { label, scopes });
    const result = await client.post<any>("/settings/apikeys", {
      name: label,
      scopes
    });
    toast.success("API key created successfully");
    return {
      id: result.id,
      label: result.name,
      key: result.key, // Full key returned only once
      scopes: result.scopes || scopes,
      createdAt: new Date().toISOString(),
      active: true
    };
  },

  async revokeAPIKey(id: string) {
    console.log("[API] POST /api/v1/settings/apikeys/revoke", { id });
    await client.post("/settings/apikeys/revoke", { id });
    toast.success("API key revoked");
    return { success: true };
  },

  // Audit Logs - Connected to real backend
  async getAuditLogs(filters?: {
    user?: string;
    dateRange?: [string, string];
    eventType?: string;
    severity?: "info" | "warning" | "error";
  }) {
    console.log("[API] GET /api/v1/audit", filters);
    try {
      const params: any = {};
      if (filters?.user) params.user = filters.user;
      if (filters?.eventType) params.action = filters.eventType;
      if (filters?.dateRange?.[0]) params.dateFrom = filters.dateRange[0];
      if (filters?.dateRange?.[1]) params.dateTo = filters.dateRange[1];

      const result = await client.get<any>("/audit", { params });
      return result.data || [];
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
      return [...mockAuditLogs];
    }
  },

  async exportAuditLogsCSV() {
    console.log("[API] GET /api/v1/audit/export/csv");
    try {
      // Use raw fetch for blob download since client doesn't support responseType
      const response = await fetch("/api/v1/audit/export/csv", {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Audit logs exported as CSV");
      return { success: true, filename: "audit-logs.csv" };
    } catch {
      toast.error("Failed to export audit logs");
      return { success: false };
    }
  },
};

