// k6 Shared Configuration
// Performance thresholds based on SOW requirements

export const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
export const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// Authentication token (will be set during setup)
export let AUTH_TOKEN = '';

// Performance thresholds
export const thresholds = {
    // API Response Time: p95 < 200ms
    http_req_duration: ['p(95)<200', 'p(99)<500'],

    // Error rate < 1%
    http_req_failed: ['rate<0.01'],

    // Specific endpoint thresholds
    'http_req_duration{endpoint:candidates_list}': ['p(95)<200'],
    'http_req_duration{endpoint:candidates_create}': ['p(95)<200'],
    'http_req_duration{endpoint:interviews_list}': ['p(95)<200'],
    'http_req_duration{endpoint:interviews_create}': ['p(95)<200'],
    'http_req_duration{endpoint:calendar_availability}': ['p(95)<200'],
    'http_req_duration{endpoint:messages_list}': ['p(95)<200'],
};

// Scenario configurations
export const scenarios = {
    // Warm-up phase: 0 → 100 VUs over 30s (scaled for local testing)
    warmup: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '30s', target: 100 },
        ],
        gracefulRampDown: '10s',
        exec: 'mixedWorkload',
    },

    // Load phase: 100 → 500 VUs over 2m
    load: {
        executor: 'ramping-vus',
        startVUs: 100,
        stages: [
            { duration: '2m', target: 500 },
        ],
        startTime: '40s',
        gracefulRampDown: '10s',
        exec: 'mixedWorkload',
    },

    // Stress phase: 500 → 1000 VUs (scaled from 5000 for local testing)
    stress: {
        executor: 'ramping-vus',
        startVUs: 500,
        stages: [
            { duration: '2m', target: 1000 },
            { duration: '1m', target: 1000 }, // Hold at max
        ],
        startTime: '3m',
        gracefulRampDown: '30s',
        exec: 'mixedWorkload',
    },
};

// Quick test scenario for validation
export const quickTestScenarios = {
    quickTest: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
            { duration: '10s', target: 50 },
            { duration: '30s', target: 50 },
            { duration: '10s', target: 0 },
        ],
        gracefulRampDown: '5s',
        exec: 'mixedWorkload',
    },
};

// Helper to create auth headers
export function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'X-Tenant-Id': 'test-tenant',
    };
}
