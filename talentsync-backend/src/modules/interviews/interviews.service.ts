import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { RescheduleInterviewDto } from './dto/reschedule-interview.dto';
import { ListInterviewsDto } from './dto/list-interviews.dto';
import {
  BulkScheduleDto,
  BulkScheduleStrategy,
  BulkScheduleResult,
  BulkMode,
} from './dto/bulk-schedule.dto';
import { BulkMode as PrismaBulkMode } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AvailabilityUtil } from './utils/availability.util';
import { InterviewAutomationService } from './services/interview-automation.service';
import { InterviewEventPayload } from './events/interview-events';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { IntegrationEventsService } from '../integrations/services/integration-events.service';

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  // Allowed status transitions for interview workflow hardening
  private static readonly ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> =
    {
      SCHEDULED: ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'],
      RESCHEDULED: ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'SCHEDULED'],
      COMPLETED: [], // Terminal state
      CANCELLED: ['SCHEDULED'], // Can reschedule cancelled interviews
      NO_SHOW: ['SCHEDULED'], // Can reschedule no-shows
    };

  constructor(
    private prisma: PrismaService,
    @InjectQueue('interview-reminder') private reminderQueue: Queue,
    @InjectQueue('calendar-sync') private syncQueue: Queue,
    private automationService: InterviewAutomationService,
    private recycleBinService: RecycleBinService,
    private integrationEvents: IntegrationEventsService,
  ) {}

  /**
   * Validate that a status transition is allowed
   * @throws BadRequestException if transition is not allowed
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const allowed = InterviewsService.ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowed) {
      throw new BadRequestException(
        `Unknown interview status: ${currentStatus}`,
      );
    }
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`,
      );
    }
  }

  async create(tenantId: string, userId: string, dto: CreateInterviewDto) {
    // Validate candidate exists (outside transaction for faster failure)
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: dto.candidateId },
    });
    if (!candidate || candidate.tenantId !== tenantId)
      throw new NotFoundException('Candidate not found');

    // Validate interviewers exist
    const interviewers = await this.prisma.user.findMany({
      where: { id: { in: dto.interviewerIds }, tenantId },
    });
    if (interviewers.length !== dto.interviewerIds.length) {
      throw new BadRequestException(
        'One or more interviewers not found in tenant',
      );
    }

    const start = AvailabilityUtil.parseDate(dto.startAt);
    const end = new Date(start.getTime() + dto.durationMins * 60000);

    // Use transaction with serializable isolation to prevent race conditions
    // This ensures conflict checks and interview creation are atomic
    const interview = await this.prisma.$transaction(
      async (tx) => {
        // Check if candidate already has an active scheduled interview
        const existingInterview = await tx.interview.findFirst({
          where: {
            tenantId,
            candidateId: dto.candidateId,
            status: 'SCHEDULED',
            date: { gt: new Date() },
          },
          select: { id: true, date: true },
        });

        if (existingInterview) {
          throw new ConflictException({
            message: 'Candidate already has a scheduled interview',
            candidateId: dto.candidateId,
            reason: 'INTERVIEW_ALREADY_SCHEDULED',
            existingInterviewId: existingInterview.id,
            existingInterviewDate: existingInterview.date,
          });
        }

        // Check for interviewer conflicts within transaction
        const potentialConflicts = await tx.interview.findMany({
          where: {
            tenantId,
            interviewerIds: { hasSome: dto.interviewerIds },
            status: { not: 'CANCELLED' },
            date: { lt: end },
          },
        });

        const conflicts = potentialConflicts.filter((i) => {
          const iEnd = new Date(i.date.getTime() + i.durationMins * 60000);
          return iEnd > start;
        });

        if (conflicts.length > 0) {
          throw new ConflictException({
            message: 'Interview conflict detected',
            conflicts: conflicts.map((c) => ({
              id: c.id,
              date: c.date,
              duration: c.durationMins,
            })),
          });
        }

        // Create the interview
        const newInterview = await tx.interview.create({
          data: {
            tenantId,
            candidateId: dto.candidateId,
            interviewerIds: dto.interviewerIds,
            date: start,
            durationMins: dto.durationMins,
            stage: dto.stage || 'Scheduled',
            status: 'SCHEDULED',
            meetingLink: dto.meetingLink,
            notes: dto.notes,
          },
        });

        // Create audit log within transaction
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'INTERVIEW_CREATE',
            metadata: { id: newInterview.id },
          },
        });

        // Create busy blocks for all interviewers within transaction
        for (const interviewerId of dto.interviewerIds) {
          await tx.busyBlock.create({
            data: {
              tenantId,
              userId: interviewerId,
              startAt: start,
              endAt: end,
              source: 'interview',
              sourceId: newInterview.id,
              reason: 'Interview scheduled',
            },
          });
        }

        return newInterview;
      },
      {
        // Use serializable isolation for strongest consistency guarantee
        isolationLevel: 'Serializable',
        timeout: 10000, // 10 second timeout
      },
    );

    // Queue jobs outside transaction (they're idempotent)
    await this.enqueueReminders(tenantId, interview.id, start);
    await this.syncQueue.add('sync', { interviewId: interview.id, tenantId });

    const eventPayload: InterviewEventPayload = {
      tenantId,
      interviewId: interview.id,
      candidateId: interview.candidateId,
      interviewerIds: interview.interviewerIds,
      interviewDate: start,
      interviewTime: start.toLocaleTimeString(),
      duration: interview.durationMins,
      stage: interview.stage,
      meetingLink: interview.meetingLink || undefined,
      // Pass custom email overrides if provided
      candidateEmailSubject: dto.candidateEmailSubject,
      candidateEmailBody: dto.candidateEmailBody,
      interviewerEmailSubject: dto.interviewerEmailSubject,
      interviewerEmailBody: dto.interviewerEmailBody,
    };
    await this.automationService.onInterviewCreated(eventPayload);

    // Trigger integration sync for interview scheduled (async, non-blocking)
    this.integrationEvents
      .onInterviewScheduled(tenantId, interview.id, userId)
      .catch((e) => console.error('Integration sync failed:', e.message));

    return interview;
  }

  async reschedule(
    tenantId: string,
    userId: string,
    id: string,
    dto: RescheduleInterviewDto,
  ) {
    const interview = await this.get(tenantId, id);

    // Only SCHEDULED or RESCHEDULED interviews can be rescheduled
    if (!['SCHEDULED', 'RESCHEDULED'].includes(interview.status)) {
      throw new BadRequestException(
        `Cannot reschedule interview with status '${interview.status}'. Only SCHEDULED interviews can be rescheduled.`,
      );
    }

    const oldDate = interview.date;
    const start = AvailabilityUtil.parseDate(dto.newStartAt);
    const end = new Date(start.getTime() + dto.newDurationMins * 60000);

    // Delete old busy blocks first (to ensure proper availability check)
    await this.prisma.busyBlock.deleteMany({
      where: {
        tenantId,
        sourceId: id,
      },
    });

    // Detect conflicts (warn-only, never block)
    const conflicts = await this.detectConflicts(
      tenantId,
      interview.interviewerIds,
      start,
      end,
      id,
    );

    const updated = await this.prisma.interview.update({
      where: { id },
      data: {
        date: start,
        durationMins: dto.newDurationMins,
        status: 'SCHEDULED', // Keep as SCHEDULED (not RESCHEDULED) for calendar clarity
      },
    });

    // Create new busy blocks with updated times
    for (const interviewerId of interview.interviewerIds) {
      await this.prisma.busyBlock.create({
        data: {
          tenantId,
          userId: interviewerId,
          startAt: start,
          endAt: end,
          source: 'interview',
          sourceId: id,
          reason: 'Interview scheduled',
        },
      });
    }

    // Audit log with old and new times
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INTERVIEW_RESCHEDULE',
        metadata: {
          id,
          oldDate,
          newDate: start,
          oldDuration: interview.durationMins,
          newDuration: dto.newDurationMins,
          hasConflicts: conflicts.length > 0,
        },
      },
    });

    // Create timeline event for candidate
    await this.prisma.candidateNote.create({
      data: {
        tenantId,
        candidateId: interview.candidateId,
        authorId: userId,
        content: `Interview rescheduled from ${oldDate.toISOString()} to ${start.toISOString()}`,
      },
    });

    await this.enqueueReminders(tenantId, id, start);
    await this.syncQueue.add('sync', { interviewId: id, tenantId });

    const eventPayload: InterviewEventPayload = {
      tenantId,
      interviewId: id,
      candidateId: updated.candidateId,
      interviewerIds: updated.interviewerIds,
      interviewDate: start,
      interviewTime: start.toLocaleTimeString(),
      duration: updated.durationMins,
      stage: updated.stage,
      meetingLink: updated.meetingLink || undefined,
    };
    await this.automationService.onInterviewRescheduled(eventPayload);

    // Trigger integration sync for interview rescheduled (async, non-blocking)
    this.integrationEvents
      .onInterviewRescheduled(tenantId, id, userId)
      .catch((e) =>
        this.logger.warn(
          `Integration sync failed for rescheduled interview ${id}: ${e.message}`,
        ),
      );

    // Return enhanced response with conflict warnings
    return {
      interview: updated,
      conflicts: conflicts.map((c) => ({
        interviewId: c.id,
        date: c.date,
        duration: c.durationMins,
        stage: c.stage,
      })),
      hasConflicts: conflicts.length > 0,
      message:
        conflicts.length > 0
          ? `Interview rescheduled with ${conflicts.length} conflict warning(s)`
          : 'Interview rescheduled successfully',
    };
  }

  async get(tenantId: string, id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: { candidate: { select: { name: true, email: true } } },
    });
    if (!interview || interview.tenantId !== tenantId)
      throw new NotFoundException('Interview not found');

    // Enrich with interviewer details
    const [enriched] = await this.enrichWithInterviewers(tenantId, [interview]);
    return enriched;
  }

  async list(tenantId: string, dto: ListInterviewsDto) {
    const page = Number(dto.page) || 1;
    const perPage = Math.min(Number(dto.perPage) || 20, 100); // Cap at 100
    const where: any = {
      tenantId,
      deletedAt: null,
      candidate: {
        deletedAt: null,
      },
    };

    if (dto.interviewerId) where.interviewerIds = { has: dto.interviewerId };
    if (dto.candidateId) where.candidateId = dto.candidateId;

    // Status filter: exclude inactive statuses by default unless explicitly requested
    if (dto.status) {
      where.status = dto.status;
    } else {
      // By default, only show active interviews (exclude cancelled, completed, no-show)
      where.status = { notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] };
    }
    if (dto.from || dto.to) {
      where.date = {};
      if (dto.from) where.date.gte = new Date(dto.from);
      if (dto.to) where.date.lte = new Date(dto.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.interview.count({ where }),
      this.prisma.interview.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: dto.sort ? this.parseSort(dto.sort) : { date: 'asc' },
        include: { candidate: { select: { name: true, email: true } } },
      }),
    ]);

    // Enrich interviews with interviewer details
    const enrichedData = await this.enrichWithInterviewers(tenantId, data);

    return {
      data: enrichedData,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  /**
   * Detect conflicts (warn-only, never blocks)
   * Returns array of conflicting interviews for the given time slot
   */
  async detectConflicts(
    tenantId: string,
    interviewerIds: string[],
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    // For an overlap to exist:
    // - The existing interview's start must be BEFORE the proposed end
    // - The existing interview's end must be AFTER the proposed start
    // We can only filter the first condition in Prisma; the second requires JS.
    const potentialConflicts = await this.prisma.interview.findMany({
      where: {
        tenantId,
        interviewerIds: { hasSome: interviewerIds },
        status: { not: 'CANCELLED' },
        ...(excludeId && { id: { not: excludeId } }),
        // Interview must start before the proposed slot ends to be a potential overlap
        date: { lt: end },
      },
    });

    // Filter further: interview must also END after the proposed slot START
    const conflicts = potentialConflicts.filter((i) => {
      const iEnd = new Date(i.date.getTime() + i.durationMins * 60000);
      // True overlap: existing interview starts before proposed end AND ends after proposed start
      return iEnd > start;
    });

    return conflicts;
  }

  /**
   * Check conflicts and throw error (for create operations)
   * @deprecated Use detectConflicts() for warn-only behavior
   */
  async checkConflicts(
    tenantId: string,
    interviewerIds: string[],
    start: Date,
    end: Date,
    excludeId?: string,
  ) {
    const conflicts = await this.detectConflicts(
      tenantId,
      interviewerIds,
      start,
      end,
      excludeId,
    );

    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Interview conflict detected',
        conflicts: conflicts.map((c) => ({
          id: c.id,
          date: c.date,
          duration: c.durationMins,
        })),
      });
    }
  }

  /**
   * Check if a candidate already has an active scheduled interview
   * Throws ConflictException if they do (one-interview-per-candidate rule)
   */
  async checkCandidateHasActiveInterview(
    tenantId: string,
    candidateId: string,
    excludeInterviewId?: string,
  ) {
    const existingInterview = await this.prisma.interview.findFirst({
      where: {
        tenantId,
        candidateId,
        status: 'SCHEDULED',
        date: { gt: new Date() }, // Only future interviews
        ...(excludeInterviewId && { id: { not: excludeInterviewId } }),
      },
      select: { id: true, date: true, durationMins: true, stage: true },
    });

    if (existingInterview) {
      throw new ConflictException({
        message: 'Candidate already has a scheduled interview',
        candidateId,
        reason: 'INTERVIEW_ALREADY_SCHEDULED',
        existingInterviewId: existingInterview.id,
        existingInterviewDate: existingInterview.date,
      });
    }
  }

  async cancel(tenantId: string, userId: string, id: string) {
    const interview = await this.get(tenantId, id);

    // Validate status transition
    this.validateStatusTransition(interview.status, 'CANCELLED');

    const updated = await this.prisma.interview.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.prisma.auditLog.create({
      data: { tenantId, userId, action: 'INTERVIEW_CANCEL', metadata: { id } },
    });

    // Clean up busy blocks associated with this interview
    // This prevents stale availability blocks from causing false conflicts
    await this.prisma.busyBlock.deleteMany({
      where: {
        tenantId,
        sourceId: id,
      },
    });

    const eventPayload: InterviewEventPayload = {
      tenantId,
      interviewId: id,
      candidateId: interview.candidateId,
      interviewerIds: interview.interviewerIds,
      interviewDate: interview.date,
      interviewTime: interview.date.toLocaleTimeString(),
      duration: interview.durationMins,
      stage: interview.stage,
    };
    await this.automationService.onInterviewCancelled(eventPayload);

    return updated;
  }

  async complete(tenantId: string, userId: string, id: string) {
    const interview = await this.get(tenantId, id);

    // Validate status transition
    this.validateStatusTransition(interview.status, 'COMPLETED');

    const updated = await this.prisma.interview.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INTERVIEW_COMPLETE',
        metadata: { id },
      },
    });

    const eventPayload: InterviewEventPayload = {
      tenantId,
      interviewId: id,
      candidateId: interview.candidateId,
      interviewerIds: interview.interviewerIds,
      interviewDate: interview.date,
      interviewTime: interview.date.toLocaleTimeString(),
      duration: interview.durationMins,
      stage: interview.stage,
    };
    await this.automationService.onInterviewCompleted(eventPayload);

    // Trigger integration sync for interview completed (async, non-blocking)
    this.integrationEvents
      .onInterviewCompleted(tenantId, id, userId)
      .catch((e) =>
        this.logger.warn(
          `Integration sync failed for completed interview ${id}: ${e.message}`,
        ),
      );

    return updated;
  }

  async delete(tenantId: string, userId: string, id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: { candidate: true }, // Include related data for full snapshot
    });

    if (!interview || interview.tenantId !== tenantId) {
      throw new NotFoundException('Interview not found');
    }

    // Use new field names: module, itemId, itemSnapshot (full object)
    await this.recycleBinService.softDelete(
      tenantId,
      userId,
      'interview',
      id,
      interview,
    );

    await this.prisma.auditLog.create({
      data: { tenantId, userId, action: 'INTERVIEW_DELETE', metadata: { id } },
    });

    return { success: true };
  }

  /**
   * Bulk schedule interviews for multiple candidates
   * Supports two explicit modes:
   * - SEQUENTIAL: One interview per candidate, times staggered by duration
   * - GROUP: One interview for all candidates at the same time
   */
  async bulkSchedule(
    tenantId: string,
    userId: string,
    dto: BulkScheduleDto,
  ): Promise<BulkScheduleResult> {
    const { v4: uuidv4 } = require('uuid');
    const bulkBatchId = uuidv4();

    // Determine mode - prefer new bulkMode, fall back to legacy strategy
    const bulkMode = dto.bulkMode || this.mapLegacyStrategyToMode(dto.strategy);
    if (!bulkMode) {
      throw new BadRequestException(
        'bulkMode is required. Use SEQUENTIAL or GROUP.',
      );
    }

    // Determine start time
    const startTime = dto.startTime || dto.scheduledTime;
    if (!startTime) {
      throw new BadRequestException('startTime is required');
    }
    const baseStartTime = new Date(startTime);

    // Validate candidates exist
    const candidates = await this.prisma.candidate.findMany({
      where: { id: { in: dto.candidateIds }, tenantId, deletedAt: null },
    });
    const validCandidateIds = new Set(candidates.map((c) => c.id));

    // Validate interviewers exist
    const interviewers = await this.prisma.user.findMany({
      where: { id: { in: dto.interviewerIds }, tenantId },
    });
    if (interviewers.length !== dto.interviewerIds.length) {
      throw new BadRequestException('One or more interviewers not found');
    }

    const results: BulkScheduleResult = {
      total: dto.candidateIds.length,
      scheduled: 0,
      skipped: 0,
      bulkBatchId,
      bulkMode,
      created: [],
      skippedCandidates: [],
    };

    if (bulkMode === 'GROUP') {
      // GROUP MODE: Create ONE interview for all candidates at the same time
      await this.handleGroupMode(
        tenantId,
        userId,
        dto,
        candidates,
        validCandidateIds,
        baseStartTime,
        bulkBatchId,
        results,
      );
    } else {
      // SEQUENTIAL MODE: Create separate interviews with staggered times
      await this.handleSequentialMode(
        tenantId,
        userId,
        dto,
        candidates,
        validCandidateIds,
        baseStartTime,
        bulkBatchId,
        results,
      );
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'BULK_SCHEDULE',
        metadata: {
          bulkMode,
          bulkBatchId,
          total: results.total,
          scheduled: results.scheduled,
          skipped: results.skipped,
        },
      },
    });

    return results;
  }

  /**
   * Handle GROUP mode: Create one interview for all candidates at the same time
   */
  private async handleGroupMode(
    tenantId: string,
    userId: string,
    dto: BulkScheduleDto,
    candidates: any[],
    validCandidateIds: Set<string>,
    startTime: Date,
    bulkBatchId: string,
    results: BulkScheduleResult,
  ) {
    const endTime = new Date(startTime.getTime() + dto.durationMins * 60000);
    const stage = dto.stage || 'Interview';

    // Check interviewer availability for the slot
    const conflicts = await this.detectConflicts(
      tenantId,
      dto.interviewerIds,
      startTime,
      endTime,
    );
    if (conflicts.length > 0) {
      // All candidates skipped due to conflict
      for (const candidateId of dto.candidateIds) {
        results.skippedCandidates.push({
          candidateId,
          reason: 'Interviewer unavailable at this time',
        });
        results.skipped++;
      }
      return;
    }

    // Filter valid candidates
    const validCandidates = dto.candidateIds.filter((id) =>
      validCandidateIds.has(id),
    );
    const invalidCandidates = dto.candidateIds.filter(
      (id) => !validCandidateIds.has(id),
    );

    // Add invalid candidates to skipped
    for (const candidateId of invalidCandidates) {
      results.skippedCandidates.push({
        candidateId,
        reason: 'Candidate not found',
      });
      results.skipped++;
    }

    if (validCandidates.length === 0) {
      return;
    }

    // Use first candidate as primary, store all in candidateIds array
    const primaryCandidateId = validCandidates[0];

    try {
      // Create ONE interview with multiple candidateIds
      const interview = await this.prisma.interview.create({
        data: {
          tenantId,
          candidateId: primaryCandidateId, // Primary candidate for relation
          candidateIds: validCandidates, // All candidates in group
          interviewerIds: dto.interviewerIds,
          date: startTime,
          durationMins: dto.durationMins,
          stage,
          status: 'SCHEDULED',
          bulkMode: 'GROUP',
          bulkBatchId,
        },
      });

      // BATCH UPDATE: Update all candidates' stages in one query (fixes N+1)
      await this.prisma.candidate.updateMany({
        where: { id: { in: validCandidates } },
        data: { stage },
      });

      // BATCH CREATE: Create stage history entries for all candidates
      // Build the data array for createMany
      const stageHistoryData = validCandidates.map((candidateId) => {
        const candidate = candidates.find((c) => c.id === candidateId);
        return {
          tenantId,
          candidateId,
          previousStage: candidate?.stage || 'Unknown',
          newStage: stage,
          source: 'SYSTEM' as const,
          triggeredBy: 'BULK_SCHEDULE_GROUP',
          actorId: userId,
          reason: null,
        };
      });

      await this.prisma.candidateStageHistory.createMany({
        data: stageHistoryData,
      });

      // Update results for each candidate
      for (const candidateId of validCandidates) {
        results.created.push({
          candidateId,
          interviewId: interview.id,
          scheduledAt: startTime.toISOString(),
        });
        results.scheduled++;
      }

      // Create busy blocks for interviewers
      for (const interviewerId of dto.interviewerIds) {
        await this.prisma.busyBlock.create({
          data: {
            tenantId,
            userId: interviewerId,
            startAt: startTime,
            endAt: endTime,
            source: 'interview',
            sourceId: interview.id,
            reason: 'Group interview scheduled',
          },
        });
      }

      await this.enqueueReminders(tenantId, interview.id, startTime);

      const eventPayload: InterviewEventPayload = {
        tenantId,
        interviewId: interview.id,
        candidateId: primaryCandidateId,
        interviewerIds: dto.interviewerIds,
        interviewDate: startTime,
        interviewTime: startTime.toLocaleTimeString(),
        duration: dto.durationMins,
        stage,
      };
      await this.automationService.onInterviewCreated(eventPayload);
    } catch (error: any) {
      for (const candidateId of validCandidates) {
        results.skippedCandidates.push({
          candidateId,
          reason: error.message || 'Failed to create group interview',
        });
        results.skipped++;
      }
    }
  }

  /**
   * Handle SEQUENTIAL mode: Create separate interviews with staggered times
   * Uses transactions per interview to prevent race conditions
   */
  private async handleSequentialMode(
    tenantId: string,
    userId: string,
    dto: BulkScheduleDto,
    candidates: any[],
    validCandidateIds: Set<string>,
    baseStartTime: Date,
    bulkBatchId: string,
    results: BulkScheduleResult,
  ) {
    const stage = dto.stage || 'Interview';

    for (let index = 0; index < dto.candidateIds.length; index++) {
      const candidateId = dto.candidateIds[index];

      // Check if candidate is valid
      if (!validCandidateIds.has(candidateId)) {
        results.skippedCandidates.push({
          candidateId,
          reason: 'Candidate not found',
        });
        results.skipped++;
        continue;
      }

      // Calculate slot time: baseStartTime + (index * durationMins)
      const slotStart = new Date(
        baseStartTime.getTime() + index * dto.durationMins * 60000,
      );
      const slotEnd = new Date(slotStart.getTime() + dto.durationMins * 60000);

      try {
        const candidate = candidates.find((c) => c.id === candidateId);
        const previousStage = candidate?.stage || 'Unknown';

        // Use transaction with serializable isolation to prevent race conditions
        const interview = await this.prisma.$transaction(
          async (tx) => {
            // Check for conflicts INSIDE the transaction
            const potentialConflicts = await tx.interview.findMany({
              where: {
                tenantId,
                interviewerIds: { hasSome: dto.interviewerIds },
                status: { not: 'CANCELLED' },
                date: { lt: slotEnd },
              },
            });

            const conflicts = potentialConflicts.filter((i) => {
              const iEnd = new Date(i.date.getTime() + i.durationMins * 60000);
              return iEnd > slotStart;
            });

            if (conflicts.length > 0) {
              throw new Error(
                `Interviewer unavailable at ${slotStart.toISOString()}`,
              );
            }

            // Create interview
            const newInterview = await tx.interview.create({
              data: {
                tenantId,
                candidateId,
                interviewerIds: dto.interviewerIds,
                date: slotStart,
                durationMins: dto.durationMins,
                stage,
                status: 'SCHEDULED',
                bulkMode: 'SEQUENTIAL',
                bulkBatchId,
              },
            });

            // Update candidate stage
            await tx.candidate.update({
              where: { id: candidateId },
              data: { stage },
            });

            await tx.candidateStageHistory.create({
              data: {
                tenantId,
                candidateId,
                previousStage,
                newStage: stage,
                source: 'SYSTEM',
                triggeredBy: 'BULK_SCHEDULE_SEQUENTIAL',
                actorId: userId,
                reason: null,
              },
            });

            // Create busy blocks for interviewers
            for (const interviewerId of dto.interviewerIds) {
              await tx.busyBlock.create({
                data: {
                  tenantId,
                  userId: interviewerId,
                  startAt: slotStart,
                  endAt: slotEnd,
                  source: 'interview',
                  sourceId: newInterview.id,
                  reason: 'Sequential bulk scheduled interview',
                },
              });
            }

            return newInterview;
          },
          {
            isolationLevel: 'Serializable',
            timeout: 10000,
          },
        );

        // Queue jobs outside transaction (idempotent)
        await this.enqueueReminders(tenantId, interview.id, slotStart);

        const eventPayload: InterviewEventPayload = {
          tenantId,
          interviewId: interview.id,
          candidateId,
          interviewerIds: dto.interviewerIds,
          interviewDate: slotStart,
          interviewTime: slotStart.toLocaleTimeString(),
          duration: dto.durationMins,
          stage,
        };
        await this.automationService.onInterviewCreated(eventPayload);

        results.created.push({
          candidateId,
          interviewId: interview.id,
          scheduledAt: slotStart.toISOString(),
        });
        results.scheduled++;
      } catch (error: any) {
        results.skippedCandidates.push({
          candidateId,
          reason: error.message || 'Failed to schedule',
        });
        results.skipped++;
      }
    }
  }

  /**
   * Map legacy strategy to new BulkMode
   */
  private mapLegacyStrategyToMode(
    strategy?: BulkScheduleStrategy,
  ): BulkMode | null {
    if (!strategy) return null;
    switch (strategy) {
      case BulkScheduleStrategy.SAME_TIME:
        return BulkMode.GROUP;
      case BulkScheduleStrategy.PER_CANDIDATE:
      case BulkScheduleStrategy.AUTO:
        return BulkMode.SEQUENTIAL;
      default:
        return null;
    }
  }

  private async enqueueReminders(
    tenantId: string,
    interviewId: string,
    start: Date,
  ) {
    const remind24h = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    if (remind24h > new Date()) {
      await this.reminderQueue.add(
        'reminder',
        { interviewId, tenantId, type: '24h' },
        { delay: remind24h.getTime() - Date.now() },
      );
    }

    const remind1h = new Date(start.getTime() - 60 * 60 * 1000);
    if (remind1h > new Date()) {
      await this.reminderQueue.add(
        'reminder',
        { interviewId, tenantId, type: '1h' },
        { delay: remind1h.getTime() - Date.now() },
      );
    }
  }

  // =====================================================
  // INTERVIEW NOTES
  // =====================================================

  /**
   * Sanitize HTML to prevent XSS
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * List all notes for an interview with author details (paginated)
   */
  async listNotes(
    tenantId: string,
    interviewId: string,
    page = 1,
    perPage = 20,
  ) {
    await this.get(tenantId, interviewId); // Validate interview exists

    const skip = (page - 1) * perPage;
    const [notes, total] = await Promise.all([
      this.prisma.interviewNote.findMany({
        where: { tenantId, interviewId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.interviewNote.count({ where: { tenantId, interviewId } }),
    ]);

    // Batch fetch authors to avoid N+1
    const authorIds = [
      ...new Set(notes.map((n: { authorId: string }) => n.authorId)),
    ];
    const authors =
      authorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    const enrichedNotes = notes.map((note: { authorId: string }) => ({
      ...note,
      author: authorMap.get(note.authorId) || {
        id: note.authorId,
        name: 'Unknown',
        email: '',
      },
    }));

    return {
      data: enrichedNotes,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  /**
   * Add a note to an interview
   */
  async addNote(
    tenantId: string,
    interviewId: string,
    userId: string,
    content: string,
  ) {
    await this.get(tenantId, interviewId); // Validate interview exists

    const sanitizedContent = this.sanitizeContent(content);
    const note = await this.prisma.interviewNote.create({
      data: {
        tenantId,
        interviewId,
        authorId: userId,
        content: sanitizedContent,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INTERVIEW_NOTE_ADD',
        metadata: { interviewId, noteId: note.id },
      },
    });

    // Fetch author details
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    return {
      ...note,
      author: author || { id: userId, name: 'Unknown', email: '' },
    };
  }

  /**
   * Update an interview note (author or ADMIN can update)
   */
  async updateNote(
    tenantId: string,
    noteId: string,
    userId: string,
    userRole: string,
    content: string,
  ) {
    const note = await this.prisma.interviewNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.tenantId !== tenantId) {
      throw new NotFoundException('Note not found');
    }

    // Allow author or ADMIN to update
    if (note.authorId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException(
        'Only the author or an admin can update this note',
      );
    }

    const sanitizedContent = this.sanitizeContent(content);
    const updated = await this.prisma.interviewNote.update({
      where: { id: noteId },
      data: { content: sanitizedContent },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INTERVIEW_NOTE_UPDATE',
        metadata: { noteId },
      },
    });

    return updated;
  }

  /**
   * Delete an interview note (author or ADMIN can delete)
   */
  async deleteNote(
    tenantId: string,
    noteId: string,
    userId: string,
    userRole: string,
  ) {
    const note = await this.prisma.interviewNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.tenantId !== tenantId) {
      throw new NotFoundException('Note not found');
    }

    // Allow author or ADMIN to delete
    if (note.authorId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException(
        'Only the author or an admin can delete this note',
      );
    }

    await this.prisma.interviewNote.delete({ where: { id: noteId } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'INTERVIEW_NOTE_DELETE',
        metadata: { noteId, interviewId: note.interviewId },
      },
    });

    return { success: true };
  }

  /**
   * Get interview timeline (notes, feedback, audit logs)
   */
  async getTimeline(tenantId: string, interviewId: string) {
    await this.get(tenantId, interviewId); // Validate interview exists

    // Fetch notes, feedback, and audit logs in parallel
    const [notes, feedbacks, auditLogs] = await Promise.all([
      this.prisma.interviewNote.findMany({
        where: { tenantId, interviewId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feedback.findMany({
        where: { tenantId, interviewId },
        orderBy: { createdAt: 'desc' },
      }),
      // Query audit logs matching multiple possible metadata shapes
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          action: { startsWith: 'INTERVIEW_' },
          OR: [
            { metadata: { path: ['interviewId'], equals: interviewId } },
            { metadata: { path: ['id'], equals: interviewId } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Collect all user IDs for batch fetch
    const userIds = new Set<string>();
    notes.forEach((n: { authorId: string }) => userIds.add(n.authorId));
    feedbacks.forEach((f) => userIds.add(f.interviewerId));
    auditLogs.forEach((a) => {
      if (a.userId) userIds.add(a.userId);
    });

    const users =
      userIds.size > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: [...userIds] } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Build timeline items
    type TimelineItem = {
      type: 'note' | 'feedback' | 'activity';
      id: string;
      createdAt: Date;
      author?: { id: string; name: string | null; email: string };
      content?: string;
      rating?: number;
      action?: string;
    };

    const timeline: TimelineItem[] = [];

    notes.forEach(
      (note: {
        id: string;
        authorId: string;
        createdAt: Date;
        content: string;
      }) => {
        timeline.push({
          type: 'note',
          id: note.id,
          createdAt: note.createdAt,
          author: userMap.get(note.authorId) || {
            id: note.authorId,
            name: 'Unknown',
            email: '',
          },
          content: note.content,
        });
      },
    );

    feedbacks.forEach((fb) => {
      timeline.push({
        type: 'feedback',
        id: fb.id,
        createdAt: fb.createdAt,
        author: userMap.get(fb.interviewerId) || {
          id: fb.interviewerId,
          name: 'Unknown',
          email: '',
        },
        rating: fb.rating,
        content: fb.comments || undefined,
      });
    });

    auditLogs.forEach((log) => {
      timeline.push({
        type: 'activity',
        id: log.id,
        createdAt: log.createdAt,
        author: log.userId
          ? userMap.get(log.userId) || {
              id: log.userId,
              name: 'Unknown',
              email: '',
            }
          : undefined,
        action: log.action,
      });
    });

    // Sort by createdAt descending
    timeline.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { data: timeline };
  }

  private parseSort(sort: string) {
    const [field, dir] = sort.split(':');
    return { [field]: dir };
  }

  /**
   * Enrich interviews with interviewer details by batch-fetching users.
   * Also flattens candidate data to candidateName/candidateEmail for frontend compatibility.
   * Prevents N+1 queries by collecting all unique interviewerIds and fetching in one query.
   */
  private async enrichWithInterviewers<
    T extends {
      interviewerIds: string[];
      candidate?: { name: string | null; email: string | null } | null;
    },
  >(
    tenantId: string,
    interviews: T[],
  ): Promise<
    (T & {
      interviewers: Array<{
        id: string;
        name: string | null;
        email: string;
        role: string;
      }>;
      candidateName: string;
      candidateEmail: string;
    })[]
  > {
    if (interviews.length === 0) {
      return [];
    }

    // Collect all unique interviewer IDs across all interviews
    const allInterviewerIds = new Set<string>();
    for (const interview of interviews) {
      for (const id of interview.interviewerIds) {
        allInterviewerIds.add(id);
      }
    }

    // Batch-fetch all users in one query with tenant isolation
    let userMap = new Map<
      string,
      { id: string; name: string | null; email: string; role: string }
    >();
    if (allInterviewerIds.size > 0) {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: Array.from(allInterviewerIds) },
          tenantId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
      userMap = new Map(users.map((u) => [u.id, u]));
    }

    // Map users back to each interview and flatten candidate data
    return interviews.map((interview) => ({
      ...interview,
      candidateName: interview.candidate?.name || 'Unknown',
      candidateEmail: interview.candidate?.email || '',
      interviewers: interview.interviewerIds
        .map((id) => userMap.get(id))
        .filter((u): u is NonNullable<typeof u> => u !== undefined),
    }));
  }
}
