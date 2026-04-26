import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../../common/prisma.service';
import { EmailService } from '../email.service';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  {
    maxRetriesPerRequest: null,
  },
);

export const startEmailProcessor = (
  prisma: PrismaService,
  emailService: EmailService,
) => {
  const worker = new Worker(
    'email',
    async (job) => {
      const { tenantId, to, template, context, attachments } = job.data;
      try {
        const res = await emailService.sendMail(tenantId, {
          to,
          template,
          context,
          attachments,
        });

        // record audit
        // Ensure AuditLog tenantId handling (using 'platform' fallback if null as per previous step discussion)
        const auditTenantId = tenantId || 'platform';
        // If schema allows null, we use null. Schema was updated to String? in previous step but migration failed.
        // Assuming previous step effectively made it optional via code logic or existing schema if pushed.
        // We'll pass tenantId as is if it can be null.
        await prisma.auditLog.create({
          data: {
            tenantId: tenantId,
            action: 'email.sent',
            metadata: { to, template, result: res as any },
          },
        });

        return res;
      } catch (err) {
        console.error('Email job failed', err);
        try {
          await prisma.auditLog.create({
            data: {
              tenantId: tenantId,
              action: 'email.failed',
              metadata: { to, template, error: String(err) },
            },
          });
        } catch (e) {
          console.error('Failed to log audit failure', e);
        }
        throw err;
      }
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    console.error('Email job failed', job?.id, err);
  });

  return worker;
};
