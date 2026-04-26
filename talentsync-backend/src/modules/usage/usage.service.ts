import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface MonthlyUsage {
  tenantId: string;
  month: string; // YYYY-MM
  activeRecruiters: number;
  candidatesCreated: number;
  interviewsScheduled: number;
  messagesSent: number;
  emailsSent: number;
  smsSent: number;
  whatsappSent: number;
  integrationsEnabled: number;
  peakCandidatesPerDay: number;
  peakInterviewsPerDay: number;
}

export interface TenantPlan {
  name: string;
  limits: {
    users?: number;
    candidates?: number;
    interviews?: number;
    messages?: number;
  };
  effectiveFrom: string;
}

/**
 * Usage Analytics Service
 *
 * Computes usage metrics from existing tables.
 * No enforcement - measurement only.
 */
@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get monthly usage for a tenant
   */
  async getMonthlyUsage(
    tenantId: string,
    month: string,
  ): Promise<MonthlyUsage> {
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Get all counts in parallel
    const [
      activeRecruiters,
      candidatesCreated,
      interviewsScheduled,
      messagesByChannel,
      integrationsEnabled,
      candidatesByDay,
      interviewsByDay,
    ] = await Promise.all([
      // Active recruiters (users who logged in during the month)
      this.prisma.user.count({
        where: {
          tenantId,
          lastLogin: { gte: startOfMonth, lte: endOfMonth },
          role: { in: ['RECRUITER', 'ADMIN'] },
        },
      }),

      // Candidates created
      this.prisma.candidate.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),

      // Interviews scheduled
      this.prisma.interview.count({
        where: {
          tenantId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),

      // Messages by channel
      this.prisma.messageLog.groupBy({
        by: ['channel'],
        where: {
          tenantId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _count: { id: true },
      }),

      // Active integrations
      this.prisma.integration.count({
        where: { tenantId, status: 'connected' },
      }),

      // Daily candidate counts for peak
      this.getDailyCounts('candidate', tenantId, startOfMonth, endOfMonth),

      // Daily interview counts for peak
      this.getDailyCounts('interview', tenantId, startOfMonth, endOfMonth),
    ]);

    // Parse message counts by channel
    let emailsSent = 0,
      smsSent = 0,
      whatsappSent = 0;
    for (const msg of messagesByChannel) {
      if (msg.channel === 'EMAIL') emailsSent = msg._count.id;
      else if (msg.channel === 'SMS') smsSent = msg._count.id;
      else if (msg.channel === 'WHATSAPP') whatsappSent = msg._count.id;
    }

    return {
      tenantId,
      month,
      activeRecruiters,
      candidatesCreated,
      interviewsScheduled,
      messagesSent: emailsSent + smsSent + whatsappSent,
      emailsSent,
      smsSent,
      whatsappSent,
      integrationsEnabled,
      peakCandidatesPerDay: Math.max(...candidatesByDay, 0),
      peakInterviewsPerDay: Math.max(...interviewsByDay, 0),
    };
  }

  /**
   * Get usage for multiple months
   */
  async getUsageHistory(
    tenantId: string,
    months: number = 6,
  ): Promise<MonthlyUsage[]> {
    const results: MonthlyUsage[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      results.push(await this.getMonthlyUsage(tenantId, month));
    }

    return results;
  }

  /**
   * Get tenant plan info
   */
  async getTenantPlan(tenantId: string): Promise<TenantPlan | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = tenant.settings as any;
    return settings?.plan || null;
  }

  /**
   * Update tenant plan (no enforcement)
   */
  async updateTenantPlan(
    tenantId: string,
    plan: TenantPlan,
  ): Promise<TenantPlan> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const currentSettings = (tenant.settings as any) || {};

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...currentSettings,
          plan,
        },
      },
    });

    return plan;
  }

  /**
   * Export usage as CSV string
   */
  async exportUsageCsv(tenantId: string, months: number = 12): Promise<string> {
    const usage = await this.getUsageHistory(tenantId, months);

    const headers = [
      'Month',
      'Active Recruiters',
      'Candidates Created',
      'Interviews Scheduled',
      'Messages Sent',
      'Emails',
      'SMS',
      'WhatsApp',
      'Integrations',
      'Peak Candidates/Day',
      'Peak Interviews/Day',
    ];

    const rows = usage.map((u) => [
      u.month,
      u.activeRecruiters,
      u.candidatesCreated,
      u.interviewsScheduled,
      u.messagesSent,
      u.emailsSent,
      u.smsSent,
      u.whatsappSent,
      u.integrationsEnabled,
      u.peakCandidatesPerDay,
      u.peakInterviewsPerDay,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Get all tenants usage summary
   */
  async getAllTenantsUsage(month: string): Promise<MonthlyUsage[]> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true },
    });

    return Promise.all(tenants.map((t) => this.getMonthlyUsage(t.id, month)));
  }

  // Helper to get daily counts
  private async getDailyCounts(
    entity: 'candidate' | 'interview',
    tenantId: string,
    start: Date,
    end: Date,
  ): Promise<number[]> {
    const days: number[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const count =
        entity === 'candidate'
          ? await this.prisma.candidate.count({
              where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
            })
          : await this.prisma.interview.count({
              where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
            });

      days.push(count);
      current.setDate(current.getDate() + 1);
    }

    return days;
  }
}
