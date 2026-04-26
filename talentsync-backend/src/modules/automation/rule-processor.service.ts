import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma.service';
import {
  AutomationActionType,
  AutomationTrigger,
  Channel,
} from '@prisma/client';
import { MessageService } from '../communication/services/message.service';
import { CandidatesService } from '../candidates/candidates.service';

@Injectable()
export class RuleProcessor {
  private readonly logger = new Logger(RuleProcessor.name);

  constructor(
    private prisma: PrismaService,
    private messageService: MessageService,
    private candidatesService: CandidatesService,
  ) {}

  @OnEvent('feedback.created')
  async handleFeedbackSubmitted(payload: {
    feedbackId: string;
    candidateId: string;
    tenantId: string;
    overallScore?: number;
  }) {
    await this.processRules(
      AutomationTrigger.FEEDBACK_SUBMITTED,
      payload.tenantId,
      payload,
    );
  }

  @OnEvent('candidate.stage.updated')
  async handleStageChanged(payload: {
    candidateId: string;
    tenantId: string;
    stage: string;
    previousStage: string;
  }) {
    await this.processRules(
      AutomationTrigger.CANDIDATE_STAGE_CHANGED,
      payload.tenantId,
      payload,
    );
  }

  @OnEvent('interview.no_show')
  async handleInterviewNoShow(payload: {
    interviewId: string;
    candidateId: string;
    tenantId: string;
  }) {
    await this.processRules(
      AutomationTrigger.INTERVIEW_NO_SHOW,
      payload.tenantId,
      payload,
    );
  }

  private async processRules(
    trigger: AutomationTrigger,
    tenantId: string,
    context: any,
  ) {
    const rules = await this.prisma.automationRule.findMany({
      where: {
        tenantId,
        trigger,
        isActive: true,
      },
      include: { template: true },
    });

    this.logger.log(
      `Found ${rules.length} rules for trigger ${trigger} in tenant ${tenantId}`,
    );

    for (const rule of rules) {
      try {
        if (this.evaluateConditions(rule.conditions, context)) {
          await this.executeAction(rule, context);
        }
      } catch (error) {
        this.logger.error(
          `Error executing rule ${rule.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private evaluateConditions(conditions: any, context: any): boolean {
    if (!conditions) return true;
    // Simple condition logic: if key exists in context, match value
    // Example condition: { "stage": "Offer" } checks context.stage === "Offer"
    // Example condition: { "score": { "lt": 3 } } checks context.overallScore < 3

    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = context[key];

      if (typeof value === 'object' && value !== null) {
        // Handle operators like lt, gt, eq
        const op = Object.keys(value)[0];
        const variable = key; // The key from the condition object is the variable name in context
        const contextVariableValue = context[variable];
        if (contextVariableValue === undefined) return false;

        // Cast value to any to allow dynamic indexing
        const target = (value as any)[op];
        if (target === undefined) return false;

        if (op === 'lt' && !(contextVariableValue < target)) return false;
        if (op === 'gt' && !(contextVariableValue > target)) return false;
        if (op === 'eq' && !(contextVariableValue === target)) return false;
        if (op === 'neq' && !(contextVariableValue !== target)) return false;
      } else {
        // Direct equality
        if (contextValue !== value) return false;
      }
    }

    return true;
  }

  private async executeAction(rule: any, context: any) {
    this.logger.log(`Executing rule ${rule.name} (Action: ${rule.actionType})`);

    switch (rule.actionType) {
      case AutomationActionType.SEND_COMMUNICATION:
        if (rule.channel && rule.templateId) {
          // Determine recipient based on context (default to candidate)
          // This is a simplification; robust logic depends on recipient mapping
          const candidateId = context.candidateId;
          if (candidateId) {
            const candidate = await this.prisma.candidate.findUnique({
              where: { id: candidateId },
            });
            if (candidate?.email) {
              await this.messageService.send(rule.tenantId, {
                channel: rule.channel as Channel,
                templateId: rule.templateId,
                recipientType: 'CANDIDATE',
                recipientId: candidateId,
                context: context, // context variables for template
              });
            }
          }
        }
        break;

      case AutomationActionType.UPDATE_STAGE:
        const targetStage = rule.actionData?.stage;
        if (targetStage && context.candidateId) {
          await this.candidatesService.update(
            rule.tenantId,
            undefined,
            context.candidateId,
            { stage: targetStage },
          );
        }
        break;
    }
  }
}
