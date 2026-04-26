import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
  QueryOffersDto,
  OfferStatus,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOfferDto, createdById: string) {
    // Verify candidate exists
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, tenantId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // Verify job exists if provided
    if (dto.jobId) {
      const job = await this.prisma.job.findFirst({
        where: { id: dto.jobId, tenantId },
      });
      if (!job) {
        throw new NotFoundException('Job not found');
      }
    }

    return this.prisma.offer.create({
      data: {
        tenantId,
        candidateId: dto.candidateId,
        jobId: dto.jobId,
        salary: dto.salary,
        currency: dto.currency || 'USD',
        salaryType: dto.salaryType || 'ANNUAL',
        bonus: dto.bonus,
        equity: dto.equity,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        position: dto.position,
        department: dto.department,
        reportingTo: dto.reportingTo,
        workLocation: dto.workLocation,
        notes: dto.notes,
        status: 'DRAFT',
        createdById,
      },
      include: {
        job: { select: { id: true, title: true } },
      },
    });
  }

  async findAll(tenantId: string, query: QueryOffersDto) {
    const { status, candidateId, jobId, search, page = 1, limit = 20 } = query;

    const where: Prisma.OfferWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(candidateId && { candidateId }),
      ...(jobId && { jobId }),
      ...(search && {
        OR: [
          { position: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [offers, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          job: { select: { id: true, title: true } },
        },
      }),
      this.prisma.offer.count({ where }),
    ]);

    // Fetch candidate names separately
    const candidateIds = [...new Set(offers.map((o: any) => o.candidateId))];
    const candidates = await this.prisma.candidate.findMany({
      where: { id: { in: candidateIds as string[] } },
      select: { id: true, name: true, email: true },
    });
    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const offersWithCandidates = offers.map((offer: any) => ({
      ...offer,
      candidate: candidateMap.get(offer.candidateId) || null,
    }));

    return {
      data: offersWithCandidates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, tenantId },
      include: {
        job: { select: { id: true, title: true, department: true } },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Get candidate details
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: offer.candidateId },
      select: { id: true, name: true, email: true, phone: true },
    });

    return { ...offer, candidate };
  }

  async update(tenantId: string, id: string, dto: UpdateOfferDto) {
    const existing = await this.prisma.offer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Offer not found');
    }

    // Validate status transitions
    if (dto.status) {
      this.validateStatusTransition(existing.status as OfferStatus, dto.status);
    }

    return this.prisma.offer.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
      include: {
        job: { select: { id: true, title: true } },
      },
    });
  }

  async send(tenantId: string, id: string, userId: string) {
    const offer = await this.findOne(tenantId, id);

    if (offer.status !== 'DRAFT' && offer.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only draft or approved offers can be sent',
      );
    }

    // TODO: Generate offer letter PDF
    // TODO: Send email to candidate with offer details

    return this.prisma.offer.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }

  async withdraw(tenantId: string, id: string) {
    const offer = await this.findOne(tenantId, id);

    if (['ACCEPTED', 'DECLINED', 'WITHDRAWN'].includes(offer.status)) {
      throw new BadRequestException('Cannot withdraw this offer');
    }

    return this.prisma.offer.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
    });
  }

  async respond(
    tenantId: string,
    id: string,
    response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED',
    details?: { declineReason?: string; counterOffer?: any },
  ) {
    const offer = await this.findOne(tenantId, id);

    if (offer.status !== 'SENT' && offer.status !== 'VIEWED') {
      throw new BadRequestException('Offer must be sent before responding');
    }

    const updateData: Prisma.OfferUpdateInput = {
      status: response,
      respondedAt: new Date(),
    };

    if (response === 'DECLINED' && details?.declineReason) {
      updateData.declineReason = details.declineReason;
    }

    if (response === 'COUNTERED' && details?.counterOffer) {
      updateData.counterOffer = details.counterOffer;
    }

    return this.prisma.offer.update({
      where: { id },
      data: updateData,
    });
  }

  async markViewed(tenantId: string, id: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { id, tenantId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.status === 'SENT' && !offer.viewedAt) {
      return this.prisma.offer.update({
        where: { id },
        data: {
          status: 'VIEWED',
          viewedAt: new Date(),
        },
      });
    }

    return offer;
  }

  async getStats(tenantId: string) {
    const [total, draft, sent, accepted, declined, pending] = await Promise.all(
      [
        this.prisma.offer.count({ where: { tenantId } }),
        this.prisma.offer.count({ where: { tenantId, status: 'DRAFT' } }),
        this.prisma.offer.count({ where: { tenantId, status: 'SENT' } }),
        this.prisma.offer.count({ where: { tenantId, status: 'ACCEPTED' } }),
        this.prisma.offer.count({ where: { tenantId, status: 'DECLINED' } }),
        this.prisma.offer.count({
          where: { tenantId, status: { in: ['SENT', 'VIEWED'] } },
        }),
      ],
    );

    const acceptanceRate =
      sent + accepted + declined > 0
        ? Math.round((accepted / (accepted + declined)) * 100)
        : 0;

    return {
      total,
      draft,
      sent,
      accepted,
      declined,
      pending,
      acceptanceRate,
    };
  }

  async delete(tenantId: string, id: string) {
    const offer = await this.findOne(tenantId, id);

    if (offer.status !== 'DRAFT') {
      throw new BadRequestException('Only draft offers can be deleted');
    }

    return this.prisma.offer.delete({ where: { id } });
  }

  private validateStatusTransition(current: OfferStatus, next: OfferStatus) {
    const validTransitions: Record<OfferStatus, OfferStatus[]> = {
      [OfferStatus.DRAFT]: [
        OfferStatus.PENDING_APPROVAL,
        OfferStatus.APPROVED,
        OfferStatus.SENT,
      ],
      [OfferStatus.PENDING_APPROVAL]: [OfferStatus.APPROVED, OfferStatus.DRAFT],
      [OfferStatus.APPROVED]: [OfferStatus.SENT, OfferStatus.WITHDRAWN],
      [OfferStatus.SENT]: [
        OfferStatus.VIEWED,
        OfferStatus.ACCEPTED,
        OfferStatus.DECLINED,
        OfferStatus.COUNTERED,
        OfferStatus.WITHDRAWN,
        OfferStatus.EXPIRED,
      ],
      [OfferStatus.VIEWED]: [
        OfferStatus.ACCEPTED,
        OfferStatus.DECLINED,
        OfferStatus.COUNTERED,
        OfferStatus.WITHDRAWN,
        OfferStatus.EXPIRED,
      ],
      [OfferStatus.ACCEPTED]: [],
      [OfferStatus.DECLINED]: [],
      [OfferStatus.EXPIRED]: [],
      [OfferStatus.WITHDRAWN]: [],
      [OfferStatus.COUNTERED]: [
        OfferStatus.APPROVED,
        OfferStatus.SENT,
        OfferStatus.WITHDRAWN,
      ],
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Cannot transition offer from ${current} to ${next}`,
      );
    }
  }
}
