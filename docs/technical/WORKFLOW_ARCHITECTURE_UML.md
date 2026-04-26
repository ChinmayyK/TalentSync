# TalentSync - Workflow Architecture UML Diagram

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp["Next.js Frontend<br/>(React 19)"]
        MobileWeb["Mobile Web<br/>(Responsive)"]
    end

    subgraph "API Gateway Layer"
        Gateway["API Gateway"]
        RateLimit["Rate Limiting"]
        JWT["JWT Validation"]
        CORS["CORS Handler"]
    end

    subgraph "Application Layer - NestJS"
        direction TB
        
        subgraph "Core Modules"
            Auth["Auth Module"]
            Users["Users Module"]
            Tenants["Tenants Module"]
            Roles["Roles Module"]
        end
        
        subgraph "Business Modules"
            Candidates["Candidates Module"]
            Interviews["Interviews Module"]
            Calendar["Calendar Module"]
            Feedback["Feedback Module"]
        end
        
        subgraph "Integration Modules"
            Integrations["Integrations Module"]
            Communication["Communication Module"]
            Email["Email Module"]
            Storage["Storage Module"]
        end
        
        subgraph "Admin Modules"
            Admin["Admin Console"]
            Reports["Reports Module"]
            Settings["Settings Module"]
            Audit["Audit Module"]
        end
    end

    subgraph "Background Processing"
        BullMQ["BullMQ Queue"]
        SyncProcessor["Sync Processors"]
        EmailProcessor["Email Workers"]
    end

    subgraph "Data Layer"
        Prisma["Prisma ORM"]
        Redis["Redis Cache"]
    end

    subgraph "Storage Layer"
        PostgreSQL[("PostgreSQL 15")]
        RedisDB[("Redis 7")]
        MinIO[("MinIO/S3")]
    end

    WebApp --> Gateway
    MobileWeb --> Gateway
    Gateway --> RateLimit --> JWT --> CORS

    CORS --> Auth
    CORS --> Users
    CORS --> Candidates
    CORS --> Interviews
    CORS --> Calendar
    CORS --> Integrations
    CORS --> Reports
    CORS --> Admin

    Auth --> Prisma
    Candidates --> Prisma
    Interviews --> Prisma
    Integrations --> BullMQ
    Communication --> BullMQ
    
    BullMQ --> SyncProcessor
    BullMQ --> EmailProcessor
    SyncProcessor --> Integrations
    EmailProcessor --> Email

    Prisma --> PostgreSQL
    Redis --> RedisDB
    Storage --> MinIO
```

---

## Request Flow Sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant N as Nginx
    participant G as Guards
    participant Ctrl as Controller
    participant Svc as Service
    participant P as Prisma
    participant DB as PostgreSQL

    C->>N: HTTP Request
    Note over N: SSL Termination<br/>Rate Limiting
    N->>G: Forward Request
    Note over G: JWT Validation<br/>RBAC Check
    G->>Ctrl: Authenticated Request
    Ctrl->>Svc: Business Logic
    Svc->>P: Data Query
    P->>DB: SQL Query
    DB-->>P: Result Set
    P-->>Svc: Entities
    Svc-->>Ctrl: Processed Data
    Ctrl-->>C: JSON Response
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant Auth as Auth Module
    participant DB as Database
    participant R as Redis

    U->>FE: Login (email/password)
    FE->>Auth: POST /auth/login
    Auth->>DB: Verify credentials
    DB-->>Auth: User record
    Auth->>Auth: Validate password (bcrypt)
    Auth->>Auth: Generate JWT tokens
    Auth->>R: Store refresh token
    Auth-->>FE: Access + Refresh tokens
    FE->>FE: Store tokens
    
    Note over FE,Auth: Subsequent Requests
    FE->>Auth: API Request + Bearer Token
    Auth->>Auth: Validate JWT
    Auth-->>FE: Protected resource
```

---

## Candidate Workflow

```mermaid
stateDiagram-v2
    [*] --> New: Candidate Created
    New --> Screening: Resume Review
    Screening --> Interview: Passed Screening
    Screening --> Rejected: Failed
    Interview --> Technical: Phone Screen Passed
    Interview --> Rejected: Failed
    Technical --> Onsite: Technical Passed
    Technical --> Rejected: Failed
    Onsite --> Offer: All Rounds Passed
    Onsite --> Rejected: Failed
    Offer --> Hired: Offer Accepted
    Offer --> Rejected: Offer Declined
    Hired --> [*]
    Rejected --> [*]
```

---

## Interview Scheduling Flow

```mermaid
sequenceDiagram
    participant R as Recruiter
    participant FE as Frontend
    participant Int as Interviews Module
    participant Cal as Calendar Module
    participant Email as Email Module
    participant Queue as BullMQ

    R->>FE: Schedule Interview
    FE->>Int: POST /interviews
    Int->>Cal: Check Availability
    Cal-->>Int: Available Slots
    Int->>Int: Create Interview
    Int->>Queue: Dispatch Email Job
    Queue->>Email: Process Email
    Email->>Email: Send Invitations
    Int-->>FE: Interview Created
    FE-->>R: Confirmation
```

---

## External Integration Flow

```mermaid
flowchart LR
    subgraph "TalentSync System"
        Event["Entity Event<br/>(Candidate/Interview)"]
        Emitter["Event Emitter"]
        Queue["BullMQ Queue"]
        Processor["Sync Processor"]
        Provider["Provider Handler"]
    end

    subgraph "External Systems"
        Zoho["Zoho CRM"]
        Salesforce["Salesforce"]
        HubSpot["HubSpot"]
        BambooHR["BambooHR"]
        Calendar["Google/Outlook<br/>Calendar"]
    end

    Event --> Emitter
    Emitter --> Queue
    Queue --> Processor
    Processor --> Provider

    Provider -->|OAuth 2.0| Zoho
    Provider -->|OAuth 2.0| Salesforce
    Provider -->|OAuth 2.0| HubSpot
    Provider -->|OAuth 2.0| BambooHR
    Provider -->|OAuth 2.0| Calendar
```

---

## Multi-Tenant Data Flow

```mermaid
flowchart TB
    subgraph "Request Context"
        JWT["JWT Token<br/>(tenantId, userId, role)"]
    end

    subgraph "Guard Layer"
        TenantGuard["Tenant Guard"]
        RoleGuard["Role Guard"]
    end

    subgraph "Service Layer"
        Service["Business Service"]
    end

    subgraph "Data Access"
        Prisma["Prisma Client"]
        RLS["Row-Level Filter<br/>(WHERE tenantId = ?)"]
    end

    subgraph "Database"
        T1["Tenant A Data"]
        T2["Tenant B Data"]
        T3["Tenant C Data"]
    end

    JWT --> TenantGuard
    TenantGuard --> RoleGuard
    RoleGuard --> Service
    Service --> Prisma
    Prisma --> RLS
    RLS --> T1
    RLS --> T2
    RLS --> T3
```

---

## Module Dependencies

```mermaid
graph TD
    subgraph "Foundational"
        Common["Common Module"]
        Prisma["Prisma Service"]
        Redis["Redis Service"]
    end

    subgraph "Core"
        Auth["Auth"] --> Common
        Tenants["Tenants"] --> Common
        Users["Users"] --> Auth
        Roles["Roles"] --> Auth
    end

    subgraph "Features"
        Candidates["Candidates"] --> Users
        Interviews["Interviews"] --> Candidates
        Calendar["Calendar"] --> Interviews
        Feedback["Feedback"] --> Interviews
        Reports["Reports"] --> Candidates
        Reports --> Interviews
    end

    subgraph "External"
        Integrations["Integrations"] --> Candidates
        Integrations --> Interviews
        Communication["Communication"] --> Common
        Storage["Storage"] --> Common
    end

    Common --> Prisma
    Common --> Redis
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16, React 19 | UI Framework |
| **Backend** | NestJS 11 | API Server |
| **Database** | PostgreSQL 15 | Primary Data Store |
| **Cache** | Redis 7 | Sessions, Caching |
| **Queue** | BullMQ | Background Jobs |
| **Storage** | MinIO (S3) | File Storage |
| **ORM** | Prisma 5 | Database Access |
