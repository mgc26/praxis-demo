# Salesforce Health Cloud / Life Sciences Cloud REST API Integration Report

> **Generated**: 2026-03-18
> **Purpose**: Greenfield integration blueprint for Vi Operate (Praxis Precision Medicine patient services)
> **Stack**: Node.js / TypeScript / Fastify backend
> **Salesforce Editions**: Enterprise ($325/user/mo) or Unlimited ($500/user/mo)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication: OAuth 2.0 JWT Bearer Flow](#2-authentication-oauth-20-jwt-bearer-flow)
3. [REST API Fundamentals](#3-rest-api-fundamentals)
4. [Health Cloud Data Model (Object Reference)](#4-health-cloud-data-model-object-reference)
5. [Life Sciences Cloud Objects (Adverse Events, Pharmacovigilance)](#5-life-sciences-cloud-objects-adverse-events-pharmacovigilance)
6. [WRITE Operations: Post-Call Data Creation](#6-write-operations-post-call-data-creation)
7. [READ Operations: Pre-Call Enrichment](#7-read-operations-pre-call-enrichment)
8. [TRIGGER: Platform Events & Change Data Capture](#8-trigger-platform-events--change-data-capture)
9. [File Attachments: Transcript Storage](#9-file-attachments-transcript-storage)
10. [Composite API: Multi-Object Operations](#10-composite-api-multi-object-operations)
11. [Rate Limits & Quotas](#11-rate-limits--quotas)
12. [Error Handling & Retry Patterns](#12-error-handling--retry-patterns)
13. [Node.js Implementation: JSforce](#13-nodejs-implementation-jsforce)
14. [Integration Blueprint: End-to-End Call Flow](#14-integration-blueprint-end-to-end-call-flow)
15. [Sources](#15-sources)

---

## 1. Architecture Overview

```
Vi Operate (Node.js/Fastify)
    |
    |-- JSforce v3.x (Salesforce client library)
    |       |
    |       |-- REST API (CRUD on sObjects)
    |       |-- SOQL Queries (pre-call enrichment)
    |       |-- Composite API (multi-record atomic writes)
    |       |-- Streaming API (Platform Events subscription)
    |
    |-- Pub/Sub API gRPC Client (salesforce-pubsub-api-client)
    |       |
    |       |-- Platform Event subscription (outbound call triggers)
    |       |-- Change Data Capture subscription (record change notifications)
    |
    +-- OAuth 2.0 JWT Bearer Flow (server-to-server auth, no user interaction)
```

**Key Decisions:**
- **JSforce v3.x** (latest: v3.10.14) — isomorphic JS/TS library covering REST, SOQL, Bulk, Streaming, Metadata APIs
- **salesforce-pubsub-api-client** npm package — for Pub/Sub API (gRPC) subscriptions to Platform Events and CDC
- **JWT Bearer Flow** — server-to-server auth with no user interaction required
- **Composite API** — atomic multi-object writes in a single API call (counts as 1 API call against limits)

---

## 2. Authentication: OAuth 2.0 JWT Bearer Flow

The JWT Bearer flow is the recommended approach for server-to-server integrations where no interactive user login is possible.

### 2.1 Prerequisites (Salesforce Admin)

1. **Create a Connected App** in Salesforce Setup:
   - Navigate to: Setup > Apps > App Manager > New Connected App
   - Enable OAuth Settings
   - Callback URL: `https://oauthdebugger.com/debug` (or any valid URL; not used in JWT flow)
   - OAuth Scopes: `api`, `refresh_token`, `offline_access`
   - Check "Use digital signatures" and upload the X.509 certificate (public key)

2. **Pre-authorize the Connected App** for the integration user:
   - Setup > Manage Connected Apps > Your App > Edit Policies
   - Set "Permitted Users" to "Admin approved users are pre-authorized"
   - Assign a Permission Set or Profile that includes the integration user

3. **Integration User**: Create a dedicated Salesforce user (e.g., `vi-integration@praxis.com`) with appropriate Health Cloud permissions

### 2.2 Certificate Generation

```bash
# Generate RSA private key (2048-bit recommended for production)
openssl genrsa -out server.key 2048

# Generate X.509 certificate (upload this to Connected App)
openssl req -new -x509 -key server.key -out server.crt -days 3650 \
  -subj "/CN=vi-operate-integration/O=Praxis Precision Medicine"
```

### 2.3 JWT Claims Structure

```json
{
  "iss": "<CONNECTED_APP_CLIENT_ID>",
  "sub": "<SALESFORCE_USERNAME>",
  "aud": "https://login.salesforce.com",
  "exp": 1711000000
}
```

| Claim | Description |
|-------|-------------|
| `iss` | Connected App Consumer Key (Client ID) |
| `sub` | Salesforce username of the integration user |
| `aud` | `https://login.salesforce.com` (production) or `https://test.salesforce.com` (sandbox) |
| `exp` | Unix timestamp, must be within 3 minutes of current time |

### 2.4 Token Exchange

```
POST https://login.salesforce.com/services/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=<SIGNED_JWT>
```

**Response:**
```json
{
  "access_token": "00D...",
  "instance_url": "https://praxis.my.salesforce.com",
  "id": "https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS",
  "token_type": "Bearer",
  "issued_at": "1711000000000",
  "signature": "..."
}
```

### 2.5 Node.js/TypeScript Implementation

```typescript
import jsforce from 'jsforce';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const privateKey = fs.readFileSync('./certs/server.key', 'utf8');

const SF_CONFIG = {
  clientId: process.env.SF_CLIENT_ID!,
  username: process.env.SF_USERNAME!,        // e.g., 'vi-integration@praxis.com'
  loginUrl: process.env.SF_LOGIN_URL!,       // 'https://login.salesforce.com'
  privateKey,
};

async function getSalesforceConnection(): Promise<jsforce.Connection> {
  const conn = new jsforce.Connection({
    loginUrl: SF_CONFIG.loginUrl,
  });

  // Build JWT
  const claim = {
    iss: SF_CONFIG.clientId,
    sub: SF_CONFIG.username,
    aud: SF_CONFIG.loginUrl,
    exp: Math.floor(Date.now() / 1000) + 180, // 3 minutes
  };

  const token = jwt.sign(claim, SF_CONFIG.privateKey, { algorithm: 'RS256' });

  // Exchange JWT for access token
  await conn.authorize({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token,
  });

  console.log(`Authenticated as: ${conn.userInfo?.id}`);
  console.log(`Instance URL: ${conn.instanceUrl}`);

  return conn;
}
```

**Token Refresh**: The JWT Bearer flow does not return a refresh token. Re-sign and re-exchange a new JWT when the access token expires (typically 1-2 hours). JSforce can be configured to auto-re-auth.

---

## 3. REST API Fundamentals

### 3.1 Base URL Pattern

```
https://{instance}.my.salesforce.com/services/data/v{version}/
```

Example: `https://praxis.my.salesforce.com/services/data/v62.0/`

Current recommended API version: **v62.0** (Spring '26). Always use the latest stable version.

### 3.2 Required Headers

```http
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
```

### 3.3 CRUD Operations

| Operation | Method | URL Pattern | Example |
|-----------|--------|-------------|---------|
| **Create** | POST | `/services/data/v62.0/sobjects/{ObjectName}` | `POST .../sobjects/Case` |
| **Read** | GET | `/services/data/v62.0/sobjects/{ObjectName}/{id}` | `GET .../sobjects/Case/500xx...` |
| **Update** | PATCH | `/services/data/v62.0/sobjects/{ObjectName}/{id}` | `PATCH .../sobjects/Case/500xx...` |
| **Delete** | DELETE | `/services/data/v62.0/sobjects/{ObjectName}/{id}` | `DELETE .../sobjects/Case/500xx...` |
| **Upsert** | PATCH | `/services/data/v62.0/sobjects/{ObjectName}/{ExtIdField}/{value}` | `PATCH .../sobjects/Case/CaseNumber/00001` |
| **Query** | GET | `/services/data/v62.0/query?q={SOQL}` | `GET .../query?q=SELECT+Id+FROM+Case` |
| **Describe** | GET | `/services/data/v62.0/sobjects/{ObjectName}/describe` | `GET .../sobjects/Case/describe` |

### 3.4 Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH, HEAD) |
| 201 | Created (POST) |
| 204 | Deleted (DELETE) |
| 400 | Bad request (malformed query, invalid field) |
| 401 | Unauthorized (expired/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 405 | Method not allowed |
| 415 | Unsupported media type |
| 500 | Internal server error |

---

## 4. Health Cloud Data Model (Object Reference)

### 4.1 Core Standard Objects (Used Across All Salesforce)

| Object API Name | Purpose | Key Fields |
|-----------------|---------|------------|
| `Account` | Organization or Person Account (patient) | `Name`, `RecordTypeId`, `PersonContactId`, `Phone`, `BillingAddress` |
| `Contact` | Individual person (alternative to PersonAccount) | `FirstName`, `LastName`, `Email`, `Phone`, `AccountId`, `Birthdate` |
| `Case` | Patient inquiry, service request, AE report | `Subject`, `Description`, `Status`, `Priority`, `Origin`, `ContactId`, `AccountId`, `Type` |
| `Task` | Action item, follow-up | `Subject`, `Description`, `Status`, `Priority`, `WhoId`, `WhatId`, `ActivityDate`, `OwnerId` |
| `Event` | Calendar event / scheduled activity | `Subject`, `StartDateTime`, `EndDateTime`, `WhoId`, `WhatId` |
| `User` | Salesforce user (agent, coordinator) | `Name`, `Email`, `ProfileId`, `UserRoleId` |

### 4.2 Health Cloud — Integrated Care Management Objects

| Object API Name | Purpose | Key Relationships |
|-----------------|---------|-------------------|
| `CarePlan` | Patient care plan | Links to `Account` (patient), contains goals and barriers |
| `CarePlanActivity` | Activity within a care plan | Child of `CarePlan` |
| `CarePlanDetail` | Detail record on a care plan | Child of `CarePlan` |
| `CarePlanTemplate__c` | Template for creating care plans | Referenced by `CarePlan` |
| `CareBarrier` | Social determinant or barrier to care | Links to `CarePlan`, `Account` |
| `CareBarrierType` | Categorization of care barriers | Referenced by `CareBarrier` |
| `GoalAssignment` | Goal linked to a care plan | Links to `CarePlan`, `GoalDefinition` |
| `GoalDefinition` | Reusable goal definition | Referenced by `GoalAssignment` |
| `CareEpisode` | Episode of care | Links to `Account` |
| `CareRequest` | Care request (referral, prior auth) | Links to `Account`, `Case` |
| `CareRequestDrug` | Drug associated with care request | Child of `CareRequest` |
| `HealthCondition` | Clinical condition/diagnosis (FHIR-aligned) | Links to `Account`, API v51.0+ |
| `ClinicalEncounter` | Clinical visit or encounter | Links to `Account`, `HealthcareProvider` |

### 4.3 Health Cloud — Care Program Objects

| Object API Name | Purpose | Key Relationships |
|-----------------|---------|-------------------|
| `CareProgram` | Patient support program definition | Start/end dates, associated products |
| `CareProgramEnrollee` | Patient enrolled in a program | Links to `CareProgram`, `Account` (patient) |
| `CareProgramProduct` | Product/medication in a program | Links to `CareProgram`, `Product` |
| `CareProgramTeamMember` | Team member on a program | Links to `CareProgram`, `User` |
| `CareProgramProvider` | Provider facility for a program | Links to `CareProgram`, `HealthcareProvider` |
| `CareProgramEnrolleeProduct` | Enrollee's product assignment | Links to `CareProgramEnrollee`, `CareProgramProduct` |
| `CareProgramGoal` | Goal within a care program | Links to `CareProgram` |
| `CareProgramEligibilityRule` | Eligibility criteria | Links to `CareProgram` |
| `CareProgramEnrollmentCard` | Enrollment documentation | Links to `CareProgramEnrollee` |

### 4.4 Health Cloud — Clinical & Provider Objects

| Object API Name | Purpose | Key Relationships |
|-----------------|---------|-------------------|
| `Medication` | Medication record (FHIR-aligned) | Standalone |
| `MedicationRequest` | Prescription / medication order (FHIR-aligned) | Links to `Account`, `Medication` |
| `HealthcareProvider` | Individual provider (HCP) | Links to `Account` |
| `HealthcareFacility` | Provider facility/location | Links to `Account` |
| `HealthcarePractitionerFacility` | Provider-facility junction | Links to `HealthcareProvider`, `HealthcareFacility` |

### 4.5 Health Cloud — Insurance & Prior Authorization Objects

| Object API Name | Purpose | Key Relationships |
|-----------------|---------|-------------------|
| `CarePreauth` | Prior authorization request | Links to `Account`, `CareRequest` |
| `MemberPlan` | Patient's insurance plan membership | Links to `Account` |
| `CoverageBenefit` | Benefits under a member's plan | Links to `MemberPlan` |
| `CoverageBenefitItem` | Detail item within a coverage benefit | Links to `CoverageBenefit` |
| `PlanBenefit` | Standard benefits available under a plan | Links to plan |
| `PlanBenefitItem` | Detail of plan benefit | Links to `PlanBenefit` |

### 4.6 Patient Representation

Health Cloud uses **Person Accounts** to represent patients. A Person Account is an Account with `IsPersonAccount = true` that automatically creates a linked Contact record.

- `Account.PersonContactId` — the auto-created Contact Id
- `Account.FirstName`, `Account.LastName` — person name fields on the Account
- Query patients: `SELECT Id, FirstName, LastName, PersonContactId FROM Account WHERE IsPersonAccount = true`

If Person Accounts are not enabled, patients are represented as `Contact` records linked to a household or organization `Account`.

---

## 5. Life Sciences Cloud Objects (Adverse Events, Pharmacovigilance)

Life Sciences Cloud (available API v61.0+) adds specialized objects for pharma/biotech:

### 5.1 Adverse Event Objects

| Object API Name | Purpose |
|-----------------|---------|
| `AdverseEventEntry` | Core AE record — unfavorable signs/symptoms during treatment |
| `AdverseEventAction` | Preventive or ameliorating actions taken |
| `AdverseEventCause` | Entity suspected to have caused the AE |
| `AdverseEventOutcome` | Outcome type from the adverse event |
| `AdverseEventSupportInfo` | Supporting information/documentation |
| `AdverseEventContributingFactor` | Contributing factors to the AE |
| `AdverseEventParty` | Parties involved in the AE |
| `AdverseEventResultingEffect` | Resulting effects of the AE |

### 5.2 Related Life Sciences Objects

| Object API Name | Purpose |
|-----------------|---------|
| `CareProgramSite` | Research/clinical site |
| `ResearchStudy` | Clinical trial / research study |
| `CodeSet` | Standardized code sets (ICD-10, MedDRA, etc.) |
| `CodeSetBundle` | Bundle of code sets |

### 5.3 Life Sciences Data Model Categories

Life Sciences Cloud includes 17 specialized data models:
1. Advanced Therapy Management (ATM)
2. **Adverse Events** (safety monitoring)
3. **Care Program Management** (enrollment, tracking)
4. **Clinical Data Model** (FHIR/USCDI-aligned)
5. Electronic Signatures
6. **Financial Assistance Programs** (patient copay, HUB services)
7. **Health Insurance** (coverage, benefits verification)
8. **Integrated Care Management** (care plans, goals, barriers)
9. Intelligent Document Automation
10. Intelligent Sales
11. Participant Management (recruitment)
12. **Patient Program Outcome Management** (goal tracking)
13. **Pharmacy Benefits Verification** (NCPDP-aligned)
14. Provider Relationship Management
15. Site Management
16. Social Determinants
17. Timeline

---

## 6. WRITE Operations: Post-Call Data Creation

### 6.1 Create a Case (Patient Inquiry / AE Report)

```typescript
// Using JSforce
const caseResult = await conn.sobject('Case').create({
  Subject: 'Patient inquiry - medication side effects',
  Description: 'Patient reported nausea after starting Cenegermin. Called to report and request guidance.',
  Status: 'New',
  Priority: 'High',
  Origin: 'Phone',
  Type: 'Adverse Event',              // Custom picklist value
  ContactId: '003xx000001abcDEF',      // Patient Contact Id
  AccountId: '001xx000001xyzABC',      // Patient Account Id
  RecordTypeId: '012xx000000AbCdEFG',  // Health Cloud Case record type
  // Custom fields (org-specific):
  // Vi_Call_Id__c: 'call-uuid-12345',
  // AE_Severity__c: 'Moderate',
  // Agent_Name__c: 'Vi Agent',
});

console.log(`Case created: ${caseResult.id}`); // e.g., 500xx000001ABcDEF
```

**REST equivalent:**
```http
POST /services/data/v62.0/sobjects/Case
Authorization: Bearer {token}
Content-Type: application/json

{
  "Subject": "Patient inquiry - medication side effects",
  "Description": "Patient reported nausea after starting Cenegermin...",
  "Status": "New",
  "Priority": "High",
  "Origin": "Phone",
  "Type": "Adverse Event",
  "ContactId": "003xx000001abcDEF",
  "AccountId": "001xx000001xyzABC"
}
```

### 6.2 Log an Activity (Task with Call Transcript)

```typescript
const taskResult = await conn.sobject('Task').create({
  Subject: 'Outbound Call - AE Follow-up',
  Description: 'Call transcript summary: Patient confirmed symptoms subsided after dose adjustment...',
  Status: 'Completed',
  Priority: 'High',
  Type: 'Call',                          // Activity type
  WhoId: '003xx000001abcDEF',            // Contact (Patient)
  WhatId: caseResult.id,                 // Related Case
  ActivityDate: new Date().toISOString().split('T')[0],  // '2026-03-18'
  OwnerId: '005xx000001SvAABBB',         // Assigned user
  CallDurationInSeconds: 420,            // 7 minutes
  CallType: 'Outbound',
  // Custom fields:
  // Vi_Call_Id__c: 'call-uuid-12345',
  // Call_Recording_URL__c: 'https://...',
});

console.log(`Task created: ${taskResult.id}`);
```

### 6.3 Flag an Adverse Event (Life Sciences Cloud)

```typescript
// Create AdverseEventEntry (requires Life Sciences Cloud license, API v61.0+)
const aeResult = await conn.sobject('AdverseEventEntry').create({
  Name: 'AE-2026-00142',
  // AccountId or related patient reference
  // Severity, onset date, description — fields depend on org configuration
  // Link to Case:
  // CaseId__c: caseResult.id,
});

// Create AdverseEventCause (suspected cause)
const aeCause = await conn.sobject('AdverseEventCause').create({
  AdverseEventEntryId: aeResult.id,
  // SuspectedEntityId, Causality assessment fields
});

// Create AdverseEventOutcome
const aeOutcome = await conn.sobject('AdverseEventOutcome').create({
  AdverseEventEntryId: aeResult.id,
  // Outcome type, resolution date
});
```

**Note:** If Life Sciences Cloud is not licensed, use a custom `Case` Record Type (e.g., "Adverse Event") with custom fields to capture AE data within the standard Case object. This is the more common pattern for patient services hubs.

### 6.4 Create Follow-Up Task

```typescript
const followUpTask = await conn.sobject('Task').create({
  Subject: 'Follow-up: Confirm AE resolution with patient',
  Description: 'Call patient in 7 days to confirm nausea has resolved after dose adjustment.',
  Status: 'Not Started',
  Priority: 'High',
  WhoId: '003xx000001abcDEF',            // Patient Contact
  WhatId: caseResult.id,                 // Related Case
  ActivityDate: '2026-03-25',            // 7 days from now
  OwnerId: '005xx000001SvAABBB',         // Assigned care coordinator
  ReminderDateTime: '2026-03-25T09:00:00.000Z',
  IsReminderSet: true,
});
```

---

## 7. READ Operations: Pre-Call Enrichment

### 7.1 Pre-Call Enrichment SOQL Query (Single Compound Query)

Pull all context needed before an agent call in a single API request using nested SOQL:

```typescript
const patientContactId = '003xx000001abcDEF';

const enrichmentQuery = `
  SELECT
    Id,
    FirstName,
    LastName,
    Phone,
    Email,
    Birthdate,
    MailingAddress,
    Account.Name,
    Account.Id,

    -- Recent Cases (last 90 days)
    (SELECT
      Id, CaseNumber, Subject, Status, Priority, Type, CreatedDate, Description
     FROM Cases
     WHERE CreatedDate = LAST_N_DAYS:90
     ORDER BY CreatedDate DESC
     LIMIT 10),

    -- Open Tasks
    (SELECT
      Id, Subject, Status, Priority, ActivityDate, Description
     FROM Tasks
     WHERE Status != 'Completed'
     ORDER BY ActivityDate ASC
     LIMIT 10),

    -- Care Program Enrollments (via Account)
    (SELECT
      Id, Name, Status, EnrollmentDate
     FROM Account.CareProgramEnrollees__r
     LIMIT 5)

  FROM Contact
  WHERE Id = '${patientContactId}'
`;

const result = await conn.query(enrichmentQuery);
const patient = result.records[0];
```

### 7.2 Separate Queries for Health Cloud Objects

Since some Health Cloud objects require separate queries:

```typescript
// Get patient's care plans
const carePlans = await conn.query(`
  SELECT Id, Name, Status, StartDate, EndDate, Description,
    (SELECT Id, Name, Status FROM CareBarriers),
    (SELECT Id, Subject, Status FROM Tasks)
  FROM CarePlan
  WHERE AccountId = '${patient.Account.Id}'
  ORDER BY CreatedDate DESC
  LIMIT 5
`);

// Get medication requests
const medications = await conn.query(`
  SELECT Id, Name, Status,
    Medication.Name,
    Medication.Id
  FROM MedicationRequest
  WHERE AccountId = '${patient.Account.Id}'
  ORDER BY CreatedDate DESC
  LIMIT 10
`);

// Get health conditions
const conditions = await conn.query(`
  SELECT Id, Name, ClinicalStatus, VerificationStatus, OnsetDate
  FROM HealthCondition
  WHERE AccountId = '${patient.Account.Id}'
`);

// Get prior authorization status
const priorAuths = await conn.query(`
  SELECT Id, Name, Status, AuthorizationNumber,
    StartDate, EndDate
  FROM CarePreauth
  WHERE AccountId = '${patient.Account.Id}'
    AND Status != 'Expired'
  ORDER BY CreatedDate DESC
  LIMIT 5
`);

// Get insurance/member plan
const memberPlans = await conn.query(`
  SELECT Id, Name, Status, MemberId,
    (SELECT Id, Name, Status FROM CoverageBenefits)
  FROM MemberPlan
  WHERE AccountId = '${patient.Account.Id}'
    AND Status = 'Active'
`);
```

### 7.3 JSforce Method-Chaining Approach

```typescript
// Fluent query with auto-fetch for large result sets
const recentCases = await conn.sobject('Case')
  .find({
    ContactId: patientContactId,
    CreatedDate: { $gte: jsforce.SfDate.LAST_N_DAYS(90) },
  }, 'Id, CaseNumber, Subject, Status, Priority, Type, CreatedDate')
  .sort('-CreatedDate')
  .limit(10)
  .execute();
```

### 7.4 Pre-Call Enrichment Bundle Function

```typescript
interface PatientContext {
  patient: {
    id: string;
    name: string;
    phone: string;
    email: string;
    birthdate: string;
    accountId: string;
  };
  recentCases: Array<{
    id: string;
    caseNumber: string;
    subject: string;
    status: string;
    type: string;
  }>;
  openTasks: Array<{
    id: string;
    subject: string;
    status: string;
    activityDate: string;
  }>;
  medications: Array<{
    id: string;
    name: string;
    status: string;
    medicationName: string;
  }>;
  conditions: Array<{
    id: string;
    name: string;
    clinicalStatus: string;
  }>;
  priorAuths: Array<{
    id: string;
    status: string;
    authorizationNumber: string;
    endDate: string;
  }>;
  insurancePlans: Array<{
    id: string;
    name: string;
    status: string;
    memberId: string;
  }>;
}

async function getPreCallContext(
  conn: jsforce.Connection,
  patientContactId: string
): Promise<PatientContext> {
  // Run all queries in parallel
  const [
    contactResult,
    casesResult,
    tasksResult,
    medsResult,
    conditionsResult,
    preauthResult,
    plansResult,
  ] = await Promise.all([
    conn.query(`
      SELECT Id, FirstName, LastName, Phone, Email, Birthdate, AccountId
      FROM Contact WHERE Id = '${patientContactId}'
    `),
    conn.query(`
      SELECT Id, CaseNumber, Subject, Status, Priority, Type, CreatedDate
      FROM Case
      WHERE ContactId = '${patientContactId}'
        AND CreatedDate = LAST_N_DAYS:90
      ORDER BY CreatedDate DESC LIMIT 10
    `),
    conn.query(`
      SELECT Id, Subject, Status, Priority, ActivityDate, Description
      FROM Task
      WHERE WhoId = '${patientContactId}'
        AND Status != 'Completed'
      ORDER BY ActivityDate ASC LIMIT 10
    `),
    conn.query(`
      SELECT Id, Name, Status, Medication.Name
      FROM MedicationRequest
      WHERE Account.PersonContactId = '${patientContactId}'
      ORDER BY CreatedDate DESC LIMIT 10
    `),
    conn.query(`
      SELECT Id, Name, ClinicalStatus, VerificationStatus, OnsetDate
      FROM HealthCondition
      WHERE Account.PersonContactId = '${patientContactId}'
    `),
    conn.query(`
      SELECT Id, Name, Status, AuthorizationNumber, StartDate, EndDate
      FROM CarePreauth
      WHERE Account.PersonContactId = '${patientContactId}'
        AND Status != 'Expired'
    `),
    conn.query(`
      SELECT Id, Name, Status, MemberId
      FROM MemberPlan
      WHERE Account.PersonContactId = '${patientContactId}'
        AND Status = 'Active'
    `),
  ]);

  const contact = contactResult.records[0] as any;

  return {
    patient: {
      id: contact.Id,
      name: `${contact.FirstName} ${contact.LastName}`,
      phone: contact.Phone,
      email: contact.Email,
      birthdate: contact.Birthdate,
      accountId: contact.AccountId,
    },
    recentCases: casesResult.records as any[],
    openTasks: tasksResult.records as any[],
    medications: medsResult.records as any[],
    conditions: conditionsResult.records as any[],
    priorAuths: preauthResult.records as any[],
    insurancePlans: plansResult.records as any[],
  };
}
```

---

## 8. TRIGGER: Platform Events & Change Data Capture

### 8.1 Custom Platform Event: Outbound Call Trigger

Define a custom Platform Event in Salesforce Setup to trigger outbound agent calls:

**Event Name:** `Outbound_Call_Request__e`

**Fields:**
| Field API Name | Type | Description |
|----------------|------|-------------|
| `Patient_Contact_Id__c` | Text(18) | Salesforce Contact ID of the patient |
| `Patient_Phone__c` | Text(40) | Phone number to call |
| `Call_Reason__c` | Text(255) | Reason for the outbound call |
| `Case_Id__c` | Text(18) | Related Case ID (if any) |
| `Priority__c` | Text(20) | Call priority (High/Medium/Low) |
| `Scheduled_Time__c` | DateTime | When to make the call |
| `Agent_Instructions__c` | Long Text Area | Instructions for the AI agent |

**Publish Behavior:** Publish After Commit (ensures event only fires after successful transaction)

### 8.2 Publishing a Platform Event (from Salesforce or external)

```http
POST /services/data/v62.0/sobjects/Outbound_Call_Request__e
Authorization: Bearer {token}
Content-Type: application/json

{
  "Patient_Contact_Id__c": "003xx000001abcDEF",
  "Patient_Phone__c": "+16175551234",
  "Call_Reason__c": "AE Follow-up - 7 day check-in",
  "Case_Id__c": "500xx000001ABcDEF",
  "Priority__c": "High",
  "Scheduled_Time__c": "2026-03-25T14:00:00.000Z",
  "Agent_Instructions__c": "Confirm nausea resolved after dose adjustment. If not, escalate to medical."
}
```

**Response:**
```json
{
  "id": "e00xx0000000001AAA",
  "success": true,
  "errors": [
    {
      "statusCode": "OPERATION_ENQUEUED",
      "message": "08ffc869-b9f8-4cff-a4ba-8dff9b3dd6cb"
    }
  ]
}
```

Note: `OPERATION_ENQUEUED` is a success status for Platform Events (not an error).

### 8.3 Subscribing to Platform Events (Pub/Sub API — Recommended)

```typescript
import PubSubApiClient from 'salesforce-pubsub-api-client';
import fs from 'fs';

const privateKey = fs.readFileSync('./certs/server.key');

const client = new PubSubApiClient({
  authType: 'oauth-jwt-bearer',
  loginUrl: process.env.SF_LOGIN_URL!,
  clientId: process.env.SF_CLIENT_ID!,
  username: process.env.SF_USERNAME!,
  privateKey,
});

await client.connect();
// Connected to Pub/Sub API endpoint: api.pubsub.salesforce.com:7443

// Subscribe to outbound call trigger events
await client.subscribe(
  '/event/Outbound_Call_Request__e',
  (subscription, callbackType, data) => {
    switch (callbackType) {
      case 'event':
        console.log(`Received call request event, replayId: ${data.replayId}`);
        const payload = data.payload;
        // Trigger outbound call:
        triggerOutboundCall({
          patientContactId: payload.Patient_Contact_Id__c,
          patientPhone: payload.Patient_Phone__c,
          callReason: payload.Call_Reason__c,
          caseId: payload.Case_Id__c,
          priority: payload.Priority__c,
          scheduledTime: payload.Scheduled_Time__c,
          agentInstructions: payload.Agent_Instructions__c,
        });
        break;
      case 'end':
        console.log('Subscription ended, reconnecting...');
        // Implement reconnection logic
        break;
    }
  },
  100  // Request up to 100 events per fetch
);
```

**gRPC Endpoint:** `api.pubsub.salesforce.com:7443`

**Event Channel Formats:**
- Platform Events: `/event/{EventApiName}` (e.g., `/event/Outbound_Call_Request__e`)
- Change Data Capture: `/data/{ObjectName}ChangeEvent` (e.g., `/data/CaseChangeEvent`)

### 8.4 Subscribing via JSforce Streaming API (CometD — Alternative)

```typescript
// Simpler but less performant than Pub/Sub API
conn.streaming.topic('/event/Outbound_Call_Request__e').subscribe((message) => {
  console.log('Platform Event received:', message);
  // message.payload contains the event fields
});
```

### 8.5 Change Data Capture (CDC) Subscription

Subscribe to changes on Salesforce records to keep external systems in sync:

```typescript
// Subscribe to Case changes
await client.subscribe(
  '/data/CaseChangeEvent',
  (subscription, callbackType, data) => {
    if (callbackType === 'event') {
      const header = data.payload.ChangeEventHeader;
      console.log(`Change type: ${header.changeType}`);  // CREATE, UPDATE, DELETE, UNDELETE
      console.log(`Changed fields: ${header.changedFields}`);
      console.log(`Record IDs: ${header.recordIds}`);
    }
  },
  50
);
```

**CDC Channel Naming:**
- Standard objects: `/data/{ObjectName}ChangeEvent` (e.g., `/data/CaseChangeEvent`, `/data/TaskChangeEvent`)
- Custom objects: `/data/{ObjectName}__ChangeEvent`

**Event Retention:**
- Platform Events: **72 hours** on the event bus
- CDC Events: **24 hours** replayable via replayId

---

## 9. File Attachments: Transcript Storage

Salesforce uses the ContentVersion/ContentDocument/ContentDocumentLink pattern for file attachments.

### 9.1 Upload Transcript as ContentVersion (Base64 — up to ~35MB)

```typescript
async function attachTranscriptToCase(
  conn: jsforce.Connection,
  caseId: string,
  transcript: string,
  callId: string
): Promise<string> {
  // Step 1: Create ContentVersion (auto-creates ContentDocument)
  const cvResult = await conn.sobject('ContentVersion').create({
    Title: `Call Transcript - ${callId}`,
    PathOnClient: `transcript-${callId}.txt`,
    VersionData: Buffer.from(transcript).toString('base64'),
    // FirstPublishLocationId: caseId,  // Optional shortcut: auto-links to Case
  });

  if (!cvResult.success) {
    throw new Error(`Failed to upload transcript: ${JSON.stringify(cvResult.errors)}`);
  }

  // Step 2: Retrieve the ContentDocumentId
  const cv = await conn.sobject('ContentVersion').retrieve(cvResult.id) as any;

  // Step 3: Link ContentDocument to the Case
  const linkResult = await conn.sobject('ContentDocumentLink').create({
    ContentDocumentId: cv.ContentDocumentId,
    LinkedEntityId: caseId,
    ShareType: 'V',  // Viewer permission
  });

  if (!linkResult.success) {
    throw new Error(`Failed to link transcript to case: ${JSON.stringify(linkResult.errors)}`);
  }

  return cvResult.id;
}
```

### 9.2 Shortcut: FirstPublishLocationId

You can skip the ContentDocumentLink creation by setting `FirstPublishLocationId` to the Case ID when creating the ContentVersion. This automatically links the file:

```typescript
const cvResult = await conn.sobject('ContentVersion').create({
  Title: `Call Transcript - ${callId}`,
  PathOnClient: `transcript-${callId}.txt`,
  VersionData: Buffer.from(transcript).toString('base64'),
  FirstPublishLocationId: caseId,  // Auto-links to Case
});
```

### 9.3 Multipart Upload (for larger files)

For files larger than ~35MB, use multipart form-data via the REST API directly:

```typescript
import FormData from 'form-data';

async function uploadLargeFile(
  conn: jsforce.Connection,
  caseId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const metadata = {
    Title: fileName,
    PathOnClient: fileName,
    FirstPublishLocationId: caseId,
  };

  const form = new FormData();
  form.append('entity_content', JSON.stringify(metadata), {
    contentType: 'application/json',
  });
  form.append('VersionData', fileBuffer, {
    filename: fileName,
    contentType: 'application/octet-stream',
  });

  const result = await conn.request({
    method: 'POST',
    url: `/services/data/v62.0/sobjects/ContentVersion`,
    body: form,
    headers: form.getHeaders(),
  }) as any;

  return result.id;
}
```

---

## 10. Composite API: Multi-Object Operations

The Composite API allows bundling multiple REST API operations into a single HTTP request. This is critical for the "call completed" event where we need to create a Case, Task, and ContentVersion atomically.

### 10.1 Composite Request: Post-Call Bundle

```http
POST /services/data/v62.0/composite
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "allOrNone": true,
  "compositeRequest": [
    {
      "method": "POST",
      "url": "/services/data/v62.0/sobjects/Case",
      "referenceId": "newCase",
      "body": {
        "Subject": "Patient inquiry - medication side effects",
        "Description": "Patient reported nausea after starting Cenegermin.",
        "Status": "New",
        "Priority": "High",
        "Origin": "Phone",
        "Type": "Adverse Event",
        "ContactId": "003xx000001abcDEF",
        "AccountId": "001xx000001xyzABC"
      }
    },
    {
      "method": "POST",
      "url": "/services/data/v62.0/sobjects/Task",
      "referenceId": "callActivity",
      "body": {
        "Subject": "Outbound Call - AE Follow-up",
        "Description": "Call completed. Patient confirmed symptoms...",
        "Status": "Completed",
        "Priority": "High",
        "Type": "Call",
        "WhoId": "003xx000001abcDEF",
        "WhatId": "@{newCase.id}",
        "ActivityDate": "2026-03-18",
        "CallDurationInSeconds": 420,
        "CallType": "Outbound"
      }
    },
    {
      "method": "POST",
      "url": "/services/data/v62.0/sobjects/Task",
      "referenceId": "followUpTask",
      "body": {
        "Subject": "Follow-up: Confirm AE resolution",
        "Description": "Call patient in 7 days to confirm nausea resolved.",
        "Status": "Not Started",
        "Priority": "High",
        "WhoId": "003xx000001abcDEF",
        "WhatId": "@{newCase.id}",
        "ActivityDate": "2026-03-25",
        "IsReminderSet": true,
        "ReminderDateTime": "2026-03-25T09:00:00.000Z"
      }
    },
    {
      "method": "POST",
      "url": "/services/data/v62.0/sobjects/ContentVersion",
      "referenceId": "transcript",
      "body": {
        "Title": "Call Transcript - call-uuid-12345",
        "PathOnClient": "transcript-call-uuid-12345.txt",
        "VersionData": "Q2FsbCB0cmFuc2NyaXB0IGNvbnRlbnQgaGVyZS4uLg==",
        "FirstPublishLocationId": "@{newCase.id}"
      }
    }
  ]
}
```

### 10.2 Composite Response

```json
{
  "compositeResponse": [
    {
      "body": {
        "id": "500xx000001ABcDEF",
        "success": true,
        "errors": []
      },
      "httpHeaders": {
        "Location": "/services/data/v62.0/sobjects/Case/500xx000001ABcDEF"
      },
      "httpStatusCode": 201,
      "referenceId": "newCase"
    },
    {
      "body": {
        "id": "00Txx000001DEfGHI",
        "success": true,
        "errors": []
      },
      "httpHeaders": {},
      "httpStatusCode": 201,
      "referenceId": "callActivity"
    },
    {
      "body": {
        "id": "00Txx000002JKlMNO",
        "success": true,
        "errors": []
      },
      "httpHeaders": {},
      "httpStatusCode": 201,
      "referenceId": "followUpTask"
    },
    {
      "body": {
        "id": "068xx000001PQrSTU",
        "success": true,
        "errors": []
      },
      "httpHeaders": {},
      "httpStatusCode": 201,
      "referenceId": "transcript"
    }
  ]
}
```

### 10.3 Composite API Limits

| Limit | Value |
|-------|-------|
| Max subrequests per composite call | **25** |
| Max query/collection operations | **5** |
| API call count | **1** (entire composite = 1 API call) |
| `allOrNone` | If `true`, all subrequests succeed or all roll back |
| Reference syntax | `@{referenceId.fieldName}` |

### 10.4 Composite via JSforce

```typescript
const compositeResult = await conn.request({
  method: 'POST',
  url: '/services/data/v62.0/composite',
  body: {
    allOrNone: true,
    compositeRequest: [
      {
        method: 'POST',
        url: '/services/data/v62.0/sobjects/Case',
        referenceId: 'newCase',
        body: { /* Case fields */ },
      },
      {
        method: 'POST',
        url: '/services/data/v62.0/sobjects/Task',
        referenceId: 'callActivity',
        body: {
          WhatId: '@{newCase.id}',
          /* other Task fields */
        },
      },
      // ... more subrequests
    ],
  },
}) as any;

// Check results
for (const resp of compositeResult.compositeResponse) {
  if (resp.httpStatusCode >= 400) {
    console.error(`Failed: ${resp.referenceId}`, resp.body);
  }
}
```

### 10.5 SObject Tree API (Alternative for Parent-Child Batch Creates)

```http
POST /services/data/v62.0/composite/tree/Account
```

- Creates parent + child records in one call
- Max **200 records** total
- Max **5 record types** per request
- Max tree depth: **5 levels**
- All-or-nothing: if any record fails, none are committed

### 10.6 Composite Collections (Batch Same-Type Operations)

```http
POST /services/data/v62.0/composite/sobjects
```

Create, update, or delete up to **200 records** of the same sObject type in one call.

---

## 11. Rate Limits & Quotas

### 11.1 Daily API Request Limits

| Edition | Base Requests / 24 Hours | Per User License | Example (50 users) |
|---------|--------------------------|------------------|---------------------|
| Enterprise | 100,000 | +1,000/user | 150,000 |
| Unlimited | 100,000 | +5,000/user | 350,000 |
| Performance | 100,000 | +5,000/user | 350,000 |
| Developer | 15,000 | N/A | 15,000 |

**Formula:** `Total = Base + (Per-User Add-on x Number of User Licenses)`

### 11.2 Other Limits

| Limit Type | Value |
|------------|-------|
| Concurrent long-running requests (production) | **25** |
| Concurrent long-running requests (sandbox/dev) | **5** |
| API request timeout | **10 minutes** max |
| Bulk API batches / 24 hours | **15,000** |
| Records per Bulk API batch | **10,000** |
| Streaming API events / 24 hours | **200,000** |
| Asynchronous Apex requests / hour | **1,200** |
| Report API sync runs / hour | **500** |

### 11.3 Monitoring Usage

```typescript
// Check current API usage
const limits = await conn.request('/services/data/v62.0/limits');
console.log(`API requests used: ${limits.DailyApiRequests.Remaining} remaining of ${limits.DailyApiRequests.Max}`);
```

### 11.4 Optimization Strategies

1. **Use Composite API** — bundle 25 operations into 1 API call
2. **Use SOQL relationship queries** — pull parent + child data in 1 query
3. **Cache patient context** — cache pre-call enrichment for 5-10 minutes
4. **Use Bulk API 2.0** for batch operations (50,000+ records)
5. **Use Platform Events** instead of polling for changes

---

## 12. Error Handling & Retry Patterns

### 12.1 Error Response Format

```json
[
  {
    "message": "The requested resource does not exist",
    "errorCode": "NOT_FOUND"
  }
]
```

### 12.2 Common Error Codes

| HTTP Status | Error Code | Meaning | Retry? |
|-------------|------------|---------|--------|
| 400 | `MALFORMED_QUERY` | Invalid SOQL syntax | No — fix query |
| 400 | `INVALID_FIELD` | Field doesn't exist on object | No — fix field name |
| 400 | `REQUIRED_FIELD_MISSING` | Required field not provided | No — add field |
| 400 | `DUPLICATE_VALUE` | Duplicate external ID | No — handle dedup |
| 401 | `INVALID_SESSION_ID` | Token expired or invalid | Yes — re-authenticate |
| 403 | `INSUFFICIENT_ACCESS` | User lacks permissions | No — fix permissions |
| 404 | `NOT_FOUND` | Record/resource doesn't exist | No — verify ID |
| 429 | `REQUEST_LIMIT_EXCEEDED` | API limit hit | Yes — exponential backoff |
| 500 | Internal Server Error | Salesforce server issue | Yes — exponential backoff |
| 503 | Service Unavailable | Salesforce maintenance | Yes — exponential backoff |

### 12.3 Retry Strategy Implementation

```typescript
async function sfRequestWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const statusCode = error.statusCode || error.status;
      const errorCode = error.errorCode || error.code;

      // Do NOT retry 4xx errors (except 429)
      if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        throw error;
      }

      // Retry on 401 (re-auth), 429 (rate limit), 5xx (server error)
      if (attempt === maxRetries) {
        throw error;
      }

      if (statusCode === 401) {
        // Re-authenticate
        await conn.authorize(/* JWT assertion */);
        continue;
      }

      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(
        `Salesforce API error (${statusCode}/${errorCode}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 13. Node.js Implementation: JSforce

### 13.1 Installation

```bash
npm install jsforce jsonwebtoken
npm install -D @types/jsonwebtoken
```

JSforce v3.x is written in TypeScript (98.6% TS codebase) and includes built-in type definitions.

### 13.2 Connection Manager Service

```typescript
// src/services/salesforce.ts
import jsforce from 'jsforce';
import jwt from 'jsonwebtoken';
import fs from 'fs';

class SalesforceService {
  private conn: jsforce.Connection | null = null;
  private privateKey: string;

  constructor() {
    this.privateKey = fs.readFileSync(
      process.env.SF_PRIVATE_KEY_PATH || './certs/server.key',
      'utf8'
    );
  }

  async getConnection(): Promise<jsforce.Connection> {
    if (this.conn?.accessToken) {
      return this.conn;
    }
    return this.connect();
  }

  private async connect(): Promise<jsforce.Connection> {
    this.conn = new jsforce.Connection({
      loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
    });

    const claim = {
      iss: process.env.SF_CLIENT_ID!,
      sub: process.env.SF_USERNAME!,
      aud: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
      exp: Math.floor(Date.now() / 1000) + 180,
    };

    const assertion = jwt.sign(claim, this.privateKey, { algorithm: 'RS256' });

    await this.conn.authorize({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    });

    console.log(`[Salesforce] Connected to ${this.conn.instanceUrl}`);
    return this.conn;
  }

  // Pre-call enrichment
  async getPatientContext(contactId: string): Promise<PatientContext> {
    const conn = await this.getConnection();
    return getPreCallContext(conn, contactId);
  }

  // Post-call write (Composite API)
  async logCallCompleted(params: {
    contactId: string;
    accountId: string;
    subject: string;
    description: string;
    transcript: string;
    callId: string;
    callDuration: number;
    isAdverseEvent: boolean;
    followUpDate?: string;
    followUpInstructions?: string;
  }) {
    const conn = await this.getConnection();

    const compositeRequest: any[] = [
      // 1. Create Case
      {
        method: 'POST',
        url: '/services/data/v62.0/sobjects/Case',
        referenceId: 'newCase',
        body: {
          Subject: params.subject,
          Description: params.description,
          Status: 'New',
          Priority: params.isAdverseEvent ? 'High' : 'Medium',
          Origin: 'Phone',
          Type: params.isAdverseEvent ? 'Adverse Event' : 'Patient Inquiry',
          ContactId: params.contactId,
          AccountId: params.accountId,
        },
      },
      // 2. Log call activity
      {
        method: 'POST',
        url: '/services/data/v62.0/sobjects/Task',
        referenceId: 'callTask',
        body: {
          Subject: `Call: ${params.subject}`,
          Description: params.description,
          Status: 'Completed',
          Priority: params.isAdverseEvent ? 'High' : 'Normal',
          Type: 'Call',
          WhoId: params.contactId,
          WhatId: '@{newCase.id}',
          ActivityDate: new Date().toISOString().split('T')[0],
          CallDurationInSeconds: params.callDuration,
          CallType: 'Outbound',
        },
      },
      // 3. Attach transcript
      {
        method: 'POST',
        url: '/services/data/v62.0/sobjects/ContentVersion',
        referenceId: 'transcript',
        body: {
          Title: `Transcript - ${params.callId}`,
          PathOnClient: `transcript-${params.callId}.txt`,
          VersionData: Buffer.from(params.transcript).toString('base64'),
          FirstPublishLocationId: '@{newCase.id}',
        },
      },
    ];

    // 4. Optional: Create follow-up task
    if (params.followUpDate) {
      compositeRequest.push({
        method: 'POST',
        url: '/services/data/v62.0/sobjects/Task',
        referenceId: 'followUp',
        body: {
          Subject: `Follow-up: ${params.subject}`,
          Description: params.followUpInstructions || 'Follow up with patient.',
          Status: 'Not Started',
          Priority: params.isAdverseEvent ? 'High' : 'Normal',
          WhoId: params.contactId,
          WhatId: '@{newCase.id}',
          ActivityDate: params.followUpDate,
          IsReminderSet: true,
          ReminderDateTime: `${params.followUpDate}T09:00:00.000Z`,
        },
      });
    }

    const result = await conn.request({
      method: 'POST',
      url: '/services/data/v62.0/composite',
      body: {
        allOrNone: true,
        compositeRequest,
      },
    }) as any;

    // Validate results
    const failures = result.compositeResponse.filter(
      (r: any) => r.httpStatusCode >= 400
    );
    if (failures.length > 0) {
      throw new Error(
        `Composite API failures: ${JSON.stringify(failures.map((f: any) => ({
          ref: f.referenceId,
          status: f.httpStatusCode,
          errors: f.body,
        })))}`
      );
    }

    return {
      caseId: result.compositeResponse[0].body.id,
      callTaskId: result.compositeResponse[1].body.id,
      transcriptId: result.compositeResponse[2].body.id,
      followUpTaskId: result.compositeResponse[3]?.body.id,
    };
  }
}

export const salesforceService = new SalesforceService();
```

### 13.3 Pub/Sub API Event Listener Service

```typescript
// src/services/salesforce-events.ts
import PubSubApiClient from 'salesforce-pubsub-api-client';
import fs from 'fs';

class SalesforceEventService {
  private client: PubSubApiClient;

  constructor() {
    const privateKey = fs.readFileSync(
      process.env.SF_PRIVATE_KEY_PATH || './certs/server.key'
    );

    this.client = new PubSubApiClient({
      authType: 'oauth-jwt-bearer',
      loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
      clientId: process.env.SF_CLIENT_ID!,
      username: process.env.SF_USERNAME!,
      privateKey,
    });
  }

  async start() {
    await this.client.connect();
    console.log('[Salesforce Events] Connected to Pub/Sub API');

    // Subscribe to outbound call triggers
    await this.subscribeToOutboundCallRequests();

    // Subscribe to Case changes (optional)
    await this.subscribeToCaseChanges();
  }

  private async subscribeToOutboundCallRequests() {
    await this.client.subscribe(
      '/event/Outbound_Call_Request__e',
      (subscription, callbackType, data) => {
        if (callbackType === 'event') {
          const payload = data.payload;
          console.log('[Salesforce Events] Outbound call request received:', {
            patientContactId: payload.Patient_Contact_Id__c,
            phone: payload.Patient_Phone__c,
            reason: payload.Call_Reason__c,
            priority: payload.Priority__c,
          });

          // Emit to your call orchestration system
          this.handleOutboundCallRequest(payload);
        }
      },
      100
    );
    console.log('[Salesforce Events] Subscribed to Outbound_Call_Request__e');
  }

  private async subscribeToCaseChanges() {
    await this.client.subscribe(
      '/data/CaseChangeEvent',
      (subscription, callbackType, data) => {
        if (callbackType === 'event') {
          const header = data.payload.ChangeEventHeader;
          if (header.changeType === 'UPDATE') {
            console.log('[Salesforce Events] Case updated:', {
              recordIds: header.recordIds,
              changedFields: header.changedFields,
            });
          }
        }
      },
      50
    );
    console.log('[Salesforce Events] Subscribed to CaseChangeEvent');
  }

  private handleOutboundCallRequest(payload: any) {
    // TODO: Integrate with Twilio/voice provider to initiate call
    // TODO: Run pre-call enrichment before call starts
  }
}

export const salesforceEventService = new SalesforceEventService();
```

### 13.4 Fastify Plugin

```typescript
// src/plugins/salesforce.ts
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { salesforceService } from '../services/salesforce';
import { salesforceEventService } from '../services/salesforce-events';

const salesforcePlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate Fastify instance with Salesforce service
  fastify.decorate('salesforce', salesforceService);

  // Start event listener on server startup
  fastify.addHook('onReady', async () => {
    await salesforceEventService.start();
  });

  // Cleanup on shutdown
  fastify.addHook('onClose', async () => {
    // Pub/Sub client cleanup happens automatically
  });
};

export default fp(salesforcePlugin, {
  name: 'salesforce',
});
```

---

## 14. Integration Blueprint: End-to-End Call Flow

### 14.1 Outbound Call Trigger Flow

```
1. Salesforce (Flow/Apex) publishes Outbound_Call_Request__e Platform Event
       |
2. Vi Operate receives event via Pub/Sub API subscription
       |
3. Vi Operate runs pre-call enrichment:
   - SOQL queries for patient context (parallel)
   - Cache results for the call duration
       |
4. Vi Operate initiates outbound call via Twilio
       |
5. AI Agent conducts call with enriched context
       |
6. Call completes → Vi Operate writes to Salesforce:
   - Composite API: Case + Task + ContentVersion + Follow-up Task
   - If AE detected: flag Case type as "Adverse Event"
       |
7. If AE detected → additional AE workflow:
   - Create AdverseEventEntry (if Life Sciences Cloud licensed)
   - OR update Case with AE custom fields
   - Notify pharmacovigilance team (Salesforce Flow/Process Builder)
```

### 14.2 Inbound Call Flow

```
1. Patient calls Vi Operate via Twilio
       |
2. Vi Operate identifies patient (phone number lookup):
   - SOQL: SELECT Id, AccountId FROM Contact WHERE Phone = '+16175551234'
       |
3. Vi Operate runs pre-call enrichment (same as step 3 above)
       |
4. AI Agent handles call
       |
5. Post-call write to Salesforce (same Composite API pattern)
```

### 14.3 Environment Variables

```env
# Salesforce OAuth
SF_CLIENT_ID=3MVG9...your_connected_app_consumer_key
SF_USERNAME=vi-integration@praxis.com
SF_LOGIN_URL=https://login.salesforce.com
SF_PRIVATE_KEY_PATH=./certs/server.key

# Salesforce API
SF_API_VERSION=62.0

# Pub/Sub API
SF_PUBSUB_ENDPOINT=api.pubsub.salesforce.com:7443
```

### 14.4 Package Dependencies

```json
{
  "dependencies": {
    "jsforce": "^3.10.14",
    "salesforce-pubsub-api-client": "^5.0.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.0"
  }
}
```

### 14.5 Key Implementation Notes

1. **Person Accounts**: Verify if Praxis has Person Accounts enabled. If so, patients are `Account` records with `IsPersonAccount = true` and a linked `Contact`. All `WhoId` fields (Task, Event) should reference the `PersonContactId`.

2. **Record Types**: Work with Praxis Salesforce admin to identify the correct Record Type IDs for Case (e.g., "Patient Inquiry", "Adverse Event"), Task types, etc. Query them at startup: `SELECT Id, Name, DeveloperName FROM RecordType WHERE SObjectType = 'Case'`.

3. **Custom Fields**: Praxis will have custom fields (e.g., `Vi_Call_Id__c`, `AE_Severity__c`, `Drug_Name__c`). Discover them with: `GET /services/data/v62.0/sobjects/Case/describe`.

4. **Field-Level Security**: The integration user must have read/write access to all fields used. Create a dedicated Permission Set for the Vi integration user.

5. **SOQL Injection Prevention**: Always use parameterized queries or escape special characters in SOQL. JSforce's `.find()` method handles this automatically.

6. **SOAP Login Deprecation**: JSforce notes that SOAP `login()` will be retired in Summer '27 (API v65.0). The JWT Bearer flow is the correct long-term approach.

---

## 15. Sources

### Official Salesforce Documentation
- [REST API Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)
- [Health Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/object_ref_overview.htm)
- [Health Cloud Data Model](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects.htm)
- [Life Sciences Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.life_sciences_dev_guide.meta/life_sciences_dev_guide/life_sciences_sforce_api_objects.htm)
- [Adverse Events Data Model Gallery](https://developer.salesforce.com/docs/platform/data-models/guide/adverse-events.html)
- [Care Program Management Data Model](https://developer.salesforce.com/docs/platform/data-models/guide/care-program-management.html)
- [Integrated Care Management Data Model](https://developer.salesforce.com/docs/platform/data-models/guide/integrated-care-management.html)
- [Platform Events Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/)
- [Pub/Sub API Developer Guide](https://developer.salesforce.com/docs/platform/pub-sub-api/overview)
- [Change Data Capture Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.change_data_capture.meta/change_data_capture/)
- [Composite API — Send Multiple Requests](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_composite_post.htm)
- [API Request Limits and Allocations](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_api.htm)
- [Status Codes and Error Responses](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/errorcodes.htm)

### Object References
- [CareBarrier Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects_carebarrier.htm)
- [HealthCondition Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/hc_r4_api_objects_HealthCondition.htm)
- [MedicationRequest Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/hc_r4_api_objects_MedicationRequest.htm)
- [Medication Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/hc_r4_api_objects_Medication.htm)
- [CarePreauth Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects_carepreauth.htm)
- [CoverageBenefit Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects_coveragebenefit.htm)
- [CarePlanTemplate__c Object](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects_careplantemplate__c.htm)
- [AdverseEventEntry Object](https://developer.salesforce.com/docs/atlas.en-us.life_sciences_dev_guide.meta/life_sciences_dev_guide/sforce_api_objects_adverseevententry.htm)
- [AdverseEventCause Object](https://developer.salesforce.com/docs/atlas.en-us.life_sciences_dev_guide.meta/life_sciences_dev_guide/sforce_api_objects_adverseeventcause.htm)

### Libraries & Tools
- [JSforce v3 — GitHub](https://github.com/jsforce/jsforce) (v3.10.14, MIT license)
- [JSforce Documentation](https://jsforce.github.io/document/)
- [salesforce-pubsub-api-client — GitHub](https://github.com/pozil/pub-sub-api-node-client)
- [Pub/Sub API Proto File](https://github.com/forcedotcom/pub-sub-api/blob/main/pubsub_api.proto)

### Trailhead Modules
- [API Basics — REST](https://trailhead.salesforce.com/content/learn/modules/api_basics/api_basics_rest)
- [Platform Events — Define and Publish](https://trailhead.salesforce.com/content/learn/modules/platform_events_basics/platform_events_define_publish)
- [Platform Events — Subscribe](https://trailhead.salesforce.com/content/learn/modules/platform_events_basics/platform_events_subscribe)
- [Health Cloud Care Programs](https://trailhead.salesforce.com/content/learn/modules/health-cloud-care-programs/set-up-care-programs)

### Third-Party References
- [Composite API Guide with Examples](https://thesalesforcedev.in/2025/10/26/understanding-salesforce-composite-api-a-complete-guide-with-examples/)
- [Salesforce API Rate Limits](https://coefficient.io/salesforce-api/salesforce-api-rate-limits)
- [Life Sciences Cloud Complete Guide](https://cyntexa.com/blog/salesforce-life-sciences-cloud/)
- [JWT Bearer Flow Implementation](https://mannharleen.github.io/2020-03-03-salesforce-jwt/)
- [Uploading Files with JSforce](https://www.pjgalbraith.com/uploading-files-to-salesforce-using-jsforce/)
- [Salesforce CDC Guide](https://airbyte.com/data-engineering-resources/salesforce-change-data-capture)
