/**
 * Seed script to create test candidates and interviews
 * covering all dashboard filter options
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Starting seed for dashboard filter testing...\n');

    // Get tenant and admin user
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.error('❌ No tenant found. Please run the app first.');
        process.exit(1);
    }
    console.log(`📌 Using tenant: ${tenant.name} (${tenant.id})`);

    const adminUser = await prisma.user.findFirst({
        where: { tenantId: tenant.id, role: 'ADMIN' }
    });
    if (!adminUser) {
        console.error('❌ No admin user found.');
        process.exit(1);
    }
    console.log(`👤 Using admin: ${adminUser.email}\n`);

    // Create test candidates
    const stages = ['APPLIED', 'RECEIVED', 'SCREENING', 'INTERVIEW', 'TECHNICAL', 'HR_ROUND', 'OFFER'];
    const statuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PENDING_FEEDBACK'];

    const testCandidates = [
        { name: 'Alice Johnson', email: 'alice@test.com', position: 'Senior Frontend Developer', stage: 'SCREENING' },
        { name: 'Bob Smith', email: 'bob@test.com', position: 'Product Manager', stage: 'INTERVIEW' },
        { name: 'Charlie Brown', email: 'charlie@test.com', position: 'UX Designer', stage: 'HR_ROUND' },
        { name: 'Diana Prince', email: 'diana@test.com', position: 'Backend Engineer', stage: 'TECHNICAL' },
        { name: 'Edward Norton', email: 'edward@test.com', position: 'DevOps Engineer', stage: 'OFFER' },
        { name: 'Fiona Apple', email: 'fiona@test.com', position: 'Data Scientist', stage: 'APPLIED' },
        { name: 'George Lucas', email: 'george@test.com', position: 'Full Stack Developer', stage: 'RECEIVED' },
        { name: 'Helen Troy', email: 'helen@test.com', position: 'QA Engineer', stage: 'SCREENING' },
        { name: 'Ivan Petrov', email: 'ivan@test.com', position: 'Mobile Developer', stage: 'INTERVIEW' },
        { name: 'Julia Roberts', email: 'julia@test.com', position: 'Project Manager', stage: 'HR_ROUND' },
    ];

    const createdCandidates = [];
    for (const c of testCandidates) {
        // Check if exists
        let candidate = await prisma.candidate.findFirst({
            where: { email: c.email, tenantId: tenant.id }
        });

        if (!candidate) {
            candidate = await prisma.candidate.create({
                data: {
                    tenantId: tenant.id,
                    name: c.name,
                    email: c.email,
                    phone: '+1' + Math.floor(1000000000 + Math.random() * 9000000000),
                    position: c.position,
                    stage: c.stage,
                    source: 'SEED_SCRIPT',
                    notes: 'Test candidate for filter testing',
                }
            });
            console.log(`✅ Created candidate: ${c.name} (${c.stage})`);
        } else {
            console.log(`⏭️  Candidate exists: ${c.name}`);
        }
        createdCandidates.push(candidate);
    }

    console.log('\n📅 Creating interviews with various stages and statuses...\n');

    // Create interviews with different statuses and stages
    const interviewData = [
        // Screening stage - various statuses
        { candidateIdx: 0, stage: 'SCREENING', status: 'SCHEDULED', daysFromNow: 1 },
        { candidateIdx: 7, stage: 'SCREENING', status: 'COMPLETED', daysFromNow: -2, hasFeedback: true },

        // Interview-1 stage
        { candidateIdx: 1, stage: 'INTERVIEW', status: 'SCHEDULED', daysFromNow: 2 },
        { candidateIdx: 8, stage: 'INTERVIEW', status: 'PENDING_FEEDBACK', daysFromNow: -1, hasFeedback: false },

        // Interview-2 / Technical stage
        { candidateIdx: 3, stage: 'TECHNICAL', status: 'SCHEDULED', daysFromNow: 3 },
        { candidateIdx: 3, stage: 'TECHNICAL', status: 'CANCELLED', daysFromNow: -3 },

        // HR Round stage
        { candidateIdx: 2, stage: 'HR_ROUND', status: 'SCHEDULED', daysFromNow: 0 }, // Today
        { candidateIdx: 9, stage: 'HR_ROUND', status: 'NO_SHOW', daysFromNow: -4 },

        // Offer stage
        { candidateIdx: 4, stage: 'OFFER', status: 'COMPLETED', daysFromNow: -5, hasFeedback: true },

        // Applied stage (phone screen)
        { candidateIdx: 5, stage: 'APPLIED', status: 'SCHEDULED', daysFromNow: 4 },

        // Received stage
        { candidateIdx: 6, stage: 'RECEIVED', status: 'SCHEDULED', daysFromNow: 5 },
    ];

    for (const i of interviewData) {
        const candidate = createdCandidates[i.candidateIdx];
        const interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() + i.daysFromNow);
        interviewDate.setHours(10 + Math.floor(Math.random() * 6), 0, 0, 0);

        // Check if similar interview exists
        const existing = await prisma.interview.findFirst({
            where: {
                tenantId: tenant.id,
                candidateId: candidate.id,
                stage: i.stage,
                status: i.status,
            }
        });

        if (!existing) {
            await prisma.interview.create({
                data: {
                    tenantId: tenant.id,
                    candidateId: candidate.id,
                    interviewerIds: [adminUser.id],
                    date: interviewDate,
                    durationMins: 45,
                    stage: i.stage,
                    status: i.status,
                    hasFeedback: i.hasFeedback || false,
                    meetingLink: 'https://meet.google.com/test-' + Math.random().toString(36).substring(7),
                    notes: `Test interview - Stage: ${i.stage}, Status: ${i.status}`,
                }
            });
            console.log(`✅ Created interview: ${candidate.name} | ${i.stage} | ${i.status} | ${i.daysFromNow >= 0 ? '+' : ''}${i.daysFromNow} days`);
        } else {
            console.log(`⏭️  Interview exists: ${candidate.name} | ${i.stage} | ${i.status}`);
        }
    }

    console.log('\n🎉 Seed complete! Summary:');
    console.log('   📊 Stages covered: APPLIED, RECEIVED, SCREENING, INTERVIEW, TECHNICAL, HR_ROUND, OFFER');
    console.log('   📈 Statuses covered: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW, PENDING_FEEDBACK');
    console.log('\n   Refresh the dashboard to test the filters!');
}

seed()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
