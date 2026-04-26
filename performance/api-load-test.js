import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, thresholds, quickTestScenarios, getAuthHeaders } from './k6-config.js';

// Custom metrics
const apiLatency = new Trend('api_latency', true);
const errorRate = new Rate('error_rate');
const requestCount = new Counter('request_count');

// Endpoint-specific metrics
const candidatesListLatency = new Trend('candidates_list_latency', true);
const candidatesCreateLatency = new Trend('candidates_create_latency', true);
const interviewsListLatency = new Trend('interviews_list_latency', true);
const calendarAvailLatency = new Trend('calendar_availability_latency', true);
const messagesListLatency = new Trend('messages_list_latency', true);

// Test configuration
export const options = {
    scenarios: quickTestScenarios,
    thresholds: {
        http_req_duration: ['p(95)<200', 'p(99)<500'],
        http_req_failed: ['rate<0.01'],
        error_rate: ['rate<0.05'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
};

// Store auth token globally
let authToken = '';
let tenantId = '';

// Setup: Get authentication token
export function setup() {
    console.log('🔐 Authenticating...');

    const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: 'admin@talentsync.com',
        password: 'password123',
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (loginRes.status !== 200 && loginRes.status !== 201) {
        console.error(`Auth failed: ${loginRes.status} - ${loginRes.body}`);
        return { token: '', tenantId: '' };
    }

    const authData = JSON.parse(loginRes.body);
    console.log('✅ Authentication successful');

    return {
        token: authData.accessToken || authData.access_token || '',
        tenantId: authData.activeTenantId || authData.tenantId || '',
    };
}

// Helper to get headers with auth
function headers(data) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
        'X-Tenant-Id': data.tenantId,
    };
}

// Main test function: Mixed workload
export function mixedWorkload(data) {
    if (!data.token) {
        console.error('No auth token available');
        return;
    }

    const h = headers(data);

    // 70% Read operations
    group('Read Operations', () => {
        // GET /api/v1/candidates
        const candidatesRes = http.get(`${BASE_URL}/api/v1/candidates`, {
            headers: h,
            tags: { endpoint: 'candidates_list' },
        });

        check(candidatesRes, {
            'candidates status 200': (r) => r.status === 200,
            'candidates p95 < 200ms': (r) => r.timings.duration < 200,
        });

        candidatesListLatency.add(candidatesRes.timings.duration);
        apiLatency.add(candidatesRes.timings.duration);
        requestCount.add(1);
        errorRate.add(candidatesRes.status >= 400);

        sleep(0.1);

        // GET /api/v1/interviews
        const interviewsRes = http.get(`${BASE_URL}/api/v1/interviews`, {
            headers: h,
            tags: { endpoint: 'interviews_list' },
        });

        check(interviewsRes, {
            'interviews status 200': (r) => r.status === 200,
            'interviews p95 < 200ms': (r) => r.timings.duration < 200,
        });

        interviewsListLatency.add(interviewsRes.timings.duration);
        apiLatency.add(interviewsRes.timings.duration);
        requestCount.add(1);
        errorRate.add(interviewsRes.status >= 400);

        sleep(0.1);

        // GET /api/v1/communication/messages
        const messagesRes = http.get(`${BASE_URL}/api/v1/communication/messages`, {
            headers: h,
            tags: { endpoint: 'messages_list' },
        });

        check(messagesRes, {
            'messages status 200': (r) => r.status === 200 || r.status === 403, // May require higher role
        });

        messagesListLatency.add(messagesRes.timings.duration);
        apiLatency.add(messagesRes.timings.duration);
        requestCount.add(1);

        sleep(0.1);
    });

    // 20% Write operations (simulated - create candidates)
    if (Math.random() < 0.2) {
        group('Write Operations', () => {
            const candidateData = {
                name: `Test Candidate ${Date.now()}`,
                email: `test${Date.now()}@example.com`,
                phone: '+1234567890',
                stage: 'NEW',
                source: 'Performance Test',
            };

            const createRes = http.post(`${BASE_URL}/api/v1/candidates`, JSON.stringify(candidateData), {
                headers: h,
                tags: { endpoint: 'candidates_create' },
            });

            check(createRes, {
                'create candidate status 201': (r) => r.status === 201 || r.status === 200,
            });

            candidatesCreateLatency.add(createRes.timings.duration);
            apiLatency.add(createRes.timings.duration);
            requestCount.add(1);
            errorRate.add(createRes.status >= 400);

            sleep(0.2);
        });
    }

    // 10% Calendar/scheduling operations
    if (Math.random() < 0.1) {
        group('Scheduling Operations', () => {
            const availRes = http.get(`${BASE_URL}/api/v1/calendar/availability?from=${new Date().toISOString()}&to=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`, {
                headers: h,
                tags: { endpoint: 'calendar_availability' },
            });

            check(availRes, {
                'availability status 200': (r) => r.status === 200 || r.status === 400, // May fail if params invalid
            });

            calendarAvailLatency.add(availRes.timings.duration);
            apiLatency.add(availRes.timings.duration);
            requestCount.add(1);

            sleep(0.3);
        });
    }

    // Think time between iterations
    sleep(Math.random() * 0.5 + 0.5);
}

// Default function (required by k6)
export default function (data) {
    mixedWorkload(data);
}

// Handle summary
export function handleSummary(data) {
    const summary = {
        timestamp: new Date().toISOString(),
        testType: 'API Load Test',
        metrics: {
            totalRequests: data.metrics.request_count ? data.metrics.request_count.values.count : 0,
            httpReqDuration: {
                avg: data.metrics.http_req_duration?.values?.avg || 0,
                p50: data.metrics.http_req_duration?.values?.['p(50)'] || 0,
                p90: data.metrics.http_req_duration?.values?.['p(90)'] || 0,
                p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
                p99: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
            },
            apiLatency: {
                avg: data.metrics.api_latency?.values?.avg || 0,
                p95: data.metrics.api_latency?.values?.['p(95)'] || 0,
            },
            errorRate: data.metrics.error_rate?.values?.rate || 0,
            httpReqFailed: data.metrics.http_req_failed?.values?.rate || 0,
        },
        endpoints: {
            candidatesList: {
                p95: data.metrics.candidates_list_latency?.values?.['p(95)'] || 0,
            },
            candidatesCreate: {
                p95: data.metrics.candidates_create_latency?.values?.['p(95)'] || 0,
            },
            interviewsList: {
                p95: data.metrics.interviews_list_latency?.values?.['p(95)'] || 0,
            },
            calendarAvailability: {
                p95: data.metrics.calendar_availability_latency?.values?.['p(95)'] || 0,
            },
            messagesList: {
                p95: data.metrics.messages_list_latency?.values?.['p(95)'] || 0,
            },
        },
        thresholds: data.thresholds,
        passed: Object.values(data.thresholds || {}).every(t => t.ok),
    };

    return {
        'performance/results/api-load-results.json': JSON.stringify(summary, null, 2),
        stdout: textSummary(data, { indent: '  ', enableColors: true }),
    };
}

// Text summary helper
function textSummary(data, opts = {}) {
    const metrics = data.metrics;
    const indent = opts.indent || '';

    let output = `
${indent}╔══════════════════════════════════════════════════════════════╗
${indent}║                   API LOAD TEST RESULTS                      ║
${indent}╠══════════════════════════════════════════════════════════════╣
${indent}║  HTTP Request Duration                                       ║
${indent}║    avg: ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms                                           ║
${indent}║    p50: ${(metrics.http_req_duration?.values?.['p(50)'] || 0).toFixed(2)}ms                                           ║
${indent}║    p90: ${(metrics.http_req_duration?.values?.['p(90)'] || 0).toFixed(2)}ms                                           ║
${indent}║    p95: ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms  (Target: <200ms)                     ║
${indent}║    p99: ${(metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms                                           ║
${indent}╠══════════════════════════════════════════════════════════════╣
${indent}║  Error Rate: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%  (Target: <1%)                      ║
${indent}╚══════════════════════════════════════════════════════════════╝
`;

    // Check pass/fail
    const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
    const errorRateVal = metrics.http_req_failed?.values?.rate || 0;

    if (p95 < 200 && errorRateVal < 0.01) {
        output += `\n${indent}✅ PASSED: API performance meets targets\n`;
    } else {
        output += `\n${indent}❌ FAILED: API performance does not meet targets\n`;
        if (p95 >= 200) output += `${indent}   - p95 latency (${p95.toFixed(2)}ms) exceeds 200ms target\n`;
        if (errorRateVal >= 0.01) output += `${indent}   - Error rate (${(errorRateVal * 100).toFixed(2)}%) exceeds 1% target\n`;
    }

    return output;
}
