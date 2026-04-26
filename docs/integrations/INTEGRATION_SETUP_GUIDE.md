# TalentSync - Integration Setup Guides

**Version:** 1.0  
**Date:** December 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Zoho CRM Integration](#zoho-crm-integration)
3. [Salesforce Integration](#salesforce-integration)
4. [HubSpot Integration](#hubspot-integration)
5. [BambooHR Integration](#bamboohr-integration)
6. [Lever Integration](#lever-integration)
7. [Greenhouse Integration](#greenhouse-integration)
8. [Workday Integration](#workday-integration)
9. [Google Calendar Integration](#google-calendar-integration)
10. [Outlook Calendar Integration](#outlook-calendar-integration)
11. [Troubleshooting](#troubleshooting)

---

## Overview

TalentSync integrates with major CRM, ATS, and HRIS platforms to streamline your hiring workflow.

### Integration Types

| Type | Direction | Description |
|------|-----------|-------------|
| CRM | Bidirectional | Sync contacts, leads, deals |
| ATS | Push | Send candidates to ATS |
| HRIS | Push | Create employees on hire |
| Calendar | Bidirectional | Sync interview events |

### Prerequisites

- Admin access to TalentSync
- Admin access to the external platform
- API credentials from the external platform

---

## Zoho CRM Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Bidirectional |
| Auth Method | OAuth 2.0 |
| Data Synced | Contacts, Leads, Deals |

### Setup Steps

1. **Get Zoho API Credentials**
   - Log in to [Zoho Developer Console](https://api-console.zoho.com/)
   - Click **Add Client**
   - Select **Server-based Applications**
   - Enter:
     - Client Name: `TalentSync`
     - Homepage URL: `https://app.talentsync.com`
     - Redirect URI: `https://api.talentsync.com/api/v1/integrations/zoho/callback`
   - Copy the **Client ID** and **Client Secret**

2. **Connect in TalentSync**
   - Go to **Admin** → **Integrations** → **Zoho CRM**
   - Click **Connect**
   - Log in to your Zoho account
   - Authorize access
   - You'll be redirected back to TalentSync

3. **Configure Sync Settings**
   - Enable/disable sync for each object type
   - Set sync frequency
   - Configure field mappings

### Field Mapping

| TalentSync Field | Zoho Field |
|--------------|------------|
| Name | Full_Name |
| Email | Email |
| Phone | Phone |
| Role | Title |
| Source | Lead_Source |

---

## Salesforce Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Push (TalentSync → Salesforce) |
| Auth Method | OAuth 2.0 |
| Data Synced | Contacts, Leads |

### Setup Steps

1. **Create Salesforce Connected App**
   - Go to **Setup** → **App Manager** → **New Connected App**
   - Enter:
     - Connected App Name: `TalentSync`
     - API Name: `TalentSync`
     - Contact Email: your email
   - Enable OAuth Settings:
     - Callback URL: `https://api.talentsync.com/api/v1/integrations/salesforce/callback`
     - Scopes: `api`, `refresh_token`, `offline_access`
   - Save and copy **Consumer Key** and **Consumer Secret**

2. **Connect in TalentSync**
   - Go to **Admin** → **Integrations** → **Salesforce**
   - Click **Connect**
   - Select production or sandbox
   - Authorize with Salesforce credentials

3. **Configure Sync**
   - Choose whether to sync candidates as Leads or Contacts
   - Map custom fields

### Environment URLs

| Environment | Login URL |
|-------------|-----------|
| Production | login.salesforce.com |
| Sandbox | test.salesforce.com |

---

## HubSpot Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Push (TalentSync → HubSpot) |
| Auth Method | OAuth 2.0 |
| Data Synced | Contacts, Deals |

### Setup Steps

1. **Create HubSpot App** (if using private app)
   - Go to **Settings** → **Integrations** → **Private Apps**
   - Create new app with scopes:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.deals.read`
     - `crm.objects.deals.write`

2. **Connect via OAuth**
   - In TalentSync: **Admin** → **Integrations** → **HubSpot**
   - Click **Connect**
   - Sign in to HubSpot
   - Select the HubSpot account
   - Authorize access

3. **Configure Sync**
   - Enable candidate sync to Contacts
   - Optionally create Deals for candidates

---

## BambooHR Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Push (Hired → Employee) |
| Auth Method | OAuth 2.0 |
| Trigger | Candidate marked as "Hired" |

### Setup Steps

1. **Register BambooHR App**
   - Go to [BambooHR Developer Portal](https://developers.bamboohr.com/)
   - Create new application
   - Set redirect URI: `https://api.talentsync.com/api/v1/integrations/bamboohr/callback`
   - Request scopes:
     - `employee.read`
     - `employee.write`
     - `offline_access`
   - Copy Client ID and Secret

2. **Connect in TalentSync**
   - Go to **Admin** → **Integrations** → **BambooHR**
   - Click **Connect**
   - Authorize with BambooHR credentials
   - Select your company subdomain

3. **Configure Handoff**
   - Map TalentSync fields to BambooHR employee fields:
     - Name → First Name / Last Name
     - Email → Work Email
     - Phone → Mobile Phone
     - Role → Job Title

### Automatic Employee Creation

When a candidate's stage changes to "Hired":
1. TalentSync creates an employee record in BambooHR
2. Basic info (name, email, phone) is transferred
3. Hire date is set to the transition date
4. Photo is uploaded if available

---

## Lever Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Push (TalentSync → Lever) |
| Auth Method | OAuth 2.0 |
| Data Synced | Opportunities, Notes |

### Setup Steps

1. **Get Lever API Credentials**
   - Contact Lever support or access Partner Portal
   - Request OAuth 2.0 credentials
   - Provide redirect URI: `https://api.talentsync.com/api/v1/integrations/lever/callback`

2. **Connect in TalentSync**
   - Go to **Admin** → **Integrations** → **Lever**
   - Enter Client ID and Secret
   - Click **Connect**
   - Authorize with Lever

3. **Configuration**
   - Candidates sync as Lever Opportunities
   - Interview notes sync to Lever Notes
   - Stage changes update Opportunity stage

---

## Greenhouse Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Push (TalentSync → Greenhouse) |
| Auth Method | API Key (Harvest API) |
| Data Synced | Candidates, Interviews |

### Setup Steps

1. **Generate Greenhouse API Key**
   - Go to **Configure** → **Dev Center** → **API Credentials**
   - Click **Create New API Key**
   - Select **Harvest** API
   - Permissions needed:
     - Candidates: Create, Update
     - Scheduled Interviews: Create
   - Copy the API key

2. **Connect in TalentSync**
   - Go to **Admin** → **Integrations** → **Greenhouse**
   - Enter your API Key
   - Click **Connect**

3. **Configuration**
   - Map TalentSync stages to Greenhouse stages
   - Configure interview sync

### Best Practices

- Use a dedicated API key for TalentSync
- Limit permissions to minimum required
- Rotate API keys periodically

---

## Workday Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Push (TalentSync → Workday) |
| Auth Method | OAuth 2.0 |
| Data Synced | Candidates, Requisitions |

### Setup Steps

1. **Configure Workday OAuth**
   - In Workday: **Edit Tenant Setup - Security** → **OAuth 2.0 Clients**
   - Create new client:
     - Client Type: API Client
     - Redirect URI: `https://api.talentsync.com/api/v1/integrations/workday/callback`
   - Note the Client ID and Secret

2. **Configure API Access**
   - Create Integration System User (ISU)
   - Assign required security groups:
     - `Recruiting Administrator`
     - `Job Requisition Data`

3. **Connect in TalentSync**
   - Go to **Admin** → **Integrations** → **Workday**
   - Enter:
     - Workday Tenant URL
     - Client ID
     - Client Secret
   - Click **Connect**
   - Authorize access

---

## Google Calendar Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Bidirectional |
| Auth Method | OAuth 2.0 |
| Data Synced | Calendar Events |

### Setup Steps

1. **Connect Your Calendar**
   - Go to **Settings** → **Calendar** → **Google Calendar**
   - Click **Connect**
   - Sign in with Google
   - Grant calendar access permissions
   - Select calendars to sync

2. **Features**
   - Interview events automatically appear in Google Calendar
   - Changes in Google Calendar sync back to TalentSync
   - Meeting links (Google Meet) auto-generated

### Permissions Required

- `calendar.readonly` - View calendars
- `calendar.events` - Manage events

---

## Outlook Calendar Integration

### Overview

| Feature | Supported |
|---------|-----------|
| Sync Direction | Bidirectional |
| Auth Method | OAuth 2.0 (Microsoft) |
| Data Synced | Calendar Events |

### Setup Steps

1. **Connect Your Calendar**
   - Go to **Settings** → **Calendar** → **Outlook**
   - Click **Connect**
   - Sign in with Microsoft account
   - Authorize access

2. **Features**
   - Automatic sync with Outlook calendar
   - Teams meeting links supported
   - Free/busy status visibility

---

## Troubleshooting

### Common Issues

#### OAuth Authorization Failed

**Cause**: Redirect URI mismatch or expired session

**Solution**:
1. Verify redirect URI matches exactly in app settings
2. Clear browser cookies
3. Try connecting again

#### Sync Not Working

**Cause**: Token expired or revoked

**Solution**:
1. Go to Integration settings
2. Click **Reconnect**
3. Re-authorize the application

#### Missing Data in External System

**Cause**: Field mapping issue or missing permissions

**Solution**:
1. Check field mappings in integration settings
2. Verify API permissions in external system
3. Check sync logs for errors: **Admin** → **Integrations** → **Logs**

### Checking Integration Status

1. Go to **Admin** → **Integrations**
2. Look at status indicator:
   - 🟢 Connected - Working normally
   - 🟡 Warning - Minor issues
   - 🔴 Error - Needs attention
3. Click integration for detailed logs

### Viewing Sync Logs

1. Go to **Admin** → **Integrations** → Select integration
2. Click **View Logs**
3. Filter by:
   - Date range
   - Status (success/failed)
   - Entity type

### Contact Support

If issues persist:
- Email: support@talentsync.com
- Include:
  - Integration name
  - Error message
  - Sync log entries
  - Steps to reproduce

---

*Integration Guide maintained by TalentSync Engineering Team*
