/**
 * Database Query Performance Benchmark
 * Measures Prisma query execution times for key operations
 * Target: p95 < 100ms
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
    ],
});

interface QueryMetric {
    query: string;
    duration: number;
    timestamp: Date;
}

const queryMetrics: QueryMetric[] = [];

// Capture query timing
prisma.$on('query' as never, (e: any) => {
    queryMetrics.push({
        query: e.query?.substring(0, 100) || 'unknown',
        duration: e.duration || 0,
        timestamp: new Date(),
    });
});

// Calculate percentile
function percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

// Benchmark wrapper
async function benchmark<T>(name: string, fn: () => Promise<T>): Promise<{ name: string; duration: number; result: T }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { name, duration, result };
}

async function runBenchmarks() {
    console.log('🔬 Starting Database Performance Benchmarks...\n');

    const results: { name: string; durations: number[]; p95: number; avg: number; passed: boolean }[] = [];
    const iterations = 50; // Number of times to run each query

    // Get a valid tenant ID
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.error('❌ No tenant found in database');
        return;
    }
    const tenantId = tenant.id;

    // ========================================
    // 1. Candidate List Query with Filters
    // ========================================
    console.log('📋 Testing: Candidate List Query');
    const candidateDurations: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const { duration } = await benchmark('candidates_list', () =>
            prisma.candidate.findMany({
                where: { tenantId },
                take: 50,
                orderBy: { createdAt: 'desc' },
                include: { interviews: { take: 1 } },
            })
        );
        candidateDurations.push(duration);
    }

    results.push({
        name: 'Candidate List',
        durations: candidateDurations,
        p95: percentile(candidateDurations, 95),
        avg: candidateDurations.reduce((a, b) => a + b, 0) / candidateDurations.length,
        passed: percentile(candidateDurations, 95) < 100,
    });

    // ========================================
    // 2. Interview Scheduling Query
    // ========================================
    console.log('📅 Testing: Interview Scheduling Query');
    const interviewDurations: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const { duration } = await benchmark('interviews_schedule', () =>
            prisma.interview.findMany({
                where: {
                    tenantId,
                    date: { gte: new Date() },
                },
                take: 20,
                orderBy: { date: 'asc' },
                include: {
                    candidate: true,
                    feedbacks: true,
                },
            })
        );
        interviewDurations.push(duration);
    }

    results.push({
        name: 'Interview Scheduling',
        durations: interviewDurations,
        p95: percentile(interviewDurations, 95),
        avg: interviewDurations.reduce((a, b) => a + b, 0) / interviewDurations.length,
        passed: percentile(interviewDurations, 95) < 100,
    });

    // ========================================
    // 3. Message Log Retrieval
    // ========================================
    console.log('💬 Testing: Message Log Retrieval');
    const messageDurations: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const { duration } = await benchmark('message_logs', () =>
            prisma.messageLog.findMany({
                where: { tenantId },
                take: 100,
                orderBy: { createdAt: 'desc' },
            })
        );
        messageDurations.push(duration);
    }

    results.push({
        name: 'Message Log Retrieval',
        durations: messageDurations,
        p95: percentile(messageDurations, 95),
        avg: messageDurations.reduce((a, b) => a + b, 0) / messageDurations.length,
        passed: percentile(messageDurations, 95) < 100,
    });

    // ========================================
    // 4. Tenant Usage Aggregation
    // ========================================
    console.log('📊 Testing: Tenant Usage Aggregation');
    const usageDurations: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const { duration } = await benchmark('tenant_usage', async () => {
            const [candidateCount, interviewCount, messageCount] = await Promise.all([
                prisma.candidate.count({ where: { tenantId } }),
                prisma.interview.count({ where: { tenantId } }),
                prisma.messageLog.count({ where: { tenantId } }),
            ]);
            return { candidateCount, interviewCount, messageCount };
        });
        usageDurations.push(duration);
    }

    results.push({
        name: 'Tenant Usage Aggregation',
        durations: usageDurations,
        p95: percentile(usageDurations, 95),
        avg: usageDurations.reduce((a, b) => a + b, 0) / usageDurations.length,
        passed: percentile(usageDurations, 95) < 100,
    });

    // ========================================
    // 5. Complex Join Query (Busy Blocks + Working Hours)
    // ========================================
    console.log('🗓️ Testing: Calendar Availability Query');
    const calendarDurations: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const { duration } = await benchmark('calendar_availability', async () => {
            const now = new Date();
            const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const [busyBlocks, workingHours] = await Promise.all([
                prisma.busyBlock.findMany({
                    where: {
                        tenantId,
                        startAt: { lte: weekLater },
                        endAt: { gte: now },
                    },
                }),
                prisma.workingHours.findMany({
                    where: { tenantId },
                }),
            ]);
            return { busyBlocks, workingHours };
        });
        calendarDurations.push(duration);
    }

    results.push({
        name: 'Calendar Availability',
        durations: calendarDurations,
        p95: percentile(calendarDurations, 95),
        avg: calendarDurations.reduce((a, b) => a + b, 0) / calendarDurations.length,
        passed: percentile(calendarDurations, 95) < 100,
    });

    // ========================================
    // Generate Report
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE BENCHMARK RESULTS');
    console.log('='.repeat(60) + '\n');

    console.log('Target: p95 < 100ms\n');

    let allPassed = true;

    for (const result of results) {
        const status = result.passed ? '✅' : '❌';
        allPassed = allPassed && result.passed;

        console.log(`${status} ${result.name}`);
        console.log(`   avg: ${result.avg.toFixed(2)}ms`);
        console.log(`   p95: ${result.p95.toFixed(2)}ms`);
        console.log('');
    }

    console.log('='.repeat(60));
    console.log(`Overall: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));

    // Save results to JSON
    const report = {
        timestamp: new Date().toISOString(),
        testType: 'Database Query Benchmark',
        target: 'p95 < 100ms',
        iterations,
        results: results.map(r => ({
            name: r.name,
            avg: parseFloat(r.avg.toFixed(2)),
            p95: parseFloat(r.p95.toFixed(2)),
            passed: r.passed,
        })),
        overall: {
            passed: allPassed,
            totalQueries: queryMetrics.length,
        },
    };

    const fs = await import('fs');
    fs.mkdirSync('performance/results', { recursive: true });
    fs.writeFileSync('performance/results/db-benchmark-results.json', JSON.stringify(report, null, 2));
    console.log('\n📁 Results saved to performance/results/db-benchmark-results.json');

    await prisma.$disconnect();
}

runBenchmarks().catch(console.error);
