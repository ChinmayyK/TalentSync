# TalentSync API - Authentication Guide

**Version:** 1.0  
**Date:** December 2025  
**Base URL:** `https://api.talentsync.com/api/v1`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Methods](#authentication-methods)
3. [JWT Authentication](#jwt-authentication)
4. [API Key Authentication](#api-key-authentication)
5. [OAuth 2.0 (Third-Party Apps)](#oauth-20-third-party-apps)
6. [Rate Limiting](#rate-limiting)
7. [Error Handling](#error-handling)
8. [Security Best Practices](#security-best-practices)

---

## Overview

TalentSync API supports multiple authentication methods:

| Method | Use Case | Token Lifetime |
|--------|----------|---------------|
| JWT | Web/Mobile apps | 15 min (access), 7 days (refresh) |
| API Key | Server-to-server | Never expires |
| OAuth 2.0 | Third-party integrations | 1 hour (configurable) |

All API requests must be authenticated. Unauthenticated requests return `401 Unauthorized`.

---

## Authentication Methods

### Choosing the Right Method

| Scenario | Recommended Method |
|----------|-------------------|
| Frontend application | JWT with refresh tokens |
| Backend service | API Key |
| Third-party integration | OAuth 2.0 |
| Mobile app | JWT with secure storage |

---

## JWT Authentication

### Login Flow

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expiresIn": 900,
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "RECRUITER",
    "tenantId": "tenant_xyz789"
  }
}
```

### Using Access Token

Include the access token in the `Authorization` header:

```http
GET /api/v1/candidates
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refreshing Tokens

When the access token expires, use the refresh token:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### JWT Payload Structure

```json
{
  "sub": "user_abc123",        // User ID
  "tenantId": "tenant_xyz789", // Tenant ID
  "email": "user@example.com",
  "role": "RECRUITER",
  "permissions": ["candidates:read", "candidates:write"],
  "iat": 1703692800,           // Issued at
  "exp": 1703693700            // Expires at
}
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

---

## API Key Authentication

### Creating an API Key

1. Log in to TalentSync as Admin
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Enter a name/description
5. Set permissions (scopes)
6. Click **Generate**
7. **Copy the key immediately** - it won't be shown again

### Using API Key

Include the API key in the `X-API-Key` header:

```http
GET /api/v1/candidates
X-API-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Or as a query parameter (not recommended):

```http
GET /api/v1/candidates?api_key=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### API Key Scopes

| Scope | Description |
|-------|-------------|
| `candidates:read` | Read candidate data |
| `candidates:write` | Create/update candidates |
| `interviews:read` | Read interview data |
| `interviews:write` | Create/update interviews |
| `reports:read` | Access reports |
| `admin:read` | Read admin settings |
| `admin:write` | Modify admin settings |

### Key Management

```http
# List all API keys
GET /api/v1/settings/api-keys
Authorization: Bearer <admin-token>

# Revoke an API key
DELETE /api/v1/settings/api-keys/{keyId}
Authorization: Bearer <admin-token>
```

---

## OAuth 2.0 (Third-Party Apps)

For building integrations with TalentSync.

### OAuth Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `https://app.talentsync.com/oauth/authorize` |
| Token | `https://api.talentsync.com/api/v1/oauth/token` |
| User Info | `https://api.talentsync.com/api/v1/oauth/userinfo` |

### Authorization Code Flow

#### 1. Redirect User to Authorization

```
GET https://app.talentsync.com/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=candidates:read%20interviews:read
  &state=random_state_string
```

#### 2. User Authorizes and Redirects Back

```
https://yourapp.com/callback
  ?code=AUTHORIZATION_CODE
  &state=random_state_string
```

#### 3. Exchange Code for Tokens

```http
POST /api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "candidates:read interviews:read"
}
```

#### 4. Refresh Access Token

```http
POST /api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
```

---

## Rate Limiting

### Limits

| Endpoint Type | Limit |
|--------------|-------|
| Read (GET) | 100 requests/minute |
| Write (POST/PATCH/DELETE) | 30 requests/minute |
| Bulk operations | 10 requests/minute |

### Headers

Rate limit info is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703693760
```

### Handling Rate Limits

When you exceed the limit:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45

{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Try again in 45 seconds."
}
```

**Best practices:**
- Implement exponential backoff
- Cache responses when possible
- Use webhooks instead of polling

---

## Error Handling

### Error Response Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  },
  "requestId": "req_abc123xyz"
}
```

### Common Error Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `invalid_request` | Malformed request |
| 401 | `unauthorized` | Invalid or missing auth |
| 401 | `token_expired` | Access token expired |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Resource already exists |
| 422 | `validation_error` | Validation failed |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_error` | Server error |

### Token Expired Response

```json
{
  "error": "token_expired",
  "message": "Access token has expired. Please refresh your token."
}
```

---

## Security Best Practices

### Token Storage

| Platform | Recommended Storage |
|----------|---------------------|
| Web (SPA) | Memory + HttpOnly cookie for refresh |
| Mobile | Secure Keychain/Keystore |
| Server | Environment variables |

### HTTPS Only

All API requests must use HTTPS. HTTP requests are rejected.

### Token Rotation

- Rotate API keys every 90 days
- Refresh tokens are single-use (rotated on each refresh)
- Revoke tokens immediately if compromised

### Minimum Permissions

- Request only the scopes you need
- Use read-only scopes when possible
- Separate API keys by service/function

### Monitoring

- Log all API key usage
- Alert on unusual patterns
- Review access logs regularly

---

## Code Examples

### Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.talentsync.com/api/v1',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// Fetch candidates
const candidates = await api.get('/candidates');

// Handle token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && error.response?.data?.error === 'token_expired') {
      const newToken = await refreshToken();
      error.config.headers['Authorization'] = `Bearer ${newToken}`;
      return api.request(error.config);
    }
    throw error;
  }
);
```

### Python

```python
import requests

class TalentSyncAPI:
    def __init__(self, api_key):
        self.base_url = 'https://api.talentsync.com/api/v1'
        self.headers = {'X-API-Key': api_key}
    
    def get_candidates(self, **filters):
        response = requests.get(
            f'{self.base_url}/candidates',
            headers=self.headers,
            params=filters
        )
        response.raise_for_status()
        return response.json()

# Usage
api = TalentSyncAPI('sk_live_xxxxx')
candidates = api.get_candidates(stage='interview')
```

### cURL

```bash
# With JWT
curl -X GET "https://api.talentsync.com/api/v1/candidates" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# With API Key
curl -X GET "https://api.talentsync.com/api/v1/candidates" \
  -H "X-API-Key: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

---

*API Authentication Guide maintained by TalentSync Engineering Team*

