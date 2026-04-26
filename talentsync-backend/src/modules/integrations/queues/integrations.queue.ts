import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export class IntegrationsQueue {
    private queue: Queue;
    constructor() {
        const conn = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
            maxRetriesPerRequest: null
        });
        this.queue = new Queue('integrations', { connection: conn });
    }
    getQueue() { return this.queue; }
}
