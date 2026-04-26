# TalentSync ATS - Deployment Requirements

This document outlines all external services and APIs required for deploying TalentSync in production.

---

## AWS Infrastructure (Required)

| Service | Purpose | Required | Est. Cost/Month |
|---------|---------|----------|-----------------|
| **ECS Fargate** | Container orchestration (backend + frontend) | ✅ | $50-150 |
| **RDS PostgreSQL** | Primary database | ✅ | $30-100 |
| **ElastiCache Redis** | Queue (BullMQ) + caching | ✅ | $15-50 |
| **S3** | File storage (resumes, documents) | ✅ | $5-20 |
| **ALB** | Load balancer | ✅ | $20-30 |
| **Route 53** | DNS management | ✅ | $1-5 |
| **ACM** | SSL certificates | ✅ | Free |
| **SES** | Email delivery | ✅ | $0.10/1K emails |
| **CloudWatch** | Logs & monitoring | Recommended | $5-20 |
| **CloudFront** | CDN for frontend assets | Optional | $5-20 |
| **WAF** | Web application firewall | Optional | $10-30 |
| **Secrets Manager** | Store API keys securely | Recommended | $1-5 |

---

## Communication Services

### Email (Required - Pick One)

| Provider | Use Case | Credentials Needed |
|----------|----------|-------------------|
| **AWS SES** | Transactional emails | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| **SMTP (Gmail, SendGrid, etc.)** | Any SMTP provider | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

### SMS (Optional)

| Provider | Use Case | Credentials Needed |
|----------|----------|-------------------|
| **Twilio** | SMS delivery | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| **AWS SNS** | Alternative SMS | AWS credentials |

### WhatsApp (Optional)

| Provider | Use Case | Credentials Needed |
|----------|----------|-------------------|
| **WhatsApp Business Cloud API** | WhatsApp messaging | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` |
| **Twilio WhatsApp** | Alternative | Twilio credentials + WhatsApp sender |

**WhatsApp Business API Requirements:**
- Meta Business account
- WhatsApp Business API access (apply at developers.facebook.com)
- Verified phone number
- Pre-approved message templates for non-24h conversations

### Team Notifications (Optional)

| Provider | Use Case | Credentials Needed |
|----------|----------|-------------------|
| **Slack** | Webhook notifications | Webhook URL |
| **Microsoft Teams** | Webhook notifications | Webhook URL |

---

## Calendar Integrations

| Provider | Purpose | Credentials Needed |
|----------|---------|-------------------|
| **Google Workspace / Calendar** | Calendar sync, OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` |
| **Microsoft Outlook / 365** | Calendar sync, OAuth | `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET` |

### Setup Requirements
- **Google**: Google Cloud Console project with Calendar API enabled
- **Microsoft**: Azure AD app registration for Microsoft Graph API
- OAuth redirect URIs configured for both

---

## ATS/CRM Integrations

| Provider | Purpose | Credentials Needed |
|----------|---------|-------------------|
| **Greenhouse** | ATS sync | API key (Harvest API) |
| **Lever** | ATS sync | API key |
| **BambooHR** | HRIS sync | OAuth2 credentials |
| **Workday** | HRIS sync | OAuth2 credentials, API endpoint |
| **Salesforce** | CRM sync | OAuth2 (`SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`) |
| **HubSpot** | CRM sync | OAuth2 (`HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`) |
| **Zoho CRM** | CRM sync | OAuth2 (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`) |

---

## AI/OCR Services

| Service | Purpose | Credentials Needed |
|---------|---------|-------------------|
| **Tesseract.js** | Resume OCR (bundled) | None |
| **OpenAI** | Resume parsing enhancement | `OPENAI_API_KEY` (optional) |
| **AWS Textract** | Advanced OCR | AWS credentials (optional) |

---

## Security & Encryption

| Requirement | Purpose | Details |
|-------------|---------|---------|
| **JWT Secret** | Token signing | Min 32 characters |
| **Encryption Key** | Credential encryption | 64 hex chars (AES-256) |
| **Bcrypt Salt Rounds** | Password hashing | Default: 12 |

---

## Complete Environment Variables

```bash
# ===========================================
# CORE INFRASTRUCTURE
# ===========================================
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/talentsync

# Redis
REDIS_URL=redis://host:6379

# Frontend URL
FRONTEND_URL=https://app.yourcompany.com
APP_BASE_URL=https://api.yourcompany.com

# ===========================================
# SECURITY
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_TTL=15m
REFRESH_TOKEN_TTL=14d
BCRYPT_SALT_ROUNDS=12
ENCRYPTION_KEY=64-hex-characters-for-aes-256-encryption
TOKEN_ENCRYPTION_KEY=64-hex-characters-for-token-encryption

# ===========================================
# AWS
# ===========================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# S3 Storage
S3_BUCKET_NAME=talentsync-assets
# For MinIO (dev only):
# MINIO_ENDPOINT=localhost
# MINIO_PORT=9000
# MINIO_ACCESS_KEY=minioadmin
# MINIO_SECRET_KEY=minioadmin

# ===========================================
# EMAIL (pick one)
# ===========================================
# Option 1: AWS SES
EMAIL_PROVIDER=ses
SES_FROM=noreply@yourcompany.com

# Option 2: SMTP
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=xxx
# SMTP_PASS=xxx
# DEFAULT_FROM_ADDRESS=noreply@yourcompany.com

# ===========================================
# SMS (optional)
# ===========================================
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1234567890

# ===========================================
# WHATSAPP (optional)
# ===========================================
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# ===========================================
# CALENDAR INTEGRATIONS
# ===========================================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://api.yourcompany.com/api/integrations/google/callback

OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=

# ===========================================
# ATS/CRM INTEGRATIONS (as needed)
# ===========================================
ZOHO_CLIENT_ID=
ZOHO_CLIENT_SECRET=

# Greenhouse - configure per-tenant in UI
# Lever - configure per-tenant in UI
# Salesforce - configure per-tenant in UI
# HubSpot - configure per-tenant in UI
# BambooHR - configure per-tenant in UI
# Workday - configure per-tenant in UI
```

---

## Cost Summary

| Tier | Monthly Cost | Includes |
|------|--------------|----------|
| **Development** | $50-100 | Small instances, single container |
| **Startup** | $150-300 | < 1,000 candidates, basic monitoring |
| **Growth** | $300-600 | 1,000-10,000 candidates, scaling |
| **Enterprise** | $600+ | 10,000+ candidates, HA, WAF |

---

## Minimum Viable Deployment Checklist

### Required
- [ ] AWS account (ECS, RDS, Redis, S3, SES, ALB)
- [ ] Domain with SSL certificate (Route 53 + ACM)
- [ ] Google Cloud project (for calendar OAuth)
- [ ] JWT secret and encryption keys generated

### Recommended
- [ ] CloudWatch for logging
- [ ] Secrets Manager for credentials
- [ ] Twilio for SMS

### Optional
- [ ] WhatsApp Business API
- [ ] Microsoft Azure AD (for Outlook calendar)
- [ ] ATS integrations (Greenhouse, Lever, etc.)
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Slack/Teams webhooks
