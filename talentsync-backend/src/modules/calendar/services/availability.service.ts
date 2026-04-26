import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { WorkingHoursService } from './working-hours.service';
import { BusyBlockService } from './busy-block.service';
import { SchedulingRulesService } from './scheduling-rules.service';
import {
  TimeInterval,
  WeeklyPattern,
  TimeSlot,
  AvailabilityResult,
  MultiUserAvailabilityResult,
} from '../types/calendar.types';
import {
  subtractIntervals,
  intersectIntervalLists,
  sliceIntoSlots,
  applyBuffers,
  filterByMinNotice,
} from '../utils/interval-math';
import {
  getCached,
  setCached,
  invalidateCache,
} from '../../../common/cache.util';

// Cache TTLs in seconds
const FREE_INTERVALS_TTL = 300; // 5 minutes
const BUSY_BLOCKS_TTL = 60; // 1 minute

// Cache key patterns
const CACHE_KEY_PREFIX = 'calendar';

// Sanitize IDs for use in cache keys - prevent pattern injection
const sanitizeCacheKeyPart = (part: string): string => {
  return part.replace(/[*:?\[\]]/g, '_');
};

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private prisma: PrismaService,
    private workingHoursService: WorkingHoursService,
    private busyBlockService: BusyBlockService,
    private schedulingRulesService: SchedulingRulesService,
  ) {}

  /**
   * Generate cache key for free intervals
   */
  private getFreeIntervalsCacheKey(
    tenantId: string,
    userId: string,
    start: Date,
    end: Date,
  ): string {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return `${CACHE_KEY_PREFIX}:free:${sanitizeCacheKeyPart(tenantId)}:${sanitizeCacheKeyPart(userId)}:${startStr}:${endStr}`;
  }

  /**
   * Generate cache key for busy blocks
   */
  private getBusyBlocksCacheKey(
    tenantId: string,
    userId: string,
    start: Date,
    end: Date,
  ): string {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return `${CACHE_KEY_PREFIX}:busy:${sanitizeCacheKeyPart(tenantId)}:${sanitizeCacheKeyPart(userId)}:${startStr}:${endStr}`;
  }

  /**
   * Invalidate cache for a user (called on data changes)
   */
  async invalidateUserCache(tenantId: string, userId: string): Promise<void> {
    const pattern = `${CACHE_KEY_PREFIX}:*:${sanitizeCacheKeyPart(tenantId)}:${sanitizeCacheKeyPart(userId)}:*`;
    await invalidateCache(pattern);
    this.logger.debug(`Invalidated cache for user ${userId}`);
  }

  /**
   * Invalidate all calendar cache for a tenant
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    const pattern = `${CACHE_KEY_PREFIX}:*:${sanitizeCacheKeyPart(tenantId)}:*`;
    await invalidateCache(pattern);
    this.logger.debug(`Invalidated cache for tenant ${tenantId}`);
  }

  /**
   * Get free intervals for a single user within a date range (with caching)
   */
  async getFreeIntervals(
    tenantId: string,
    userId: string,
    start: Date,
    end: Date,
  ): Promise<TimeInterval[]> {
    // Check cache first
    const cacheKey = this.getFreeIntervalsCacheKey(
      tenantId,
      userId,
      start,
      end,
    );
    const cached =
      await getCached<Array<{ start: string; end: string }>>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for free intervals: ${userId}`);
      // Convert back to Date objects
      return cached.map((c) => ({
        start: new Date(c.start),
        end: new Date(c.end),
      }));
    }

    // Cache miss - compute fresh
    const intervals = await this.computeFreeIntervals(
      tenantId,
      userId,
      start,
      end,
    );

    // Store in cache
    const cacheable = intervals.map((i) => ({
      start: i.start.toISOString(),
      end: i.end.toISOString(),
    }));
    await setCached(cacheKey, cacheable, FREE_INTERVALS_TTL);

    return intervals;
  }

  /**
   * Compute free intervals (internal, no caching)
   */
  private async computeFreeIntervals(
    tenantId: string,
    userId: string,
    start: Date,
    end: Date,
  ): Promise<TimeInterval[]> {
    // Get working hours
    const workingHours = await this.workingHoursService.getWorkingHours(
      tenantId,
      userId,
    );

    if (!workingHours) {
      // Use default working hours if none set
      // Get user's timezone preference or use tenant/system default
      const userTimezone = await this.getUserTimezone(tenantId, userId);
      const defaultPattern = this.workingHoursService.getDefaultPattern();
      return this.expandWeeklyPattern(defaultPattern, start, end, userTimezone);
    }

    const weekly = workingHours.weekly as unknown as WeeklyPattern[];
    const timezone = workingHours.timezone || 'UTC';

    // Expand weekly pattern into concrete intervals
    const workingIntervals = this.expandWeeklyPattern(
      weekly,
      start,
      end,
      timezone,
    );

    // Get busy blocks (with caching)
    const busyIntervals = await this.getCachedBusyBlocks(
      tenantId,
      userId,
      start,
      end,
    );

    // Subtract busy from working
    const freeIntervals = subtractIntervals(workingIntervals, busyIntervals);

    return freeIntervals;
  }

  /**
   * Get timezone for a user, falling back to tenant settings or system default
   */
  private async getUserTimezone(
    tenantId: string,
    userId: string,
  ): Promise<string> {
    // First check if user has a timezone set in their profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    if (user?.timezone) {
      return user.timezone;
    }

    // Fall back to tenant settings
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const tenantTimezone = (tenant?.settings as any)?.timezone;
    if (tenantTimezone) {
      return tenantTimezone;
    }

    // Fall back to system default (configurable via environment variable)
    return process.env.DEFAULT_TIMEZONE || 'UTC';
  }

  /**
   * Get busy blocks with caching
   */
  private async getCachedBusyBlocks(
    tenantId: string,
    userId: string,
    start: Date,
    end: Date,
  ): Promise<TimeInterval[]> {
    const cacheKey = this.getBusyBlocksCacheKey(tenantId, userId, start, end);
    const cached =
      await getCached<Array<{ start: string; end: string }>>(cacheKey);

    if (cached) {
      return cached.map((c) => ({
        start: new Date(c.start),
        end: new Date(c.end),
      }));
    }

    // Fetch from database
    const busyBlocks = await this.busyBlockService.getBusyBlocks(tenantId, {
      userId,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const intervals: TimeInterval[] = busyBlocks.map((b) => ({
      start: b.startAt,
      end: b.endAt,
    }));

    // Cache the result
    const cacheable = intervals.map((i) => ({
      start: i.start.toISOString(),
      end: i.end.toISOString(),
    }));
    await setCached(cacheKey, cacheable, BUSY_BLOCKS_TTL);

    return intervals;
  }

  /**
   * Get availability for multiple users and find common slots
   */
  async getMultiUserAvailability(
    tenantId: string,
    userIds: string[],
    start: Date,
    end: Date,
    durationMins: number,
    ruleId?: string,
  ): Promise<MultiUserAvailabilityResult> {
    // Get scheduling rule
    const rule = ruleId
      ? await this.schedulingRulesService.getRule(tenantId, ruleId)
      : await this.schedulingRulesService.getDefaultRule(tenantId);

    // Get free intervals for each user
    const individual: AvailabilityResult[] = [];
    const intervalLists: TimeInterval[][] = [];

    for (const userId of userIds) {
      const intervals = await this.getFreeIntervals(
        tenantId,
        userId,
        start,
        end,
      );
      individual.push({ userId, intervals });
      intervalLists.push(intervals);
    }

    // Find intersection of all users' free intervals
    let combined = intersectIntervalLists(intervalLists);

    // Apply buffers
    combined = applyBuffers(
      combined,
      rule.bufferBeforeMins,
      rule.bufferAfterMins,
    );

    // Slice into slots
    const slottedIntervals = sliceIntoSlots(combined, durationMins);

    // Filter by minimum notice
    const validSlots = filterByMinNotice(slottedIntervals, rule.minNoticeMins);

    // Convert to TimeSlots
    const slots: TimeSlot[] = validSlots.map((interval) => ({
      start: interval.start,
      end: interval.end,
      durationMins,
    }));

    return { individual, combined: slots };
  }

  /**
   * Expand a weekly pattern into concrete time intervals within a date range
   */
  private expandWeeklyPattern(
    weekly: WeeklyPattern[],
    start: Date,
    end: Date,
    timezone: string,
  ): TimeInterval[] {
    const intervals: TimeInterval[] = [];

    // Create a map of dow -> patterns
    const patternsByDow = new Map<number, WeeklyPattern[]>();
    for (const pattern of weekly) {
      if (!patternsByDow.has(pattern.dow)) {
        patternsByDow.set(pattern.dow, []);
      }
      patternsByDow.get(pattern.dow)!.push(pattern);
    }

    // Iterate through each day in the range
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dow = current.getDay();
      const patterns = patternsByDow.get(dow);

      if (patterns) {
        for (const pattern of patterns) {
          const [startHour, startMin] = pattern.start.split(':').map(Number);
          const [endHour, endMin] = pattern.end.split(':').map(Number);

          const intervalStart = new Date(current);
          intervalStart.setHours(startHour, startMin, 0, 0);

          const intervalEnd = new Date(current);
          intervalEnd.setHours(endHour, endMin, 0, 0);

          // Only include if the interval overlaps with our query range
          if (intervalEnd > start && intervalStart < end) {
            intervals.push({
              start: new Date(
                Math.max(intervalStart.getTime(), start.getTime()),
              ),
              end: new Date(Math.min(intervalEnd.getTime(), end.getTime())),
            });
          }
        }
      }

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return intervals;
  }

  /**
   * Check if a specific time slot is available for all participants
   */
  async isSlotAvailable(
    tenantId: string,
    userIds: string[],
    start: Date,
    end: Date,
  ): Promise<boolean> {
    for (const userId of userIds) {
      const freeIntervals = await this.getFreeIntervals(
        tenantId,
        userId,
        start,
        end,
      );

      // Check if the requested slot is fully contained in any free interval
      const isAvailable = freeIntervals.some(
        (interval) =>
          interval.start.getTime() <= start.getTime() &&
          interval.end.getTime() >= end.getTime(),
      );

      if (!isAvailable) {
        return false;
      }
    }

    return true;
  }
}
