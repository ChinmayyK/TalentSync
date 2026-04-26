import { Worker } from 'bullmq';
import IORedis from 'ioredis';

// Use same redis connection config
const connection = new IORedis(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  {
    maxRetriesPerRequest: null,
  },
);

export const startSyncProcessor = () => {
  const worker = new Worker(
    'interviews',
    async (job) => {
      if (job.name === 'calendar-sync') {
        const { interviewId } = job.data;
        // Hook point:
        // - Look up tenant integration config (e.g., Google Calendar / Outlook)
        // - For each interviewer with calendar linked, create calendar event
        // - On failure, retry based on job.attempts
        console.log('Calendar sync for interview', interviewId);
      }
    },
    { connection },
  );

  worker.on('completed', (job) => console.log('Sync job completed', job?.id));
  worker.on('failed', (job, err) =>
    console.error('Sync job failed', job?.id, err),
  );
};
