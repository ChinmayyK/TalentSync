import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../common/prisma.service';
import {
  IntegrationEventType,
  SyncEntityType,
} from '../types/standard-entities';

/**
 * Event payload for integration sync jobs
 */
export interface IntegrationEventPayload {
  tenantId: string;
  eventType: IntegrationEventType;
  entityType: SyncEntityType;
  entityId: string;
  data?: Record<string, unknown>;
  triggeredBy?: string;
}

/**
 * Service that emits integration events when core entities change
 * These events are queued for processing by active integrations
 */
@Injectable()
export class IntegrationEventsService {
  private readonly logger = new Logger(IntegrationEventsService.name);

  constructor(
    @InjectQueue('integration-sync') private syncQueue: Queue,
    private prisma: PrismaService,
  ) {}

  /**
   * Emit event when a candidate is created
   */
  async onCandidateCreated(
    tenantId: string,
    candidateId: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.CANDIDATE_CREATED,
      entityType: SyncEntityType.CANDIDATE,
      entityId: candidateId,
      triggeredBy,
    });
  }

  /**
   * Emit event when a candidate is updated
   */
  async onCandidateUpdated(
    tenantId: string,
    candidateId: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.CANDIDATE_UPDATED,
      entityType: SyncEntityType.CANDIDATE,
      entityId: candidateId,
      triggeredBy,
    });
  }

  /**
   * Emit event when a candidate's stage changes
   */
  async onCandidateStageChanged(
    tenantId: string,
    candidateId: string,
    newStage: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.CANDIDATE_STAGE_CHANGED,
      entityType: SyncEntityType.CANDIDATE,
      entityId: candidateId,
      data: { newStage },
      triggeredBy,
    });
  }

  /**
   * Emit event when an interview is scheduled
   */
  async onInterviewScheduled(
    tenantId: string,
    interviewId: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.INTERVIEW_SCHEDULED,
      entityType: SyncEntityType.INTERVIEW,
      entityId: interviewId,
      triggeredBy,
    });
  }

  /**
   * Emit event when an interview is rescheduled
   */
  async onInterviewRescheduled(
    tenantId: string,
    interviewId: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.INTERVIEW_RESCHEDULED,
      entityType: SyncEntityType.INTERVIEW,
      entityId: interviewId,
      triggeredBy,
    });
  }

  /**
   * Emit event when an interview is cancelled
   */
  async onInterviewCancelled(
    tenantId: string,
    interviewId: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.INTERVIEW_CANCELLED,
      entityType: SyncEntityType.INTERVIEW,
      entityId: interviewId,
      triggeredBy,
    });
  }

  /**
   * Emit event when an interview is completed
   */
  async onInterviewCompleted(
    tenantId: string,
    interviewId: string,
    triggeredBy?: string,
  ) {
    await this.emitEvent({
      tenantId,
      eventType: IntegrationEventType.INTERVIEW_COMPLETED,
      entityType: SyncEntityType.INTERVIEW,
      entityId: interviewId,
      triggeredBy,
    });
  }

  /**
   * Core method to emit integration events
   * Finds all active integrations that support the event and queues sync jobs
   */
  private async emitEvent(payload: IntegrationEventPayload) {
    try {
      // Find all active integrations for this tenant
      const integrations = await this.prisma.integration.findMany({
        where: {
          tenantId: payload.tenantId,
          status: 'connected',
        },
      });

      if (integrations.length === 0) {
        this.logger.debug(
          `No active integrations for tenant ${payload.tenantId}`,
        );
        return;
      }

      // Queue sync job for each active integration
      for (const integration of integrations) {
        try {
          // Determine if this integration supports this event type
          const supportsEvent = this.checkEventSupport(
            integration.provider,
            payload.eventType,
          );

          if (!supportsEvent) {
            this.logger.debug(
              `Provider ${integration.provider} does not support event ${payload.eventType}`,
            );
            continue;
          }

          await this.syncQueue.add(
            'integration-event',
            {
              tenantId: payload.tenantId,
              provider: integration.provider,
              eventType: payload.eventType,
              entityType: payload.entityType,
              entityId: payload.entityId,
              data: payload.data,
              triggeredBy: payload.triggeredBy,
              direction: 'OUTBOUND',
            },
            {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: 100,
              removeOnFail: 1000,
            },
          );

          this.logger.debug(
            `Queued ${payload.eventType} event for ${integration.provider}`,
          );
        } catch (error: unknown) {
          // Log error but don't fail - integration failures should not block core operations
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `Failed to queue event for ${integration.provider}: ${message}`,
          );
        }
      }
    } catch (error: unknown) {
      // Integration event failures should never block core operations
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit integration event: ${message}`);
    }
  }

  /**
   * Check if a provider supports a specific event type
   * This is a simple mapping - providers declare their capabilities
   */
  private checkEventSupport(
    provider: string,
    eventType: IntegrationEventType,
  ): boolean {
    // CRM providers support candidate events
    const crmProviders = ['zoho', 'hubspot', 'salesforce'];
    const candidateEvents = [
      IntegrationEventType.CANDIDATE_CREATED,
      IntegrationEventType.CANDIDATE_UPDATED,
      IntegrationEventType.CANDIDATE_STAGE_CHANGED,
    ];

    if (
      crmProviders.includes(provider) &&
      candidateEvents.includes(eventType)
    ) {
      return true;
    }

    // HRIS providers support stage change events (for employee handoff)
    const hrisProviders = ['bamboohr', 'workday'];
    if (
      hrisProviders.includes(provider) &&
      eventType === IntegrationEventType.CANDIDATE_STAGE_CHANGED
    ) {
      return true;
    }

    // Calendar providers support interview events
    const calendarProviders = ['google_calendar', 'outlook_calendar'];
    const interviewEvents = [
      IntegrationEventType.INTERVIEW_SCHEDULED,
      IntegrationEventType.INTERVIEW_RESCHEDULED,
      IntegrationEventType.INTERVIEW_CANCELLED,
      IntegrationEventType.INTERVIEW_COMPLETED,
    ];

    if (
      calendarProviders.includes(provider) &&
      interviewEvents.includes(eventType)
    ) {
      return true;
    }

    return false;
  }
}

