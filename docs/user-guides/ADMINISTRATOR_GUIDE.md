# TalentSync Application - Administrator Guide

**Version:** 1.0  
**Date:** December 2025  
**Audience:** System Administrators, IT Teams

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Tenant Management](#2-tenant-management)
3. [User Management](#3-user-management)
4. [Team Configuration](#4-team-configuration)
5. [Role & Permissions](#5-role--permissions)
6. [Integration Setup](#6-integration-setup)
7. [SSO Configuration](#7-sso-configuration)
8. [Communication Channels](#8-communication-channels)
9. [System Settings](#9-system-settings)
10. [Security Best Practices](#10-security-best-practices)

---

## 1. Getting Started

### Accessing the Admin Console

1. Log in to TalentSync at `https://app.talentsync.com`
2. Navigate to **Settings** → **Admin Console** (visible only to Admins)
3. Or directly access `https://app.talentsync.com/admin`

### Admin Dashboard Overview

The Admin Console provides:

- **Tenant Settings**: Branding, preferences, configurations
- **User Management**: Add/remove users, assign roles
- **Team Management**: Create teams, assign members
- **Integrations**: Connect CRM/ATS/HRIS systems
- **System Metrics**: Usage analytics, health monitoring

---

## 2. Tenant Management

### Viewing Tenant Details

Navigate to **Admin** → **Tenant Settings** to view:

| Field | Description |
|-------|-------------|
| Tenant Name | Organization display name |
| Slug | Unique URL identifier |
| Plan | Subscription tier (Free/Starter/Professional/Enterprise) |
| Status | Active, Suspended, or Trial |

### Updating Tenant Settings

1. Go to **Admin** → **Tenant Settings**
2. Edit the following sections:

#### General Settings

- **Organization Name**: Displayed in UI and emails
- **Logo**: Upload company logo (PNG/SVG, max 2MB)
- **Primary Color**: Brand color for UI accent

#### Preferences

- **Date Format**: MM/DD/YYYY or DD/MM/YYYY
- **Time Zone**: Default timezone for scheduling
- **Language**: UI language (English by default)

#### Security Settings

- **Session Timeout**: Auto-logout after inactivity (15-120 minutes)
- **Password Policy**: Minimum length, complexity requirements
- **2FA Requirement**: Enforce two-factor authentication

---

## 3. User Management

### Inviting New Users

1. Navigate to **Admin** → **Users & Teams**
2. Click **Invite User**
3. Enter:
   - Email address
   - Name
   - Role (see [Roles & Permissions](#5-role--permissions))
   - Team (optional)
4. Click **Send Invite**

The user will receive an email invitation to set up their account.

### Managing Existing Users

| Action | Steps |
|--------|-------|
| Edit User | Click user row → Edit details |
| Change Role | User menu → Change Role → Select new role |
| Deactivate | User menu → Deactivate (preserves data) |
| Delete | User menu → Delete (requires confirmation) |
| Reset 2FA | User menu → Reset Two-Factor Auth |
| Resend Invite | User menu → Resend Invitation |

### User Statuses

| Status | Description |
|--------|-------------|
| Pending | Invitation sent, not accepted |
| Active | Verified and active account |
| Deactivated | Temporarily disabled |

### Bulk User Import

1. Go to **Admin** → **Users & Teams**
2. Click **Import Users**
3. Download CSV template
4. Fill in user details:
   ```csv
   email,name,role,team
   john@company.com,John Doe,RECRUITER,Engineering
   jane@company.com,Jane Smith,MANAGER,Sales
   ```
5. Upload CSV and review
6. Click **Import**

---

## 4. Team Configuration

### Creating Teams

1. Navigate to **Admin** → **Users & Teams** → **Teams** tab
2. Click **Create Team**
3. Enter:
   - Team Name
   - Description
   - Team Lead (optional)
4. Click **Create**

### Managing Team Members

1. Click on a team to open details
2. Use **Add Members** to assign users
3. Use the member menu to:
   - Set as Team Lead
   - Remove from team

### Team-Based Permissions

Teams can be used to:

- Filter candidates by assigned team
- Restrict interview visibility
- Generate team-specific reports

---

## 5. Role & Permissions

### Available Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| ADMIN | Full tenant access | All permissions |
| MANAGER | Team management | Manage team, all candidates, reports |
| RECRUITER | Standard user | Own candidates, scheduling |
| INTERVIEWER | Limited access | View assigned interviews, submit feedback |
| READONLY | View only | Read-only access to candidates |

### Default Permissions Matrix

| Permission | ADMIN | MANAGER | RECRUITER | INTERVIEWER | READONLY |
|------------|:-----:|:-------:|:---------:|:-----------:|:--------:|
| View Candidates | ✓ | ✓ | ✓ | Limited | ✓ |
| Create Candidates | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit Candidates | ✓ | ✓ | Own | ✗ | ✗ |
| Delete Candidates | ✓ | ✓ | ✗ | ✗ | ✗ |
| Schedule Interviews | ✓ | ✓ | ✓ | ✗ | ✗ |
| Submit Feedback | ✓ | ✓ | ✓ | ✓ | ✗ |
| View Reports | ✓ | ✓ | Limited | ✗ | Limited |
| Manage Users | ✓ | Team | ✗ | ✗ | ✗ |
| Admin Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Integrations | ✓ | ✗ | ✗ | ✗ | ✗ |

### Custom Roles (Enterprise)

Enterprise plans support custom roles:

1. Go to **Admin** → **Roles & Permissions**
2. Click **Create Role**
3. Name the role and select permissions
4. Assign to users

---

## 6. Integration Setup

### Connecting Integrations

1. Navigate to **Admin** → **Integrations**
2. Find the integration you want to connect
3. Click **Connect**
4. Follow the OAuth flow or enter API credentials
5. Configure sync settings

### Available Integrations

| Integration | Type | Connection Method |
|-------------|------|-------------------|
| Zoho CRM | CRM | OAuth 2.0 |
| Salesforce | CRM | OAuth 2.0 |
| HubSpot | CRM | OAuth 2.0 |
| BambooHR | HRIS | OAuth 2.0 |
| Lever | ATS | OAuth 2.0 |
| Greenhouse | ATS | API Key |
| Workday | ATS | OAuth 2.0 |
| Google Calendar | Calendar | OAuth 2.0 |
| Outlook Calendar | Calendar | OAuth 2.0 |

### Integration Settings

After connecting, configure:

- **Sync Direction**: Inbound, Outbound, or Bidirectional
- **Sync Frequency**: Real-time or scheduled
- **Field Mapping**: Map TalentSync fields to external fields
- **Triggers**: Which events trigger sync

### Monitoring Integrations

View integration health at **Admin** → **Integrations**:

| Status | Meaning |
|--------|---------|
| Connected | Working normally |
| Warning | Minor issues, still syncing |
| Error | Sync failures, needs attention |
| Disconnected | Not connected |

---

## 7. SSO Configuration

### Supported Providers

- SAML 2.0 (Okta, Azure AD, OneLogin, etc.)
- OAuth 2.0/OIDC (Google Workspace, Azure AD)

### SAML Setup

1. Go to **Admin** → **Security** → **Single Sign-On**
2. Click **Configure SAML**
3. Enter:
   - **Entity ID**: Your IdP entity ID
   - **SSO URL**: IdP login URL
   - **Certificate**: X.509 certificate from IdP
4. Download TalentSync's SP metadata to configure your IdP
5. Click **Save** and **Test Connection**

### Google Workspace SSO

1. Go to **Admin** → **Security** → **Single Sign-On**
2. Click **Configure Google SSO**
3. Enter your Google Workspace domain
4. Users with matching email domains can sign in with Google

### Enforcing SSO

1. After successful SSO setup, toggle **Require SSO**
2. Users must use SSO to log in
3. Password login is disabled

> **Note**: Ensure at least one admin can access via SSO before enforcing.

---

## 8. Communication Channels

### Email Configuration

Navigate to **Admin** → **Communication** → **Email**:

1. Select email provider (SendGrid, Amazon SES, or SMTP)
2. Enter credentials:
   - API Key (for SendGrid/SES)
   - SMTP settings (for custom)
3. Configure sender:
   - From Name: "TalentSync Recruiting"
   - From Email: "noreply@yourcompany.com"
4. Verify domain ownership

### SMS Configuration (Twilio)

1. Go to **Admin** → **Communication** → **SMS**
2. Enter Twilio credentials:
   - Account SID
   - Auth Token
   - Phone Number
3. Enable SMS for notifications

### WhatsApp Configuration

1. Go to **Admin** → **Communication** → **WhatsApp**
2. Connect Twilio WhatsApp Business
3. Enter WhatsApp-enabled number
4. Configure message templates

### Email Templates

1. Go to **Admin** → **Communication** → **Templates**
2. Edit or create templates for:
   - Interview invitations
   - Reminders
   - Offer letters
   - Rejection notices
3. Use variables like `{{candidate.name}}`, `{{interview.date}}`

---

## 9. System Settings

### Hiring Stages

Customize your hiring pipeline:

1. Go to **Admin** → **Settings** → **Hiring Stages**
2. Default stages:
   - Applied → Screening → Interview → Offer → Hired/Rejected
3. Add, rename, or reorder stages
4. Set stage-specific automation

### Interview Types

Configure interview types:

| Type | Description |
|------|-------------|
| Phone Screen | Initial phone screening |
| Technical | Technical assessment |
| Behavioral | Behavioral interview |
| Panel | Multiple interviewers |
| Final | Final round |

### Automation Rules

Set up automations at **Admin** → **Automation**:

- Move to next stage after X days
- Send reminder before interview
- Notify team on stage change
- Sync to ATS on hire

### Data Retention

Configure at **Admin** → **Settings** → **Data Retention**:

- Candidate data retention period
- Interview recording retention
- Audit log retention

---

## 10. Security Best Practices

### Recommended Settings

| Setting | Recommended Value |
|---------|-------------------|
| Session Timeout | 30 minutes |
| 2FA | Required for Admins |
| Password Length | 12+ characters |
| Password Complexity | Upper, lower, number, symbol |
| Login Attempts | Lock after 5 failures |

### Regular Audits

1. Review user access monthly
2. Remove inactive users
3. Check integration connections
4. Review audit logs for unusual activity

### Audit Logs

View at **Admin** → **Security** → **Audit Logs**:

- User logins/logouts
- Permission changes
- Data exports
- Integration activities
- Admin actions

### Data Export

For GDPR/compliance:

1. Go to **Admin** → **Settings** → **Data Export**
2. Select data types to export
3. Choose format (JSON or CSV)
4. Download or schedule delivery

---

## Support

For assistance:

- **Documentation**: docs.talentsync.com
- **Email**: support@talentsync.com
- **Chat**: In-app support widget

---

*Administrator Guide maintained by TalentSync Product Team*

