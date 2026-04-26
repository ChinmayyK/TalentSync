# TalentSync API - Webhook Event Reference

**Version:** 1.0  
**Date:** December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Setting Up Webhooks](#setting-up-webhooks)
3. [Event Types](#event-types)
4. [Payload Structure](#payload-structure)
5. [Event Payloads](#event-payloads)
6. [Security](#security)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Webhooks allow your application to receive real-time notifications when events occur in TalentSync.

### How Webhooks Work

```
1. Event occurs in TalentSync (e.g., candidate created)
2. TalentSync sends HTTP POST to your webhook URL
3. Your server processes the event
4. Your server responds with 2xx status
5. TalentSync retries if no 2xx received
```

### Supported Events

| Category | Events |
|----------|--------|
| Candidates | created, updated, stage_changed, deleted |
| Interviews | scheduled, completed, cancelled, rescheduled |
| Feedback | submitted, updated |
| Integration | sync_completed, sync_failed |

---

## Setting Up Webhooks

### Via Admin Console

1. Go to **Admin** → **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter:
   - **URL**: Your endpoint (must be HTTPS)
   - **Events**: Select events to receive
   - **Secret**: Auto-generated or custom
4. Click **Save**
5. Test the webhook

### Via API

```http
POST /api/v1/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhooks/talentsync",
  "events": ["candidate.created", "candidate.stage_changed"],
  "secret": "whsec_your_secret_key",
  "active": true
}
```

**Response:**

```json
{
  "id": "wh_abc123",
  "url": "https://yourapp.com/webhooks/talentsync",
  "events": ["candidate.created", "candidate.stage_changed"],
  "active": true,
  "createdAt": "2025-12-27T10:00:00Z"
}
```

---

## Event Types

### Candidate Events

| Event | Description |
|-------|-------------|
| `candidate.created` | New candidate added |
| `candidate.updated` | Candidate profile updated |
| `candidate.stage_changed` | Candidate moved to new stage |
| `candidate.deleted` | Candidate removed |
| `candidate.archived` | Candidate archived |
| `candidate.restored` | Candidate restored from archive |

### Interview Events

| Event | Description |
|-------|-------------|
| `interview.scheduled` | New interview scheduled |
| `interview.updated` | Interview details updated |
| `interview.completed` | Interview marked complete |
| `interview.cancelled` | Interview cancelled |
| `interview.rescheduled` | Interview date/time changed |

### Feedback Events

| Event | Description |
|-------|-------------|
| `feedback.submitted` | Interviewer submitted feedback |
| `feedback.updated` | Feedback was edited |

### Integration Events

| Event | Description |
|-------|-------------|
| `integration.connected` | Integration connected |
| `integration.disconnected` | Integration disconnected |
| `integration.sync_completed` | Sync job completed |
| `integration.sync_failed` | Sync job failed |

---

## Payload Structure

### Common Fields

All webhook payloads include:

```json
{
  "id": "evt_xxxxxxxxxxxxxxxx",
  "type": "candidate.created",
  "tenantId": "tenant_xyz789",
  "createdAt": "2025-12-27T10:30:00Z",
  "data": {
    // Event-specific data
  }
}
```

### Headers

```http
Content-Type: application/json
X-TalentSync-Webhook-Id: evt_xxxxxxxxxxxxxxxx
X-TalentSync-Webhook-Timestamp: 1703674200
X-TalentSync-Webhook-Signature: sha256=xxxxxxxxxxxxxxxx
User-Agent: TalentSync-Webhooks/1.0
```

---

## Event Payloads

### candidate.created

```json
{
  "id": "evt_abc123",
  "type": "candidate.created",
  "tenantId": "tenant_xyz789",
  "createdAt": "2025-12-27T10:30:00Z",
  "data": {
    "candidate": {
      "id": "cand_def456",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1-555-0123",
      "roleTitle": "Software Engineer",
      "stage": "applied",
      "source": "linkedin",
      "tags": ["engineering", "senior"],
      "createdAt": "2025-12-27T10:30:00Z",
      "createdById": "user_ghi789"
    }
  }
}
```

### candidate.stage_changed

```json
{
  "id": "evt_jkl012",
  "type": "candidate.stage_changed",
  "tenantId": "tenant_xyz789",
  "createdAt": "2025-12-27T11:00:00Z",
  "data": {
    "candidate": {
      "id": "cand_def456",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "previousStage": "screening",
    "newStage": "interview",
    "changedBy": {
      "id": "user_ghi789",
      "name": "Jane Smith",
      "role": "RECRUITER"
    },
    "reason": "Passed phone screen"
  }
}
```

### interview.scheduled

```json
{
  "id": "evt_mno345",
  "type": "interview.scheduled",
  "tenantId": "tenant_xyz789",
  "createdAt": "2025-12-27T14:00:00Z",
  "data": {
    "interview": {
      "id": "int_pqr678",
      "title": "Technical Interview",
      "type": "video",
      "date": "2025-12-30T10:00:00Z",
      "duration": 60,
      "location": "https://meet.google.com/xxx-xxxx-xxx",
      "status": "scheduled"
    },
    "candidate": {
      "id": "cand_def456",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "host": {
      "id": "user_stu901",
      "name": "Bob Wilson",
      "email": "bob@company.com"
    },
    "scheduledBy": {
      "id": "user_ghi789",
      "name": "Jane Smith"
    }
  }
}
```

### interview.completed

```json
{
  "id": "evt_vwx234",
  "type": "interview.completed",
  "tenantId": "tenant_xyz789",
  "createdAt": "2025-12-30T11:15:00Z",
  "data": {
    "interview": {
      "id": "int_pqr678",
      "title": "Technical Interview",
      "date": "2025-12-30T10:00:00Z",
      "duration": 60,
      "status": "completed"
    },
    "candidate": {
      "id": "cand_def456",
      "name": "John Doe"
    },
    "feedbackSummary": {
      "overallRating": 4.2,
      "recommendation": "hire",
      "feedbackCount": 3
    }
  }
}
```

### feedback.submitted

```json
{
  "id": "evt_yza567",
  "type": "feedback.submitted",
  "tenantId": "tenant_xyz789",
  "createdAt": "2025-12-30T11:30:00Z",
  "data": {
    "feedback": {
      "id": "fb_bcd890",
      "overallRating": 4,
      "technicalScore": 4,
      "communicationScore": 5,
      "cultureFitScore": 4,
      "recommendation": "hire",
      "strengths": "Strong problem solving",
      "concerns": "Limited system design experience"
    },
    "interview": {
      "id": "int_pqr678",
      "title": "Technical Interview"
    },
    "candidate": {
      "id": "cand_def456",
      "name": "John Doe"
    },
    "submittedBy": {
      "id": "user_stu901",
      "name": "Bob Wilson"
    }
  }
}
```

---

## Security

### Signature Verification

All webhooks are signed using HMAC-SHA256. Verify signatures to ensure requests are from TalentSync.

#### Node.js Example

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const timestamp = signature.split(',')[0].replace('t=', '');
  const sig = signature.split(',')[1].replace('v1=', '');
  
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSig)
  );
}

// Express middleware
app.post('/webhooks/talentsync', (req, res) => {
  const signature = req.headers['x-talentsync-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  handleEvent(req.body);
  res.status(200).send('OK');
});
```

#### Python Example

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    parts = dict(p.split('=') for p in signature.split(','))
    timestamp = parts['t']
    sig = parts['v1']
    
    signed_payload = f"{timestamp}.{payload}"
    expected_sig = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(sig, expected_sig)
```

### Timestamp Validation

Reject webhooks with old timestamps to prevent replay attacks:

```javascript
const MAX_AGE = 300; // 5 minutes

function isTimestampValid(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - parseInt(timestamp)) < MAX_AGE;
}
```

---

## Best Practices

### 1. Respond Quickly

Return `200 OK` as soon as possible. Process events asynchronously.

```javascript
app.post('/webhooks', (req, res) => {
  // Immediately acknowledge
  res.status(200).send('OK');
  
  // Process async
  setImmediate(() => processEvent(req.body));
});
```

### 2. Handle Retries

TalentSync retries failed webhooks:
- Retry 1: 1 minute
- Retry 2: 5 minutes
- Retry 3: 30 minutes
- Retry 4: 2 hours
- Retry 5: 24 hours

Use idempotency keys to prevent duplicate processing:

```javascript
const processed = new Set();

function handleEvent(event) {
  if (processed.has(event.id)) {
    return; // Already processed
  }
  processed.add(event.id);
  // Process event
}
```

### 3. Use Queues

For reliable processing, queue events:

```javascript
const Queue = require('bull');
const webhookQueue = new Queue('webhooks');

app.post('/webhooks', (req, res) => {
  webhookQueue.add(req.body);
  res.status(200).send('OK');
});

webhookQueue.process(async (job) => {
  await processEvent(job.data);
});
```

### 4. Log Everything

```javascript
function handleEvent(event) {
  console.log({
    eventId: event.id,
    type: event.type,
    tenantId: event.tenantId,
    timestamp: event.createdAt
  });
}
```

---

## Troubleshooting

### Viewing Delivery History

1. Go to **Admin** → **Settings** → **Webhooks**
2. Click on a webhook
3. View **Delivery History**
4. See status, response code, and response body

### Testing Webhooks

**From Admin Console:**
1. Go to webhook settings
2. Click **Send Test**
3. Select event type
4. View test result

**From CLI:**
```bash
curl -X POST https://api.talentsync.com/api/v1/webhooks/wh_abc123/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"eventType": "candidate.created"}'
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 response | Invalid signature | Verify secret and algorithm |
| Timeout | Processing too slow | Respond immediately, process async |
| Duplicate events | Missing idempotency | Track processed event IDs |
| Missing events | Endpoint down | Check uptime, review retry history |

---

*Webhook Reference maintained by TalentSync Engineering Team*
