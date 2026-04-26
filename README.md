<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
</p>

# TalentSync

**Multi-Tenant Interview Management Platform**

TalentSync is a SaaS platform built for recruitment teams to manage candidates, schedule interviews, collect structured feedback, and automate communications — all within a secure, multi-tenant architecture with full role-based access control.

---

## Features

### Candidate Management
- Full candidate lifecycle tracking with configurable hiring pipeline stages
- Resume upload and document management via S3-compatible object storage (MinIO)
- Candidate notes, tagging, and advanced filtering
- Soft-delete with recycle bin and restore capability
- Stage history audit trail for every transition
- Candidate portal with token-based secure access
- Resume inbox for automated candidate ingestion from email

### Interview Scheduling & Calendar
- Interactive calendar with day, week, and month views
- Bulk scheduling — sequential (staggered) and group modes
- Interviewer working hours and busy block management
- Scheduling rules engine with conflict detection
- Calendar sync with external providers (Google Calendar, Outlook)

### Feedback & Evaluation
- Structured feedback forms with criteria-based scoring
- Per-interviewer feedback with one-submission-per-interview enforcement
- Aggregate scoring and candidate overall rating
- No-show tracking and interview status lifecycle
- External feedback context import from ATS platforms (Greenhouse, Lever)

### Communication Hub
- Multi-channel messaging: Email, SMS, and WhatsApp
- Configurable channel providers (SMTP, SES, Twilio, WhatsApp Cloud API)
- Template engine with variable interpolation and versioning
- Automation rules with event-driven triggers (interview scheduled, stage change, reminders)
- Scheduled messages with BullMQ job orchestration
- Full message delivery tracking with status lifecycle (pending, sent, delivered, read, failed)

### Jobs & Offers
- Job posting management with multi-board distribution
- Offer letter generation and tracking
- Vendor/agency management with candidate submission attribution

### Authentication & Security
- JWT-based authentication with access and refresh token rotation
- Multi-tenant user membership with per-tenant role assignments
- Role-based access control (Superadmin, Admin, Manager, Recruiter, Interviewer, Vendor)
- Custom role definitions per tenant
- Two-Factor Authentication (TOTP) with recovery codes
- SSO via configurable Identity Providers (SAML/OIDC)
- Tenant-level security policies: IP allowlisting, password policies, session management
- Email verification and invite-based onboarding
- Password reset flow with secure token hashing

### Admin Console
- Tenant provisioning and configuration via CLI
- Team management with lead assignment
- User invitation system with role pre-assignment
- API key management with scoped permissions
- Audit logging for all tenant operations
- System metrics and usage dashboards

### Integrations
- Zoho CRM, Salesforce, HubSpot — candidate and opportunity sync
- BambooHR, Lever, Greenhouse, Workday — ATS data import
- Google Calendar and Outlook — bi-directional calendar sync
- Webhook framework for event-driven external integrations

---

## Architecture

```
                    ┌──────────────────────┐
                    │     Next.js 16       │
                    │   (React 19 + App    │
                    │      Router)         │
                    └──────────┬───────────┘
                               │ HTTP
                    ┌──────────▼───────────┐
                    │     NestJS 11        │
                    │   REST API (v1)      │
                    │  Guards / Middleware  │
                    │  Tenant Isolation    │
                    └──┬──────┬────────┬───┘
                       │      │        │
              ┌────────▼──┐ ┌─▼─────┐ ┌▼────────┐
              │ PostgreSQL │ │ Redis │ │  MinIO  │
              │   (Prisma) │ │       │ │  (S3)   │
              └────────────┘ └──┬────┘ └─────────┘
                                │
                          ┌─────▼─────┐
                          │  BullMQ   │
                          │  Workers  │
                          └───────────┘
```

### Multi-Tenant Data Isolation

Every data model is scoped to a `tenantId`. Middleware validates tenant context on every request, ensuring strict data isolation. Users can belong to multiple tenants with independent role assignments.

### Backend Modules

The backend follows a modular NestJS architecture with 30+ feature modules:

| Module | Description |
|--------|-------------|
| `auth` | JWT authentication, token rotation, 2FA |
| `candidates` | Candidate CRUD, pipeline stages, search |
| `interviews` | Scheduling, bulk operations, status lifecycle |
| `feedback` | Structured evaluation and scoring |
| `calendar` | Working hours, busy blocks, scheduling rules |
| `communication` | Multi-channel messaging and automation |
| `jobs` | Job postings, multi-board distribution |
| `offers` | Offer letter management |
| `vendors` | Agency management, submission tracking |
| `integrations` | CRM/ATS connectors, calendar sync |
| `sso` | Identity provider configuration |
| `teams` | Team management, membership |
| `roles` | Custom role definitions, RBAC |
| `audit` | Audit logging |
| `storage` | File management via S3/MinIO |
| `reports` | Reporting and analytics |
| `resume-inbox` | Email-to-candidate ingestion |
| `candidate-portal` | Secure external candidate access |
| `admin-console` | Tenant admin operations |
| `system-metrics` | Health and performance monitoring |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | React framework (App Router) |
| React | 19 | UI library |
| Tailwind CSS | 3.4 | Utility-first styling |
| Radix UI | Latest | Accessible component primitives |
| TanStack Query | 5 | Server state management and caching |
| Vitest | Latest | Unit testing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11 | Modular Node.js framework |
| PostgreSQL | 15+ | Primary relational database |
| Prisma | 5 | Type-safe ORM with migrations |
| Redis | 7+ | Caching, rate limiting, sessions |
| BullMQ | 5 | Background job queues |
| MinIO | Latest | S3-compatible object storage |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker & Docker Compose | Local development environment |
| Kubernetes (Kustomize) | Production deployment with base/overlay configuration |
| GitHub Actions | CI/CD pipeline |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

### 1. Clone and Install

```bash
git clone <repository-url>
cd talentsync

# Install backend dependencies
cd talentsync-backend && npm install && cd ..

# Install frontend dependencies
cd talentsync-frontend && npm install && cd ..
```

### 2. Start Infrastructure

```bash
cd talentsync-backend
docker compose up -d
```

This starts PostgreSQL, Redis, and MinIO with persistent volumes.

### 3. Configure Environment

```bash
# Backend
cp talentsync-backend/.env.example talentsync-backend/.env

# Frontend
cp talentsync-frontend/.env.example talentsync-frontend/.env.local
```

### 4. Initialize Database

```bash
cd talentsync-backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 5. Run the Application

```bash
# Terminal 1 — Backend
cd talentsync-backend && npm run start:dev

# Terminal 2 — Frontend
cd talentsync-frontend && npm run dev
```

Or use the included startup script:

```bash
./start.sh
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| API Documentation (Swagger) | http://localhost:3001/api/docs |
| MinIO Console | http://localhost:9001 |
| Prisma Studio | `npx prisma studio` (port 5555) |

---

## Project Structure

```
talentsync/
├── talentsync-backend/             # NestJS backend service
│   ├── prisma/                 # Schema, migrations, seed data
│   └── src/
│       ├── common/             # Guards, decorators, filters, middleware
│       └── modules/            # Feature modules (30+)
│
├── talentsync-frontend/            # Next.js frontend application
│   ├── app/                    # App Router pages and layouts
│   │   ├── (auth)/             # Authentication pages
│   │   ├── (dashboard)/        # Main application views
│   │   ├── (candidate-portal)/ # External candidate-facing portal
│   │   └── (public)/           # Public pages
│   ├── components/             # Reusable React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # API clients, utilities, helpers
│   └── types/                  # TypeScript type definitions
│
├── docs/                       # Documentation
│   ├── technical/              # Architecture, database schema, deployment
│   ├── user-guides/            # Administrator and recruiter guides
│   ├── integrations/           # Integration setup guides
│   ├── developer/              # API authentication, webhook reference
│   └── commercial/             # SLA, pricing, legal documents
│
├── k8s/                        # Kubernetes manifests
│   ├── base/                   # Base Kustomize configuration
│   └── overlays/               # Environment-specific overrides
│
├── .github/workflows/          # CI/CD pipeline definitions
├── start.sh                    # Development startup script
└── docker-compose.yml          # Local infrastructure services
```

---

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs) directory:

| Category | Documents |
|----------|-----------|
| **Technical** | System Architecture, Database Schema, Deployment & Operations |
| **User Guides** | Administrator Guide, Recruiter Guide |
| **Integrations** | Setup guides for all 9 supported integrations |
| **Developer** | API Authentication (JWT, API Keys, OAuth 2.0), Webhook Reference |
| **Commercial** | SLA, Support Tiers, Pricing Plans, Legal |

---

## Development

### Available Commands

**Backend** (`talentsync-backend/`):

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run lint` | Lint codebase |
| `npm run provision:tenant` | Provision a new tenant via CLI |

**Frontend** (`talentsync-frontend/`):

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Lint codebase |

**Database**:

| Command | Description |
|---------|-------------|
| `npx prisma migrate dev` | Apply pending migrations |
| `npx prisma migrate reset` | Reset and re-seed database |
| `npx prisma studio` | Open database GUI |
| `npx prisma generate` | Regenerate Prisma client |

### Deployment

- **Docker**: `docker build -t talentsync-backend .` (from `talentsync-backend/`)
- **Kubernetes**: Kustomize-based with base and overlay configurations in `k8s/`
- **CI/CD**: Automated via GitHub Actions (`.github/workflows/`)

See [`docs/technical/DEPLOYMENT_OPERATIONS.md`](./docs/technical/DEPLOYMENT_OPERATIONS.md) for full deployment and operations documentation.

---

## License

This project is proprietary software. All rights reserved.
