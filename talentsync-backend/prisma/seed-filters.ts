/**
 * Add test data for dashboard filter testing
 * Run with: npx ts-node prisma/seed-filters.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Adding test data for dashboard filters...\n');

    // Get existing tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error('No tenant found. Run npm run seed first.');
    }
    console.log(`📌 Using tenant: ${tenant.name}`);

    // Get admin user
    const adminUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id, role: 'ADMIN' }
    });
    if (!adminUser) {
        throw new Error('No admin found. Run npm run seed first.');
    }
    console.log(`👤 Using admin: ${adminUser.email}\n`);

    // Define test candidates with all stages
    const testCandidates = [
        { name: 'Test Applied User', email: 'applied@test.com', stage: 'applied' },
        { name: 'Test Received User', email: 'received@test.com', stage: 'received' },
        { name: 'Test Screening User', email: 'screening@test.com', stage: 'screening' },
        { name: 'Test Interview1 User', email: 'interview1@test.com', stage: 'interview-1' },
        { name: 'Test Interview2 User', email: 'interview2@test.com', stage: 'interview-2' },
        { name: 'Test HR Round User', email: 'hrround@test.com', stage: 'hr-round' },
        { name: 'Test Offer User', email: 'offer@test.com', stage: 'offer' },
        // Extra candidates for status variety
        { name: 'Test Completed User', email: 'completed@test.com', stage: 'interview-1' },
        { name: 'Test Cancelled User', email: 'cancelled@test.com', stage: 'screening' },
        { name: 'Test NoShow User', email: 'noshow@test.com', stage: 'hr-round' },
        { name: 'Test Pending User', email: 'pending@test.com', stage: 'interview-2' },
    ];

    // Create or update candidates
    const candidates: any[] = [];
    for (const c of testCandidates) {
        let candidate = await prisma.candidate.findFirst({
            where: { tenantId: tenant.id, email: c.email }
        });

        if (!candidate) {
            candidate = await prisma.candidate.create({
                data: {
                    tenantId: tenant.id,
                    name: c.name,
                    email: c.email,
                    phone: '+1555' + Math.floor(1000000 + Math.random() * 9000000),
                    stage: c.stage,
                    source: 'Test Data',
                }
            });
            console.log(`✅ Created: ${c.name} (${c.stage})`);
        } else {
            console.log(`⏭️  Exists: ${c.name}`);
        }
        candidates.push(candidate);
    }

    console.log('\n📅 Creating interviews with various statuses...\n');

    // Create interviews with different stages and statuses
    const interviews = [
        // Stage-based interviews (all SCHEDULED for today+)
        { idx: 0, stage: 'APPLIED', status: 'SCHEDULED', daysFromNow: 1 },
        { idx: 1, stage: 'RECEIVED', status: 'SCHEDULED', daysFromNow: 2 },
        { idx: 2, stage: 'SCREENING', status: 'SCHEDULED', daysFromNow: 0 }, // Today
        { idx: 3, stage: 'INTERVIEW', status: 'SCHEDULED', daysFromNow: 3 },
        { idx: 4, stage: 'TECHNICAL', status: 'SCHEDULED', daysFromNow: 4 },
        { idx: 5, stage: 'HR_ROUND', status: 'SCHEDULED', daysFromNow: 5 },
        { idx: 6, stage: 'OFFER', status: 'SCHEDULED', daysFromNow: 6 },
        // Status-based interviews (for status filter testing)
        { idx: 7, stage: 'INTERVIEW', status: 'COMPLETED', daysFromNow: -2 },
        { idx: 8, stage: 'SCREENING', status: 'CANCELLED', daysFromNow: -1 },
        { idx: 9, stage: 'HR_ROUND', status: 'NO_SHOW', daysFromNow: -3 },
        { idx: 10, stage: 'TECHNICAL', status: 'PENDING_FEEDBACK', daysFromNow: -1 },
    ];

    for (const i of interviews) {
        const candidate = candidates[i.idx];
        const date = new Date();
        date.setDate(date.getDate() + i.daysFromNow);
        date.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

        await prisma.interview.create({
            data: {
                tenantId: tenant.id,
                candidateId: candidate.id,
                interviewerIds: [adminUser.id],
                date,
                durationMins: 45,
                stage: i.stage,
                status: i.status,
                hasFeedback: i.status === 'COMPLETED',
                meetingLink: `https://meet.google.com/test-${Math.random().toString(36).substring(7)}`,
            }
        });
        console.log(`✅ Interview: ${candidate.name} | ${i.stage} | ${i.status}`);
    }

    console.log('\n🎉 Test data created!');
    console.log('\n📊 Filter coverage:');
    console.log('   Stages: APPLIED, RECEIVED, SCREENING, INTERVIEW, TECHNICAL, HR_ROUND, OFFER');
    console.log('   Statuses: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW, PENDING_FEEDBACK');
    console.log('\n   Refresh the dashboard to test all filters!');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
