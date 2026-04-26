
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('All Users:', JSON.stringify(users, null, 2));

    const tenants = await prisma.tenant.findMany();
    console.log('All Tenants:', JSON.stringify(tenants, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
