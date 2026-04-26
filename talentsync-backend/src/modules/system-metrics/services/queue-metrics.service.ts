import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { COMMUNICATION_QUEUES } from '../../communication/queues';

export interface QueueMetrics {
  queue: string;
  waiting: number;
  active: number;
  completed24h: number;
  failed24h: number;
  avgJobDurationMs: number;
}

@Injectable()
export class QueueMetricsService {
  constructor(
    @InjectQueue(COMMUNICATION_QUEUES.EMAIL) private emailQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.WHATSAPP) private whatsappQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.SMS) private smsQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.AUTOMATION)
    private automationQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.SCHEDULER) private schedulerQueue: Queue,
    @InjectQueue(COMMUNICATION_QUEUES.DLQ) private dlqQueue: Queue,
  ) {}

  /**
   * Get metrics for all queues
   */
  async getMetrics(): Promise<QueueMetrics[]> {
    const queues = [
      { name: 'email', queue: this.emailQueue },
      { name: 'whatsapp', queue: this.whatsappQueue },
      { name: 'sms', queue: this.smsQueue },
      { name: 'automation', queue: this.automationQueue },
      { name: 'scheduler', queue: this.schedulerQueue },
      { name: 'communication-dlq', queue: this.dlqQueue },
    ];

    const results = await Promise.all(
      queues.map(async ({ name, queue }) => {
        try {
          const jobCounts = await queue.getJobCounts();

          // Get completed and failed jobs from last 24 hours
          const now = Date.now();
          const dayAgo = now - 24 * 60 * 60 * 1000;

          const [completedJobs, failedJobs] = await Promise.all([
            queue.getJobs(['completed'], 0, 1000),
            queue.getJobs(['failed'], 0, 1000),
          ]);

          // Filter to last 24h and calculate average duration
          const completed24h = completedJobs.filter(
            (job) => job.finishedOn && job.finishedOn > dayAgo,
          );
          const failed24h = failedJobs.filter(
            (job) => job.finishedOn && job.finishedOn > dayAgo,
          );

          // Calculate average job duration from completed jobs
          let avgJobDurationMs = 0;
          const durationsWithTiming = completed24h.filter(
            (job) => job.processedOn && job.finishedOn,
          );
          if (durationsWithTiming.length > 0) {
            const totalDuration = durationsWithTiming.reduce(
              (sum, job) =>
                sum + ((job.finishedOn || 0) - (job.processedOn || 0)),
              0,
            );
            avgJobDurationMs = Math.round(
              totalDuration / durationsWithTiming.length,
            );
          }

          return {
            queue: name,
            waiting: jobCounts.waiting || 0,
            active: jobCounts.active || 0,
            completed24h: completed24h.length,
            failed24h: failed24h.length,
            avgJobDurationMs,
          };
        } catch (error) {
          // Return empty metrics if queue is not available
          console.error(`Error getting metrics for queue ${name}:`, error);
          return {
            queue: name,
            waiting: 0,
            active: 0,
            completed24h: 0,
            failed24h: 0,
            avgJobDurationMs: 0,
          };
        }
      }),
    );

    return results;
  }

  /**
   * Get metrics for a specific queue
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics | null> {
    const metrics = await this.getMetrics();
    return metrics.find((m) => m.queue === queueName) || null;
  }
}
