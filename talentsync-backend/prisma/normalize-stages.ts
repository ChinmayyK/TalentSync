/**
 * Normalize all stage values to uppercase HiringStage keys
 * Run with: DATABASE_URL="postgresql://chinmayk@localhost:5432/talentsync" npx ts-node prisma/normalize-stages.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map from various formats to standard uppercase keys
const STAGE_MAPPING: Record<string, string> = {
    // Applied variations
    'applied': 'APPLIED',
    'APPLIED': 'APPLIED',
    'Applied': 'APPLIED',

    // Screening variations
    'screening': 'SCREENING',
    'SCREENING': 'SCREENING',
    'Screening': 'SCREENING',
    'screen': 'SCREENING',
    'phone_screen': 'SCREENING',
    'PHONE_SCREEN': 'SCREENING',

    // Interview 1 variations
    'interview': 'INTERVIEW_1',
    'INTERVIEW': 'INTERVIEW_1',
    'Interview': 'INTERVIEW_1',
    'interview-1': 'INTERVIEW_1',
    'interview_1': 'INTERVIEW_1',
    'INTERVIEW_1': 'INTERVIEW_1',
    'INTERVIEW-1': 'INTERVIEW_1',
    'first_interview': 'INTERVIEW_1',
    'Technical Screen': 'INTERVIEW_1',

    // Interview 2 / Technical variations  
    'interview-2': 'INTERVIEW_2',
    'interview_2': 'INTERVIEW_2',
    'INTERVIEW_2': 'INTERVIEW_2',
    'INTERVIEW-2': 'INTERVIEW_2',
    'technical': 'INTERVIEW_2',
    'TECHNICAL': 'INTERVIEW_2',
    'Technical': 'INTERVIEW_2',
    'second_interview': 'INTERVIEW_2',
    'Final Round': 'INTERVIEW_2',

    // HR Round variations
    'hr': 'HR_ROUND',
    'HR': 'HR_ROUND',
    'hr-round': 'HR_ROUND',
    'hr_round': 'HR_ROUND',
    'HR_ROUND': 'HR_ROUND',
    'HR-ROUND': 'HR_ROUND',
    'hrround': 'HR_ROUND',

    // Offer variations
    'offer': 'OFFER',
    'OFFER': 'OFFER',
    'Offer': 'OFFER',
    'offered': 'OFFER',

    // Received
    'received': 'RECEIVED',
    'RECEIVED': 'RECEIVED',
    'Received': 'RECEIVED',
};

async function normalizeStages() {
    console.log('🔄 Normalizing stage values...\n');

    const tenantId = 'tenant_123'; // Adjust if needed

    // 1. Get current stage distribution for Candidates
    console.log('📊 Current Candidate stage distribution:');
    const candidateStages = await prisma.$queryRaw<{ stage: string, count: bigint }[]>`
        SELECT stage, COUNT(*)::int as count 
        FROM "Candidate" 
        WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
        GROUP BY stage 
        ORDER BY count DESC
    `;
    candidateStages.forEach(s => console.log(`   ${s.stage}: ${s.count}`));

    // 2. Get current stage distribution for Interviews
    console.log('\n📊 Current Interview stage distribution:');
    const interviewStages = await prisma.$queryRaw<{ stage: string, count: bigint }[]>`
        SELECT stage, COUNT(*)::int as count 
        FROM "Interview" 
        WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
        GROUP BY stage 
        ORDER BY count DESC
    `;
    interviewStages.forEach(s => console.log(`   ${s.stage}: ${s.count}`));

    // 3. Normalize Candidate stages
    console.log('\n📝 Normalizing Candidate stages...');
    let candidateUpdates = 0;
    for (const [oldValue, newValue] of Object.entries(STAGE_MAPPING)) {
        if (oldValue !== newValue) {
            const result = await prisma.candidate.updateMany({
                where: { tenantId, stage: oldValue },
                data: { stage: newValue }
            });
            if (result.count > 0) {
                console.log(`   ✅ ${oldValue} → ${newValue}: ${result.count} candidates`);
                candidateUpdates += result.count;
            }
        }
    }
    console.log(`   Total: ${candidateUpdates} candidates updated`);

    // 4. Normalize Interview stages
    console.log('\n📝 Normalizing Interview stages...');
    let interviewUpdates = 0;
    for (const [oldValue, newValue] of Object.entries(STAGE_MAPPING)) {
        if (oldValue !== newValue) {
            const result = await prisma.interview.updateMany({
                where: { tenantId, stage: oldValue },
                data: { stage: newValue }
            });
            if (result.count > 0) {
                console.log(`   ✅ ${oldValue} → ${newValue}: ${result.count} interviews`);
                interviewUpdates += result.count;
            }
        }
    }
    console.log(`   Total: ${interviewUpdates} interviews updated`);

    // 5. Verify final distribution
    console.log('\n✅ Final Candidate stage distribution:');
    const finalCandidateStages = await prisma.$queryRaw<{ stage: string, count: bigint }[]>`
        SELECT stage, COUNT(*)::int as count 
        FROM "Candidate" 
        WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
        GROUP BY stage 
        ORDER BY count DESC
    `;
    finalCandidateStages.forEach(s => console.log(`   ${s.stage}: ${s.count}`));

    console.log('\n✅ Final Interview stage distribution:');
    const finalInterviewStages = await prisma.$queryRaw<{ stage: string, count: bigint }[]>`
        SELECT stage, COUNT(*)::int as count 
        FROM "Interview" 
        WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
        GROUP BY stage 
        ORDER BY count DESC
    `;
    finalInterviewStages.forEach(s => console.log(`   ${s.stage}: ${s.count}`));

    console.log('\n🎉 Stage normalization complete!');
}

normalizeStages()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
