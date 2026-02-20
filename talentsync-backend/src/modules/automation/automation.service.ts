import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AutomationRule, Prisma } from '@prisma/client';

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) {}

  async createRule(
    tenantId: string,
    userId: string,
    data: Prisma.AutomationRuleCreateWithoutTenantInput,
  ): Promise<AutomationRule> {
    const rule = await this.prisma.automationRule.create({
      data: {
        ...data,
        tenant: { connect: { id: tenantId } },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'automation.rule.created',
        metadata: { ruleId: rule.id, name: rule.name },
      },
    });

    return rule;
  }

  async getRules(tenantId: string, limit = 100): Promise<AutomationRule[]> {
    return this.prisma.automationRule.findMany({
      where: { tenantId },
      include: { template: true },
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(
    tenantId: string,
    userId: string,
    id: string,
    data: Prisma.AutomationRuleUpdateInput,
  ): Promise<AutomationRule> {
    const rule = await this.prisma.automationRule.update({
      where: { id, tenantId },
      data,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'automation.rule.updated',
        metadata: { ruleId: id, changes: JSON.parse(JSON.stringify(data)) },
      },
    });

    return rule;
  }

  async deleteRule(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<AutomationRule> {
    const rule = await this.prisma.automationRule.delete({
      where: { id, tenantId },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'automation.rule.deleted',
        metadata: { ruleId: id, name: rule.name },
      },
    });

    return rule;
  }
}

