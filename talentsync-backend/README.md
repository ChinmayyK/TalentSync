# TalentSync Backend

Backend service for TalentSync Interview Management System.
Built with NestJS, Prisma, BullMQ, and PostgreSQL.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Quick Start (Local Development)

1.  **Clone & Install**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```

3.  **Start Infrastructure**
    Start Postgres, Redis, and MinIO:
    ```bash
    docker-compose up -d
    ```

4.  **Database Migration**
    Apply database schema:
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```

5.  **Start Backend**
    Dev mode with watch:
    ```bash
    npm run start:dev
    ```
    The server typically runs on [http://localhost:3000](http://localhost:3000).

## Infrastructure Services

- **App**: Port 3000
- **Postgres**: Port 5432 (User: user / Pass: password / DB: talentsync)
- **Redis**: Port 6379
- **MinIO**: Console at Port 9001 (User/Pass: minioadmin)

## Commands

- `npm run start:dev` - Start in dev mode
- `npm run build` - Build production bundle
- `npm run test` - Run unit tests
- `npm run lint` - Lint code
- `npm run provision:tenant` - CLI to provision tenants (see Admin Console docs)

## Architecture

- **Auth**: JWT (AccessToken + RefreshToken)
- **Job Queues**: BullMQ (Redis) for Email, Integrations, etc.
- **ORM**: Prisma (PostgreSQL)
- **Role Control**: RBAC Guards + Tenant Isolation Middleware

## API Documentation

- **Health Check**: `GET /api/v1/health` (To be implemented/verified)
- **Auth**: `POST /api/v1/auth/login`, `POST /api/v1/auth/register` (See Postman collection)

## Deployment

CI pipeline provided in `.github/workflows/ci.yml`.
Docker build: `docker build -t talentsync-backend .`
