
import { getAuthToken } from "@/lib/auth";

// Dynamically determine API base URL for network access
export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        // In browser: use same hostname as the page (for network access from phone)
        const hostname = window.location.hostname;
        return process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:3001`;
    }
    // Server-side: use localhost
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
};

const API_BASE_URL = getApiBaseUrl();
const API_BASE = `${API_BASE_URL}/api/v1`;

// Debug logging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.debug('[API Debug] Hostname:', window.location.hostname);
    console.debug('[API Debug] API_BASE_URL:', API_BASE_URL);
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Token refresh mutex - prevents concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: any,
        public isRetryable: boolean = false,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined | null>;
    _retry?: boolean; // Used for refresh token retry
    _retryCount?: number; // Track retry attempts
    skipRetry?: boolean; // Disable retry for specific requests
}

// Get active tenant ID from localStorage
function getActiveTenantId(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('activeTenantId');
    }
    return null;
}

// Attempt to refresh the access token (with mutex to prevent concurrent refreshes)
async function attemptTokenRefresh(): Promise<string | null> {
    // If a refresh is already in progress, wait for it
    if (refreshPromise) {
        return refreshPromise;
    }

    // Start a new refresh
    refreshPromise = doTokenRefresh();

    try {
        const result = await refreshPromise;
        return result;
    } finally {
        // Clear the mutex after refresh completes (success or failure)
        refreshPromise = null;
    }
}

// The actual token refresh logic
async function doTokenRefresh(): Promise<string | null> {
    try {
        const response = await fetch(`${API_BASE.replace('/api/v1', '')}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
            if (data.activeTenantId) {
                localStorage.setItem('activeTenantId', data.activeTenantId);
            }
            return data.accessToken;
        }
        return null;
    } catch {
        return null;
    }
}

// Check if error is retryable (5xx or network error)
function isRetryableError(status: number): boolean {
    return status >= 500 && status < 600;
}

// Sleep with exponential backoff
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function request<T>(
    endpoint: string,
    options: RequestOptions = {},
): Promise<T> {
    const token = getAuthToken();
    const tenantId = getActiveTenantId();
    const retryCount = options._retryCount || 0;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Add tenant ID header for multi-tenant context
    if (tenantId) {
        headers["X-Tenant-Id"] = tenantId;
    }

    let url = `${API_BASE}${endpoint}`;
    if (options.params) {
        const searchParams = new URLSearchParams();
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value));
            }
        });
        const queryString = searchParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include', // For HTTPOnly cookies
        });

        // Handle 401 - try to refresh token
        if (response.status === 401 && !options._retry) {
            const newToken = await attemptTokenRefresh();
            if (newToken) {
                // Retry with new token
                return request<T>(endpoint, {
                    ...options,
                    _retry: true,
                    headers: {
                        ...options.headers as Record<string, string>,
                        "Authorization": `Bearer ${newToken}`,
                    },
                });
            }

            // Refresh failed - redirect to login
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('activeTenantId');
                window.location.href = '/login';
            }
        }

        // Handle 5xx errors with retry (only for GET requests by default)
        if (isRetryableError(response.status) && !options.skipRetry && retryCount < MAX_RETRIES) {
            const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';

            if (isGetRequest) {
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`Request failed with ${response.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await sleep(delay);

                return request<T>(endpoint, {
                    ...options,
                    _retryCount: retryCount + 1,
                });
            }
        }

        // Handle 429 rate limit errors with special handling
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
            throw new ApiError(
                429,
                `Too many requests. Please wait ${retrySeconds} seconds before trying again.`,
                { retryAfter: retrySeconds },
                false, // Not auto-retryable
            );
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
                response.status,
                errorData.message || `Request failed with status ${response.status}`,
                errorData,
                isRetryableError(response.status),
            );
        }

        // Handle empty responses
        const text = await response.text();
        return text ? JSON.parse(text) : (null as unknown as T);
    } catch (error) {
        // Handle network errors with retry (only for GET requests)
        if (error instanceof TypeError && error.message.includes('fetch') && !options.skipRetry && retryCount < MAX_RETRIES) {
            const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';

            if (isGetRequest) {
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await sleep(delay);

                return request<T>(endpoint, {
                    ...options,
                    _retryCount: retryCount + 1,
                });
            }
        }
        throw error;
    }
}

export const client = {
    get: <T>(endpoint: string, options: RequestOptions = {}) =>
        request<T>(endpoint, { ...options, method: "GET" }),

    post: <T>(endpoint: string, body?: any, options: RequestOptions = {}) =>
        request<T>(endpoint, {
            ...options,
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
        }),

    put: <T>(endpoint: string, body?: any, options: RequestOptions = {}) =>
        request<T>(endpoint, {
            ...options,
            method: "PUT",
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(endpoint: string, body?: any, options: RequestOptions = {}) =>
        request<T>(endpoint, {
            ...options,
            method: "PATCH",
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(endpoint: string, options: RequestOptions = {}) =>
        request<T>(endpoint, { ...options, method: "DELETE" }),
};
