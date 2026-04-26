/**
 * Seed default hiring stages for existing tenants
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_HIRING_STAGES = [
    { name: 'Applied', key: 'APPLIED', order: 1, color: '#6366f1', isDefault: true },
    { name: 'Screening', key: 'SCREENING', order: 2, color: '#8b5cf6' },
    { name: 'Interview 1', key: 'INTERVIEW_1', order: 3, color: '#0ea5e9' },
    { name: 'Interview 2', key: 'INTERVIEW_2', order: 4, color: '#06b6d4' },
    { name: 'HR Round', key: 'HR_ROUND', order: 5, color: '#10b981' },
    { name: 'Offer', key: 'OFFER', order: 6, color: '#22c55e' },
];

async function main() {
    console.log('🌱 Seeding default hiring stages...\n');

    const tenants = await prisma.tenant.findMany();
    console.log(`Found ${tenants.length} tenant(s)\n`);

    for (const tenant of tenants) {
        const existingCount = await prisma.hiringStage.count({
            where: { tenantId: tenant.id }
        });

        if (existingCount > 0) {
            console.log(`⏭️  Tenant "${tenant.name}" already has ${existingCount} stages, skipping`);
            continue;
        }

        await prisma.hiringStage.createMany({
            data: DEFAULT_HIRING_STAGES.map(s => ({
                tenantId: tenant.id,
                name: s.name,
                key: s.key,
                order: s.order,
                color: s.color,
                isDefault: s.isDefault || false,
            })),
        });

        console.log(`✅ Created ${DEFAULT_HIRING_STAGES.length} stages for tenant "${tenant.name}"`);
    }

    console.log('\n🎉 Seeding complete!');
}

main()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
