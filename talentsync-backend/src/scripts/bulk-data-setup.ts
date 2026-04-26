import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'tenant_123';
  const passwordHash = await bcrypt.hash('password123', 12);

  console.log('🚀 Starting bulk data setup...');

  // 1. Add 7 Interviewers
  console.log('👤 Adding 7 interviewers...');
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
  
  const interviewers = [];
  for (let i = 1; i <= 7; i++) {
    const name = `${firstNames[i - 1]} ${lastNames[i - 1]}`;
    const email = `interviewer.${i}@talentsync.com`;
    
    const interviewer = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: passwordHash,
        name,
        role: Role.INTERVIEWER,
        status: UserStatus.ACTIVE,
        tenantId,
        userTenants: {
          create: {
            tenantId,
            role: Role.INTERVIEWER,
            status: 'ACTIVE',
          },
        },
      },
    });
    interviewers.push(interviewer);
    console.log(`   ✅ Added: ${name} (${email})`);
  }

  // 2. Fetch 50 candidates
  console.log('👥 Fetching 50 candidates...');
  const candidates = await prisma.candidate.findMany({
    where: { tenantId, deletedAt: null },
    take: 50,
  });

  if (candidates.length < 50) {
    console.warn(`   ⚠️ Only found ${candidates.length} candidates. Creating interviews for all of them.`);
  }

  // 3. Setup 50 interviews
  console.log('📅 Setting up 50 interviews...');
  const stages = ['SCREENING', 'TECHNICAL', 'CULTURE', 'FINAL'];
  const now = new Date();

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const interviewer = interviewers[i % interviewers.length];
    
    // Random date in the next 14 days
    const interviewDate = new Date(now);
    interviewDate.setDate(now.getDate() + Math.floor(Math.random() * 14) + 1);
    interviewDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

    await prisma.interview.create({
      data: {
        tenantId,
        candidateId: candidate.id,
        interviewerIds: [interviewer.id],
        date: interviewDate,
        durationMins: 45,
        stage: stages[Math.floor(Math.random() * stages.length)],
        status: 'SCHEDULED',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        notes: `Bulk setup interview for ${candidate.name}`,
      },
    });

    if ((i + 1) % 10 === 0) {
      console.log(`   ✅ Created ${i + 1} interviews...`);
    }
  }

  console.log('✨ Bulk data setup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during setup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
