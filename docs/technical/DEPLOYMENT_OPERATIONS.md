# TalentSync Application - Deployment & Operations Manual

**Version:** 1.0  
**Date:** December 2025

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Docker Deployment](#3-docker-deployment)
4. [Kubernetes Deployment](#4-kubernetes-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Operations](#6-database-operations)
7. [Monitoring & Health Checks](#7-monitoring--health-checks)
8. [Backup & Recovery](#8-backup--recovery)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| npm | 10.x | Package manager |
| Docker | 24.x | Containerization |
| Docker Compose | 2.x | Local orchestration |
| PostgreSQL | 15.x | Database |
| Redis | 7.x | Cache/Queue |

### Hardware Requirements

| Environment | CPU | RAM | Storage |
|-------------|-----|-----|---------|
| Development | 4 cores | 8 GB | 20 GB |
| Staging | 4 cores | 16 GB | 100 GB |
| Production | 8+ cores | 32 GB | 500 GB+ |

---

## 2. Local Development Setup

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd talentsync

# Run the setup script
chmod +x start.sh
./start.sh
```

### Manual Setup

```bash
# 1. Install backend dependencies
cd talentsync-backend
npm install

# 2. Install frontend dependencies
cd ../talentsync-frontend
npm install

# 3. Start infrastructure
cd ..
docker-compose up -d postgres redis minio

# 4. Configure environment
cp talentsync-backend/.env.example talentsync-backend/.env
cp talentsync-frontend/.env.example talentsync-frontend/.env.local
# Edit files with your configuration

# 5. Run database migrations
cd talentsync-backend
npx prisma migrate deploy
npx prisma db seed

# 6. Start development servers
npm run dev  # In talentsync-backend
npm run dev  # In talentsync-frontend (separate terminal)
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| API Docs | http://localhost:3001/api/docs |
| MinIO Console | http://localhost:9001 |

---

## 3. Docker Deployment

### Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: talentsync-backend:latest
    build:
      context: ./talentsync-backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: talentsync-frontend:latest
    build:
      context: ./talentsync-frontend
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: talentsync_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redisdata:/data
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - miniodata:/data
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  miniodata:
```

### Build & Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## 4. Kubernetes Deployment

### Namespace Setup

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: talentsync
```

### Backend Deployment

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: talentsync-backend
  namespace: talentsync
spec:
  replicas: 3
  selector:
    matchLabels:
      app: talentsync-backend
  template:
    metadata:
      labels:
        app: talentsync-backend
    spec:
      containers:
      - name: backend
        image: talentsync-backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - secretRef:
            name: talentsync-secrets
        - configMapRef:
            name: talentsync-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: talentsync-backend
  namespace: talentsync
spec:
  selector:
    app: talentsync-backend
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: talentsync-ingress
  namespace: talentsync
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - app.talentsync.com
    - api.talentsync.com
    secretName: talentsync-tls
  rules:
  - host: app.talentsync.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: talentsync-frontend
            port:
              number: 3000
  - host: api.talentsync.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: talentsync-backend
            port:
              number: 3001
```

### Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n talentsync

# View logs
kubectl logs -f deployment/talentsync-backend -n talentsync

# Scale deployment
kubectl scale deployment talentsync-backend --replicas=5 -n talentsync
```

---

## 5. Environment Configuration

### Backend Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/talentsync_db

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=32-byte-hex-key-for-aes-256

# MinIO/S3
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=talentsync-files

# Integrations (per provider)
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-secret
SALESFORCE_CLIENT_ID=your-sf-client-id
HUBSPOT_CLIENT_ID=your-hubspot-client-id
BAMBOOHR_CLIENT_ID=your-bamboohr-client-id

# Communication
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
SENDGRID_API_KEY=your-sendgrid-key
```

### Frontend Environment Variables

```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Auth
NEXT_PUBLIC_AUTH_DOMAIN=your-auth-domain
```

---

## 6. Database Operations

### Migrations

```bash
# Create new migration
npx prisma migrate dev --name <description>

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset
```

### Seeding

```bash
# Run seed script
npx prisma db seed

# Custom seed
npx ts-node prisma/seed.ts
```

### Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U talentsync -d talentsync_db > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U talentsync -d talentsync_db < backup_20251227.sql
```

---

## 7. Monitoring & Health Checks

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health check |
| `GET /health/live` | Kubernetes liveness probe |
| `GET /health/ready` | Kubernetes readiness probe |

### Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2025-12-27T14:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "minio": "healthy"
  }
}
```

### Key Metrics to Monitor

- **API Response Time**: p50, p95, p99 latencies
- **Error Rate**: 4xx, 5xx responses
- **Queue Depth**: Pending background jobs
- **Database Connections**: Active/idle pool
- **Memory Usage**: Heap, RSS
- **Integration Sync Status**: Success/failure rates

---

## 8. Backup & Recovery

### Backup Schedule

| Component | Frequency | Retention |
|-----------|-----------|-----------|
| PostgreSQL | Daily | 30 days |
| Redis (RDB) | Hourly | 7 days |
| MinIO Files | Daily (incremental) | 90 days |

### Recovery Procedures

#### Database Recovery

```bash
# 1. Stop application
kubectl scale deployment talentsync-backend --replicas=0

# 2. Restore database
psql -h $DB_HOST -U $DB_USER -d talentsync_db < backup.sql

# 3. Restart application
kubectl scale deployment talentsync-backend --replicas=3
```

#### Point-in-Time Recovery

```bash
# Using PostgreSQL WAL
pg_restore --target-time="2025-12-27 14:00:00" backup.sql
```

---

## 9. Troubleshooting

### Common Issues

#### Backend won't start

```bash
# Check logs
docker logs talentsync-backend

# Common causes:
# - Database not ready: Wait for postgres healthcheck
# - Missing env vars: Verify .env file
# - Port conflict: Check if 3001 is in use
```

#### Database connection failures

```bash
# Test connection
psql -h localhost -U talentsync -d talentsync_db -c "SELECT 1"

# Check connection pool
# In application logs, look for "Pool exhausted"
# Solution: Increase pool size in DATABASE_URL
```

#### Integration sync failures

```bash
# Check sync logs
SELECT * FROM "SyncLog" 
WHERE status = 'failed' 
ORDER BY "createdAt" DESC 
LIMIT 10;

# Common causes:
# - Expired OAuth tokens: Re-authenticate integration
# - Rate limiting: Check external API limits
# - Invalid data: Review payload in sync log
```

#### High memory usage

```bash
# Check Node.js heap
curl http://localhost:3001/health/metrics

# Solutions:
# - Increase container memory limits
# - Check for memory leaks in logs
# - Review recent code changes
```

### Support Escalation

1. **L1**: Check health endpoints and logs
2. **L2**: Review metrics and recent deployments
3. **L3**: Engineering team investigation

---

## Appendix: Useful Commands

```bash
# View running containers
docker ps

# Tail all logs
docker-compose logs -f

# Enter container shell
docker exec -it talentsync-backend sh

# Database console
docker exec -it talentsync-postgres psql -U talentsync -d talentsync_db

# Redis CLI
docker exec -it talentsync-redis redis-cli

# Kubernetes pod shell
kubectl exec -it <pod-name> -n talentsync -- sh
```

---

*Operations Manual maintained by TalentSync DevOps Team*
