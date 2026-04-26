import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CreateSchedulingRuleDto, UpdateSchedulingRuleDto } from '../dto';

@Injectable()
export class SchedulingRulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all scheduling rules for a tenant
   */
  async getRules(tenantId: string) {
    return this.prisma.schedulingRule.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Get a specific rule by ID
   */
  async getRule(tenantId: string, ruleId: string) {
    const rule = await this.prisma.schedulingRule.findFirst({
      where: { id: ruleId, tenantId },
    });

    if (!rule) {
      throw new NotFoundException('Scheduling rule not found');
    }

    return rule;
  }

  /**
   * Get the default scheduling rule for a tenant
   */
  async getDefaultRule(tenantId: string) {
    let rule = await this.prisma.schedulingRule.findFirst({
      where: { tenantId, isDefault: true },
    });

    // If no default exists, create one
    if (!rule) {
      rule = await this.createDefaultRule(tenantId);
    }

    return rule;
  }

  /**
   * Create a scheduling rule
   */
  async createRule(
    tenantId: string,
    userId: string,
    dto: CreateSchedulingRuleDto,
  ) {
    // If this is marked as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.schedulingRule.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.schedulingRule.create({
      data: {
        tenantId,
        name: dto.name,
        minNoticeMins: dto.minNoticeMins ?? 60,
        bufferBeforeMins: dto.bufferBeforeMins ?? 10,
        bufferAfterMins: dto.bufferAfterMins ?? 10,
        defaultSlotMins: dto.defaultSlotMins ?? 60,
        allowOverlapping: dto.allowOverlapping ?? false,
        isDefault: dto.isDefault ?? false,
        createdBy: userId,
      },
    });
  }

  /**
   * Update a scheduling rule
   */
  async updateRule(
    tenantId: string,
    ruleId: string,
    dto: UpdateSchedulingRuleDto,
  ) {
    const rule = await this.getRule(tenantId, ruleId);

    // If this is marked as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.schedulingRule.updateMany({
        where: { tenantId, isDefault: true, id: { not: ruleId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.schedulingRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name ?? rule.name,
        minNoticeMins: dto.minNoticeMins ?? rule.minNoticeMins,
        bufferBeforeMins: dto.bufferBeforeMins ?? rule.bufferBeforeMins,
        bufferAfterMins: dto.bufferAfterMins ?? rule.bufferAfterMins,
        defaultSlotMins: dto.defaultSlotMins ?? rule.defaultSlotMins,
        allowOverlapping: dto.allowOverlapping ?? rule.allowOverlapping,
        isDefault: dto.isDefault ?? rule.isDefault,
      },
    });
  }

  /**
   * Delete a scheduling rule
   */
  async deleteRule(tenantId: string, ruleId: string) {
    const rule = await this.getRule(tenantId, ruleId);

    if (rule.isDefault) {
      throw new Error('Cannot delete the default scheduling rule');
    }

    return this.prisma.schedulingRule.delete({
      where: { id: ruleId },
    });
  }

  /**
   * Create the default scheduling rule for a tenant
   */
  private async createDefaultRule(tenantId: string) {
    return this.prisma.schedulingRule.create({
      data: {
        tenantId,
        name: 'Default',
        minNoticeMins: 60,
        bufferBeforeMins: 10,
        bufferAfterMins: 10,
        defaultSlotMins: 60,
        allowOverlapping: false,
        isDefault: true,
      },
    });
  }
}
