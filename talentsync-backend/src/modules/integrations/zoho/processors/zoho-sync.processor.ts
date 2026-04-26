import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../../../common/prisma.service';
import { ZohoSyncService } from '../zoho.sync.service';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
});

export const startZohoSyncProcessor = (prisma: PrismaService, sync: ZohoSyncService) => {
    const worker = new Worker('zoho-sync', async job => {
        const { tenantId, module, type } = job.data;

        console.log(`Processing Zoho sync job: tenant=${tenantId}, module=${module}, type=${type}`);

        try {
            // Full sync - syncs stages, users, then candidates
            if (type === 'full' || module === 'all') {
                return await sync.syncAll(tenantId, module || 'leads');
            }

            // Individual sync types
            if (module === 'stages') {
                return await sync.syncStages(tenantId);
            }

            if (module === 'users') {
                return await sync.syncUsers(tenantId);
            }

            if (module === 'leads') {
                return await sync.syncLeads(tenantId);
            }

            if (module === 'contacts') {
                return await sync.syncContacts(tenantId);
            }

            // Default to full sync
            return await sync.syncAll(tenantId, module || 'leads');
        } catch (e) {
            console.error('Zoho sync error', e);
            await prisma.integration.updateMany({
                where: { tenantId, provider: 'zoho' },
                data: { status: 'error' }
            });
            throw e;
        }
    }, { connection });

    worker.on('failed', (job, err) => console.error('Zoho Sync failed', job?.id, err));
    worker.on('completed', (job) => console.log('Zoho Sync completed', job?.id));

    return worker;
};
