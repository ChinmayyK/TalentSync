import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SetWorkingHoursDto, WeeklyPatternDto } from '../dto';
import { AvailabilityService } from './availability.service';

@Injectable()
export class WorkingHoursService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AvailabilityService))
    private availabilityService: AvailabilityService,
  ) {}

  /**
   * Get working hours for a user
   */
  async getWorkingHours(tenantId: string, userId: string) {
    const workingHours = await this.prisma.workingHours.findFirst({
      where: {
        tenantId,
        userId,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return workingHours;
  }

  /**
   * Set working hours for a user (creates or updates)
   */
  async setWorkingHours(
    tenantId: string,
    currentUserId: string,
    currentUserRole: string,
    dto: SetWorkingHoursDto,
  ) {
    const userId = dto.userId || currentUserId;

    // Authorization check: users can only set their own working hours unless they're ADMIN
    if (
      userId !== currentUserId &&
      !['ADMIN', 'SUPERADMIN', 'MANAGER'].includes(currentUserRole)
    ) {
      throw new ForbiddenException(
        'You can only modify your own working hours',
      );
    }

    // Validate weekly pattern
    this.validateWeeklyPattern(dto.weekly);

    // Check if user belongs to tenant
    const userTenant = await this.prisma.userTenant.findFirst({
      where: { tenantId, userId },
    });

    if (!userTenant) {
      throw new NotFoundException('User not found in this tenant');
    }

    // Upsert working hours
    const existing = await this.prisma.workingHours.findFirst({
      where: { tenantId, userId },
    });

    if (existing) {
      const updated = await this.prisma.workingHours.update({
        where: { id: existing.id },
        data: {
          weekly: dto.weekly as any,
          timezone: dto.timezone,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        },
      });
      // Invalidate cache
      await this.availabilityService.invalidateUserCache(tenantId, userId);
      return updated;
    }

    const created = await this.prisma.workingHours.create({
      data: {
        tenantId,
        userId,
        weekly: dto.weekly as any,
        timezone: dto.timezone,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });
    // Invalidate cache
    await this.availabilityService.invalidateUserCache(tenantId, userId);
    return created;
  }

  /**
   * Get default working hours pattern (Mon-Sun 8am-8pm for flexibility)
   */
  getDefaultPattern(timezone: string = 'UTC'): WeeklyPatternDto[] {
    return [
      { dow: 0, start: '08:00', end: '20:00' }, // Sunday
      { dow: 1, start: '08:00', end: '20:00' }, // Monday
      { dow: 2, start: '08:00', end: '20:00' }, // Tuesday
      { dow: 3, start: '08:00', end: '20:00' }, // Wednesday
      { dow: 4, start: '08:00', end: '20:00' }, // Thursday
      { dow: 5, start: '08:00', end: '20:00' }, // Friday
      { dow: 6, start: '08:00', end: '20:00' }, // Saturday
    ];
  }

  private validateWeeklyPattern(weekly: WeeklyPatternDto[]) {
    for (const pattern of weekly) {
      if (pattern.dow < 0 || pattern.dow > 6) {
        throw new BadRequestException(`Invalid day of week: ${pattern.dow}`);
      }

      const startParts = pattern.start.split(':').map(Number);
      const endParts = pattern.end.split(':').map(Number);

      if (
        startParts.length !== 2 ||
        endParts.length !== 2 ||
        isNaN(startParts[0]) ||
        isNaN(startParts[1]) ||
        isNaN(endParts[0]) ||
        isNaN(endParts[1])
      ) {
        throw new BadRequestException('Invalid time format. Use HH:mm');
      }

      const startMins = startParts[0] * 60 + startParts[1];
      const endMins = endParts[0] * 60 + endParts[1];

      if (endMins <= startMins) {
        throw new BadRequestException('End time must be after start time');
      }
    }
  }
}
