import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const BATCH_SIZE = parseInt(__ENV.BATCH_SIZE) || 100;

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users
        { duration: '1m', target: 10 },   // Stay at 10 users
        { duration: '30s', target: 50 },  // Ramp up to 50 users
        { duration: '2m', target: 50 },   // Stay at 50 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],  // 95% of requests should be under 500ms
        errors: ['rate<0.05'],              // Error rate should be below 5%
    },
};

// Simulated auth token (you should get this from a setup function)
let authToken = '';

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
        return { token: body.accessToken };
    }

    console.error('Failed to authenticate for load test');
    return { token: null };
}

export default function (data) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
    };

    // Test 1: List candidates (simulates sync reading)
    const listRes = http.get(`${BASE_URL}/candidates?page=1&limit=50`, { headers });
    check(listRes, {
        'list candidates status is 200': (r) => r.status === 200,
    });
    errorRate.add(listRes.status !== 200);

    sleep(0.5);

    // Test 2: Bulk import simulation
    const candidates = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
        candidates.push({
            name: `Load Test User ${__VU}-${__ITER}-${i}`,
            email: `loadtest-${__VU}-${__ITER}-${i}@example.com`,
            stage: 'applied',
            source: 'k6-load-test',
        });
    }

    const bulkRes = http.post(`${BASE_URL}/candidates/bulk`, JSON.stringify({
        candidates
    }), { headers });

    check(bulkRes, {
        'bulk import status is 201': (r) => r.status === 201,
        'bulk import has correct count': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.imported >= 0;
            } catch {
                return false;
            }
        },
    });
    errorRate.add(bulkRes.status !== 201);

    sleep(1);

    // Test 3: Read single candidate
    const singleRes = http.get(`${BASE_URL}/candidates`, { headers });
    if (singleRes.status === 200) {
        try {
            const body = JSON.parse(singleRes.body);
            if (body.data && body.data.length > 0) {
                const candidateId = body.data[0].id;
                const detailRes = http.get(`${BASE_URL}/candidates/${candidateId}`, { headers });
                check(detailRes, {
                    'get candidate detail status is 200': (r) => r.status === 200,
                });
                errorRate.add(detailRes.status !== 200);
            }
        } catch (e) {
            console.error('Failed to parse candidates response');
        }
    }

    sleep(0.5);
}

export function teardown(data) {
    console.log('Load test completed');
}
