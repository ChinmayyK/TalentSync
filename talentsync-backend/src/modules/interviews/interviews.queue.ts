import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export class InterviewsQueue {
  private queue: Queue;
  constructor() {
    const connection = new IORedis(
      process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    );
    this.queue = new Queue('interviews', { connection });
  }

  getQueue() {
    return this.queue;
  }
}

