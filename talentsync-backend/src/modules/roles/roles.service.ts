import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions.constants';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all assignable permissions (TENANT level only for tenant admins)
   */
  async listPermissions(isSuperAdmin: boolean = false) {
    const permissions = await this.prisma.permission.findMany({
      where: isSuperAdmin ? {} : { level: 'TENANT' },
      orderBy: [{ category: 'asc' }, { id: 'asc' }],
    });

    // Group by category for easier UI consumption
    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
      },
      {} as Record<string, typeof permissions>,
    );

    return { permissions, grouped };
  }

  /**
   * List all roles for a tenant (including system defaults)
   */
  async listRoles(tenantId: string) {
    const customRoles = await this.prisma.customRole.findMany({
      where: { tenantId },
      include: {
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    // Add system roles for reference
    const systemRoles = Object.keys(DEFAULT_ROLE_PERMISSIONS).map((role) => ({
      id: role,
      name: role,
      type: 'SYSTEM' as const,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
      isDefault: false,
      userCount: 0, // Would need to query User table for actual count
    }));

    return {
      customRoles: customRoles.map((r) => ({
        ...r,
        userCount: r._count.userRoles,
      })),
      systemRoles,
    };
  }

  /**
   * Create a custom role
   */
  async createRole(tenantId: string, adminId: string, dto: CreateRoleDto) {
    // Validate permissions exist and are TENANT level
    const validPermissions = await this.prisma.permission.findMany({
      where: {
        id: { in: dto.permissions },
        level: 'TENANT',
      },
    });

    const invalidPerms = dto.permissions.filter(
      (p) => !validPermissions.find((vp) => vp.id === p),
    );

    if (invalidPerms.length > 0) {
      throw new BadRequestException(
        `Invalid or system-level permissions: ${invalidPerms.join(', ')}`,
      );
    }

    // Check name uniqueness
    const existing = await this.prisma.customRole.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });

    if (existing) {
      throw new BadRequestException(`Role "${dto.name}" already exists`);
    }

    const role = await this.prisma.customRole.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        isDefault: dto.isDefault || false,
        createdById: adminId,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'role.created',
        metadata: {
          roleId: role.id,
          name: role.name,
          permissions: role.permissions,
        },
      },
    });

    return role;
  }

  /**
   * Update a custom role
   */
  async updateRole(
    tenantId: string,
    roleId: string,
    adminId: string,
    dto: UpdateRoleDto,
  ) {
    const role = await this.prisma.customRole.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.type === 'SYSTEM') {
      throw new ForbiddenException('Cannot modify system roles');
    }

    // Validate permissions if updating
    if (dto.permissions) {
      const validPermissions = await this.prisma.permission.findMany({
        where: {
          id: { in: dto.permissions },
          level: 'TENANT',
        },
      });

      const invalidPerms = dto.permissions.filter(
        (p) => !validPermissions.find((vp) => vp.id === p),
      );

      if (invalidPerms.length > 0) {
        throw new BadRequestException(
          `Invalid or system-level permissions: ${invalidPerms.join(', ')}`,
        );
      }
    }

    const oldPermissions = role.permissions;

    const updated = await this.prisma.customRole.update({
      where: { id: roleId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.permissions && { permissions: dto.permissions }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'role.updated',
        metadata: {
          roleId,
          changes: JSON.parse(JSON.stringify(dto)),
          oldPermissions,
          newPermissions: dto.permissions || oldPermissions,
        },
      },
    });

    return updated;
  }

  /**
   * Delete a custom role (only if no users assigned)
   */
  async deleteRole(tenantId: string, roleId: string, adminId: string) {
    const role = await this.prisma.customRole.findFirst({
      where: { id: roleId, tenantId },
      include: { _count: { select: { userRoles: true } } },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.type === 'SYSTEM') {
      throw new ForbiddenException('Cannot delete system roles');
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${role._count.userRoles} assigned users. Reassign users first.`,
      );
    }

    await this.prisma.customRole.delete({ where: { id: roleId } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'role.deleted',
        metadata: { roleId, name: role.name },
      },
    });

    return { success: true, message: 'Role deleted' };
  }

  /**
   * Assign a custom role to a user
   */
  async assignRoleToUser(
    tenantId: string,
    userId: string,
    roleId: string,
    adminId: string,
  ) {
    const role = await this.prisma.customRole.findFirst({
      where: { id: roleId, tenantId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found in tenant');
    }

    // Create or update assignment
    const assignment = await this.prisma.userCustomRole.upsert({
      where: {
        userId_roleId_tenantId: { userId, roleId, tenantId },
      },
      update: {},
      create: {
        userId,
        roleId,
        tenantId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'role.assigned',
        metadata: { targetUserId: userId, roleId, roleName: role.name },
      },
    });

    return assignment;
  }

  /**
   * Remove a custom role from a user
   */
  async removeRoleFromUser(
    tenantId: string,
    userId: string,
    roleId: string,
    adminId: string,
  ) {
    const assignment = await this.prisma.userCustomRole.findUnique({
      where: { userId_roleId_tenantId: { userId, roleId, tenantId } },
      include: { role: true },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.userCustomRole.delete({
      where: { userId_roleId_tenantId: { userId, roleId, tenantId } },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'role.unassigned',
        metadata: {
          targetUserId: userId,
          roleId,
          roleName: assignment.role.name,
        },
      },
    });

    return { success: true, message: 'Role removed from user' };
  }

  /**
   * Seed default permissions to database
   */
  async seedPermissions() {
    const existing = await this.prisma.permission.count();
    if (existing > 0) {
      return { message: 'Permissions already seeded', count: existing };
    }

    await this.prisma.permission.createMany({
      data: DEFAULT_PERMISSIONS.map((p) => ({
        id: p.id,
        category: p.category,
        description: p.description,
        level: p.level as any,
      })),
    });

    return { message: 'Permissions seeded', count: DEFAULT_PERMISSIONS.length };
  }
}
