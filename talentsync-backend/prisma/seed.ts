import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedCommunicationTemplates } from './seeds/seed-templates';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Clear existing data (optional - comment out if you want to keep data)
    console.log('🗑️  Clearing existing data...');
    await prisma.messageLog.deleteMany({});
    await prisma.scheduledMessage.deleteMany({});
    await prisma.automationRule.deleteMany({});
    await prisma.messageTemplate.deleteMany({});
    await prisma.interview.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.userCustomRole.deleteMany({}); // Clear custom role assignments
    await prisma.user.deleteMany({});

    // Create tenant
    const tenant = await prisma.tenant.upsert({
        where: { id: 'tenant_123' },
        update: { name: 'TalentSync' },
        create: {
            id: 'tenant_123',
            name: 'TalentSync',
            domain: 'talentsync.com',
            settings: {},
        },
    });
    console.log('✅ Created tenant:', tenant.name);

    // Create default hiring stages for the tenant
    const defaultStages = [
        { key: 'APPLIED', name: 'Applied', order: 1, isTerminal: false },
        { key: 'SCREENING', name: 'Screening', order: 2, isTerminal: false },
        { key: 'INTERVIEW', name: 'Interview', order: 3, isTerminal: false },
        { key: 'INTERVIEW_1', name: 'Interview 1', order: 4, isTerminal: false },
        { key: 'INTERVIEW_2', name: 'Interview 2', order: 5, isTerminal: false },
        { key: 'HR_ROUND', name: 'HR Round', order: 6, isTerminal: false },
        { key: 'OFFER', name: 'Offer', order: 7, isTerminal: false },
        { key: 'HIRED', name: 'Hired', order: 8, isTerminal: true },
        { key: 'REJECTED', name: 'Rejected', order: 9, isTerminal: true },
    ];

    for (const stage of defaultStages) {
        await prisma.hiringStage.upsert({
            where: { tenantId_key: { tenantId: tenant.id, key: stage.key } },
            update: {},
            create: {
                tenantId: tenant.id,
                key: stage.key,
                name: stage.name,
                order: stage.order,
                isTerminal: stage.isTerminal,
                isActive: true,
            },
        });
    }
    console.log('✅ Created', defaultStages.length, 'hiring stages');


    // Create SUPERADMIN user (Platform Admin - Chinmay Kudalkar)
    const hashedPassword = await bcrypt.hash('password123', 12);
    const superadminUser = await prisma.user.create({
        data: {
            email: 'superadmin@talentsync.com',
            password: hashedPassword,
            name: 'Chinmay Kudalkar',
            role: 'SUPERADMIN',
            tenantId: tenant.id,
        },
    });
    console.log('✅ Created SUPERADMIN:', superadminUser.email);

    // Create UserTenant record for superadmin
    await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId: superadminUser.id, tenantId: tenant.id } },
        update: { role: 'SUPERADMIN', status: 'ACTIVE' },
        create: {
            userId: superadminUser.id,
            tenantId: tenant.id,
            role: 'SUPERADMIN',
            status: 'ACTIVE',
        },
    });

    // Create ADMIN user (Tenant Admin)
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@talentsync.com',
            password: hashedPassword,
            name: 'Raj Patel',
            role: 'ADMIN',
            tenantId: tenant.id,
        },
    });
    console.log('✅ Created ADMIN:', adminUser.email);

    await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
        update: { role: 'ADMIN', status: 'ACTIVE' },
        create: {
            userId: adminUser.id,
            tenantId: tenant.id,
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });

    // Create MANAGER user
    const managerUser = await prisma.user.create({
        data: {
            email: 'manager@talentsync.com',
            password: hashedPassword,
            name: 'Anita Desai',
            role: 'MANAGER',
            tenantId: tenant.id,
        },
    });
    console.log('✅ Created MANAGER:', managerUser.email);

    await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId: managerUser.id, tenantId: tenant.id } },
        update: { role: 'MANAGER', status: 'ACTIVE' },
        create: {
            userId: managerUser.id,
            tenantId: tenant.id,
            role: 'MANAGER',
            status: 'ACTIVE',
        },
    });

    // Create RECRUITER user
    const recruiterUser = await prisma.user.create({
        data: {
            email: 'recruiter@talentsync.com',
            password: hashedPassword,
            name: 'Priya Sharma',
            role: 'RECRUITER',
            tenantId: tenant.id,
        },
    });
    console.log('✅ Created RECRUITER:', recruiterUser.email);

    await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId: recruiterUser.id, tenantId: tenant.id } },
        update: { role: 'RECRUITER', status: 'ACTIVE' },
        create: {
            userId: recruiterUser.id,
            tenantId: tenant.id,
            role: 'RECRUITER',
            status: 'ACTIVE',
        },
    });

    // Create INTERVIEWER users
    const interviewers = await Promise.all([
        prisma.user.create({
            data: {
                email: 'interviewer@talentsync.com',
                password: hashedPassword,
                name: 'Sarah Chen',
                role: 'INTERVIEWER',
                tenantId: tenant.id,
            },
        }),
        prisma.user.create({
            data: {
                email: 'interviewer2@talentsync.com',
                password: hashedPassword,
                name: 'Mike Johnson',
                role: 'INTERVIEWER',
                tenantId: tenant.id,
            },
        }),
    ]);
    console.log('✅ Created', interviewers.length, 'INTERVIEWER users');

    // Create UserTenant records for all interviewers
    for (const user of interviewers) {
        await prisma.userTenant.upsert({
            where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
            update: { role: 'INTERVIEWER', status: 'ACTIVE' },
            create: {
                userId: user.id,
                tenantId: tenant.id,
                role: 'INTERVIEWER',
                status: 'ACTIVE',
            },
        });
    }
    console.log('✅ Created UserTenant records for all users');

    // Create realistic candidates
    const candidates = await Promise.all([
        prisma.candidate.create({
            data: {
                name: 'Alex Rivera',
                email: 'alex.rivera@gmail.com',
                phone: '+1-555-0101',
                tenantId: tenant.id,
                stage: 'screening',
                source: 'LinkedIn',
            },
        }),
        prisma.candidate.create({
            data: {
                name: 'Emma Watson',
                email: 'emma.watson@outlook.com',
                phone: '+1-555-0102',
                tenantId: tenant.id,
                stage: 'interview',
                source: 'Referral',
            },
        }),
        prisma.candidate.create({
            data: {
                name: 'James Park',
                email: 'james.park@yahoo.com',
                phone: '+1-555-0103',
                tenantId: tenant.id,
                stage: 'technical',
                source: 'Job Board',
            },
        }),
        prisma.candidate.create({
            data: {
                name: 'Sofia Martinez',
                email: 'sofia.martinez@gmail.com',
                phone: '+1-555-0104',
                tenantId: tenant.id,
                stage: 'offer',
                source: 'Website',
            },
        }),
        prisma.candidate.create({
            data: {
                name: 'David Kim',
                email: 'david.kim@proton.me',
                phone: '+1-555-0105',
                tenantId: tenant.id,
                stage: 'screening',
                source: 'Indeed',
            },
        }),
    ]);
    console.log('✅ Created', candidates.length, 'candidates');

    // Create sample interviews
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    await prisma.interview.create({
        data: {
            tenantId: tenant.id,
            candidateId: candidates[0].id,
            interviewerIds: [interviewers[0].id],
            date: tomorrow,
            durationMins: 45,
            stage: 'Technical Screen',
            status: 'SCHEDULED',
            meetingLink: 'https://meet.google.com/abc-defg-hij',
        },
    });

    await prisma.interview.create({
        data: {
            tenantId: tenant.id,
            candidateId: candidates[1].id,
            interviewerIds: [interviewers[1].id, interviewers[0].id],
            date: nextWeek,
            durationMins: 60,
            stage: 'Final Round',
            status: 'SCHEDULED',
            meetingLink: 'https://zoom.us/j/1234567890',
        },
    });
    console.log('✅ Created 2 sample interviews');

    // Seed communication templates
    await seedCommunicationTemplates(tenant.id);
    console.log('✅ Seeded communication templates');

    console.log('\n🎉 Seeding complete!');
    console.log('\n📝 Login credentials (all passwords: password123):');
    console.log('   SUPERADMIN:  superadmin@talentsync.com');
    console.log('   ADMIN:       admin@talentsync.com');
    console.log('   MANAGER:     manager@talentsync.com');
    console.log('   RECRUITER:   recruiter@talentsync.com');
    console.log('   INTERVIEWER: interviewer@talentsync.com');
    console.log('\n👥 Candidates to message:');
    candidates.forEach(c => console.log(`   - ${c.name} (${c.email})`));
    console.log('\n💡 All emails will appear in MailHog at http://localhost:8025');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
