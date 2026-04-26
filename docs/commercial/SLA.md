# TalentSync - Service Level Agreement (SLA)

**Version:** 1.0  
**Effective Date:** January 2026

---

## 1. Overview

This Service Level Agreement (SLA) outlines the service commitments for TalentSync's cloud-hosted interview management platform. This SLA applies to all customers on paid subscription plans.

---

## 2. Service Availability

### 2.1 Uptime Commitment

| Plan | Monthly Uptime Target | Max Downtime/Month |
|------|----------------------|-------------------|
| Starter | 99.0% | 7.3 hours |
| Professional | 99.5% | 3.6 hours |
| Enterprise | 99.9% | 43.8 minutes |

### 2.2 Uptime Calculation

```
Monthly Uptime % = ((Total Minutes - Downtime Minutes) / Total Minutes) × 100
```

**Exclusions from downtime:**
- Scheduled maintenance (with 48-hour notice)
- Force majeure events
- Customer-side issues (network, browser)
- Third-party integration outages
- Beta/preview features

### 2.3 Service Credits

If TalentSync fails to meet the uptime commitment:

| Uptime Achieved | Credit % of Monthly Fee |
|-----------------|------------------------|
| < 99.9% but ≥ 99.0% | 10% |
| < 99.0% but ≥ 95.0% | 25% |
| < 95.0% | 50% |

**Credit Request Process:**
1. Submit request within 30 days of incident
2. Include affected dates and times
3. Credits applied to next billing cycle
4. Maximum credit: 100% of monthly fee

---

## 3. Performance Targets

### 3.1 Response Time

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response (p50) | < 100ms | Internal monitoring |
| API Response (p95) | < 200ms | Internal monitoring |
| API Response (p99) | < 500ms | Internal monitoring |
| Page Load Time | < 3 seconds | Synthetic monitoring |

### 3.2 Throughput

| Resource | Limit |
|----------|-------|
| API Rate Limit (read) | 100 requests/minute |
| API Rate Limit (write) | 30 requests/minute |
| Concurrent Users | Based on plan |
| File Upload Size | 50 MB |

---

## 4. Support Response Times

### 4.1 Support Tiers

| Plan | Support Level | Channels |
|------|--------------|----------|
| Starter | Standard | Email, Knowledge Base |
| Professional | Priority | Email, Chat, Phone |
| Enterprise | Premium | Email, Chat, Phone, Dedicated CSM |

### 4.2 Response Time Targets

| Priority | Description | Starter | Professional | Enterprise |
|----------|-------------|---------|--------------|------------|
| P1 - Critical | System down, data loss | 4 hours | 1 hour | 15 minutes |
| P2 - High | Major function impaired | 8 hours | 4 hours | 1 hour |
| P3 - Medium | Partial impact | 24 hours | 8 hours | 4 hours |
| P4 - Low | Minor issues, questions | 48 hours | 24 hours | 8 hours |

### 4.3 Priority Definitions

**P1 - Critical:**
- Complete system unavailability
- Data corruption or loss
- Security breach

**P2 - High:**
- Major feature completely non-functional
- Significant performance degradation
- Integration sync failures

**P3 - Medium:**
- Feature partially impaired
- Workaround available
- Non-critical bug

**P4 - Low:**
- UI/UX improvements
- Feature requests
- General questions

---

## 5. Data & Security

### 5.1 Data Protection

| Measure | Commitment |
|---------|------------|
| Encryption at Rest | AES-256 |
| Encryption in Transit | TLS 1.3 |
| Backup Frequency | Daily |
| Backup Retention | 30 days |
| Data Center | SOC 2 Type II certified |

### 5.2 Security Practices

- Regular security audits
- Annual penetration testing
- Vulnerability scanning
- Incident response within 24 hours
- Security breach notification within 72 hours

### 5.3 Data Residency

| Region | Data Location |
|--------|---------------|
| US | AWS us-east-1 |
| EU | AWS eu-west-1 |
| APAC | AWS ap-south-1 |

Enterprise customers may request specific data residency.

---

## 6. Maintenance

### 6.1 Scheduled Maintenance

- Notification: 48 hours in advance
- Preferred time: Sundays 2:00 AM - 6:00 AM UTC
- Estimated duration provided in advance
- Status page updates

### 6.2 Emergency Maintenance

- For critical security patches
- Notification as soon as possible
- Post-incident summary provided

### 6.3 Status Page

Real-time status available at: `status.talentsync.com`

- Current system status
- Incident history
- Scheduled maintenance
- Subscribe to updates (email, SMS, webhook)

---

## 7. Business Continuity

### 7.1 Disaster Recovery

| Metric | Target |
|--------|--------|
| Recovery Point Objective (RPO) | 1 hour |
| Recovery Time Objective (RTO) | 4 hours |

### 7.2 Redundancy

- Multi-AZ deployment
- Database replication
- Geographic failover (Enterprise)
- Regular DR testing

---

## 8. Compliance

### 8.1 Current Certifications

- GDPR Compliant
- CCPA Compliant
- SOC 2 Type II (in progress)

### 8.2 Industry Standards

- OWASP Top 10 compliance
- Regular third-party audits
- Data processing agreements available

---

## 9. Exclusions

This SLA does not apply to:

1. Free tier accounts
2. Beta or preview features
3. Third-party integrations
4. Customer API misuse or abuse
5. Force majeure events
6. Customer-caused security incidents

---

## 10. Contact

**Support:**
- Email: support@talentsync.com
- Phone: +1 (555) 123-4567
- Portal: app.talentsync.com/support

**Status:**
- status.talentsync.com

**Security:**
- security@talentsync.com

---

*This SLA is subject to the TalentSync Terms of Service and may be updated with 30 days notice.*
