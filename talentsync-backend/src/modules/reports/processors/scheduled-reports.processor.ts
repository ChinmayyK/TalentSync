import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ReportsService } from '../reports.service';
import { EmailService } from '../../email/email.service';
import { ReportType, ScheduleFrequency } from '../dto/scheduled-report.dto';

@Processor('scheduled-reports')
@Injectable()
export class ScheduledReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledReportsProcessor.name);

  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
    private emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log('Processing scheduled reports...');

    const now = new Date();
    const dueReports = await this.prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    this.logger.log(`Found ${dueReports.length} due scheduled reports`);

    for (const report of dueReports) {
      try {
        await this.processReport(report);
      } catch (e) {
        this.logger.error(
          `Failed to process scheduled report ${report.id}: ${e.message}`,
        );
      }
    }

    this.logger.log('Scheduled reports processing completed.');
  }

  private async processReport(report: any): Promise<void> {
    this.logger.debug(
      `Processing report: ${report.name} (${report.reportType})`,
    );

    // Generate the report as HTML for email
    const { html } = await this.reportsService.exportToPdf(
      report.tenantId,
      report.reportType as ReportType,
    );

    // Send email to all recipients
    for (const recipient of report.recipients) {
      try {
        await this.emailService.sendMail(report.tenantId, {
          to: recipient,
          template: 'scheduled-report', // Use a template
          context: {
            reportName: report.name || report.reportType,
            reportHtml: html,
          },
        });
        this.logger.debug(`Sent report to ${recipient}`);
      } catch (e) {
        this.logger.error(
          `Failed to send report to ${recipient}: ${e.message}`,
        );
      }
    }

    // Update last run time and calculate next run
    const nextRunAt = this.calculateNextRun(
      report.frequency as ScheduleFrequency,
      report.time,
      report.dayOfWeek,
      report.dayOfMonth,
    );

    await this.prisma.scheduledReport.update({
      where: { id: report.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });

    this.logger.debug(`Updated next run for ${report.id} to ${nextRunAt}`);
  }

  private calculateNextRun(
    frequency: ScheduleFrequency,
    time: string,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
  ): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ScheduleFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case ScheduleFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        if (dayOfMonth !== undefined && dayOfMonth !== null) {
          next.setDate(dayOfMonth);
        }
        break;
    }

    return next;
  }
}

