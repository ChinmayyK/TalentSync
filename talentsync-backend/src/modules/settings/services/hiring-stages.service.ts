import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import {
  CreateHiringStageDto,
  UpdateHiringStageDto,
} from '../dto/hiring-stage.dto';

// Default stages to seed for new tenants
export const DEFAULT_HIRING_STAGES = [
  {
    name: 'Applied',
    key: 'APPLIED',
    order: 1,
    color: '#6366f1',
    isDefault: true,
  },
  { name: 'Screening', key: 'SCREENING', order: 2, color: '#8b5cf6' },
  { name: 'Interview 1', key: 'INTERVIEW_1', order: 3, color: '#0ea5e9' },
  { name: 'Interview 2', key: 'INTERVIEW_2', order: 4, color: '#06b6d4' },
  { name: 'HR Round', key: 'HR_ROUND', order: 5, color: '#10b981' },
  { name: 'Offer', key: 'OFFER', order: 6, color: '#22c55e' },
  { name: 'Hired', key: 'HIRED', order: 7, color: '#16a34a', isTerminal: true },
  {
    name: 'Rejected',
    key: 'REJECTED',
    order: 99,
    color: '#dc2626',
    isTerminal: true,
  },
];

@Injectable()
export class HiringStagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all hiring stages for a tenant (ordered)
   */
  async list(tenantId: string, includeInactive = false, limit = 100) {
    const where: any = { tenantId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.hiringStage.findMany({
      where,
      orderBy: { order: 'asc' },
      take: Math.min(limit, 200),
    });
  }

  /**
   * Get a single stage by ID
   */
  async get(tenantId: string, id: string) {
    const stage = await this.prisma.hiringStage.findFirst({
      where: { id, tenantId },
    });
    if (!stage) {
      throw new NotFoundException('Hiring stage not found');
    }
    return stage;
  }

  /**
   * Get stage by key
   */
  async getByKey(tenantId: string, key: string) {
    return this.prisma.hiringStage.findFirst({
      where: { tenantId, key, isActive: true },
    });
  }

  /**
   * Validate that a stage key exists and is active
   */
  async validate(tenantId: string, key: string): Promise<boolean> {
    const stage = await this.getByKey(tenantId, key);
    return !!stage;
  }

  /**
   * Get the default stage for a tenant
   */
  async getDefault(tenantId: string) {
    const stage = await this.prisma.hiringStage.findFirst({
      where: { tenantId, isDefault: true, isActive: true },
    });
    return stage || (await this.list(tenantId))[0];
  }

  /**
   * Create a new hiring stage
   */
  async create(tenantId: string, userId: string, dto: CreateHiringStageDto) {
    // Check for duplicate key
    const existing = await this.prisma.hiringStage.findFirst({
      where: { tenantId, key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`Stage with key "${dto.key}" already exists`);
    }

    // Get max order
    const maxOrder = await this.prisma.hiringStage.aggregate({
      where: { tenantId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order || 0) + 1;

    // If setting as default, unset others
    if (dto.isDefault) {
      await this.prisma.hiringStage.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const stage = await this.prisma.hiringStage.create({
      data: {
        tenantId,
        name: dto.name,
        key: dto.key,
        order: nextOrder,
        color: dto.color || null,
        isDefault: dto.isDefault || false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'HIRING_STAGE_CREATE',
        metadata: { stageId: stage.id, key: stage.key, name: stage.name },
      },
    });

    return stage;
  }

  /**
   * Update a hiring stage
   */
  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateHiringStageDto,
  ) {
    const stage = await this.get(tenantId, id);

    // If setting as default, unset others
    if (dto.isDefault) {
      await this.prisma.hiringStage.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.hiringStage.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
        isActive: dto.isActive,
        isDefault: dto.isDefault,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'HIRING_STAGE_UPDATE',
        metadata: { stageId: id, changes: dto as any },
      },
    });

    return updated;
  }

  /**
   * Reorder hiring stages
   */
  async reorder(tenantId: string, userId: string, stageIds: string[]) {
    // Validate all IDs belong to tenant
    const stages = await this.prisma.hiringStage.findMany({
      where: { tenantId, id: { in: stageIds } },
    });
    if (stages.length !== stageIds.length) {
      throw new BadRequestException('Invalid stage IDs');
    }

    // Update orders
    await this.prisma.$transaction(
      stageIds.map((id, index) =>
        this.prisma.hiringStage.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'HIRING_STAGE_REORDER',
        metadata: { newOrder: stageIds },
      },
    });

    return this.list(tenantId, true);
  }

  /**
   * Toggle active status
   */
  async toggle(tenantId: string, userId: string, id: string) {
    const stage = await this.get(tenantId, id);

    // Prevent deactivating if it's the only active stage
    if (stage.isActive) {
      const activeCount = await this.prisma.hiringStage.count({
        where: { tenantId, isActive: true },
      });
      if (activeCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the last active stage',
        );
      }
    }

    // Prevent deactivating default stage
    if (stage.isActive && stage.isDefault) {
      throw new BadRequestException(
        'Cannot deactivate the default stage. Set another stage as default first.',
      );
    }

    const updated = await this.prisma.hiringStage.update({
      where: { id },
      data: { isActive: !stage.isActive },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'HIRING_STAGE_TOGGLE',
        metadata: { stageId: id, isActive: updated.isActive },
      },
    });

    return updated;
  }

  /**
   * Delete a hiring stage (only if not in use)
   */
  async delete(tenantId: string, userId: string, id: string) {
    const stage = await this.get(tenantId, id);

    // Check if stage is in use by candidates
    const candidateCount = await this.prisma.candidate.count({
      where: { tenantId, stage: stage.key },
    });
    if (candidateCount > 0) {
      throw new BadRequestException(
        `Cannot delete stage "${stage.name}" - it is used by ${candidateCount} candidate(s). ` +
          `Move them to another stage first.`,
      );
    }

    // Check if stage is in use by interviews
    const interviewCount = await this.prisma.interview.count({
      where: { tenantId, stage: stage.key },
    });
    if (interviewCount > 0) {
      throw new BadRequestException(
        `Cannot delete stage "${stage.name}" - it is used by ${interviewCount} interview(s).`,
      );
    }

    // Prevent deleting the only active stage
    const activeCount = await this.prisma.hiringStage.count({
      where: { tenantId, isActive: true },
    });
    if (stage.isActive && activeCount <= 1) {
      throw new BadRequestException('Cannot delete the last active stage');
    }

    await this.prisma.hiringStage.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'HIRING_STAGE_DELETE',
        metadata: { stageId: id, key: stage.key, name: stage.name },
      },
    });

    return { success: true };
  }

  /**
   * Seed default stages for a tenant
   */
  async seedDefaultStages(tenantId: string) {
    const existing = await this.prisma.hiringStage.count({
      where: { tenantId },
    });
    if (existing > 0) {
      return; // Already has stages
    }

    await this.prisma.hiringStage.createMany({
      data: DEFAULT_HIRING_STAGES.map((s) => ({
        tenantId,
        name: s.name,
        key: s.key,
        order: s.order,
        color: s.color,
        isDefault: (s as any).isDefault || false,
        isTerminal: (s as any).isTerminal || false,
      })),
    });
  }
}

