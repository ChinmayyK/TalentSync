import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { AvailabilityService } from './availability.service';
import { BusyBlockService } from './busy-block.service';
import { SchedulingRulesService } from './scheduling-rules.service';
import {
  SuggestionQueryDto,
  SlotSuggestionDto,
  SuggestionResponseDto,
  TeamAvailabilityQueryDto,
  TeamAvailabilityResponseDto,
  UserAvailabilityDto,
  MAX_PANEL_INTERVIEWERS,
  TimeOfDay,
} from '../dto/suggestion.dto';
import { TimeInterval, TimeSlot } from '../types/calendar.types';
import { sliceIntoSlots, filterByMinNotice } from '../utils/interval-math';

interface RankedSlot {
  slot: TimeInterval;
  score: number;
  reasons: string[];
}

interface InterviewerLoad {
  userId: string;
  interviewCount: number;
  totalMinutes: number;
}

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private busyBlockService: BusyBlockService,
    private schedulingRulesService: SchedulingRulesService,
  ) {}

  /**
   * Get ranked slot suggestions for multi-participant scheduling
   */
  async getSuggestions(
    tenantId: string,
    dto: SuggestionQueryDto,
  ): Promise<SuggestionResponseDto> {
    const startTime = Date.now();

    // Validate max interviewers
    if (dto.userIds.length > MAX_PANEL_INTERVIEWERS) {
      throw new BadRequestException(
        `Maximum ${MAX_PANEL_INTERVIEWERS} interviewers allowed per panel`,
      );
    }

    const startRange = new Date(dto.startRange);
    const endRange = new Date(dto.endRange);
    const maxSuggestions = dto.maxSuggestions || 10;

    // Get multi-user availability (intersected free slots)
    const multiUserResult =
      await this.availabilityService.getMultiUserAvailability(
        tenantId,
        dto.userIds,
        startRange,
        endRange,
        dto.durationMins,
        dto.ruleId,
      );

    if (multiUserResult.combined.length === 0) {
      return {
        suggestions: [],
        totalAvailableSlots: 0,
        queryRange: { start: dto.startRange, end: dto.endRange },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Convert TimeSlots to TimeIntervals for ranking
    const availableSlots: TimeInterval[] = multiUserResult.combined.map(
      (s) => ({
        start: s.start,
        end: s.end,
      }),
    );

    // Get interviewer loads for load balancing
    const loads = await this.getInterviewerLoads(
      tenantId,
      dto.userIds,
      startRange,
      endRange,
    );

    // Get candidate's existing interviews if provided
    let candidateInterviews: Date[] = [];
    if (dto.candidateId) {
      candidateInterviews = await this.getCandidateInterviewDates(
        tenantId,
        dto.candidateId,
        startRange,
        endRange,
      );
    }

    // Rank slots
    const rankedSlots = this.rankSlots(
      availableSlots,
      dto.userIds,
      loads,
      candidateInterviews,
      dto.preferences,
    );

    // Sort by score descending and take top N
    rankedSlots.sort((a, b) => b.score - a.score);
    const topSlots = rankedSlots.slice(0, maxSuggestions);

    // Build user availability map for each slot
    const suggestions: SlotSuggestionDto[] = topSlots.map((ranked) => ({
      start: ranked.slot.start.toISOString(),
      end: ranked.slot.end.toISOString(),
      score: Math.round(ranked.score),
      reasons: ranked.reasons,
      userAvailability: this.buildUserAvailabilityMap(
        ranked.slot,
        dto.userIds,
        multiUserResult.individual,
      ),
    }));

    return {
      suggestions,
      totalAvailableSlots: availableSlots.length,
      queryRange: { start: dto.startRange, end: dto.endRange },
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get team availability for visualization
   */
  async getTeamAvailability(
    tenantId: string,
    dto: TeamAvailabilityQueryDto,
  ): Promise<TeamAvailabilityResponseDto> {
    // Validate max interviewers
    if (dto.userIds.length > MAX_PANEL_INTERVIEWERS) {
      throw new BadRequestException(
        `Maximum ${MAX_PANEL_INTERVIEWERS} interviewers allowed`,
      );
    }

    const start = new Date(dto.start);
    const end = new Date(dto.end);

    // Get user info
    const users = await this.prisma.user.findMany({
      where: { id: { in: dto.userIds } },
      select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u.name]));

    // Get availability for each user
    const userAvailability: UserAvailabilityDto[] = [];

    for (const userId of dto.userIds) {
      const intervals = await this.availabilityService.getFreeIntervals(
        tenantId,
        userId,
        start,
        end,
      );

      userAvailability.push({
        userId,
        userName: userMap.get(userId) || undefined,
        intervals: intervals.map((i) => ({
          start: i.start.toISOString(),
          end: i.end.toISOString(),
        })),
      });
    }

    // Find common slots
    const multiUserResult =
      await this.availabilityService.getMultiUserAvailability(
        tenantId,
        dto.userIds,
        start,
        end,
        dto.slotDurationMins || 60,
      );

    return {
      userAvailability,
      commonSlots: multiUserResult.combined.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
      queryRange: { start: dto.start, end: dto.end },
    };
  }

  /**
   * Rank slots using multiple factors
   */
  private rankSlots(
    slots: TimeInterval[],
    userIds: string[],
    loads: InterviewerLoad[],
    candidateInterviews: Date[],
    preferences?: SuggestionQueryDto['preferences'],
  ): RankedSlot[] {
    return slots.map((slot) => {
      let score = 50; // Base score
      const reasons: string[] = [];

      // 1. Time of day preference (0-20 points)
      const timeScore = this.scoreTimeOfDay(
        slot,
        preferences?.preferredTimeOfDay,
      );
      score += timeScore.score;
      if (timeScore.reason) reasons.push(timeScore.reason);

      // 2. Day of week preference (0-15 points)
      const dayScore = this.scoreDayOfWeek(slot, preferences?.preferredDays);
      score += dayScore.score;
      if (dayScore.reason) reasons.push(dayScore.reason);

      // 3. Load balancing (0-25 points)
      const loadScore = this.scoreLoadBalance(slot, userIds, loads);
      score += loadScore.score;
      if (loadScore.reason) reasons.push(loadScore.reason);

      // 4. Avoid back-to-back for candidate (-20 to +10 points)
      if (preferences?.avoidBackToBack && candidateInterviews.length > 0) {
        const gapScore = this.scoreGapFromOtherInterviews(
          slot,
          candidateInterviews,
          preferences.minGapBetweenInterviewsMins || 60,
        );
        score += gapScore.score;
        if (gapScore.reason) reasons.push(gapScore.reason);
      }

      // 5. Sooner is better (0-10 points)
      const soonerScore = this.scoreSooner(slot);
      score += soonerScore.score;
      if (soonerScore.reason) reasons.push(soonerScore.reason);

      // Clamp score to 0-100
      score = Math.max(0, Math.min(100, score));

      return { slot, score, reasons };
    });
  }

  /**
   * Score based on time of day preference
   */
  private scoreTimeOfDay(
    slot: TimeInterval,
    preference?: TimeOfDay,
  ): { score: number; reason?: string } {
    if (!preference || preference === TimeOfDay.ANY) {
      return { score: 0 };
    }

    const hour = slot.start.getHours();

    // Morning: 8-12, Afternoon: 12-17, Evening: 17-21
    const isMorning = hour >= 8 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;

    if (preference === TimeOfDay.MORNING && isMorning) {
      return { score: 20, reason: 'Matches morning preference' };
    }
    if (preference === TimeOfDay.AFTERNOON && isAfternoon) {
      return { score: 20, reason: 'Matches afternoon preference' };
    }
    if (preference === TimeOfDay.EVENING && isEvening) {
      return { score: 20, reason: 'Matches evening preference' };
    }

    // Partial match
    if (preference === TimeOfDay.MORNING && isAfternoon) {
      return { score: 5, reason: 'Close to morning preference' };
    }
    if (preference === TimeOfDay.AFTERNOON && (isMorning || isEvening)) {
      return { score: 5, reason: 'Close to afternoon preference' };
    }

    return { score: -10, reason: 'Does not match time of day preference' };
  }

  /**
   * Score based on preferred days
   */
  private scoreDayOfWeek(
    slot: TimeInterval,
    preferredDays?: number[],
  ): { score: number; reason?: string } {
    if (!preferredDays || preferredDays.length === 0) {
      return { score: 0 };
    }

    const dow = slot.start.getDay();

    if (preferredDays.includes(dow)) {
      return { score: 15, reason: 'Matches preferred day' };
    }

    return { score: -5, reason: 'Not a preferred day' };
  }

  /**
   * Score based on load balancing across interviewers
   */
  private scoreLoadBalance(
    slot: TimeInterval,
    userIds: string[],
    loads: InterviewerLoad[],
  ): { score: number; reason?: string } {
    if (loads.length === 0) {
      return { score: 25, reason: 'No prior interviews - good balance' };
    }

    // Calculate average load
    const avgInterviews =
      loads.reduce((sum, l) => sum + l.interviewCount, 0) / loads.length;

    // Check if this slot would improve balance
    // (Prefer slots where the least loaded interviewers are available)
    const loadVariance =
      loads.reduce(
        (sum, l) => sum + Math.pow(l.interviewCount - avgInterviews, 2),
        0,
      ) / loads.length;

    if (loadVariance < 1) {
      return { score: 25, reason: 'Excellent load balance' };
    }
    if (loadVariance < 4) {
      return { score: 15, reason: 'Good load balance' };
    }
    if (loadVariance < 9) {
      return { score: 5, reason: 'Moderate load imbalance' };
    }

    return { score: -5, reason: 'Load imbalance may increase' };
  }

  /**
   * Score based on gap from other interviews for the same candidate
   */
  private scoreGapFromOtherInterviews(
    slot: TimeInterval,
    otherInterviews: Date[],
    minGapMins: number,
  ): { score: number; reason?: string } {
    const slotStart = slot.start.getTime();
    const slotEnd = slot.end.getTime();
    const minGapMs = minGapMins * 60 * 1000;

    let closestGapMs = Infinity;

    for (const interview of otherInterviews) {
      const interviewTime = interview.getTime();
      const gapBefore = slotStart - interviewTime;
      const gapAfter = interviewTime - slotEnd;
      const gap = Math.min(Math.abs(gapBefore), Math.abs(gapAfter));

      if (gap < closestGapMs) {
        closestGapMs = gap;
      }
    }

    if (closestGapMs === Infinity) {
      return { score: 10, reason: 'No other interviews scheduled' };
    }

    if (closestGapMs < minGapMs / 2) {
      return { score: -20, reason: 'Too close to another interview' };
    }

    if (closestGapMs < minGapMs) {
      return { score: -10, reason: 'Less than preferred gap' };
    }

    if (closestGapMs >= minGapMs * 2) {
      return { score: 10, reason: 'Good gap from other interviews' };
    }

    return { score: 0 };
  }

  /**
   * Score slots that are sooner higher (for urgency)
   */
  private scoreSooner(slot: TimeInterval): { score: number; reason?: string } {
    const now = Date.now();
    const slotStart = slot.start.getTime();
    const daysAway = (slotStart - now) / (1000 * 60 * 60 * 24);

    if (daysAway <= 1) {
      return { score: 10, reason: 'Available soon' };
    }
    if (daysAway <= 3) {
      return { score: 7, reason: 'Available within 3 days' };
    }
    if (daysAway <= 7) {
      return { score: 3, reason: 'Available this week' };
    }

    return { score: 0 };
  }

  /**
   * Get interview load for each interviewer in the date range
   */
  private async getInterviewerLoads(
    tenantId: string,
    userIds: string[],
    start: Date,
    end: Date,
  ): Promise<InterviewerLoad[]> {
    const loads: InterviewerLoad[] = [];

    for (const userId of userIds) {
      // Count booked slots for this user in the range
      const slots = await this.prisma.interviewSlot.findMany({
        where: {
          tenantId,
          status: 'BOOKED',
          startAt: { gte: start },
          endAt: { lte: end },
          participants: {
            path: ['$[*].id'],
            array_contains: userId,
          },
        },
      });

      const totalMinutes = slots.reduce((sum, slot) => {
        return sum + (slot.endAt.getTime() - slot.startAt.getTime()) / 60000;
      }, 0);

      loads.push({
        userId,
        interviewCount: slots.length,
        totalMinutes,
      });
    }

    return loads;
  }

  /**
   * Get existing interview dates for a candidate
   */
  private async getCandidateInterviewDates(
    tenantId: string,
    candidateId: string,
    start: Date,
    end: Date,
  ): Promise<Date[]> {
    const interviews = await this.prisma.interview.findMany({
      where: {
        tenantId,
        candidateId,
        date: { gte: start, lte: end },
        status: { notIn: ['CANCELLED'] },
      },
      select: { date: true },
    });

    return interviews.map((i) => i.date);
  }

  /**
   * Build per-user availability map for a specific slot
   */
  private buildUserAvailabilityMap(
    slot: TimeInterval,
    userIds: string[],
    individualAvailability: Array<{
      userId: string;
      intervals: TimeInterval[];
    }>,
  ): Record<string, boolean> {
    const map: Record<string, boolean> = {};

    for (const userId of userIds) {
      const userAvail = individualAvailability.find((a) => a.userId === userId);
      if (!userAvail) {
        map[userId] = false;
        continue;
      }

      // Check if user's free intervals contain this slot
      const isAvailable = userAvail.intervals.some(
        (interval) =>
          interval.start.getTime() <= slot.start.getTime() &&
          interval.end.getTime() >= slot.end.getTime(),
      );

      map[userId] = isAvailable;
    }

    return map;
  }
}

