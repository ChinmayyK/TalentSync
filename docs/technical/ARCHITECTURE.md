# TalentSync Application - Technical Architecture Document

**Version:** 1.0  
**Date:** December 2025  
**Document Type:** Technical Architecture Specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture Principles](#3-architecture-principles)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Multi-Tenant Architecture](#6-multi-tenant-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Data Architecture](#9-data-architecture)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Monitoring & Observability](#11-monitoring--observability)

---

## 1. Executive Summary

TalentSync is a modern, multi-tenant SaaS platform for interview management and recruitment operations. The platform enables organizations to:

- Schedule and manage interviews across multiple stages
- Track candidates through the hiring pipeline
- Integrate with major CRM and ATS platforms
- Generate hiring analytics and reports
- Support enterprise SSO and security requirements

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Framework | NestJS (Node.js) | TypeScript support, modular architecture, excellent DI |
| Frontend Framework | Next.js 14 (React) | App Router, SSR/SSG, TypeScript |
| Database | PostgreSQL | ACID compliance, JSON support, enterprise-ready |
| Cache | Redis | Session management, job queues, caching |
| Object Storage | MinIO (S3-compatible) | On-premise/cloud flexibility, resume storage |
| Message Queue | BullMQ (Redis-backed) | Reliable background jobs, retries |
| Container Runtime | Docker + Kubernetes | Scalability, orchestration |

---

## 2. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React)  │  Mobile (Responsive Web)          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Rate Limiting  │  JWT Validation  │  CORS  │  Request Logging │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER (NestJS)                    │
├─────────────────────────────────────────────────────────────────┤
│  Auth Module     │  Candidates Module   │  Interviews Module   │
│  Integrations    │  Reports Module      │  Communication       │
│  Admin Console   │  Users/Teams         │  Settings            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│         Prisma ORM          │          Redis Client            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│   PostgreSQL    │    Redis     │    MinIO (S3)    │   BullMQ   │
└─────────────────────────────────────────────────────────────────┘
```

### Module Overview

| Module | Purpose | Key Features |
|--------|---------|--------------|
| `auth` | Authentication & Authorization | JWT, OAuth 2.0, 2FA, RBAC |
| `sso` | Enterprise SSO | SAML 2.0, OAuth SSO providers |
| `candidates` | Candidate Management | CRUD, resume parsing, bulk import |
| `interviews` | Interview Scheduling | Calendar sync, feedback, stages |
| `integrations` | External Integrations | 9 providers (CRM/ATS/HRIS) |
| `reports` | Analytics & Reporting | Pre-built reports, scheduled delivery |
| `communication` | Multi-channel Messaging | Email, SMS, WhatsApp, Webhooks |
| `admin-console` | Administration | Tenant management, settings |
| `storage` | File Management | MinIO integration, secure uploads |

---

## 3. Architecture Principles

### 3.1 Design Principles

1. **Multi-Tenancy First**: Every data access is tenant-scoped
2. **Security by Design**: Authentication/authorization at every layer
3. **Event-Driven**: Decoupled components via events and queues
4. **API-First**: All functionality exposed via REST API
5. **Horizontal Scalability**: Stateless services, externalized state

### 3.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| API Response Time | < 200ms (95th percentile) | APM monitoring |
| System Uptime | 99.5% | Uptime monitoring |
| Concurrent Users | 5,000+ | Load testing |
| Data Encryption | AES-256 (rest), TLS 1.3 (transit) | Security audit |
| Recovery Time | < 4 hours (RTO) | DR testing |

---

## 4. Technology Stack

### Backend Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20.x LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x |
| ORM | Prisma | 6.x |
| API Documentation | Swagger/OpenAPI | 3.0 |
| Queue | BullMQ | 5.x |
| Validation | class-validator | 0.14.x |

### Frontend Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14.x |
| Language | TypeScript | 5.x |
| State Management | TanStack Query | 5.x |
| UI Components | Radix UI + Tailwind | Latest |
| Forms | React Hook Form | 7.x |
| Charts | Recharts | 2.x |

### Infrastructure Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL | 15.x | Primary data store |
| Cache/Queue | Redis | 7.x | Caching, sessions, jobs |
| Object Storage | MinIO | Latest | S3-compatible file storage |
| Containerization | Docker | 24.x | Application packaging |
| Orchestration | Kubernetes | 1.28+ | Container orchestration |
| Reverse Proxy | Nginx/Traefik | - | Load balancing, SSL |

---

## 5. System Architecture

### 5.1 Backend Module Architecture

```
src/
├── common/                    # Shared utilities
│   ├── prisma.service.ts     # Database client
│   ├── redis.service.ts      # Cache client
│   ├── encryption.service.ts # Data encryption
│   └── health.controller.ts  # Health checks
│
├── modules/
│   ├── auth/                 # Authentication
│   │   ├── guards/           # JWT, RBAC guards
│   │   ├── strategies/       # Passport strategies
│   │   └── decorators/       # @Roles, @Public
│   │
│   ├── candidates/           # Candidate management
│   │   ├── services/         # Business logic
│   │   ├── dto/              # Validation schemas
│   │   └── processors/       # Background jobs
│   │
│   ├── integrations/         # External integrations
│   │   ├── providers/        # Per-provider implementations
│   │   │   ├── zoho/
│   │   │   ├── salesforce/
│   │   │   ├── hubspot/
│   │   │   ├── bamboohr/
│   │   │   ├── lever/
│   │   │   ├── greenhouse/
│   │   │   └── workday/
│   │   ├── services/         # Shared integration services
│   │   └── processors/       # Sync job processors
│   │
│   └── [other modules...]
│
└── main.ts                   # Application bootstrap
```

### 5.2 Request Flow

```
Client Request
      │
      ▼
┌─────────────┐
│   Nginx     │ ← SSL Termination, Rate Limiting
└─────────────┘
      │
      ▼
┌─────────────┐
│  NestJS     │ ← Request Validation
│  Guards     │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Controller  │ ← Route Handling
└─────────────┘
      │
      ▼
┌─────────────┐
│  Service    │ ← Business Logic
└─────────────┘
      │
      ▼
┌─────────────┐
│  Prisma     │ ← Data Access
└─────────────┘
      │
      ▼
┌─────────────┐
│ PostgreSQL  │ ← Data Storage
└─────────────┘
```

---

## 6. Multi-Tenant Architecture

### 6.1 Tenant Isolation Strategy

TalentSync uses **row-level multi-tenancy** with tenant ID enforcement:

```typescript
// Every table includes tenantId
model Candidate {
  id       String @id @default(cuid())
  tenantId String // Foreign key to Tenant
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  // ... other fields
  
  @@index([tenantId, createdAt])
}
```

### 6.2 Tenant Context Propagation

```typescript
// JWT contains tenant context
interface JwtPayload {
  sub: string;      // User ID
  tenantId: string; // Tenant ID  
  role: string;     // User role
  permissions: string[];
}

// Every service method receives tenantId
async getCandidates(tenantId: string, filters: ListDto) {
  return this.prisma.candidate.findMany({
    where: { tenantId, ...filters }
  });
}
```

### 6.3 Tenant-Specific Features

| Feature | Scope | Storage |
|---------|-------|---------|
| Settings | Per-tenant | `TenantSettings` table |
| Integrations | Per-tenant | `Integration` table |
| Users | Per-tenant | `User` table |
| Branding | Per-tenant | `TenantSettings.branding` |
| SSO Config | Per-tenant | `IdentityProvider` table |

---

## 7. Security Architecture

### 7.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  /login  │────▶│  Verify  │
└──────────┘     └──────────┘     └──────────┘
                                       │
                                       ▼
                                 ┌──────────┐
                                 │  Issue   │
                                 │   JWT    │
                                 └──────────┘
                                       │
                                       ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │◀────│  Access  │◀────│  Refresh │
│  Stores  │     │  Token   │     │  Token   │
└──────────┘     └──────────┘     └──────────┘
```

### 7.2 Authorization Model (RBAC)

| Role | Permissions |
|------|-------------|
| SUPERADMIN | Platform-wide access |
| ADMIN | Full tenant access |
| MANAGER | Team management, all candidates |
| RECRUITER | Own candidates, scheduling |
| INTERVIEWER | View assigned interviews |
| READONLY | View-only access |

### 7.3 Security Controls

| Control | Implementation |
|---------|---------------|
| Password Hashing | bcrypt (rounds: 12) |
| Token Encryption | JWT with RS256 |
| API Rate Limiting | 100 req/min (read), 30 req/min (write) |
| Input Validation | class-validator DTOs |
| XSS Prevention | Helmet.js, CSP headers |
| SQL Injection | Prisma parameterized queries |
| CSRF Protection | SameSite cookies |
| Secrets Management | Environment variables, encrypted at rest |

### 7.4 Data Encryption

| Data Type | Encryption |
|-----------|------------|
| Passwords | bcrypt hash |
| OAuth Tokens | AES-256-GCM |
| API Keys | AES-256-GCM |
| PII in transit | TLS 1.3 |
| Database backups | AES-256 |

---

## 8. Integration Architecture

### 8.1 Integration Provider Pattern

```typescript
interface IntegrationProvider {
  // Authentication
  getAuthUrl(tenantId: string): Promise<string>;
  exchangeCode(tenantId: string, code: string): Promise<void>;
  refreshTokens(tenantId: string): Promise<void>;
  
  // Sync Operations
  syncCandidate(tenantId: string, id: string, event: string): Promise<void>;
  syncInterview(tenantId: string, id: string, event: string): Promise<void>;
  
  // Status
  getStatus(tenantId: string): Promise<IntegrationStatus>;
  testConnection(tenantId: string): Promise<TestResult>;
}
```

### 8.2 Supported Integrations

| Provider | Type | Auth Method | Sync Direction |
|----------|------|-------------|----------------|
| Zoho CRM | CRM | OAuth 2.0 | Bidirectional |
| Salesforce | CRM | OAuth 2.0 | Push |
| HubSpot | CRM | OAuth 2.0 | Push |
| BambooHR | HRIS | OAuth 2.0 | Push (Hired → Employee) |
| Lever | ATS | OAuth 2.0 | Push |
| Greenhouse | ATS | API Key | Push |
| Workday | ATS | OAuth 2.0 | Push |
| Google Calendar | Calendar | OAuth 2.0 | Bidirectional |
| Outlook Calendar | Calendar | OAuth 2.0 | Bidirectional |

### 8.3 Integration Event Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Candidate  │────▶│    Event     │────▶│   BullMQ     │
│   Updated    │     │   Emitter    │     │   Queue      │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   External   │◀────│   Provider   │◀────│    Sync      │
│     API      │     │   Handler    │     │  Processor   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 9. Data Architecture

### 9.1 Core Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Tenant    │──────▶│    User     │──────▶│    Team     │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │
      ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Candidate  │──────▶│  Interview  │──────▶│  Feedback   │
└─────────────┘       └─────────────┘       └─────────────┘
      │                     │
      ▼                     ▼
┌─────────────┐       ┌─────────────┐
│   Resume    │       │  Calendar   │
│  (MinIO)    │       │   Event     │
└─────────────┘       └─────────────┘
```

### 9.2 Key Tables

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `Tenant` | Multi-tenant root | Primary |
| `User` | User accounts | `tenantId`, `email` |
| `Candidate` | Candidate profiles | `tenantId`, `email`, `stage` |
| `Interview` | Interview sessions | `tenantId`, `candidateId`, `date` |
| `Integration` | Provider connections | `tenantId`, `provider` |
| `SyncLog` | Integration audit | `tenantId`, `provider`, `createdAt` |

### 9.3 Data Retention

| Data Type | Retention | Policy |
|-----------|-----------|--------|
| Candidates | 7 years | Compliance |
| Interviews | 7 years | Compliance |
| Audit Logs | 3 years | Regulatory |
| Sync Logs | 90 days | Rolling |
| Session Data | 24 hours | Auto-expire |

---

## 10. Deployment Architecture

### 10.1 Container Architecture

```yaml
# docker-compose.yml structure
services:
  backend:
    image: talentsync-backend:latest
    replicas: 3
    resources:
      limits: { cpus: '1', memory: '2G' }
    
  frontend:
    image: talentsync-frontend:latest
    replicas: 2
    
  postgres:
    image: postgres:15
    volumes: [pgdata:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    
  minio:
    image: minio/minio
    volumes: [minio-data:/data]
```

### 10.2 Kubernetes Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Ingress   │  │   Backend   │  │  Frontend   │         │
│  │  Controller │  │  Deployment │  │  Deployment │         │
│  │  (3 pods)   │  │  (3 pods)   │  │  (2 pods)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  PostgreSQL │  │    Redis    │  │    MinIO    │         │
│  │ StatefulSet │  │ StatefulSet │  │ StatefulSet │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Persistent Volume Claims            │       │
│  │  (Database, Redis, MinIO storage)               │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Environment Configuration

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| Development | Local dev | Docker Compose |
| Staging | Pre-production testing | K8s (single node) |
| Production | Live system | K8s (multi-node, HA) |

---

## 11. Monitoring & Observability

### 11.1 Health Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/health` | Basic health | `{ status: 'ok' }` |
| `/health/ready` | Readiness probe | DB, Redis, MinIO status |
| `/health/live` | Liveness probe | Process alive check |

### 11.2 Logging Strategy

```typescript
// Structured logging with context
logger.log({
  level: 'info',
  tenantId: context.tenantId,
  userId: context.userId,
  action: 'CANDIDATE_CREATED',
  candidateId: result.id,
  duration: Date.now() - start,
});
```

### 11.3 Metrics Collection

| Metric | Type | Purpose |
|--------|------|---------|
| `http_request_duration` | Histogram | API latency |
| `http_requests_total` | Counter | Request volume |
| `db_query_duration` | Histogram | Database performance |
| `queue_depth` | Gauge | Job queue backlog |
| `integration_sync_total` | Counter | Sync operations |
| `integration_sync_errors` | Counter | Sync failures |

### 11.4 Alerting Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | >5% 5xx responses | Critical |
| High Latency | p99 > 2s | Warning |
| Queue Backlog | >1000 pending jobs | Warning |
| Database Connection | Pool exhausted | Critical |
| Disk Usage | >80% on any PV | Warning |

---

## Appendix A: API Documentation

API documentation is available via Swagger UI at `/api/docs`

## Appendix B: Environment Variables

See `.env.example` for complete list of configuration options.

## Appendix C: Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial release |

---

*Document prepared by TalentSync Engineering Team*
