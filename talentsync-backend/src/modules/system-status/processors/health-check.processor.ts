import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { HealthCheckService } from '../services/health-check.service';

@Processor('health-checks')
export class HealthCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthCheckProcessor.name);

  constructor(private healthCheckService: HealthCheckService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing health check job: ${job.id}`);

    try {
      const results = await this.healthCheckService.runAllChecks();
      this.logger.log(
        `Health checks completed: ${results.length} components checked`,
      );

      // Log any non-operational statuses
      const issues = results.filter((r) => r.status !== 'OPERATIONAL');
      if (issues.length > 0) {
        this.logger.warn(
          `Components with issues: ${issues.map((i) => `${i.componentKey}:${i.status}`).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error('Health check job failed:', error);
      throw error;
    }
  }
}

