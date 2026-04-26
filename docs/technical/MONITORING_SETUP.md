# TalentSync Application - Monitoring Configuration

## Overview

This document describes the monitoring setup for achieving 99.5% uptime SLA as required by the SOW.

---

## Health Check Endpoints

### Backend Health

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Basic health check | `{ "status": "ok", "timestamp": "..." }` |
| `GET /health/ready` | Readiness probe | `{ "status": "ready", "db": "ok", "redis": "ok" }` |
| `GET /health/live` | Liveness probe | `{ "status": "alive" }` |

### Frontend Health

| Endpoint | Purpose |
|----------|---------|
| `GET /` | Main application |
| `GET /api/health` | Next.js API health |

---

## Recommended Monitoring Stack

### Option 1: Self-Hosted (Free)

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
```

### Option 2: Cloud Services

| Service | Purpose | SLA |
|---------|---------|-----|
| **UptimeRobot** | Uptime monitoring | Free tier: 50 monitors |
| **Datadog** | APM + Logs | Enterprise |
| **New Relic** | Full observability | Free tier available |
| **Pingdom** | Uptime + RUM | Enterprise |
| **AWS CloudWatch** | If using AWS | Pay-per-use |

---

## Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'talentsync-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: /metrics
    
  - job_name: 'talentsync-postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'talentsync-redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

---

## Alert Rules

```yaml
# alerts.yml
groups:
  - name: talentsync-sla
    rules:
      # Uptime Alert (99.5% SLA)
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.005
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected - SLA at risk"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 0.5%)"

      # Response Time Alert
      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API response time exceeds 200ms (p95)"

      # Database Alert
      - alert: DatabaseConnections
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection count high"

      # Service Down Alert
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
```

---

## Uptime Calculation

**Formula for 99.5% uptime:**
```
Allowed downtime per month = 30 days × 24 hours × 60 minutes × 0.5% = 216 minutes
Allowed downtime per year = 365 days × 24 hours × 60 minutes × 0.5% = 2,628 minutes (~43.8 hours)
```

---

## Quick Setup with UptimeRobot (Recommended for Start)

1. Create account at https://uptimerobot.com
2. Add monitors:
   - **Backend API**: `https://api.yoursite.com/health`
   - **Frontend**: `https://app.yoursite.com`
   - **Login Page**: `https://app.yoursite.com/login`
3. Set check interval: 5 minutes
4. Configure alerts: Email, Slack, SMS

---

## Metrics to Track (SLA Compliance)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.5% | Monitoring service |
| **API p95 latency** | <200ms | Prometheus |
| **Error rate** | <0.5% | Prometheus |
| **DB query time** | <100ms | Prometheus |
| **Page load time** | <2s | Real User Monitoring |

---

## Status Page Setup

Consider setting up a public status page:

- **Statuspage.io** (Atlassian) - Enterprise
- **Cachet** - Self-hosted, free
- **Instatus** - Affordable
- **Betteruptime** - Free tier available

---

## Implementation Checklist

- [ ] Deploy Prometheus + Grafana stack
- [ ] Configure UptimeRobot for external monitoring
- [ ] Set up alerting (Slack/Email)
- [ ] Create status page
- [ ] Document incident response procedures
- [ ] Configure on-call rotation

---

*Last updated: December 2025*
