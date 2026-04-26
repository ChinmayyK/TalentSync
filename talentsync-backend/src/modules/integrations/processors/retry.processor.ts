import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

@Processor('integration-dlq')
@Injectable()
export class RetryProcessor extends WorkerHost {
    private readonly logger = new Logger(RetryProcessor.name);

    constructor(
        @InjectQueue('integration-sync') private syncQueue: Queue,
    ) {
        super();
    }

    /**
     * Process jobs from DLQ and retry them
     */
    async process(job: Job): Promise<any> {
        this.logger.log(`Retrying job ${job.id} from DLQ`);

        try {
            // Move job back to main queue
            await this.syncQueue.add(
                'sync',
                job.data,
                {
                    attempts: 3, // Fewer attempts for retry
                    backoff: {
                        type: 'exponential',
                        delay: 5000, // Longer initial delay
                    },
                },
            );

            this.logger.log(`Job ${job.id} moved back to sync queue`);
            return { success: true, retried: true };
        } catch (error) {
            this.logger.error(`Failed to retry job ${job.id}`, error);
            throw error;
        }
    }

    /**
     * Schedule periodic retry of DLQ items
     * This would typically be triggered by a cron job
     */
    async retryAll(): Promise<void> {
        const dlqJobs = await this.syncQueue.getFailed();

        this.logger.log(`Found ${dlqJobs.length} failed jobs to retry`);

        for (const job of dlqJobs) {
            try {
                await this.process(job);
            } catch (error) {
                this.logger.error(`Failed to process DLQ job ${job.id}`, error);
            }
        }
    }
}
