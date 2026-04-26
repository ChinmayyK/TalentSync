import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import { loadSQL } from '../../common/sql.util';
import { getCached, setCached } from '../../common/cache.util';
import {
  CreateScheduledReportDto,
  ReportType,
  ScheduleFrequency,
} from './dto/scheduled-report.dto';
import { GetReportDto } from './dto/get-report.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Dashboard Summary ───────────────────────────────────────────────────────

  async getDashboardSummary(tenantId: string): Promise<DashboardSummaryDto> {
    // Run aggregations in parallel
    const [totalCandidates, activeInterviews, offersMade, hires] =
      await Promise.all([
        // Total active candidates (not deleted)
        this.prisma.candidate.count({
          where: { tenantId, deletedAt: null },
        }),
        // Active interviews (Scheduled, Rescheduled)
        this.prisma.interview.count({
          where: {
            tenantId,
            deletedAt: null,
            status: { in: ['SCHEDULED', 'RESCHEDULED', 'PENDING_FEEDBACK'] },
          },
        }),
        // Offers made
        this.prisma.candidate.count({
          where: { tenantId, deletedAt: null, stage: 'OFFER' },
        }),
        // Hires usually stage = HIRED
        this.prisma.candidate.count({
          where: { tenantId, deletedAt: null, stage: 'HIRED' },
        }),
      ]);

    return {
      totalCandidates,
      activeInterviews,
      offersMade,
      hires,
    };
  }

  // ─── Core Report Methods ─────────────────────────────────────────────────────

  // Whitelist of valid field names to prevent SQL injection
  private static readonly VALID_DATE_FIELDS = [
    '"createdAt"',
    '"updatedAt"',
    'inter.date',
  ];

  private buildDateFilter(
    field: string,
    from?: string,
    to?: string,
  ): Prisma.Sql {
    // Validate field is in whitelist
    if (!ReportsService.VALID_DATE_FIELDS.includes(field)) {
      throw new BadRequestException(`Invalid date filter field: ${field}`);
    }
    if (from && to) {
      return Prisma.sql`AND ${Prisma.raw(field)} >= ${new Date(from)} AND ${Prisma.raw(field)} <= ${new Date(to)}`;
    }
    if (from) {
      return Prisma.sql`AND ${Prisma.raw(field)} >= ${new Date(from)}`;
    }
    if (to) {
      return Prisma.sql`AND ${Prisma.raw(field)} <= ${new Date(to)}`;
    }
    return Prisma.empty;
  }

  private buildRoleFilter(role?: string): Prisma.Sql {
    return role ? Prisma.sql`AND "roleTitle" = ${role}` : Prisma.empty;
  }

  async funnel(tenantId: string, filters: GetReportDto = {}, force = false) {
    this.logger.debug(
      `funnel called with tenantId=${tenantId}, filters=${JSON.stringify(filters)}, force=${force}`,
    );

    const cacheKey = `reports:${tenantId}:funnel:${JSON.stringify(filters)}`;
    if (!force) {
      const cached = await getCached(cacheKey);
      if (cached) {
        this.logger.debug(
          `funnel returning cached data: ${JSON.stringify(cached)}`,
        );
        return cached;
      }
    }

    const dateFilter = this.buildDateFilter(
      '"createdAt"',
      filters.from,
      filters.to,
    );
    const roleFilter = this.buildRoleFilter(filters.role);

    const result = await this.prisma.$queryRaw<any[]>`
            SELECT
                stage,
                COUNT(*)::int as count,
                ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ())::numeric, 1)::float as percentage
            FROM "Candidate"
            WHERE "tenantId" = ${tenantId} 
            AND "deletedAt" IS NULL
            ${dateFilter}
            ${roleFilter}
            GROUP BY stage
            ORDER BY count DESC;
        `;

    this.logger.debug(`funnel query result: ${JSON.stringify(result)}`);
    await setCached(cacheKey, result, 600); // 10 min cache
    return result;
  }

  async timeToHireTrend(tenantId: string, force = false) {
    const cacheKey = `reports:${tenantId}:time_to_hire_trend`;
    if (!force) {
      const cached = await getCached(cacheKey);
      if (cached) return cached;
    }

    // Average days to hire grouped by month for the last 6 months
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', "updatedAt"), 'Mon YYYY') as month,
        DATE_TRUNC('month', "updatedAt") as month_date,
        AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))/86400)::float as "avgDays"
      FROM "Candidate"
      WHERE "tenantId" = ${tenantId} 
        AND stage = 'HIRED' 
        AND "deletedAt" IS NULL
        AND "updatedAt" >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', "updatedAt"), TO_CHAR(DATE_TRUNC('month', "updatedAt"), 'Mon YYYY')
      ORDER BY month_date ASC;
    `;

    await setCached(cacheKey, result, 600);
    return result;
  }

  async stageDuration(tenantId: string, force = false) {
    const cacheKey = `reports:${tenantId}:stage_duration`;
    if (!force) {
      const cached = await getCached(cacheKey);
      if (cached) return cached;
    }

    // Average duration in each stage using CandidateStageHistory
    const result = await this.prisma.$queryRaw<any[]>`
      WITH stage_diffs AS (
        SELECT 
          "previousStage" as stage,
          EXTRACT(EPOCH FROM (h."createdAt" - c."createdAt"))/86400 as duration
        FROM "CandidateStageHistory" h
        JOIN "Candidate" c ON c.id = h."candidateId"
        WHERE h."tenantId" = ${tenantId}
      )
      SELECT 
        stage,
        AVG(duration)::float as "avgDays"
      FROM stage_diffs
      WHERE stage IS NOT NULL
      GROUP BY stage
      ORDER BY "avgDays" DESC;
    `;

    await setCached(cacheKey, result, 600);
    return result;
  }

  async offerBreakdown(tenantId: string, force = false) {
    const cacheKey = `reports:${tenantId}:offer_breakdown`;
    if (!force) {
      const cached = await getCached(cacheKey);
      if (cached) return cached;
    }

    const result = await this.prisma.offer.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const formatted = result.map(r => ({
      status: r.status,
      count: r._count.status,
    }));

    await setCached(cacheKey, formatted, 600);
    return formatted;
  }

  async interviewerLoad(
    tenantId: string,
    filters: GetReportDto = {},
    force = false,
  ) {
    const cacheKey = `reports:${tenantId}:interviewer_load:${JSON.stringify(filters)}`;
    if (!force) {
      const cached = await getCached(cacheKey);
      if (cached) return cached;
    }

    const dateFilter = this.buildDateFilter(
      'inter.date',
      filters.from,
      filters.to,
    );
    const roleFilter = filters.role
      ? Prisma.sql`AND c."roleTitle" = ${filters.role}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<any[]>`
            SELECT
                u.id as "interviewerId",
                u.name as "interviewerName",
                COUNT(*)::int as "totalInterviews",
                COUNT(CASE WHEN inter.date >= date_trunc('week', current_date) THEN 1 END)::int as "thisWeek",
                COUNT(CASE WHEN inter.date >= date_trunc('month', current_date) THEN 1 END)::int as "thisMonth",
                COUNT(CASE WHEN inter."hasFeedback" = false AND inter.status = 'COMPLETED' THEN 1 END)::int as "pendingFeedback"
            FROM "Interview" inter
            CROSS JOIN LATERAL UNNEST(inter."interviewerIds") AS vid
            JOIN "User" u ON u.id = vid
            JOIN "Candidate" c ON c.id = inter."candidateId"
            WHERE inter."tenantId" = ${tenantId} 
            AND inter."deletedAt" IS NULL 
            AND c."deletedAt" IS NULL
            ${dateFilter}
            ${roleFilter}
            GROUP BY u.id, u.name
            ORDER BY "totalInterviews" DESC;
        `;

    await setCached(cacheKey, result, 600);
    return result;
  }

  async sourcePerformance(
    tenantId: string,
    filters: GetReportDto = {},
    force = false,
  ) {
    const cacheKey = `reports:${tenantId}:source_performance:${JSON.stringify(filters)}`;
    if (!force) {
      const cached = await getCached(cacheKey);
      if (cached) return cached;
    }

    const dateFilter = this.buildDateFilter(
      '"createdAt"',
      filters.from,
      filters.to,
    );
    const roleFilter = this.buildRoleFilter(filters.role);

    const result = await this.prisma.$queryRaw<any[]>`
            SELECT
                COALESCE(source, 'Unknown') as source,
                COUNT(*)::int as "totalCandidates",
                COUNT(CASE WHEN stage = 'HIRED' THEN 1 END)::int as "hires",
                COUNT(CASE WHEN stage IN ('OFFER', 'HIRED') THEN 1 END)::int as "offers"
            FROM "Candidate"
            WHERE "tenantId" = ${tenantId}
            AND "deletedAt" IS NULL
            ${dateFilter}
            ${roleFilter}
            GROUP BY source
            ORDER BY "hires" DESC, "totalCandidates" DESC;
        `;

    await setCached(cacheKey, result, 600);
    return result;
  }

  async stageMetrics(
    tenantId: string,
    filters: GetReportDto = {},
    force = false,
  ) {
    return this.funnel(tenantId, filters, force);
  }

  async overview(tenantId: string, force = false): Promise<any> {
    // Calculate date ranges for "this week" metrics
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);

    // Run parallel aggregations including summary metrics
    const [
      funnel,
      timeToHire,
      interviewerLoad,
      totalCandidates,
      activeInterviews,
      completedThisWeek,
      pendingFeedback,
      timeToHireTrend,
      stageDuration,
      offerBreakdown,
    ] = await Promise.all([
      this.funnel(tenantId, {}, force),
      this.timeToHireTrend(tenantId, force),
      this.interviewerLoad(tenantId, {}, force),
      // Summary metrics
      this.prisma.candidate.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.interview.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        },
      }),
      this.prisma.interview.count({
        where: {
          tenantId,
          deletedAt: null,
          status: 'COMPLETED',
          updatedAt: { gte: startOfWeek },
        },
      }),
      this.prisma.interview.count({
        where: {
          tenantId,
          deletedAt: null,
          status: 'PENDING_FEEDBACK',
        },
      }),
      this.timeToHireTrend(tenantId, force),
      this.stageDuration(tenantId, force),
      this.offerBreakdown(tenantId, force),
    ]);

    return {
      funnel,
      timeToHireTrend,
      stageDuration,
      offerBreakdown,
      interviewerLoad,
      totalCandidates,
      activeInterviews,
      completedThisWeek,
      pendingFeedback,
    };
  }

  // ─── Export Methods ──────────────────────────────────────────────────────────

  async getReportData(
    tenantId: string,
    reportType: ReportType,
    filters: GetReportDto = {},
    force = true,
  ) {
    switch (reportType) {
      case ReportType.OVERVIEW:
        return this.overview(tenantId, force);
      case ReportType.FUNNEL:
        return this.funnel(tenantId, filters, force);
      case ReportType.TIME_TO_HIRE:
        return this.timeToHireTrend(tenantId, force);
      case ReportType.INTERVIEWER_LOAD:
        return this.interviewerLoad(tenantId, filters, force);
      case ReportType.SOURCE_PERFORMANCE:
        return this.sourcePerformance(tenantId, filters, force);
      case ReportType.STAGE_METRICS:
        return this.stageMetrics(tenantId, filters, force);
      default:
        throw new BadRequestException(`Unknown report type: ${reportType}`);
    }
  }

  async exportToCsv(
    tenantId: string,
    reportType: ReportType,
    filters: GetReportDto = {},
  ): Promise<{ filename: string; content: string }> {
    const data = await this.getReportData(tenantId, reportType, filters);
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    // Handle different report structures
    let rows: any[] = [];

    if (
      reportType === ReportType.OVERVIEW &&
      data &&
      typeof data === 'object' &&
      !Array.isArray(data)
    ) {
      const ov = data;
      // Add Summary section
      rows.push({ Metric: 'SUMMARY', Value: '' });
      rows.push({ Metric: 'Total Candidates', Value: ov.totalCandidates || 0 });
      rows.push({
        Metric: 'Active Interviews',
        Value: ov.activeInterviews || 0,
      });
      rows.push({
        Metric: 'Completed This Week',
        Value: ov.completedThisWeek || 0,
      });
      rows.push({ Metric: 'Pending Feedback', Value: ov.pendingFeedback || 0 });

      // Add Funnel section
      rows.push({ Metric: '', Value: '' });
      rows.push({ Metric: 'FUNNEL', Value: 'Count (Percentage)' });
      (ov.funnel || []).forEach((f: any) => {
        rows.push({
          Metric: f.stage,
          Value: `${f.count} (${f.percentage || 0}%)`,
        });
      });

      // Add Time to Hire section
      rows.push({ Metric: '', Value: '' });
      rows.push({ Metric: 'TIME TO HIRE', Value: '' });
      rows.push({
        Metric: 'Average Days',
        Value: ov.timeToHire?.averageDays || 0,
      });

      // Add Interviewer Load section
      rows.push({ Metric: '', Value: '' });
      rows.push({ Metric: 'INTERVIEWER LOAD', Value: 'Total Interviews' });
      (ov.interviewerLoad || []).forEach((i: any) => {
        rows.push({
          Metric: i.interviewerName || i.interviewerId,
          Value: i.totalInterviews,
        });
      });
    } else if (Array.isArray(data)) {
      rows = data;
    } else if (data && typeof data === 'object') {
      // For other objects
      rows = Object.entries(data as Record<string, unknown>).map(
        ([key, value]) => ({
          metric: key,
          data: JSON.stringify(value),
        }),
      );
    }

    if (rows.length === 0) {
      return { filename, content: 'No data available' };
    }

    // Generate CSV
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => this.escapeCsvValue(row[h])).join(','),
      ),
    ];

    return { filename, content: csvLines.join('\n') };
  }

  async exportToPdf(
    tenantId: string,
    reportType: ReportType,
    filters: GetReportDto = {},
  ): Promise<{ filename: string; html: string }> {
    const data = await this.getReportData(tenantId, reportType, filters);
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
    const generatedAt = new Date().toLocaleString();

    // Generate HTML that can be converted to PDF on client or via a PDF service
    let tableHtml = '';
    let rows: any[] = [];

    if (Array.isArray(data)) {
      rows = data;
    } else if (data && typeof data === 'object') {
      rows = Object.entries(data as Record<string, unknown>).map(
        ([key, value]) => ({
          metric: key,
          value: Array.isArray(value)
            ? `${value.length} items`
            : JSON.stringify(value),
        }),
      );
    }

    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      tableHtml = `
                <table style="width:100%;border-collapse:collapse;margin-top:20px;">
                    <thead>
                        <tr style="background:#f3f4f6;">
                            ${headers.map((h) => `<th style="padding:12px;text-align:left;border-bottom:2px solid #e5e7eb;">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows
                          .map(
                            (row) => `
                            <tr>
                                ${headers.map((h) => `<td style="padding:10px;border-bottom:1px solid #e5e7eb;">${row[h] ?? '-'}</td>`).join('')}
                            </tr>
                        `,
                          )
                          .join('')}
                    </tbody>
                </table>
            `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${reportType} Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; }
        h1 { color: #0066cc; margin-bottom: 8px; }
        .subtitle { color: #6b7280; margin-bottom: 24px; }
        .meta { font-size: 12px; color: #9ca3af; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>${this.formatReportTitle(reportType)} Report</h1>
    <p class="subtitle">Generated for your organization</p>
    <p class="meta">Generated at: ${generatedAt}</p>
    ${tableHtml || '<p>No data available for this report.</p>'}
</body>
</html>
        `.trim();

    return { filename, html };
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) return '';
    let str = String(value);
    // Prevent CSV formula injection
    if (/^[=@+\-]/.test(str)) {
      str = "'" + str;
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private formatReportTitle(reportType: ReportType): string {
    return reportType
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // ─── Scheduled Reports CRUD ──────────────────────────────────────────────────

  async createScheduledReport(
    tenantId: string,
    userId: string,
    dto: CreateScheduledReportDto,
  ) {
    const nextRunAt = this.calculateNextRun(
      dto.frequency,
      dto.time,
      dto.dayOfWeek,
      dto.dayOfMonth,
    );

    const scheduled = await this.prisma.scheduledReport.create({
      data: {
        tenantId,
        createdById: userId,
        reportType: dto.reportType,
        frequency: dto.frequency,
        recipients: dto.recipients,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        time: dto.time,
        name: dto.name || `${dto.reportType} - ${dto.frequency}`,
        isActive: true,
        nextRunAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'SCHEDULED_REPORT_CREATE',
        metadata: {
          scheduledReportId: scheduled.id,
          reportType: dto.reportType,
        },
      },
    });

    return scheduled;
  }

  async listScheduledReports(tenantId: string) {
    return this.prisma.scheduledReport.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getScheduledReport(tenantId: string, id: string) {
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id, tenantId },
    });
    if (!report) throw new NotFoundException('Scheduled report not found');
    return report;
  }

  async deleteScheduledReport(tenantId: string, userId: string, id: string) {
    const report = await this.getScheduledReport(tenantId, id);

    await this.prisma.scheduledReport.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'SCHEDULED_REPORT_DELETE',
        metadata: { scheduledReportId: id, reportType: report.reportType },
      },
    });

    return { success: true };
  }

  async toggleScheduledReport(tenantId: string, userId: string, id: string) {
    const report = await this.getScheduledReport(tenantId, id);
    const updated = await this.prisma.scheduledReport.update({
      where: { id },
      data: { isActive: !report.isActive },
    });
    return updated;
  }

  private calculateNextRun(
    frequency: ScheduleFrequency,
    time: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        // Already set to tomorrow if past time
        break;
      case ScheduleFrequency.WEEKLY:
        if (dayOfWeek !== undefined) {
          while (next.getDay() !== dayOfWeek) {
            next.setDate(next.getDate() + 1);
          }
        }
        break;
      case ScheduleFrequency.MONTHLY:
        if (dayOfMonth !== undefined) {
          next.setDate(dayOfMonth);
          if (next <= now) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        break;
    }

    return next;
  }
}
