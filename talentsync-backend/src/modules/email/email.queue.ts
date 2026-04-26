import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export class EmailQueue {
  private queue: Queue;
  constructor() {
    const conn = new IORedis(
      process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      {
        maxRetriesPerRequest: null,
      },
    );
    this.queue = new Queue('email', {
      connection: conn,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }

  getQueue() {
    return this.queue;
  }
}
