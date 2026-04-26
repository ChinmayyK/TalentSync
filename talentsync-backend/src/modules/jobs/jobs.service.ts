import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateJobDto, UpdateJobDto, QueryJobsDto, JobStatus } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateJobDto, createdById?: string) {
    return this.prisma.job.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        requirements: dto.requirements,
        department: dto.department,
        location: dto.location,
        locationType: dto.locationType,
        employmentType: dto.employmentType,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency || 'USD',
        openings: dto.openings || 1,
        closingDate: dto.closingDate ? new Date(dto.closingDate) : null,
        hiringManagerId: dto.hiringManagerId,
        recruiterId: dto.recruiterId || createdById,
        assignedRecruiterIds: dto.assignedRecruiterIds || [],
        visibility: dto.visibility || 'INTERNAL',
        priority: dto.priority || 'NORMAL',
        skills: dto.skills || [],
        benefits: dto.benefits || [],
        tags: dto.tags || [],
        city: dto.city,
        clientName: dto.clientName,
        status: 'DRAFT',
      },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });
  }

  async findAll(tenantId: string, query: QueryJobsDto) {
    const {
      status,
      department,
      locationType,
      search,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.JobWhereInput = {
      tenantId,
      deletedAt: null,
      ...(status && { status }),
      ...(department && { department }),
      ...(locationType && { locationType }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { applications: true, offers: true },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: jobs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        applications: {
          orderBy: { appliedAt: 'desc' },
          take: 10,
        },
        offers: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { applications: true, offers: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async update(tenantId: string, id: string, dto: UpdateJobDto) {
    const existing = await this.prisma.job.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Job not found');
    }

    // Handle status transitions
    if (dto.status) {
      this.validateStatusTransition(existing.status as JobStatus, dto.status);
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        ...dto,
        closingDate: dto.closingDate ? new Date(dto.closingDate) : undefined,
        publishedAt:
          dto.status === 'OPEN' && existing.status === 'DRAFT'
            ? new Date()
            : undefined,
      },
      include: {
        _count: {
          select: { applications: true, offers: true },
        },
      },
    });
  }

  async publish(tenantId: string, id: string) {
    const job = await this.findOne(tenantId, id);

    if (job.status !== 'DRAFT') {
      throw new BadRequestException('Only draft jobs can be published');
    }

    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'OPEN',
        publishedAt: new Date(),
      },
    });
  }

  async close(tenantId: string, id: string) {
    const job = await this.findOne(tenantId, id);

    if (job.status === 'CLOSED' || job.status === 'CANCELLED') {
      throw new BadRequestException('Job is already closed or cancelled');
    }

    return this.prisma.job.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  async delete(tenantId: string, id: string) {
    const job = await this.findOne(tenantId, id);

    // Soft delete
    return this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(tenantId: string) {
    const [total, open, draft, closed, recentApplications] = await Promise.all([
      this.prisma.job.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.job.count({
        where: { tenantId, status: 'OPEN', deletedAt: null },
      }),
      this.prisma.job.count({
        where: { tenantId, status: 'DRAFT', deletedAt: null },
      }),
      this.prisma.job.count({
        where: { tenantId, status: 'CLOSED', deletedAt: null },
      }),
      this.prisma.jobApplication.count({
        where: {
          tenantId,
          appliedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      total,
      open,
      draft,
      closed,
      recentApplications,
    };
  }

  private validateStatusTransition(current: JobStatus, next: JobStatus) {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.DRAFT]: [JobStatus.OPEN, JobStatus.CANCELLED],
      [JobStatus.OPEN]: [
        JobStatus.ON_HOLD,
        JobStatus.CLOSED,
        JobStatus.CANCELLED,
      ],
      [JobStatus.ON_HOLD]: [
        JobStatus.OPEN,
        JobStatus.CLOSED,
        JobStatus.CANCELLED,
      ],
      [JobStatus.CLOSED]: [], // Terminal state
      [JobStatus.CANCELLED]: [], // Terminal state
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Cannot transition job from ${current} to ${next}`,
      );
    }
  }
}
