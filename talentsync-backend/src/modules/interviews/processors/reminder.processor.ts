import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../../common/prisma.service';
import { subMinutes } from 'date-fns';

// Use same redis connection config
const connection = new IORedis(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  {
    maxRetriesPerRequest: null,
  },
);

const interviewsQueue = new Queue('interviews', { connection });

export const startReminderProcessor = (prisma: PrismaService) => {
  const worker = new Worker(
    'interviews',
    async (job) => {
      const name = job.name;
      if (name === 'schedule-reminders' || name === 'reschedule-reminders') {
        const { interviewId, tenantId } = job.data;
        const iv = await prisma.interview.findUnique({
          where: { id: interviewId },
        });
        if (!iv || iv.tenantId !== tenantId) return;

        // schedule two reminders: 24 hours and 30 minutes before
        const reminders = [
          { minutesBefore: 24 * 60, type: 'reminder.24h' },
          { minutesBefore: 30, type: 'reminder.30m' },
        ];

        for (const r of reminders) {
          const remindAt = subMinutes(new Date(iv.date), r.minutesBefore);
          const delay = Math.max(0, remindAt.getTime() - Date.now());
          await interviewsQueue.add(
            'send-reminder',
            { interviewId, tenantId, type: r.type },
            { delay },
          );
        }
      } else if (name === 'send-reminder') {
        const { interviewId, tenantId, type } = job.data;
        const iv = await prisma.interview.findUnique({
          where: { id: interviewId },
        });
        if (!iv || iv.tenantId !== tenantId) return;

        // Here, send email/SMS/webhook. For now, log and write audit entry.
        console.log(`Send ${type} for interview ${interviewId}`);
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: 'system',
            action: 'interview.reminder',
            metadata: { interviewId, type },
          },
        });
      } else if (name === 'send-cancel-notifications') {
        const { interviewId } = job.data;
        // send cancellation notifications
        console.log('Send cancel notifications for', interviewId);
      } else if (name === 'bulk-schedule') {
        const { items, tenantId } = job.data;
        // process bulk scheduling: attempt create for each item; log failures
        for (const it of items) {
          try {
            // use prisma to create; using interview creation rules is suggested
            await prisma.interview.create({
              data: {
                tenantId,
                candidateId: it.candidateId,
                interviewerIds: it.interviewerIds,
                date: new Date(it.date),
                durationMins: it.durationMins,
                stage: 'scheduled',
                status: 'scheduled',
              },
            });
          } catch (e) {
            console.error('bulk schedule item failed', e);
          }
        }
      }
    },
    { connection },
  );

  worker.on('completed', (job) =>
    console.log('Interviews job completed', job?.id),
  );
  worker.on('failed', (job, err) =>
    console.error('Interviews job failed', job?.id, err),
  );
};

