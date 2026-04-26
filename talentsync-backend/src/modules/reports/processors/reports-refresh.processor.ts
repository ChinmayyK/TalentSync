import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ReportsService } from '../reports.service';

@Processor('reports-refresh')
@Injectable()
export class ReportsRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsRefreshProcessor.name);

  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log('Starting daily reports refresh...');
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });

    for (const t of tenants) {
      try {
        this.logger.debug(`Refreshing reports for tenant ${t.id}`);
        // Refresh all main reports
        await this.reportsService.overview(t.id, true);
        // Overview calls funnel, timeToHire, interviewerLoad with force=true
      } catch (e) {
        this.logger.error(
          `Failed to refresh reports for tenant ${t.id}: ${e.message}`,
        );
      }
    }
    this.logger.log('Daily reports refresh completed.');
  }
}
