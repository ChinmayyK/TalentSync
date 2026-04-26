import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../../common/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null
});

import { EmailService } from '../../email/email.service';

export const startTenantProvisionProcessor = (prisma: PrismaService, emailService: EmailService) => {
    const worker = new Worker('tenant-provision', async job => {
        const { tenantId, name, domain, adminEmail } = job.data;
        try {
            // 1) create default tenant settings in DB (idempotent)
            // Note: prisma.tenant.update requires 'where', tenant should exist
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { settings: { branding: {}, security: {}, smtp: {}, integrations: {} } }
            });

            // 2) create initial admin user if adminEmail present
            if (adminEmail) {
                const pwd = crypto.randomBytes(10).toString('base64').slice(0, 12);
                const hashed = await bcrypt.hash(pwd, 10);

                const user = await prisma.user.create({
                    data: {
                        tenantId,
                        email: adminEmail,
                        password: hashed,
                        name: 'Tenant Admin',
                        role: 'ADMIN',
                        status: 'ACTIVE'
                    }
                });

                // create audit log
                await prisma.auditLog.create({ data: { tenantId, userId: user.id, action: 'provision.user.created', metadata: { email: adminEmail } } });

                await emailService.sendOnboardingEmail(tenantId, adminEmail, 'Tenant Admin', name, { userId: user.id, tenantId, purpose: 'onboard' });
                await prisma.auditLog.create({ data: { tenantId, action: 'provision.email.enqueued', metadata: { to: adminEmail } } });
                await emailService.sendOnboardingEmail(tenantId, adminEmail, 'Tenant Admin', name, { userId: user.id, tenantId, purpose: 'onboard' });
            }

            // 3) S3 bucket provisioning stub
            // For now, record in tenant.settings: s3Provisioned: true
            // Fetch existing settings to merge or just overwrite specific keys if Json structure
            // Prisma Json update deep merge depends on version/DB, often replaces. We'll simplisticly set it.
            // Better: read first.
            const t = await prisma.tenant.findUnique({ where: { id: tenantId } });
            const currentSettings = (t?.settings as any) || {};

            await prisma.tenant.update({
                where: { id: tenantId },
                data: { settings: { ...currentSettings, s3Provisioned: true } }
            });

            // 4) mark provision completed
            await prisma.auditLog.create({ data: { tenantId, action: 'provision.completed', metadata: { tenantId } } });
            return { success: true };
        } catch (err) {
            console.error('tenant provision failed', err);
            // Ensure we don't fail audit log creation if possible
            try {
                await prisma.auditLog.create({ data: { tenantId, action: 'provision.failed', metadata: { error: String(err) } } });
            } catch (e) { console.error('Failed to log audit failure', e); }
            throw err;
        }
    }, { connection });

    worker.on('failed', (job, err) => {
        console.error('Provision job failed', job?.id, err);
    });

    return worker;
};
