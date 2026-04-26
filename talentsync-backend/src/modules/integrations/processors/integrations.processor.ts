import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { IntegrationFactory } from '../common/integration-factory.service';
import { PrismaService } from '../../../common/prisma.service';
import { defaultRetryOptions } from '../common/retry.policy';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});

export const startIntegrationsProcessor = (prisma: PrismaService, factory: IntegrationFactory) => {
    const worker = new Worker('integrations', async job => {
        const { tenantId, provider, action, payload } = job.data;
        const connector = factory.getConnector(provider);
        if (action === 'pull') {
            return await connector.pullChanges(tenantId, payload?.since);
        }
        if (action === 'push') {
            return await connector.pushRecord(tenantId, payload.record);
        }
        if (action === 'webhook') {
            return await connector.handleWebhook!(tenantId, payload);
        }
    }, { connection });

    worker.on('failed', async (job, err) => {
        console.error('Integration job failed', job?.id, err);
        if (job?.data) {
            // Use PrismaService to update status if possible, but here we might need to handle context carefully.
            // Also note: job.data might be undefined if job failed before being saved.
            // For now, logging effectively.
            try {
                await prisma.integration.updateMany({
                    where: { tenantId: job.data.tenantId, provider: job.data.provider },
                    data: { status: 'error' }
                });
            } catch (dbErr) {
                console.error('Failed to update integration status', dbErr);
            }
        }
    });

    return worker;
};
