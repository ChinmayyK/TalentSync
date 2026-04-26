# Integrations Framework

## Overview

The Integrations Framework provides a modular, pluggable architecture for connecting external systems to the TalentSync application. It supports OAuth2 authentication, field mapping, webhook receivers, and background sync jobs.

## Supported Providers

### CRM Systems
- **Zoho CRM** - Full implementation with OAuth2, contact sync, and field mapping

### Calendar Systems
- **Google Calendar** - Skeleton implementation for interview scheduling
- **Outlook Calendar** - Skeleton implementation for interview scheduling

## Architecture

### Components

1. **Provider Interface** - Common interface all providers must implement
2. **OAuth Services** - Handle OAuth2 flow for each provider
3. **API Clients** - REST API clients with retry logic and exponential backoff
4. **Provider Factory** - Instantiates the correct provider based on name
5. **Integrations Service** - Core business logic for managing integrations
6. **Webhook Receiver** - Handles incoming webhooks from providers
7. **Sync Engine** - BullMQ-based background jobs for data synchronization

### Data Flow

```
User → Controller → Service → Provider Factory → Provider → API Client → External System
                                                      ↓
                                                  Database (encrypted tokens)
```

## Environment Variables

Add these to your `.env` file:

```bash
# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Zoho CRM
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
ZOHO_REDIRECT_URI=http://localhost:4000/api/v1/integrations/callback

# Google Calendar
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/integrations/callback

# Outlook Calendar
OUTLOOK_CLIENT_ID=your-outlook-client-id
OUTLOOK_CLIENT_SECRET=your-outlook-client-secret
OUTLOOK_REDIRECT_URI=http://localhost:4000/api/v1/integrations/callback

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## API Endpoints

### Connect to Provider
```http
POST /api/v1/integrations/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "zoho"
}

Response:
{
  "authUrl": "https://accounts.zoho.com/oauth/v2/auth?...",
  "provider": "zoho"
}
```

### OAuth Callback
```http
GET /api/v1/integrations/callback?provider=zoho&code=<code>&state=<state>

Response:
{
  "success": true,
  "provider": "zoho"
}
```

### List Integrations
```http
GET /api/v1/integrations
Authorization: Bearer <token>

Response:
[
  {
    "id": "int-123",
    "provider": "zoho",
    "status": "connected",
    "lastSyncedAt": "2025-12-08T17:00:00Z",
    "createdAt": "2025-12-01T10:00:00Z"
  }
]
```

### Update Field Mapping
```http
POST /api/v1/integrations/mapping
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "zoho",
  "mappings": [
    {
      "sourceField": "name",
      "targetField": "Full_Name",
      "transform": "none"
    },
    {
      "sourceField": "email",
      "targetField": "Email",
      "transform": "lowercase"
    }
  ],
  "direction": "bidirectional"
}
```

### Trigger Manual Sync
```http
POST /api/v1/integrations/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "zoho",
  "since": "2025-12-01T00:00:00Z"
}

Response:
{
  "success": true,
  "message": "Sync job enqueued"
}
```

### Webhook Receiver
```http
POST /api/v1/integrations/webhooks/:provider
Content-Type: application/json

<provider-specific payload>
```

## Production Notes

### Token Management

- **Encryption**: All OAuth tokens are encrypted using AES-256-GCM before storage
- **Refresh Strategy**: Tokens are automatically refreshed 5 minutes before expiry
- **Rotation**: Refresh tokens are rotated on each refresh (provider-dependent)

### Zoho CRM Specifics

- **Regional Differences**: Zoho has different domains (.com, .in, .eu) - ensure correct API base URL
- **Token Expiry**: Access tokens expire after 1 hour
- **Rate Limits**: 5000 API calls per day (varies by plan)
- **Webhook Verification**: Zoho webhooks include organization ID for tenant mapping

### Sync Engine

- **Retry Logic**: 5 attempts with exponential backoff (2s, 4s, 8s, 16s, 32s)
- **DLQ Monitoring**: Failed jobs after 5 attempts move to Dead Letter Queue
- **Chunking**: Large syncs should process 100-200 records per page
- **Alerts**: Set up monitoring for DLQ accumulation

### API Quota Handling

- **Exponential Backoff**: Implemented with jitter to avoid thundering herd
- **Rate Limit Headers**: Monitor `X-RateLimit-Remaining` headers
- **429 Responses**: Automatically retry with backoff

### Calendar Integration Notes

- **ETag Management**: Use ETags for efficient calendar event updates
- **Push Notifications**: Google Calendar supports push notifications via webhooks
- **Subscription Management**: Outlook requires webhook subscription renewal every 3 days
- **Time Zones**: Always use UTC for event times, convert on display

### Field Mapping

- **Per-Tenant**: Each tenant can customize field mappings
- **Transformations**: Support for uppercase, lowercase, trim
- **Validation**: Mappings are validated before saving
- **Merge Strategy**: New mappings merge with existing ones

### Security

- **Encryption Key**: Store in secure key management system (AWS KMS, HashiCorp Vault)
- **Key Rotation**: Implement periodic key rotation with re-encryption
- **Webhook Validation**: Verify webhook signatures (provider-specific)
- **OAuth State**: State parameter prevents CSRF attacks

### Monitoring

- **Audit Logs**: All integration actions are logged
- **Metrics**: Track sync success/failure rates
- **Alerts**: 
  - DLQ items > 10
  - Sync failures > 5 in 1 hour
  - Token refresh failures
  - Webhook delivery failures

### Scaling

- **Horizontal**: Multiple worker instances can process sync jobs
- **Queue Partitioning**: Separate queues per provider if needed
- **Connection Pooling**: Reuse HTTP connections to external APIs
- **Caching**: Cache provider metadata and field mappings

## Development

### Adding a New Provider

1. Create provider directory: `src/modules/integrations/providers/new-provider/`
2. Implement OAuth service: `new-provider.oauth.ts`
3. Implement API client: `new-provider.api.ts`
4. Implement provider class: `new-provider.provider.ts`
5. Add to ProviderFactory
6. Register in IntegrationsModule
7. Add environment variables
8. Update documentation

### Testing

```bash
# Run unit tests
npm run test -- integrations.service.spec

# Run integration tests
npm run test:e2e -- integrations

# Test OAuth flow manually
curl -X POST http://localhost:4000/api/v1/integrations/connect \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"zoho"}'
```

### Debugging

- Enable debug logging: `DEBUG=integrations:* npm run start:dev`
- View BullMQ dashboard: Install `@bull-board/express`
- Check Redis: `redis-cli KEYS "bull:integration-*"`
- Monitor sync jobs: `redis-cli LRANGE bull:integration-sync:active 0 -1`

## Troubleshooting

### Common Issues

**Tokens not refreshing**
- Check ENCRYPTION_KEY is set
- Verify refresh_token is stored
- Check provider credentials are valid

**Sync jobs failing**
- Check Redis connection
- Verify provider API credentials
- Review DLQ for error messages
- Check rate limits

**Webhooks not received**
- Verify webhook URL is publicly accessible
- Check provider webhook configuration
- Review webhook logs in provider dashboard
- Ensure correct Content-Type header

**Field mapping not working**
- Validate mapping configuration
- Check source/target field names match provider schema
- Review transformation logic
- Test with sample data

## License

UNLICENSED - Internal use only
