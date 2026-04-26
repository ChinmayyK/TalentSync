import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../../common/prisma.service';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  {
    maxRetriesPerRequest: null,
  },
);

export const startReportsProcessor = (prisma: PrismaService) => {
  const worker = new Worker(
    'reports',
    async (job) => {
      if (job.name === 'refresh-materialized') {
        // In production, execute: await prisma.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_interviewer_load`;
        console.log('Refreshing materialized views...');
        // Simulated refresh delay
        await new Promise((r) => setTimeout(r, 100));
      }
    },
    { connection },
  );

  worker.on('completed', (job) =>
    console.log('Reports job completed', job?.id),
  );
  worker.on('failed', (job, err) =>
    console.error('Reports job failed', job?.id, err),
  );
};
