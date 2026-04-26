/**
 * Interview Automation Service
 * Publishes interview events to the automation queue
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  COMMUNICATION_QUEUES,
  AutomationJobData,
} from '../../communication/queues';
import {
  InterviewEventPayload,
  INTERVIEW_EVENTS,
} from '../events/interview-events';
import { AutomationTrigger } from '@prisma/client';

@Injectable()
export class InterviewAutomationService {
  private readonly logger = new Logger(InterviewAutomationService.name);

  constructor(
    @InjectQueue(COMMUNICATION_QUEUES.AUTOMATION)
    private automationQueue: Queue,
  ) {}

  /**
   * Trigger automation for interview created
   */
  async onInterviewCreated(payload: InterviewEventPayload) {
    await this.publishTrigger('INTERVIEW_SCHEDULED', payload);
    this.logger.log(
      `Published INTERVIEW_SCHEDULED for interview ${payload.interviewId}`,
    );

    // Also schedule reminder triggers
    await this.scheduleReminderTriggers(payload);
  }

  /**
   * Trigger automation for interview rescheduled
   */
  async onInterviewRescheduled(payload: InterviewEventPayload) {
    await this.publishTrigger('INTERVIEW_RESCHEDULED', payload);
    this.logger.log(
      `Published INTERVIEW_RESCHEDULED for interview ${payload.interviewId}`,
    );

    // Reschedule reminder triggers
    await this.scheduleReminderTriggers(payload);
  }

  /**
   * Trigger automation for interview cancelled
   */
  async onInterviewCancelled(payload: InterviewEventPayload) {
    await this.publishTrigger('INTERVIEW_CANCELLED', payload);
    this.logger.log(
      `Published INTERVIEW_CANCELLED for interview ${payload.interviewId}`,
    );
  }

  /**
   * Trigger automation for interview completed
   */
  async onInterviewCompleted(payload: InterviewEventPayload) {
    await this.publishTrigger('INTERVIEW_COMPLETED', payload);
    this.logger.log(
      `Published INTERVIEW_COMPLETED for interview ${payload.interviewId}`,
    );
  }

  /**
   * Schedule reminder triggers based on interview time
   */
  private async scheduleReminderTriggers(payload: InterviewEventPayload) {
    const interviewTime = new Date(payload.interviewDate).getTime();
    const now = Date.now();

    // 24 hour reminder
    const remind24h = interviewTime - 24 * 60 * 60 * 1000;
    if (remind24h > now) {
      await this.automationQueue.add(
        'process-trigger',
        {
          tenantId: payload.tenantId,
          trigger: 'INTERVIEW_REMINDER_24H',
          entityId: payload.interviewId,
          entityType: 'INTERVIEW',
          data: {
            ...payload,
            reminderType: '24h',
          },
        },
        {
          delay: remind24h - now,
          jobId: `reminder-24h-${payload.interviewId}`,
        },
      );
      this.logger.log(
        `Scheduled 24h reminder for interview ${payload.interviewId}`,
      );
    }

    // 1 hour reminder
    const remind1h = interviewTime - 60 * 60 * 1000;
    if (remind1h > now) {
      await this.automationQueue.add(
        'process-trigger',
        {
          tenantId: payload.tenantId,
          trigger: 'INTERVIEW_REMINDER_1H',
          entityId: payload.interviewId,
          entityType: 'INTERVIEW',
          data: {
            ...payload,
            reminderType: '1h',
          },
        },
        {
          delay: remind1h - now,
          jobId: `reminder-1h-${payload.interviewId}`,
        },
      );
      this.logger.log(
        `Scheduled 1h reminder for interview ${payload.interviewId}`,
      );
    }
  }

  /**
   * Publish a trigger event to the automation queue
   */
  private async publishTrigger(
    trigger: keyof typeof AutomationTrigger,
    payload: InterviewEventPayload,
  ) {
    const jobData: AutomationJobData = {
      tenantId: payload.tenantId,
      trigger,
      entityId: payload.interviewId,
      entityType: 'INTERVIEW',
      data: {
        interviewId: payload.interviewId,
        candidateId: payload.candidateId,
        interviewerIds: payload.interviewerIds,
        interviewDate: payload.interviewDate,
        interviewTime: payload.interviewTime,
        duration: payload.duration,
        stage: payload.stage,
        meetingLink: payload.meetingLink,
        candidateEmailSubject: payload.candidateEmailSubject,
        candidateEmailBody: payload.candidateEmailBody,
        interviewerEmailSubject: payload.interviewerEmailSubject,
        interviewerEmailBody: payload.interviewerEmailBody,
      },
    };

    await this.automationQueue.add('process-trigger', jobData);
  }

  /**
   * Manually trigger automation for testing
   */
  async runAutomationForInterviewTrigger(
    trigger: keyof typeof AutomationTrigger,
    interview: any,
  ) {
    const payload: InterviewEventPayload = {
      tenantId: interview.tenantId,
      interviewId: interview.id,
      candidateId: interview.candidateId,
      interviewerIds: interview.interviewerIds,
      interviewDate: interview.date,
      interviewTime: new Date(interview.date).toLocaleTimeString(),
      duration: interview.durationMins,
      stage: interview.stage,
      meetingLink: interview.meetingLink,
    };

    await this.publishTrigger(trigger, payload);
  }
}
