# Customer Onboarding Checklist

## Overview

This checklist guides the onboarding of a new TalentSync customer from contract signature to go-live.

**Estimated Timeline**: 1-2 weeks (Standard/Pro), 2-4 weeks (Enterprise)

---

## Phase 1: Pre-Onboarding

### Commercial
- [ ] Contract signed
- [ ] Payment processed (or PO received)
- [ ] Plan tier confirmed: ____________
- [ ] User count confirmed: ____________

### Customer Information
- [ ] Primary contact: ____________
- [ ] Technical contact: ____________
- [ ] Admin email: ____________
- [ ] Company domain: ____________
- [ ] Timezone: ____________

### Requirements Gathered
- [ ] Number of recruiters
- [ ] Monthly hiring volume estimate
- [ ] Existing ATS (if any): ____________
- [ ] Existing CRM (if any): ____________
- [ ] SSO provider (if any): ____________
- [ ] Data residency requirements: ____________

---

## Phase 2: Tenant Setup

### Platform Admin Actions

1. **Create Tenant**
   ```bash
   POST /api/v1/admin/provision-tenant
   {
     "name": "Customer Name",
     "domain": "customer.com",
     "initialAdminEmail": "admin@customer.com"
   }
   ```
   - [ ] Tenant created
   - [ ] Tenant ID: ____________

2. **Configure Plan**
   ```bash
   PATCH /api/v1/admin/usage/{tenantId}/plan
   {
     "name": "Pro",
     "limits": { "users": 50, "candidates": 500 },
     "effectiveFrom": "2024-01-01"
   }
   ```
   - [ ] Plan configured

3. **Create Initial Admin**
   - [ ] Admin user created
   - [ ] Credentials sent securely

4. **Domain Verification** (if custom domain)
   - [ ] DNS TXT record provided
   - [ ] Domain verified

---

## Phase 3: Customer Configuration

### Admin Portal Setup (by Customer Admin)

1. **Branding**
   - [ ] Logo uploaded
   - [ ] Brand colors configured

2. **Team Setup**
   - [ ] Teams/departments created
   - [ ] Roles configured (if custom)

3. **User Provisioning**
   - [ ] User accounts created
   - [ ] Roles assigned
   - [ ] Invitations sent

4. **Security Configuration**
   - [ ] Password policy reviewed
   - [ ] MFA requirement set (if applicable)
   - [ ] IP allowlist configured (if applicable)

---

## Phase 4: Integration Enablement

### Calendar Integration
- [ ] Calendar provider selected: Google / Outlook
- [ ] OAuth connection established
- [ ] Test event created successfully

### CRM Integration (if applicable)
- [ ] CRM provider: ____________
- [ ] OAuth/API key configured
- [ ] Test sync successful
- [ ] Field mappings reviewed

### ATS Integration (if applicable)
- [ ] ATS provider: ____________
- [ ] Credentials configured
- [ ] Test candidate sync successful
- [ ] Stage mappings confirmed

### Communication Channels
- [ ] Email: SMTP/SES configured
- [ ] SMS: Twilio credentials (if Pro+)
- [ ] WhatsApp: Meta credentials (if Enterprise)
- [ ] Test message sent

---

## Phase 5: Data Setup

### Initial Data
- [ ] Candidate stages defined
- [ ] Interview types configured
- [ ] Email templates customized
- [ ] Scheduling preferences set

### Sample Data (for training)
- [ ] Test candidates created
- [ ] Test interviews scheduled
- [ ] Walkthrough completed with admin

---

## Phase 6: Training

### Admin Training
- [ ] Admin portal walkthrough
- [ ] User management training
- [ ] Integration management training
- [ ] Reporting overview

### Recruiter Training
- [ ] Scheduling workflow demo
- [ ] Candidate management demo
- [ ] Communication features demo
- [ ] Calendar integration demo

### Training Materials Provided
- [ ] User guide link shared
- [ ] Admin guide link shared
- [ ] FAQ document shared

---

## Phase 7: Go-Live Validation

### Functional Checks
- [ ] User login successful
- [ ] Candidate creation works
- [ ] Interview scheduling works
- [ ] Calendar events created
- [ ] Email notifications received
- [ ] Integration sync working

### Performance Checks
- [ ] Dashboard loads < 3 seconds
- [ ] No error messages visible

### Security Checks
- [ ] RBAC enforced correctly
- [ ] Audit logs capturing actions

---

## Phase 8: Go-Live

### Final Steps
- [ ] Production readiness confirmed
- [ ] Support contacts shared
- [ ] Escalation path documented
- [ ] Go-live date: ____________

### Post Go-Live
- [ ] Day 1 check-in scheduled
- [ ] Week 1 review scheduled
- [ ] Success metrics defined

---

## Sign-Off

```
Customer Name: ____________
Go-Live Date: ____________
Onboarded By: ____________

Customer Sign-Off: ____________
Date: ____________
```

---

## Support Information

| Channel | Availability | Response Time |
|---------|--------------|---------------|
| Email | 24/7 | 24 hours |
| Chat | Business hours | 4 hours |
| Phone | Enterprise only | 1 hour |

**Support Email**: support@talentsync.app
**Documentation**: docs.talentsync.app
