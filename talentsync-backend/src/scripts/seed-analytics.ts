import { PrismaClient, OfferStatus, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantId = 'tenant_123';
  const now = new Date();

  console.log('📊 Seeding analytics data (History and Offers)...');

  // 1. Fetch some candidates
  const candidates = await prisma.candidate.findMany({
    where: { tenantId, deletedAt: null },
    take: 200,
  });

  console.log(`👤 Processing ${candidates.length} candidates for history...`);

  const stages = ['APPLIED', 'SCREENING', 'TECHNICAL', 'HR_ROUND', 'OFFER', 'HIRED'];
  
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    
    // Create some fake stage history
    const historyCount = Math.floor(Math.random() * 4) + 1;
    let prevStage = 'APPLIED';
    
    for (let j = 0; j < historyCount; j++) {
      const newStage = stages[j + 1] || 'HIRED';
      
      // Random date in the past
      const historyDate = new Date(candidate.createdAt);
      historyDate.setDate(historyDate.getDate() + (j * 5) + Math.floor(Math.random() * 5));

      await prisma.candidateStageHistory.create({
        data: {
          tenantId,
          candidateId: candidate.id,
          previousStage: prevStage,
          newStage: newStage,
          source: 'USER',
          triggeredBy: 'MANUAL',
          createdAt: historyDate,
        },
      });
      prevStage = newStage;
    }

    // 2. Create some Offers
    if (i % 10 === 0) {
      const offerStatuses: OfferStatus[] = ['SENT', 'ACCEPTED', 'DECLINED', 'PENDING_APPROVAL'];
      const status = offerStatuses[Math.floor(Math.random() * offerStatuses.length)];
      
      await prisma.offer.create({
        data: {
          tenantId,
          candidateId: candidate.id,
          status,
          position: candidate.roleTitle || 'Software Engineer',
          salary: 120000 + (Math.random() * 50000),
          currency: 'USD',
          startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Mark some as HIRED with trend dates
    if (i % 5 === 0) {
      // Set hire date in the past 6 months
      const hireDate = new Date(now);
      hireDate.setMonth(now.getMonth() - Math.floor(Math.random() * 6));
      
      const createDate = new Date(hireDate);
      createDate.setDate(hireDate.getDate() - (15 + Math.floor(Math.random() * 30)));

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          stage: 'HIRED',
          createdAt: createDate,
          updatedAt: hireDate,
        },
      });
    }
  }

  console.log('✨ Analytics data seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
