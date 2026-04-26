import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CreateBusyBlockDto, BusyBlockQueryDto } from '../dto';
import { BusyBlockSource } from '../types/calendar.types';
import { AvailabilityService } from './availability.service';

@Injectable()
export class BusyBlockService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AvailabilityService))
    private availabilityService: AvailabilityService,
  ) {}

  /**
   * Get busy blocks for a user within a date range
   */
  async getBusyBlocks(tenantId: string, query: BusyBlockQueryDto) {
    const where: any = { tenantId };

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.start || query.end) {
      where.OR = [];

      // Blocks that overlap with the query range
      if (query.start && query.end) {
        where.AND = [
          { startAt: { lt: new Date(query.end) } },
          { endAt: { gt: new Date(query.start) } },
        ];
      } else if (query.start) {
        where.endAt = { gt: new Date(query.start) };
      } else if (query.end) {
        where.startAt = { lt: new Date(query.end) };
      }
    }

    return this.prisma.busyBlock.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Create a manual busy block
   */
  async createBusyBlock(
    tenantId: string,
    currentUserId: string,
    dto: CreateBusyBlockDto,
  ) {
    const userId = dto.userId || currentUserId;

    // Validate dates
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) {
      throw new Error('End time must be after start time');
    }

    const block = await this.prisma.busyBlock.create({
      data: {
        tenantId,
        userId,
        startAt,
        endAt,
        reason: dto.reason,
        source: 'manual',
        metadata: dto.metadata,
      },
    });
    // Invalidate cache
    await this.availabilityService.invalidateUserCache(tenantId, userId);
    return block;
  }

  /**
   * Create a busy block from an interview booking
   */
  async createFromInterview(
    tenantId: string,
    userId: string,
    interviewId: string,
    startAt: Date,
    endAt: Date,
  ) {
    const block = await this.prisma.busyBlock.create({
      data: {
        tenantId,
        userId,
        startAt,
        endAt,
        source: 'interview',
        sourceId: interviewId,
        reason: 'Interview scheduled',
      },
    });
    // Invalidate cache
    await this.availabilityService.invalidateUserCache(tenantId, userId);
    return block;
  }

  /**
   * Delete a busy block
   */
  async deleteBusyBlock(
    tenantId: string,
    currentUserId: string,
    blockId: string,
  ) {
    const block = await this.prisma.busyBlock.findUnique({
      where: { id: blockId },
    });

    if (!block) {
      throw new NotFoundException('Busy block not found');
    }

    if (block.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Only allow deleting manual blocks
    if (block.source !== 'manual') {
      throw new ForbiddenException(
        'Cannot delete system-generated busy blocks',
      );
    }

    // Only owner or admin can delete
    if (block.userId !== currentUserId) {
      // TODO: Check if user is admin
    }

    const deleted = await this.prisma.busyBlock.delete({
      where: { id: blockId },
    });
    // Invalidate cache
    await this.availabilityService.invalidateUserCache(tenantId, block.userId);
    return deleted;
  }

  /**
   * Delete busy blocks by source ID (e.g., when cancelling an interview)
   */
  async deleteBySourceId(tenantId: string, sourceId: string) {
    return this.prisma.busyBlock.deleteMany({
      where: {
        tenantId,
        sourceId,
      },
    });
  }
}
