import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Stage transition source - distinguishes system vs user-initiated changes
 */
export type TransitionSource = 'SYSTEM' | 'USER';

/**
 * Common triggers for stage transitions
 */
export type TransitionTrigger =
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'INTERVIEW_CANCELLED'
  | 'BULK_SCHEDULE'
  | 'MANUAL'
  | 'REJECTION'
  | 'OFFER_ACCEPTED'
  | 'IMPORT';

/**
 * Request payload for stage transitions
 */
export interface StageTransitionRequest {
  candidateId: string;
  newStage: string;
  source: TransitionSource;
  triggeredBy: TransitionTrigger | string;
  actorId?: string; // User ID for manual changes (null for system)
  reason?: string; // Required for manual overrides and rejections
  allowOverride?: boolean; // Admin can bypass ordering rules
}

/**
 * Result of a stage transition
 */
export interface StageTransitionResult {
  success: boolean;
  candidateId: string;
  previousStage: string;
  newStage: string;
  transitionType: 'FORWARD' | 'BACKWARD' | 'TERMINAL' | 'OVERRIDE' | 'SAME';
  warnings?: string[];
}

@Injectable()
export class StageTransitionService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main entry point for all stage transitions.
   * ALL stage changes MUST go through this method.
   */
  async transitionStage(
    tenantId: string,
    request: StageTransitionRequest,
  ): Promise<StageTransitionResult> {
    // 1. Get the candidate
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: request.candidateId, tenantId, deletedAt: null },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const previousStage = candidate.stage;

    // 2. If same stage, no-op
    if (previousStage === request.newStage) {
      return {
        success: true,
        candidateId: request.candidateId,
        previousStage,
        newStage: request.newStage,
        transitionType: 'SAME',
      };
    }

    // 3. Check if candidate is already in terminal stage
    const isCurrentlyTerminal = await this.isTerminalStage(
      tenantId,
      previousStage,
    );
    if (isCurrentlyTerminal) {
      throw new ForbiddenException(
        `Cannot change stage: Candidate is in terminal stage "${previousStage}". ` +
          `Terminal stages (e.g., HIRED, REJECTED) are final.`,
      );
    }

    // 4. Validate target stage exists
    const targetStage = await this.prisma.hiringStage.findFirst({
      where: { tenantId, key: request.newStage, isActive: true },
    });
    if (!targetStage) {
      throw new BadRequestException(
        `Invalid stage: "${request.newStage}" does not exist or is inactive`,
      );
    }

    // 5. Validate transition ordering (unless override)
    const warnings: string[] = [];
    let transitionType: StageTransitionResult['transitionType'] = 'FORWARD';

    const currentStageOrder = await this.getStageOrder(tenantId, previousStage);
    const targetStageOrder = targetStage.order;

    if (targetStage.isTerminal) {
      transitionType = 'TERMINAL';
    } else if (targetStageOrder < currentStageOrder) {
      // Backward transition
      if (!request.allowOverride && request.source === 'USER') {
        // Check if user has permission for backward transitions
        // For now, we allow backward with a warning
        warnings.push(
          `Backward transition from "${previousStage}" to "${request.newStage}"`,
        );
      }
      transitionType = request.allowOverride ? 'OVERRIDE' : 'BACKWARD';
    }

    // 6. Require reason for override transitions
    if (transitionType === 'OVERRIDE' && !request.reason) {
      throw new BadRequestException(
        'Reason is required for override transitions',
      );
    }

    // 7. Perform the transition
    await this.prisma.candidate.update({
      where: { id: request.candidateId },
      data: { stage: request.newStage },
    });

    // 8. Record in stage history
    await this.prisma.candidateStageHistory.create({
      data: {
        tenantId,
        candidateId: request.candidateId,
        previousStage,
        newStage: request.newStage,
        source: request.source,
        triggeredBy: request.triggeredBy,
        actorId: request.actorId || null,
        reason: request.reason || null,
      },
    });

    // 9. Create audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: request.actorId || null,
        action: 'CANDIDATE_STAGE_TRANSITION',
        metadata: {
          candidateId: request.candidateId,
          previousStage,
          newStage: request.newStage,
          source: request.source,
          triggeredBy: request.triggeredBy,
          transitionType,
          reason: request.reason,
        },
      },
    });

    // 10. Emit event for automation triggers
    this.eventEmitter.emit('candidate.stage.changed', {
      tenantId,
      candidateId: request.candidateId,
      previousStage,
      newStage: request.newStage,
      source: request.source,
      triggeredBy: request.triggeredBy,
    });

    return {
      success: true,
      candidateId: request.candidateId,
      previousStage,
      newStage: request.newStage,
      transitionType,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Reject a candidate - moves to terminal REJECTED stage
   */
  async rejectCandidate(
    tenantId: string,
    candidateId: string,
    reason: string,
    actorId: string,
  ): Promise<StageTransitionResult> {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException(
        'Rejection reason is required (minimum 3 characters)',
      );
    }

    return this.transitionStage(tenantId, {
      candidateId,
      newStage: 'REJECTED',
      source: 'USER',
      triggeredBy: 'REJECTION',
      actorId,
      reason,
    });
  }

  /**
   * Check if a stage is terminal (HIRED, REJECTED, etc.)
   */
  async isTerminalStage(tenantId: string, stageKey: string): Promise<boolean> {
    const stage = await this.prisma.hiringStage.findFirst({
      where: { tenantId, key: stageKey },
      select: { isTerminal: true },
    });
    return stage?.isTerminal || false;
  }

  /**
   * Get the order of a stage (for comparison)
   */
  async getStageOrder(tenantId: string, stageKey: string): Promise<number> {
    const stage = await this.prisma.hiringStage.findFirst({
      where: { tenantId, key: stageKey },
      select: { order: true },
    });
    return stage?.order || 0;
  }

  /**
   * Validate that a transition is allowed
   */
  async validateTransition(
    tenantId: string,
    fromStage: string,
    toStage: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if fromStage is terminal
    const isFromTerminal = await this.isTerminalStage(tenantId, fromStage);
    if (isFromTerminal) {
      return {
        valid: false,
        reason: `Cannot transition from terminal stage "${fromStage}"`,
      };
    }

    // Check if toStage exists and is active
    const targetStage = await this.prisma.hiringStage.findFirst({
      where: { tenantId, key: toStage, isActive: true },
    });
    if (!targetStage) {
      return {
        valid: false,
        reason: `Stage "${toStage}" does not exist or is inactive`,
      };
    }

    return { valid: true };
  }

  /**
   * Get the full stage transition history for a candidate
   */
  async getStageHistory(tenantId: string, candidateId: string) {
    // Verify candidate exists
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, tenantId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const history = await this.prisma.candidateStageHistory.findMany({
      where: { tenantId, candidateId },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with actor details
    const actorIds = [
      ...new Set(history.filter((h) => h.actorId).map((h) => h.actorId!)),
    ];
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    return history.map((h) => ({
      ...h,
      actor: h.actorId
        ? actorMap.get(h.actorId) || {
            id: h.actorId,
            name: 'Unknown',
            email: '',
          }
        : null,
    }));
  }
}

