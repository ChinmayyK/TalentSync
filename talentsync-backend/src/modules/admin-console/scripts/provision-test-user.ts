#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Provisioning test environment...');

    const email = 'test@talentsync.com';
    const password = 'Password@123';
    const domain = 'test-talentsync.com';

    // 1. Create or get Tenant
    let tenant = await prisma.tenant.findUnique({ where: { domain } });
    if (!tenant) {
        tenant = await prisma.tenant.create({
            data: {
                name: 'Test Tenant',
                domain,
                domainVerified: true,
                settings: {
                    branding: { logo: 'https://placehold.co/200x50' },
                    smtp: {
                        // Using Ethereal or similar would be better, but we can't easily auto-gen here without API.
                        // We will rely on console logs from fallback or if EmailService defaults are set.
                        // Or user can configure manually.
                        // Setting dummy for now so tests don't crash if they check for settings.
                    }
                }
            }
        });
        console.log(`Created tenant: ${tenant.name} (${tenant.id})`);
    } else {
        console.log(`Using existing tenant: ${tenant.name} (${tenant.id})`);
    }

    // 2. Create Admin User
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        console.log(`User ${email} already exists. Resetting password.`);
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { password: hashedPassword, tenantId: tenant.id, role: 'ADMIN', status: 'ACTIVE' }
        });
    } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Test Admin',
                role: 'ADMIN',
                status: 'ACTIVE',
                tenantId: tenant.id,
                emailVerified: true
            }
        });
        console.log(`Created user: ${email}`);
    }

    console.log('\n==================================================');
    console.log('LOGIN CREDENTIALS:');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('==================================================\n');

    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
