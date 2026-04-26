import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ListTeamsDto } from './dto/list-teams.dto';
import { effectiveRole } from './utils/team-role.util';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async createTeam(tenantId: string, userId: string, dto: CreateTeamDto) {
    const existing = await this.prisma.team.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (existing)
      throw new BadRequestException('Team name already exists in this tenant');

    if (dto.leadId) {
      const lead = await this.prisma.user.findFirst({
        where: { id: dto.leadId, tenantId },
      });
      if (!lead) throw new BadRequestException('Team lead not found');
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        description: dto.description,
        leadId: dto.leadId,
        tenantId,
      },
    });

    if (dto.leadId) {
      await this.prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: dto.leadId,
          tenantId,
          role: 'TEAM_LEAD',
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'team.created',
        metadata: { teamId: team.id, name: dto.name, leadId: dto.leadId },
      },
    });

    return team;
  }

  async listTeams(tenantId: string, dto: ListTeamsDto) {
    const page = dto.page || 1;
    const perPage = Math.min(dto.perPage || 20, 100);
    const where: any = { tenantId };

    if (dto.q) where.name = { contains: dto.q, mode: 'insensitive' };

    const [total, data] = await Promise.all([
      this.prisma.team.count({ where }),
      this.prisma.team.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          members: { select: { userId: true } },
          _count: { select: { members: true } },
        },
      }),
    ]);

    return {
      data: data.map((team) => ({
        ...team,
        memberIds: team.members.map((m) => m.userId),
        memberCount: team._count.members,
        members: undefined,
        _count: undefined,
      })),
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  async getTeam(tenantId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
      include: { _count: { select: { members: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    return { ...team, memberCount: team._count.members, _count: undefined };
  }

  async updateTeam(
    tenantId: string,
    userId: string,
    teamId: string,
    dto: UpdateTeamDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    if (dto.name && dto.name !== team.name) {
      const existing = await this.prisma.team.findUnique({
        where: { tenantId_name: { tenantId, name: dto.name } },
      });
      if (existing) throw new BadRequestException('Team name already exists');
    }

    if (dto.leadId) {
      const isMember = await this.prisma.teamMember.findFirst({
        where: { teamId, userId: dto.leadId },
      });
      if (!isMember)
        throw new BadRequestException('Team lead must be a member of the team');
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.leadId !== undefined && { leadId: dto.leadId }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'team.updated',
        metadata: { teamId, changes: JSON.parse(JSON.stringify(dto)) },
      },
    });

    return updated;
  }

  async deleteTeam(tenantId: string, userId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    await this.prisma.team.delete({ where: { id: teamId } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'team.deleted',
        metadata: { teamId, name: team.name },
      },
    });

    return { success: true, message: 'Team deleted successfully' };
  }

  async addMember(
    tenantId: string,
    userId: string,
    teamId: string,
    dto: AddMemberDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });
    if (!user) throw new BadRequestException('User not found in this tenant');

    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: dto.userId } },
    });
    if (existing)
      throw new BadRequestException('User is already a team member');

    const member = await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        tenantId,
        role: dto.role || 'TEAM_MEMBER',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'team.member.added',
        metadata: { teamId, addedUserId: dto.userId, role: dto.role },
      },
    });

    return member;
  }

  async removeMember(
    tenantId: string,
    userId: string,
    teamId: string,
    memberId: string,
  ) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId, tenantId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.teamMember.delete({ where: { id: memberId } });

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (team?.leadId === member.userId) {
      await this.prisma.team.update({
        where: { id: teamId },
        data: { leadId: null },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'team.member.removed',
        metadata: { teamId, removedUserId: member.userId },
      },
    });

    return { success: true, message: 'Member removed successfully' };
  }

  async getTeamMembers(tenantId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const members = await this.prisma.teamMember.findMany({
      where: { teamId, tenantId },
      take: 200, // Limit to 200 members
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      teamRole: m.role,
      effectiveRole: effectiveRole(m.user.role, m.role),
      user: m.user,
      createdAt: m.createdAt,
    }));
  }

  async getAvailableInterviewers(
    tenantId: string,
    teamId: string,
    dateRange?: any,
  ) {
    // Validate team belongs to tenant
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, tenantId },
    });
    if (!team) throw new NotFoundException('Team not found');

    const members = await this.prisma.teamMember.findMany({
      where: { teamId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return members
      .filter(
        (m) =>
          m.user.status === 'ACTIVE' &&
          (m.user.role === 'INTERVIEWER' ||
            m.user.role === 'MANAGER' ||
            m.role === 'TEAM_LEAD'),
      )
      .map((m) => m.user);
  }
}
