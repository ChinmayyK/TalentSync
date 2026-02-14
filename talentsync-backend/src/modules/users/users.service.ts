import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  validateRoleChange,
  PROTECTED_ROLES,
  generateInvitationToken,
  hashInvitationToken,
  getInvitationExpiry,
  isInvitationExpired,
} from './utils/user-role.util';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('user-invitations') private invitationQueue: Queue,
  ) {}

  async inviteUser(tenantId: string, adminId: string, dto: InviteUserDto) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) throw new BadRequestException('Admin user not found');

    validateRoleChange(admin.role, dto.role);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing)
      throw new BadRequestException('User with this email already exists');

    const token = generateInvitationToken();
    const hashedToken = hashInvitationToken(token);
    const expiry = getInvitationExpiry();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        tenantId,
        status: 'INVITED',
        invitationToken: hashedToken,
        invitationExpiresAt: expiry,
        teamIds: dto.teamIds || [],
        password: '',
      },
    });

    await this.invitationQueue.add('send-invitation', {
      tenantId,
      userId: user.id,
      email: dto.email,
      name: dto.name,
      invitationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${token}`,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'user.invited',
        metadata: { invitedUserId: user.id, email: dto.email, role: dto.role },
      },
    });

    return {
      success: true,
      userId: user.id,
      message: 'Invitation sent successfully',
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const hashedToken = hashInvitationToken(dto.token);
    const user = await this.prisma.user.findUnique({
      where: { invitationToken: hashedToken },
    });

    if (!user) throw new BadRequestException('Invalid invitation token');
    if (user.status === 'ACTIVE')
      throw new BadRequestException('Invitation already accepted');
    if (isInvitationExpired(user.invitationExpiresAt))
      throw new BadRequestException('Invitation has expired');

    const hashedPassword = await bcrypt.hash(
      dto.password,
      Number(process.env.BCRYPT_SALT_ROUNDS || 12),
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'user.activated',
        metadata: { email: user.email },
      },
    });

    return {
      success: true,
      message: 'Account activated successfully. You can now log in.',
    };
  }

  async listUsers(tenantId: string, dto: ListUsersDto) {
    const page = dto.page || 1;
    const perPage = Math.min(dto.perPage || 20, 100);
    const where: any = { tenantId };

    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { email: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    // Support single role filter
    if (dto.role) where.role = dto.role;
    // Support multiple roles filter (comma-separated)
    if (dto.roles) {
      const roleList = dto.roles
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r);
      if (roleList.length > 0) {
        where.role = { in: roleList };
      }
    }
    if (dto.status) where.status = dto.status;

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  async getUser(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        teamIds: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(
    tenantId: string,
    adminId: string,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const [admin, user] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: adminId } }),
      this.prisma.user.findFirst({ where: { id: userId, tenantId } }),
    ]);

    if (!admin) throw new BadRequestException('Admin user not found');
    if (!user) throw new NotFoundException('User not found');

    // Capture old role for audit logging
    const oldRole = user.role;

    // Validate role change if role is being modified
    if (dto.role && dto.role !== user.role) {
      // This will throw ForbiddenException if:
      // 1. Trying to assign a protected role (ADMIN/SUPERADMIN) without being SUPERADMIN
      // 2. Trying to modify a user with protected role without being SUPERADMIN
      validateRoleChange(admin.role, dto.role, user.role);
    }

    // Additional check: prevent modifying ANY field on a protected user unless SUPERADMIN
    if (PROTECTED_ROLES.includes(user.role) && admin.role !== 'SUPERADMIN') {
      throw new ForbiddenException(
        'Cannot modify users with admin role. Contact platform administrators.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.role && { role: dto.role }),
        ...(dto.status && { status: dto.status }),
        ...(dto.teamIds && { teamIds: dto.teamIds }),
      },
    });

    // Enhanced audit logging with role change details
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action:
          dto.role && dto.role !== oldRole
            ? 'user.role_changed'
            : 'user.updated',
        metadata: {
          targetUserId: userId,
          targetEmail: user.email,
          ...(dto.role &&
            dto.role !== oldRole && {
              oldRole,
              newRole: dto.role,
            }),
          changes: JSON.parse(JSON.stringify(dto)),
        },
      },
    });

    return updated;
  }

  async activateUser(tenantId: string, adminId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'user.activated',
        metadata: { targetUserId: userId },
      },
    });

    return { success: true, message: 'User activated' };
  }

  async deactivateUser(tenantId: string, adminId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminId,
        action: 'user.deactivated',
        metadata: { targetUserId: userId },
      },
    });

    return { success: true, message: 'User deactivated' };
  }
}

