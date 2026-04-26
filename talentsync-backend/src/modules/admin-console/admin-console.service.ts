import {
  Injectable,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { randomPassword } from './utils/provisioning.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminConsoleService implements OnModuleDestroy {
  private queue: Queue;
  private redisConnection: IORedis;

  constructor(private prisma: PrismaService) {
    this.redisConnection = new IORedis(
      process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      {
        maxRetriesPerRequest: null,
      },
    );
    this.queue = new Queue('tenant-provision', {
      connection: this.redisConnection,
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.redisConnection.quit();
  }

  // Platform user management
  async createPlatformUser(dto: any, currentUserId: string) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new BadRequestException('User already exists');

    const pwd = dto.password || randomPassword();
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const hashed = await bcrypt.hash(pwd, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: dto.role, // SUPERADMIN or SUPPORT
        tenantId: null, // platform-level user
      },
    });

    // For platform action auditing, tenantId is optional in our schema or we use a convention.
    // If AuditLog.tenantId is required (it is String, not String?), we must provide one.
    // Schema says: tenantId String, tenant Tenant. This implies every audit log MUST belong to a tenant.
    // This is a schema limitation for platform logs.
    // Workaround: Use a "system" tenant or null if schema allows (it doesn't).
    // Prompt says: "Platform audit...".
    // I will assume for now we might need to fetch a 'system' tenant ID or allow null in schema.
    // Since I can't change schema successfully on DB, I will modify AuditLog in schema to be optional tenantId?
    // Doing so now would require another migration attempt.
    // For this skeleton, I will use a dummy UUID if I can't find one, or just `tenantId: 'platform'`.
    // But `tenantId` is a foreign key, so it must exist.
    // BEST FIX: Schema was not fully updated for AuditLog optionality in prompt instructions.
    // I made User.tenantId optional. I should probably make AuditLog.tenantId optional too.
    // I'll update schema.prisma again to make AuditLog.tenantId optional!
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        tenantId: null,
        action: 'platform.user.create',
        metadata: { userId: user.id },
      },
    });
    // Return plaintext password only once if generated
    return { id: user.id, password: dto.password ? null : pwd };
  }

  // Tenant provisioning: synchronous create + enqueue background setup
  async provisionTenant(dto: any, currentUserId: string) {
    // create tenant row
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        domain: dto.domain || null,
        settings: { createdBy: currentUserId },
      },
    });

    // create audit
    // Note: tenantId is created above.
    await this.prisma.auditLog.create({
      data: {
        userId: currentUserId,
        tenantId: tenant.id,
        action: 'provision.started',
        metadata: { dto },
      },
    });

    // enqueue provisioning background job
    await this.queue.add('provision-tenant', {
      tenantId: tenant.id,
      name: dto.name,
      domain: dto.domain,
      adminEmail: dto.initialAdminEmail,
    });

    return { tenantId: tenant.id, status: 'enqueued' };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async tenantStatus(tenantId: string) {
    // fetch latest audit logs for provisioning events
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { tenantId, logs };
  }

  async createTenantAdmin(
    tenantId: string,
    email: string,
    adminUserId: string,
  ) {
    const pwd = randomPassword();
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const hashed = await bcrypt.hash(pwd, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        password: hashed,
        name: 'Tenant Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: 'admin.tenant_admin_created',
        metadata: {
          email,
          assignedUserId: user.id,
          role: 'ADMIN',
          assignedBy: 'PLATFORM_ADMIN',
        },
      },
    });
    return { id: user.id, password: pwd };
  }

  /**
   * Assign or change role for an existing user (SUPERADMIN only)
   * This is the ONLY way to assign ADMIN role to existing users
   */
  async assignUserRole(
    tenantId: string,
    userId: string,
    role: 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'INTERVIEWER',
    adminUserId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new BadRequestException('User not found in tenant');
    }

    const oldRole = user.role;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: 'admin.user_role_assigned',
        metadata: {
          targetUserId: userId,
          targetEmail: user.email,
          oldRole,
          newRole: role,
          assignedBy: 'PLATFORM_ADMIN',
        },
      },
    });

    return {
      success: true,
      userId,
      oldRole,
      newRole: role,
      message: `User role changed from ${oldRole} to ${role}`,
    };
  }

  // ============================================
  // TENANT CONTROL
  // ============================================

  async updateTenantStatus(
    tenantId: string,
    enabled: boolean,
    adminUserId: string,
  ) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          enabled,
          disabledAt: enabled ? null : new Date().toISOString(),
          disabledBy: enabled ? null : adminUserId,
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: enabled ? 'tenant.enabled' : 'tenant.disabled',
        metadata: { enabled },
      },
    });

    return { tenantId, enabled, updatedAt: new Date() };
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            candidates: true,
            interviews: true,
          },
        },
      },
    });

    const integrations = await this.prisma.integration.findMany({
      where: { tenantId },
      select: { provider: true, status: true, lastSyncedAt: true },
    });

    return {
      ...tenant,
      integrations,
      usage: tenant?._count,
    };
  }

  // ============================================
  // USER OVERSIGHT
  // ============================================

  async listTenantUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserStatus(
    userId: string,
    status: 'ACTIVE' | 'INACTIVE',
    adminUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: adminUserId,
        action: status === 'INACTIVE' ? 'user.disabled' : 'user.enabled',
        metadata: { targetUserId: userId, status },
      },
    });

    return { userId, status, updatedAt: new Date() };
  }

  // ============================================
  // INTEGRATION CONTROL
  // ============================================

  async listAllIntegrations() {
    return this.prisma.integration.findMany({
      include: {
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateIntegrationStatus(
    tenantId: string,
    provider: string,
    enabled: boolean,
    adminUserId: string,
  ) {
    const status = enabled ? 'connected' : 'disabled';

    await this.prisma.integration.update({
      where: { tenantId_provider: { tenantId, provider } },
      data: { status },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: enabled ? 'integration.enabled' : 'integration.disabled',
        metadata: { provider, enabled },
      },
    });

    return { tenantId, provider, enabled, updatedAt: new Date() };
  }

  async getIntegrationSummary() {
    const integrations = await this.prisma.integration.groupBy({
      by: ['provider', 'status'],
      _count: { id: true },
    });

    const summary: Record<
      string,
      { connected: number; disabled: number; error: number }
    > = {};

    for (const item of integrations) {
      if (!summary[item.provider]) {
        summary[item.provider] = { connected: 0, disabled: 0, error: 0 };
      }
      if (item.status === 'connected')
        summary[item.provider].connected = item._count.id;
      else if (item.status === 'disabled')
        summary[item.provider].disabled = item._count.id;
      else if (item.status === 'error')
        summary[item.provider].error = item._count.id;
    }

    return summary;
  }

  // ============================================
  // SYSTEM HEALTH (delegates to metrics)
  // ============================================

  async getSystemHealth() {
    // Get basic counts
    const [tenantCount, userCount, activeIntegrations] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.integration.count({ where: { status: 'connected' } }),
    ]);

    return {
      tenants: tenantCount,
      users: userCount,
      activeIntegrations,
      timestamp: new Date().toISOString(),
    };
  }
}
