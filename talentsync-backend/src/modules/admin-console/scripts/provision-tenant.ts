#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const name = process.argv[2];
    const domain = process.argv[3] || null;
    if (!name) { console.error('Usage: provision-tenant <name> [domain]'); process.exit(1); }

    const tenant = await prisma.tenant.create({ data: { name, domain } });
    console.log('Created tenant', tenant.id);
    // Optional: call provisioning queue logic here if we wanted to reuse it, 
    // but for CLI simple DB create is often enough or we can import service.
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
