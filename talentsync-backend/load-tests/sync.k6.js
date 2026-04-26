import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Custom metrics
const errorRate = new Rate('errors');
const successfulSyncs = new Counter('successful_syncs');
const failedSyncs = new Counter('failed_syncs');

export const options = {
    scenarios: {
        // Simulate real-world sync patterns
        scheduled_syncs: {
            executor: 'constant-arrival-rate',
            rate: 5,            // 5 syncs per minute
            timeUnit: '1m',
            duration: '5m',
            preAllocatedVUs: 10,
            maxVUs: 20,
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<2000'],  // 95% under 2s (syncs can be slower)
        errors: ['rate<0.1'],                // Allow 10% error rate for syncs
    },
};

export function setup() {
    // Login to get auth token
    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: __ENV.TEST_EMAIL || 'test@example.com',
        password: __ENV.TEST_PASSWORD || 'TestPass123!@#',
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (loginRes.status === 200) {
        const body = JSON.parse(loginRes.body);
        return {
            token: body.accessToken,
            tenantId: body.activeTenantId,
        };
    }

    console.error('Failed to authenticate');
    return { token: null };
}

export default function (data) {
    if (!data.token) {
        console.error('No auth token available');
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
    };

    // Trigger integration sync
    const providers = ['zoho', 'linkedin', 'greenhouse'];
    const provider = providers[Math.floor(Math.random() * providers.length)];

    // Check if integration exists
    const integrationsRes = http.get(`${BASE_URL}/integrations`, { headers });

    if (integrationsRes.status !== 200) {
        errorRate.add(1);
        failedSyncs.add(1);
        return;
    }

    // Simulate triggering a sync (if endpoint exists)
    const syncRes = http.post(`${BASE_URL}/integrations/sync`, JSON.stringify({
        provider,
    }), { headers });

    const syncSuccess = syncRes.status === 200 || syncRes.status === 201 || syncRes.status === 202;

    check(syncRes, {
        'sync triggered successfully': (r) => syncSuccess || r.status === 404, // 404 if no integration
    });

    if (syncSuccess) {
        successfulSyncs.add(1);
    } else if (syncRes.status !== 404) {
        failedSyncs.add(1);
    }

    errorRate.add(!syncSuccess && syncRes.status !== 404);

    // Wait before next sync
    sleep(5);

    // Check sync status (poll for completion)
    const statusRes = http.get(`${BASE_URL}/integrations`, { headers });
    check(statusRes, {
        'can check integration status': (r) => r.status === 200,
    });
}

export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}

function textSummary(data, opts) {
    const metrics = data.metrics;
    let output = '\n';
    output += '=== Load Test Summary ===\n';
    output += `Total requests: ${metrics.http_reqs?.values?.count || 0}\n`;
    output += `Avg response time: ${Math.round(metrics.http_req_duration?.values?.avg || 0)}ms\n`;
    output += `95th percentile: ${Math.round(metrics.http_req_duration?.values?.['p(95)'] || 0)}ms\n`;
    output += `Error rate: ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%\n`;
    output += `Successful syncs: ${metrics.successful_syncs?.values?.count || 0}\n`;
    output += `Failed syncs: ${metrics.failed_syncs?.values?.count || 0}\n`;
    return output;
}
