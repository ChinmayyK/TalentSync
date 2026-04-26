/**
 * Performance Report Generator
 * Aggregates all test results into a final JSON and Markdown report
 */

import * as fs from 'fs';
import * as path from 'path';

interface KPIResult {
    name: string;
    target: string;
    actual: string;
    passed: boolean;
}

interface PerformanceReport {
    timestamp: string;
    summary: {
        totalKPIs: number;
        passedKPIs: number;
        failedKPIs: number;
        overallStatus: 'PASSED' | 'FAILED';
    };
    kpis: KPIResult[];
    details: {
        apiLoadTest: any;
        pageLoadTest: any;
        dbBenchmark: any;
        uptimeMonitor: any;
    };
}

function loadJsonFile(filePath: string): any {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.warn(`Warning: Could not load ${filePath}`);
        return null;
    }
}

function generateReport() {
    console.log('📊 Generating Performance Report...\n');

    const resultsDir = 'performance/results';

    // Load all test results
    const apiResults = loadJsonFile(path.join(resultsDir, 'api-load-results.json'));
    const pageResults = loadJsonFile(path.join(resultsDir, 'page-load-results.json'));
    const dbResults = loadJsonFile(path.join(resultsDir, 'db-benchmark-results.json'));
    const uptimeResults = loadJsonFile(path.join(resultsDir, 'uptime-results.json'));

    // Build KPI summary
    const kpis: KPIResult[] = [];

    // KPI 1: API Response Time (p95 < 200ms)
    if (apiResults) {
        const p95 = apiResults.metrics?.httpReqDuration?.p95 || 0;
        kpis.push({
            name: 'API Response Time (p95)',
            target: '< 200ms',
            actual: `${p95.toFixed(2)}ms`,
            passed: p95 < 200,
        });
    } else {
        kpis.push({
            name: 'API Response Time (p95)',
            target: '< 200ms',
            actual: 'NOT TESTED',
            passed: false,
        });
    }

    // KPI 2: Page Load Time (p95 < 2s)
    if (pageResults) {
        const maxP95 = Math.max(...pageResults.results.map((r: any) => r.p95LoadTime || 0));
        kpis.push({
            name: 'Page Load Time (p95)',
            target: '< 2000ms',
            actual: `${maxP95.toFixed(0)}ms`,
            passed: maxP95 < 2000,
        });
    } else {
        kpis.push({
            name: 'Page Load Time (p95)',
            target: '< 2000ms',
            actual: 'NOT TESTED',
            passed: false,
        });
    }

    // KPI 3: Database Query Time (p95 < 100ms)
    if (dbResults) {
        const maxDbP95 = Math.max(...dbResults.results.map((r: any) => r.p95 || 0));
        kpis.push({
            name: 'Database Query Time (p95)',
            target: '< 100ms',
            actual: `${maxDbP95.toFixed(2)}ms`,
            passed: maxDbP95 < 100,
        });
    } else {
        kpis.push({
            name: 'Database Query Time (p95)',
            target: '< 100ms',
            actual: 'NOT TESTED',
            passed: false,
        });
    }

    // KPI 4: Concurrency (based on API error rate under load)
    if (apiResults) {
        const errorRate = (apiResults.metrics?.errorRate || 0) * 100;
        kpis.push({
            name: 'Concurrency Error Rate',
            target: '< 5%',
            actual: `${errorRate.toFixed(2)}%`,
            passed: errorRate < 5,
        });
    } else {
        kpis.push({
            name: 'Concurrency Error Rate',
            target: '< 5%',
            actual: 'NOT TESTED',
            passed: false,
        });
    }

    // KPI 5: System Uptime
    if (uptimeResults) {
        const uptime = uptimeResults.metrics?.uptime || 0;
        kpis.push({
            name: 'System Uptime',
            target: '> 99.5%',
            actual: `${uptime.toFixed(2)}%`,
            passed: uptime >= 99.5,
        });
    } else {
        kpis.push({
            name: 'System Uptime',
            target: '> 99.5%',
            actual: 'NOT TESTED',
            passed: false,
        });
    }

    const passedCount = kpis.filter(k => k.passed).length;
    const failedCount = kpis.filter(k => !k.passed).length;

    const report: PerformanceReport = {
        timestamp: new Date().toISOString(),
        summary: {
            totalKPIs: kpis.length,
            passedKPIs: passedCount,
            failedKPIs: failedCount,
            overallStatus: failedCount === 0 ? 'PASSED' : 'FAILED',
        },
        kpis,
        details: {
            apiLoadTest: apiResults,
            pageLoadTest: pageResults,
            dbBenchmark: dbResults,
            uptimeMonitor: uptimeResults,
        },
    };

    // Save JSON report
    fs.writeFileSync(path.join(resultsDir, 'performance-report.json'), JSON.stringify(report, null, 2));

    // Generate Markdown report
    const markdown = generateMarkdownReport(report);
    fs.writeFileSync(path.join(resultsDir, 'performance-report.md'), markdown);

    // Print summary
    console.log('═'.repeat(60));
    console.log('              PERFORMANCE TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log('');

    for (const kpi of kpis) {
        const status = kpi.passed ? '✅' : '❌';
        console.log(`${status} ${kpi.name}`);
        console.log(`   Target: ${kpi.target} | Actual: ${kpi.actual}`);
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log(`Overall: ${report.summary.overallStatus === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`KPIs: ${passedCount}/${kpis.length} passed`);
    console.log('═'.repeat(60));

    console.log('\n📁 Reports saved:');
    console.log('   - performance/results/performance-report.json');
    console.log('   - performance/results/performance-report.md');
}

function generateMarkdownReport(report: PerformanceReport): string {
    const statusEmoji = report.summary.overallStatus === 'PASSED' ? '✅' : '❌';

    let md = `# Performance Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Overall Status | ${statusEmoji} **${report.summary.overallStatus}** |
| KPIs Passed | ${report.summary.passedKPIs} / ${report.summary.totalKPIs} |
| KPIs Failed | ${report.summary.failedKPIs} |

---

## KPI Results

| KPI | Target | Actual | Status |
|-----|--------|--------|--------|
`;

    for (const kpi of report.kpis) {
        const status = kpi.passed ? '✅ PASS' : '❌ FAIL';
        md += `| ${kpi.name} | ${kpi.target} | ${kpi.actual} | ${status} |\n`;
    }

    md += `
---

## Detailed Results

### API Load Test

`;

    if (report.details.apiLoadTest) {
        const api = report.details.apiLoadTest;
        md += `- **Total Requests:** ${api.metrics?.totalRequests || 'N/A'}
- **p50 Latency:** ${api.metrics?.httpReqDuration?.p50?.toFixed(2) || 'N/A'}ms
- **p90 Latency:** ${api.metrics?.httpReqDuration?.p90?.toFixed(2) || 'N/A'}ms
- **p95 Latency:** ${api.metrics?.httpReqDuration?.p95?.toFixed(2) || 'N/A'}ms
- **p99 Latency:** ${api.metrics?.httpReqDuration?.p99?.toFixed(2) || 'N/A'}ms
- **Error Rate:** ${((api.metrics?.errorRate || 0) * 100).toFixed(2)}%
`;
    } else {
        md += `*Not tested*\n`;
    }

    md += `
### Page Load Test

`;

    if (report.details.pageLoadTest) {
        md += `| Page | Avg Load Time | p95 Load Time | Status |
|------|---------------|---------------|--------|
`;
        for (const page of report.details.pageLoadTest.results) {
            const status = page.passed ? '✅' : '❌';
            md += `| ${page.page} | ${page.avgLoadTime?.toFixed(0) || 'N/A'}ms | ${page.p95LoadTime?.toFixed(0) || 'N/A'}ms | ${status} |\n`;
        }
    } else {
        md += `*Not tested*\n`;
    }

    md += `
### Database Query Benchmark

`;

    if (report.details.dbBenchmark) {
        md += `| Query | Avg Latency | p95 Latency | Status |
|-------|-------------|-------------|--------|
`;
        for (const query of report.details.dbBenchmark.results) {
            const status = query.passed ? '✅' : '❌';
            md += `| ${query.name} | ${query.avg?.toFixed(2) || 'N/A'}ms | ${query.p95?.toFixed(2) || 'N/A'}ms | ${status} |\n`;
        }
    } else {
        md += `*Not tested*\n`;
    }

    md += `
### Uptime Monitoring

`;

    if (report.details.uptimeMonitor) {
        const uptime = report.details.uptimeMonitor;
        md += `- **Total Pings:** ${uptime.simulation?.totalPings || 'N/A'}
- **Successful:** ${uptime.metrics?.successfulPings || 'N/A'}
- **Failed:** ${uptime.metrics?.failedPings || 'N/A'}
- **Uptime:** ${uptime.metrics?.uptime?.toFixed(2) || 'N/A'}%
- **Avg Response Time:** ${uptime.metrics?.avgResponseTime?.toFixed(2) || 'N/A'}ms
`;
    } else {
        md += `*Not tested*\n`;
    }

    md += `
---

## Performance Targets (SOW)

| Metric | Target | Status |
|--------|--------|--------|
| API Response Time | p95 < 200ms | ${report.kpis[0]?.passed ? '✅' : '❌'} |
| Page Load Time | p95 < 2s | ${report.kpis[1]?.passed ? '✅' : '❌'} |
| Database Queries | p95 < 100ms | ${report.kpis[2]?.passed ? '✅' : '❌'} |
| Concurrency | 5000 users, <5% degradation | ${report.kpis[3]?.passed ? '✅' : '❌'} |
| System Uptime | 99.5% | ${report.kpis[4]?.passed ? '✅' : '❌'} |

---

*Generated by Lineup Performance Testing Suite*
`;

    return md;
}

generateReport();
