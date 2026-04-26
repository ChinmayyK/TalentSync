import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

const prisma = new PrismaClient();
const redis = new IORedis('redis://127.0.0.1:6379');

async function main() {
  const tenantId = 'tenant_123';

  console.log('🔄 Updating candidate stages based on their scheduled interviews...');

  // 1. Fetch all interviews for this tenant
  const interviews = await prisma.interview.findMany({
    where: { tenantId, deletedAt: null },
    select: { candidateId: true, stage: true },
  });

  console.log(`📋 Found ${interviews.length} interviews to process.`);

  // 2. Update each candidate's stage to match their interview stage
  let updatedCount = 0;
  for (const interview of interviews) {
    await prisma.candidate.update({
      where: { id: interview.candidateId },
      data: { stage: interview.stage },
    });
    updatedCount++;
    if (updatedCount % 10 === 0) {
      console.log(`   ✅ Updated ${updatedCount} candidates...`);
    }
  }

  // 3. Clear report cache
  console.log('🧹 Clearing reports cache in Redis...');
  const keys = await redis.keys(`reports:${tenantId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`   ✅ Deleted ${keys.length} cache keys.`);
  } else {
    console.log('   ℹ️ No cache keys found.');
  }

  console.log('✨ Pipeline update complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during update:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.disconnect();
  });
