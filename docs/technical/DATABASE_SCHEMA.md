# TalentSync Application - Database Schema Documentation

**Version:** 1.0  
**Date:** December 2025  
**ORM:** Prisma 6.x  
**Database:** PostgreSQL 15.x

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Authentication Tables](#authentication-tables)
5. [Integration Tables](#integration-tables)
6. [Communication Tables](#communication-tables)
7. [Indexes & Performance](#indexes--performance)

---

## Overview

The TalentSync database uses a **row-level multi-tenancy** model where every table includes a `tenantId` foreign key to ensure data isolation between organizations.

### Key Design Principles

- **Tenant Isolation**: All queries are scoped by `tenantId`
- **Soft Deletes**: Most entities support `deletedAt` for recovery
- **Audit Trail**: Critical operations logged to `AuditLog`
- **UUID Primary Keys**: Using CUIDs for distributed generation

---

## Entity Relationship Diagram

```
┌─────────────┐
│   Tenant    │
└─────┬───────┘
      │
      ├──────────────────┬──────────────────┬──────────────────┐
      │                  │                  │                  │
      ▼                  ▼                  ▼                  ▼
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│   User    │     │ Candidate │     │Integration│     │ Settings  │
└─────┬─────┘     └─────┬─────┘     └───────────┘     └───────────┘
      │                 │
      │                 ├─────────────────┐
      ▼                 ▼                 ▼
┌───────────┐     ┌───────────┐     ┌───────────┐
│   Team    │     │ Interview │     │   Notes   │
└───────────┘     └─────┬─────┘     └───────────┘
                        │
                        ▼
                  ┌───────────┐
                  │ Feedback  │
                  └───────────┘
```

---

## Core Tables

### Tenant

Root table for multi-tenancy.

```prisma
model Tenant {
  id               String   @id @default(cuid())
  name             String
  slug             String   @unique
  domain           String?  @unique
  status           String   @default("active") // active, suspended, deleted
  plan             String   @default("free")   // free, starter, professional, enterprise
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  // Relations
  users            User[]
  candidates       Candidate[]
  interviews       Interview[]
  integrations     Integration[]
  settings         TenantSettings?
}
```

### User

User accounts within a tenant.

```prisma
model User {
  id               String    @id @default(cuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  
  email            String
  passwordHash     String?
  name             String
  role             String    @default("RECRUITER")
  status           String    @default("pending") // pending, active, deactivated
  
  emailVerified    Boolean   @default(false)
  twoFactorEnabled Boolean   @default(false)
  twoFactorSecret  String?
  
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  
  // Relations
  teams            Team[]    @relation("UserTeams")
  interviews       Interview[] @relation("InterviewHost")
  
  @@unique([tenantId, email])
  @@index([tenantId, status])
}
```

### Candidate

Candidate profiles.

```prisma
model Candidate {
  id               String    @id @default(cuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  
  name             String
  email            String?
  phone            String?
  roleTitle        String?
  stage            String    // applied, screening, interview, offer, hired, rejected
  source           String?   // linkedin, referral, website, etc.
  
  resumeUrl        String?
  photoUrl         String?
  notes            String?
  tags             String[]
  
  // External sync
  externalId       String?
  externalSource   String?
  rawExternalData  Json?
  
  // Scoring
  overallScore     Float?
  lastFeedbackAt   DateTime?
  
  createdById      String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  
  // Relations
  interviews       Interview[]
  stageHistory     CandidateStageHistory[]
  notes            CandidateNote[]
  
  @@unique([tenantId, externalId, externalSource])
  @@index([tenantId, createdAt])
  @@index([tenantId, stage])
  @@index([tenantId, email])
}
```

### Interview

Interview scheduling.

```prisma
model Interview {
  id               String    @id @default(cuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  
  candidateId      String
  candidate        Candidate @relation(fields: [candidateId], references: [id])
  
  hostId           String
  host             User      @relation("InterviewHost", fields: [hostId], references: [id])
  
  title            String
  description      String?
  date             DateTime
  duration         Int       @default(60) // minutes
  location         String?   // physical or video link
  type             String    @default("video") // video, phone, in-person
  status           String    @default("scheduled") // scheduled, completed, cancelled
  
  // Calendar sync
  calendarEventId  String?
  calendarProvider String?   // google, outlook
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  // Relations
  feedback         InterviewFeedback[]
  
  @@index([tenantId, date])
  @@index([tenantId, candidateId])
  @@index([tenantId, hostId])
}
```

### InterviewFeedback

Feedback collected after interviews.

```prisma
model InterviewFeedback {
  id               String    @id @default(cuid())
  tenantId         String
  
  interviewId      String
  interview        Interview @relation(fields: [interviewId], references: [id])
  
  submittedById    String
  
  overallRating    Int       // 1-5
  technicalScore   Int?      // 1-5
  communicationScore Int?    // 1-5
  cultureFitScore  Int?      // 1-5
  
  strengths        String?
  concerns         String?
  recommendation   String    // strong_hire, hire, no_hire, strong_no_hire
  notes            String?
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  @@index([tenantId, interviewId])
}
```

### CandidateStageHistory

Audit trail for stage transitions.

```prisma
model CandidateStageHistory {
  id               String    @id @default(cuid())
  tenantId         String
  
  candidateId      String
  candidate        Candidate @relation(fields: [candidateId], references: [id])
  
  fromStage        String?
  toStage          String
  reason           String?
  triggeredBy      String    // MANUAL, AUTOMATION, INTEGRATION
  actorId          String?
  
  createdAt        DateTime  @default(now())
  
  @@index([tenantId, candidateId])
}
```

---

## Authentication Tables

### RefreshToken

JWT refresh token storage.

```prisma
model RefreshToken {
  id               String   @id @default(cuid())
  userId           String
  token            String   @unique
  expiresAt        DateTime
  createdAt        DateTime @default(now())
  revokedAt        DateTime?
  
  @@index([userId])
  @@index([expiresAt])
}
```

### IdentityProvider

SSO configuration per tenant.

```prisma
model IdentityProvider {
  id               String   @id @default(cuid())
  tenantId         String
  
  name             String   // "Okta", "Azure AD", "Google Workspace"
  type             String   // saml, oidc
  status           String   @default("active")
  
  // SAML Config
  entityId         String?
  ssoUrl           String?
  certificate      String?
  
  // OIDC Config
  clientId         String?
  clientSecret     String?  // Encrypted
  issuerUrl        String?
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([tenantId, type])
}
```

---

## Integration Tables

### Integration

External system connections.

```prisma
model Integration {
  id               String    @id @default(cuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  
  provider         String    // zoho, salesforce, hubspot, bamboohr, etc.
  status           String    @default("disconnected") // disconnected, connected, error
  
  tokens           String?   // AES-encrypted OAuth tokens
  settings         Json?     // Provider-specific settings
  instanceUrl      String?   // For Salesforce, Workday
  
  lastSyncedAt     DateTime?
  lastError        String?
  
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  @@unique([tenantId, provider])
  @@index([tenantId, status])
}
```

### IntegrationMapping

Maps internal entities to external IDs.

```prisma
model IntegrationMapping {
  id               String   @id @default(cuid())
  tenantId         String
  
  provider         String
  entityType       String   // candidate, interview, employee
  entityId         String   // Internal TalentSync ID
  externalId       String   // External system ID
  
  createdAt        DateTime @default(now())
  
  @@unique([tenantId, provider, entityType, entityId])
  @@index([tenantId, provider, externalId])
}
```

### SyncLog

Audit trail for integration operations.

```prisma
model SyncLog {
  id               String   @id @default(cuid())
  tenantId         String
  
  provider         String
  eventType        String   // CANDIDATE_CREATED, INTERVIEW_SCHEDULED, etc.
  direction        String   // INBOUND, OUTBOUND
  entityType       String
  entityId         String
  externalId       String?
  
  status           String   @default("pending") // pending, success, failed
  errorMessage     String?
  retryCount       Int      @default(0)
  payload          Json?
  response         Json?
  
  createdAt        DateTime @default(now())
  completedAt      DateTime?
  
  @@index([tenantId, provider, createdAt])
  @@index([tenantId, status])
}
```

---

## Communication Tables

### MessageTemplate

Email/SMS templates.

```prisma
model MessageTemplate {
  id               String   @id @default(cuid())
  tenantId         String
  
  name             String
  type             String   // email, sms, whatsapp
  subject          String?  // For email
  body             String
  variables        String[] // Available template variables
  
  isDefault        Boolean  @default(false)
  isActive         Boolean  @default(true)
  
  createdById      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([tenantId, name, type])
}
```

### CommunicationChannel

Configured channels per tenant.

```prisma
model CommunicationChannel {
  id               String   @id @default(cuid())
  tenantId         String
  
  type             String   // email, sms, whatsapp
  provider         String   // sendgrid, ses, twilio
  status           String   @default("active")
  
  config           Json     // Encrypted API keys, sender IDs
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  @@unique([tenantId, type])
}
```

---

## Indexes & Performance

### Critical Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| Candidate | `(tenantId, createdAt)` | List with pagination |
| Candidate | `(tenantId, stage)` | Filter by stage |
| Candidate | `(tenantId, email)` | Deduplication lookup |
| Interview | `(tenantId, date)` | Calendar queries |
| Interview | `(tenantId, hostId)` | User's interviews |
| SyncLog | `(tenantId, provider, createdAt)` | Integration monitoring |

### Query Optimization Tips

1. **Always include tenantId** in WHERE clauses
2. **Use pagination** with cursor-based pagination for large datasets
3. **Avoid SELECT *** - specify only needed columns
4. **Cache frequently accessed data** in Redis

---

## Migration Commands

```bash
# Create a new migration
npx prisma migrate dev --name <migration_name>

# Apply migrations to production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# View database schema
npx prisma studio
```

---

*Document generated from Prisma schema at `/talentsync-backend/prisma/schema.prisma`*
