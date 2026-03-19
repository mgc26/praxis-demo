# Veeva Vault CRM API Integration Report

**Prepared for:** Vi Operate / Praxis Precision Medicines HCP Engagement Platform
**Date:** 2026-03-18
**Platform:** Node.js / TypeScript backend (greenfield integration)
**API Versions:** Vault API v25.3 GA | v26.1 Beta (as of January 2026)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Context: Vault CRM Migration](#2-platform-context-vault-crm-migration)
3. [Authentication](#3-authentication)
4. [Client ID Registration](#4-client-id-registration)
5. [Object CRUD Operations](#5-object-crud-operations)
6. [CRITICAL PATH: Call Report Write-Back](#6-critical-path-call-report-write-back)
7. [Vault Query Language (VQL)](#7-vault-query-language-vql)
8. [CRITICAL PATH: Vault Safety AE Intake](#8-critical-path-vault-safety-ae-intake)
9. [Veeva Network API (HCP/HCO Master Data)](#9-veeva-network-api-hcphco-master-data)
10. [Spark Messaging (Async Events)](#10-spark-messaging-async-events)
11. [Vault Java SDK vs REST API](#11-vault-java-sdk-vs-rest-api)
12. [VAPIL & Client Libraries](#12-vapil--client-libraries)
13. [Rate Limits & Burst Protection](#13-rate-limits--burst-protection)
14. [Direct Data API](#14-direct-data-api)
15. [Action Triggers](#15-action-triggers)
16. [Integration Architecture Recommendations](#16-integration-architecture-recommendations)
17. [Open Questions & Next Steps](#17-open-questions--next-steps)

---

## 1. Executive Summary

Veeva Vault CRM is the new Vault-native CRM platform replacing the legacy Salesforce-based Veeva CRM. All integrations use the **standard Vault REST API** -- there is no separate "CRM API." The platform runs on Java (not Apex), uses VQL (not SOQL), and follows Vault's session-based authentication model.

**Key findings for Vi Operate:**

- **Call Report write-back** uses `POST /api/v25.3/objects/{object_name}/records` with JSON body. Object names use `__v` suffix (standard) or `__c` suffix (custom).
- **AE Safety intake** uses the **Intake Inbox Item** endpoint accepting E2B(R2/R3) XML files, routed through configured Transmission Profiles.
- **HCP/HCO master data** comes from the **Veeva Network API** (separate service, separate auth), not from Vault CRM directly.
- **No official Node.js/TypeScript SDK exists.** VAPIL is Java-only. We must build our own HTTP client layer.
- **Bulk operations** support up to **500 records per request**.
- **Session tokens** last 30 min inactive / 48 hours max.

---

## 2. Platform Context: Vault CRM Migration

### Timeline

| Milestone | Date |
|-----------|------|
| First Vault CRM production customer | Q4 2023 |
| General availability (new customers) | Q2 2024 |
| Salesforce partnership officially ended | September 2025 |
| 125+ customers live on Vault CRM | Q1 2026 (current) |
| Bulk migration period | 2026-2029 |
| End-of-support for legacy CRM | December 31, 2029 |

### What Changed for Integrations

| Aspect | Legacy CRM (Salesforce) | Vault CRM |
|--------|------------------------|-----------|
| API Style | Salesforce SOAP/REST, Bulk API | Vault REST API (JSON/HTTPS) |
| Query Language | SOQL | VQL |
| Custom Code | Apex | Java 17 (Vault Java SDK) |
| Object Suffix | `_vod` | `__v` (standard), `__c` (custom) |
| Auth | Salesforce OAuth / Session | Vault session token / OAuth 2.0/OIDC |
| Security Model | Salesforce Profiles | Vault Security Profiles & Permission Sets |
| Field Types Lost | -- | Geolocation, Hierarchical Relationships, External Lookup |

### Critical Migration Note

Veeva explicitly states: **customer-developed code and third-party integrations are NOT migrated automatically.** All outbound/inbound integrations must be rebuilt against Vault APIs. This means Praxis's Vi Operate integration is building against the correct (new) platform.

**Major adopters already on Vault CRM:** Novo Nordisk, Roche, GSK.

Sources: [IntuitionLabs Migration Roadmap](https://intuitionlabs.ai/articles/veeva-vault-crm-migration-roadmap), [IntuitionLabs API Overview](https://intuitionlabs.ai/articles/veeva-ecosystem-apis-comprehensive-technical-overview)

---

## 3. Authentication

### Session-Based Auth (Primary)

**Endpoint:** `POST https://{vaultDNS}/api/{version}/auth`

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
Accept: application/json
```

**Body (form-encoded):**
```
username={vault_username}&password={vault_password}
```

**Response:**
```json
{
  "responseStatus": "SUCCESS",
  "sessionId": "6B2F8D5E1A3C4F7890AB...",
  "userId": 12345,
  "vaultIds": [
    {
      "id": 1234,
      "name": "Praxis CRM",
      "url": "https://praxis-crm.veevavault.com/api"
    }
  ]
}
```

**Subsequent requests use:**
```
Authorization: {sessionId}
```
or
```
Authorization: Bearer {sessionId}
```

### Session Lifecycle

| Parameter | Value |
|-----------|-------|
| Inactivity timeout | 30 minutes |
| Max session duration | 48 hours (non-configurable) |
| Keep-alive endpoint | `POST /api/{version}/keep-alive` |
| End session | `DELETE /api/{version}/session` |
| Multiple sessions per user | Yes, independent |

### OAuth 2.0 / OIDC

**Endpoint:** `POST https://login.veevavault.com/auth/oauth/session/{oauth_oidc_profile_id}`

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer {access_token}
```

**Optional body params:** `vaultDNS`, `client_id`

Returns the same `sessionId` as username/password auth.

### Auth Type Discovery

**Endpoint:** `POST https://login.veevavault.com/auth/discovery?username={user}&client_id={client_id}`

Returns `auth_type: "password"` or `auth_type: "sso"` with OAuth/OIDC profile details.

### API Version Independence

Auth version does not need to match subsequent call versions. Authenticate with v17.3, run integrations with v25.3.

**Retrieve supported versions:** `GET /api/`

---

## 4. Client ID Registration

Client IDs are used primarily in OAuth 2.0/OIDC flows. They are **optional** in most contexts but required when:

- Using OAuth 2.0 / OIDC authentication
- Client ID mappings are defined on the OAuth profile
- Using the auth discovery endpoint

**Inclusion:**
- OAuth session endpoint: body parameter `client_id={value}`
- Discovery endpoint: query parameter `client_id={value}`

Client ID registration is handled by Vault administrators through OAuth profile configuration, not through a self-service developer portal.

---

## 5. Object CRUD Operations

### Object Naming Convention

- Standard objects: `object_name__v` (e.g., `call2__v`, `account__v`)
- Custom objects: `object_name__c` (e.g., `call_report__c`)
- System objects: `object_name__sys` (e.g., `user__sys`)

### Retrieve Object Metadata (Schema Discovery)

**Endpoint:** `GET /api/{version}/metadata/vobjects/{object_name}`

Example: `GET /api/v25.3/metadata/vobjects/call2__v`

Returns field definitions, data types, required status, picklist associations, and permissions. Use this to dynamically discover CRM object schemas.

**List all objects:** `GET /api/{version}/metadata/vobjects`

### Create Object Records

**Endpoint:** `POST /api/{version}/vobjects/{object_name}`

**Single record (JSON):**
```
Content-Type: application/json

{
  "field_name__v": "value",
  "another_field__c": "value"
}
```

**Bulk creation:** Up to **500 records** per request.

**Response:**
```json
{
  "responseStatus": "SUCCESS",
  "data": [
    {
      "responseStatus": "SUCCESS",
      "data": {
        "id": "OOW000000000301",
        "url": "/api/v25.3/vobjects/call2__v/OOW000000000301"
      }
    }
  ]
}
```

### Read Object Records

**Single record:** `GET /api/{version}/vobjects/{object_name}/{record_id}`

**Collection:** `GET /api/{version}/vobjects/{object_name}`

Supports filtering, sorting, and pagination via query parameters (`pagesize`, `pageoffset`).

### Update Object Records

**Endpoint:** `PUT /api/{version}/vobjects/{object_name}/{record_id}`

Only included fields are updated; others remain unchanged. Bulk updates supported.

### Delete Object Records

**Endpoint:** `DELETE /api/{version}/vobjects/{object_name}/{record_id}`

Cascade delete and bulk delete available.

### Response Pattern (All Operations)

```json
{
  "responseStatus": "SUCCESS" | "FAILURE",
  "responseDetails": {
    "pagesize": 1000,
    "pageoffset": 0,
    "size": 5,
    "total": 5
  },
  "data": [...],
  "errors": [...]
}
```

---

## 6. CRITICAL PATH: Call Report Write-Back

### Object Model

In Vault CRM, the Call Report object is typically `call2__v` (standard) or `call_report__c` (custom). The exact object name depends on Praxis's Vault CRM configuration.

**To discover the exact object name and fields:**
```
GET /api/v25.3/metadata/vobjects
```
Then:
```
GET /api/v25.3/metadata/vobjects/call2__v
```

### Write-Back Pattern

**Step 1: Authenticate**
```http
POST https://praxis-crm.veevavault.com/api/v25.3/auth
Content-Type: application/x-www-form-urlencoded

username=vi-operate-service@praxis.com&password=***
```

**Step 2: Create Call Report**
```http
POST https://praxis-crm.veevavault.com/api/v25.3/vobjects/call2__v
Authorization: {sessionId}
Content-Type: application/json

{
  "account__v": "V0C000000001001",
  "call_date__v": "2026-03-18",
  "call_type__v": "Detail",
  "attendees__v": "V0C000000002001",
  "status__v": "Submitted",
  "call_channel__v": "In-Person",
  "key_messages__v": ["efficacy_data", "safety_profile"],
  "notes__v": "Discussed PRAX-562 Phase 3 efficacy data..."
}
```

**Step 3: Verify (VQL)**
```http
POST https://praxis-crm.veevavault.com/api/v25.3/query
Content-Type: application/x-www-form-urlencoded
Authorization: {sessionId}

q=SELECT id, account__v, call_date__v, status__v FROM call2__v WHERE id = 'OOW000000000301'
```

### Related Objects (Typical CRM Model)

| Object | Purpose | Likely API Name |
|--------|---------|----------------|
| Call Report | Call/visit record | `call2__v` |
| Account | HCP/HCO account | `account__v` |
| Activity | Scheduled activities | `activity__v` |
| Medical Inquiry | Med info requests | `medical_inquiry__v` or custom |
| Key Message | Detail messages | `key_message__v` |
| Product | Product catalog | `product__v` |
| Call Objective | Call planning | `call_objective__v` |

### Bulk Call Report Submission

For batch processing (e.g., syncing multiple call reports from Vi Operate):
```http
POST https://praxis-crm.veevavault.com/api/v25.3/vobjects/call2__v
Content-Type: application/json

[
  { "account__v": "V0C000000001001", "call_date__v": "2026-03-18", ... },
  { "account__v": "V0C000000001002", "call_date__v": "2026-03-18", ... }
]
```
Limit: **500 records per request**.

### Error Handling

Partial failures return per-record status:
```json
{
  "responseStatus": "SUCCESS",
  "data": [
    { "responseStatus": "SUCCESS", "data": { "id": "OOW000000000301" } },
    { "responseStatus": "FAILURE", "errors": [{ "type": "INVALID_DATA", "message": "Required field missing: call_date__v" }] }
  ]
}
```

---

## 7. Vault Query Language (VQL)

### Endpoint

**POST** `/api/{version}/query`

```
Content-Type: application/x-www-form-urlencoded
Authorization: {sessionId}

q=SELECT id, name__v FROM call2__v WHERE call_date__v > '2026-01-01'
```

### Syntax Reference

```sql
SELECT {fields}
FROM {object}
WHERE {conditions}
ORDER BY {field} ASC|DESC
PAGESIZE {n}
PAGEOFFSET {n}
MAXROWS {n}
```

### Operators

| Operator | Example |
|----------|---------|
| `=`, `!=`, `<`, `>`, `<=`, `>=` | `WHERE status__v = 'Active'` |
| `AND`, `OR` | `WHERE status__v = 'Active' AND call_date__v > '2026-01-01'` |
| `BETWEEN` | `WHERE call_date__v BETWEEN '2026-01-01' AND '2026-03-31'` |
| `IN` | `WHERE status__v IN ('Active', 'Submitted')` |
| `LIKE` | `WHERE name__v LIKE 'Dr. Smith%'` |
| `CONTAINS` | `WHERE product__v CONTAINS ('PRAX-562')` |

### Functions

| Function | Purpose |
|----------|---------|
| `CASEINSENSITIVE()` | Case-insensitive matching |
| `TOLABEL()` | Get field labels instead of API values |
| `LONGTEXT()` | Retrieve full long text field values |
| `RICHTEXT()` | Return Rich Text with HTML markup |
| `STATETYPE()` | Filter by object state type |
| `TONAME()` | Get field names instead of labels |

### Relationship Queries (Subqueries)

```sql
SELECT id, name__v, (SELECT id FROM call_attendees__cr)
FROM call2__v
WHERE call_date__v > '2026-01-01'
```

### FIND (Full-Text Search)

```sql
FIND ('PRAX-562 efficacy' SCOPE ALL)
FROM call2__v
WHERE call_date__v > '2026-01-01'
```

Scope options: `ALL`, `CONTENT`, `PROPERTIES`, `FIELDS`

### Pagination

Default page sizes: 1000 (objects), 200 (documents).
Use `next_page`/`previous_page` URLs from response (preferred over manual PAGEOFFSET).

### Schema Introspection (v25.2+)

```sql
SHOW TARGETS                    -- List all queryable objects
SHOW FIELDS FROM call2__v       -- Available fields
SHOW RELATIONSHIPS FROM call2__v -- Relationship metadata
```

### Practical CRM Queries

**Recent call history for an HCP:**
```sql
SELECT id, call_date__v, call_type__v, status__v, notes__v
FROM call2__v
WHERE account__v = 'V0C000000001001'
ORDER BY call_date__v DESC
PAGESIZE 50
```

**All accounts with recent activity:**
```sql
SELECT id, name__v, specialty__v
FROM account__v
WHERE id IN (SELECT account__v FROM call2__v WHERE call_date__v > '2026-01-01')
```

### Limits

- Max query string: **50,000 characters**
- Max search term: **250 characters**
- Default page size: 1000 objects
- VQL is case-insensitive for keywords, case-sensitive for field values (use `CASEINSENSITIVE()` to override)

### Headers for Enhanced Queries

| Header | Purpose |
|--------|---------|
| `X-VaultAPI-DescribeQuery: true` | Include field metadata (types, required, encrypted) |
| `X-VaultAPI-RecordProperties: all` | Include permissions, hidden fields, edit status |
| `X-VaultAPI-Facets: field1,field2` | Return facet counts for specified fields |

---

## 8. CRITICAL PATH: Vault Safety AE Intake

### Architecture Overview

Vault Safety receives adverse event reports through the **Intake Inbox Item** API endpoint. Reports are submitted as **E2B(R2) or E2B(R3) XML files**, which Vault processes into Inbox Items and (optionally) auto-promotes to Cases.

### Intake Inbox Item Endpoint

**Endpoint:** `POST /api/{version}/services/safety/intake`
(Exact path per [Vault Developer Portal](https://developer.veevavault.com/api/25.3#intake-inbox-item))

**Required Parameters:**

| Parameter | Description |
|-----------|-------------|
| `originId` | Identifier for the **receiving** organization (Praxis) |
| `destinationId` | Identifier for the **sending** organization (Vi Operate) |
| E2B file | The E2B(R2) or E2B(R3) XML file as multipart attachment |

These IDs must match the configured **Transmission Profile** in Vault Safety.

### Prerequisites (Vault Admin Setup)

1. **Transmission Profile**: Create a Connection-type Transmission Profile with:
   - Origin: Praxis organization (receiving)
   - Origin ID: Must match API call's `originId`
   - Destination: Vi Operate (sending)
   - Destination ID: Must match API call's `destinationId`

2. **User Permissions**: The API service account must have:
   - Permission to create `transmission__v` objects
   - Permission to create `case__v > source__v > adverse_event_report__v` documents
   - User record linked to the receiving Organization

3. **Default Values**: All non-standard mandatory fields on Transmission, Inbox Item, and Adverse Event Report documents must have default values configured.

### E2B Processing Workflow

```
Vi Operate submits E2B XML via API
         |
         v
Vault creates Inbound Transmission record
         |
         v
E2B file added to Library (with narratives, translations, attachments)
         |
         v
E2B import begins -> Data conformance checks (R2 or R3)
         |
         v
Sender-based inbound validation (if enabled)
         |
         v
Inbox Item created with imported case data
         |
         v
ICSR Acknowledgment generated (matching E2B format)
         |
         v
[Optional] Auto-promotion to Case (if configured)
```

### Acknowledgment Codes

**E2B(R3) ACK:**

| Code | Field | Meaning |
|------|-------|---------|
| `AA` | ACK.A.4 | Transmission success |
| `AE` | ACK.A.4 | Success with warnings |
| `AR` | ACK.A.4 | Transmission failure |
| `CA` | ACK.B.r.6 | Report success/warnings |
| `CR` | ACK.B.r.6 | Report failure |

**E2B(R2) ACK:**

| Code | Field | Meaning |
|------|-------|---------|
| `01` | A.1.6 | All reports loaded |
| `02` | A.1.6 | Partial load / errors |
| `03` | A.1.6 | Parse error |
| `01` | B.1.8 | Report loaded |
| `02` | B.1.8 | Report not loaded |

### Retrieve Intake Status

After submission, poll for status:

**Endpoint:** `GET /api/{version}/services/safety/intake/{job_id}/status`

For API transmissions, the acknowledgment must be retrieved via a separate "Retrieve Job Status" call (unlike AS2 gateway which returns ACK automatically).

### Inbox Item Key Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Organization | Lookup | Yes | Sponsor organization |
| New Info Date | Date | Yes | Most recent follow-up date |
| Report Type | Picklist | Yes | Method AE was reported |
| Intake Format | Picklist | Auto | E2B, Manual, Document, JSON, etc. |
| Intake Method | Picklist | Auto | How intake occurred |
| Case Identifier | Text | No | External UID for duplicate detection |
| Worldwide UID | Text | No | External safety case ID |
| External System UID | Text | No | Vi Operate's unique identifier |
| Company Product | Lookup | Auto | Auto-matched from E2B data |
| Product Match Confidence | Picklist | Auto | 1-6 scale confidence |
| Adverse Event | Text | Auto | From Medical Events (Rank 1) |
| Identifiable Patient | Picklist | Auto | Yes if patient data present |
| Identifiable Reporter | Picklist | Auto | Yes if reporter data present |
| Assigned To | Lookup | No | User assigned to review |
| Priority | Picklist | No | Report priority level |

### E2B File Requirements

- **Supported formats:** E2B(R2) and E2B(R3) ICSR XML
- **Single or multi-case:** Both supported in one file
- Each case in the file generates a separate Inbox Item
- Vault performs data conformance checks before import
- Text fields exceeding character limits trigger import failure with NACK

### Integration Pattern for Vi Operate

```typescript
// Pseudocode for AE submission from Vi Operate
async function submitAdverseEvent(e2bXml: string): Promise<IntakeResult> {
  // 1. Authenticate to Vault Safety instance
  const session = await vaultAuth(SAFETY_VAULT_DNS, credentials);

  // 2. Submit E2B file
  const formData = new FormData();
  formData.append('file', Buffer.from(e2bXml), {
    filename: 'ae_report.xml',
    contentType: 'application/xml'
  });

  const response = await fetch(
    `https://${SAFETY_VAULT_DNS}/api/v25.3/services/safety/intake` +
    `?originId=${PRAXIS_ORG_ID}&destinationId=${VI_OPERATE_DEST_ID}`,
    {
      method: 'POST',
      headers: { 'Authorization': session.sessionId },
      body: formData
    }
  );

  // 3. Poll for acknowledgment
  const jobId = response.data.jobId;
  const ack = await pollIntakeStatus(session, jobId);

  return ack;
}
```

### Additional Intake Methods

| Endpoint | Purpose |
|----------|---------|
| Intake Inbox Item | E2B XML file submission (primary) |
| Intake JSON | JSON-format case submission (alternative) |
| Intake Imported Case | Pre-processed case import |
| Import Narrative | Narrative document attachment |
| Bulk Import Narrative | Batch narrative import |

Sources: [Vault Safety Help - Intake Configuration](https://safety.veevavault.help/en/lr/01207/), [E2B Transmission](https://safety.veevavault.help/en/gr/01286/), [Inbox Item Fields](https://safety.veevavault.help/en/gr/01285/)

---

## 9. Veeva Network API (HCP/HCO Master Data)

Veeva Network is a **separate service** with its own authentication, base URL, and API versioning. It is the master data management (MDM) system for HCP/HCO records.

### Authentication

**Endpoint:** `POST https://{network_dns}/api/{version}/auth`

**Request:** Form-encoded username/password
**Response:** `sessionId` (20-minute inactivity timeout)
**Header:** `Authorization: {sessionId}`

### Core Endpoints

#### Search/Retrieve HCP/HCO

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/{version}/entity/{vid_key}` | GET | Retrieve single HCP/HCO by Veeva ID |
| `GET /api/{version}/entities/{vid_key}/children/{children_key}` | GET | Retrieve address, license, parent HCO |
| `POST /api/{version}/entities/batch` | POST | Batch retrieve up to 500 entities |
| `GET /api/{version}/search?objectType=HCP&searchTerm=...` | GET | Search HCPs by criteria |

**Retrieve example:**
```
GET https://praxis.veevanetwork.com/api/v37.0/entity/243567890123456789
Authorization: {sessionId}
```

**Response includes:** `entityId`, `entityType`, field values, custom keys, hashtags.

**Optional parameters:** `systemName`, `enrichedResults`, `resultLanguage`

#### Data Change Requests (DCR)

DCRs are the mechanism for adding or updating HCP/HCO records. Network routes changes through business rules and data steward approval.

**Create DCR:**
```
POST https://{network_dns}/api/{version}/change_request
```

**Request body:**
```json
{
  "entity_type": "HCP",
  "metadata": {
    "creator": "ViOperate",
    "note": "New HCP discovered during engagement"
  },
  "entity": {
    "first_name__v": "John",
    "last_name__v": "Doe",
    "specialty_1__v": "Neurology"
  },
  "addresses__v": [{
    "address_line_1__v": "123 Medical Center Dr",
    "city__v": "Boston",
    "state_province__v": "US-MA",
    "country__v": "US"
  }],
  "licenses__v": [{
    "license_number__v": "MD12345",
    "license_status__v": "A"
  }]
}
```

**Response:**
```json
{
  "responseStatus": "SUCCESS",
  "change_request_id": "CR-12345"
}
```

**DCR Status Values:** `CHANGE_NEW`, `CHANGE_PENDINGREVIEW`, `CHANGE_PROCESSED`, `CHANGE_CANCELLED`

**Track DCR:**
```
GET /api/{version}/change_requests/{change_request_id}
```

#### Custom Keys (Cross-Reference)

Link external system IDs to Network entities:
```
POST /api/{version}/entities/{vid_key}/custom_keys
```
Batch: up to **500 per request**.

#### Metadata Discovery

```
GET /api/{version}/metadata/object-types
GET /api/{version}/metadata/fields
GET /api/{version}/metadata/reference-data
GET /api/{version}/metadata/versions
```

#### Subscription Jobs (Bulk Sync)

```
POST /api/{version}/subscriptions          -- Create sync job
GET /api/{version}/subscriptions/{job_id}  -- Check status
```

### Key Network API Patterns

| Pattern | Endpoint |
|---------|----------|
| Match incoming record | `POST /api/{version}/match` |
| Search change requests | `GET /api/{version}/change_request/search` |
| Batch process DCRs | `PUT /api/{version}/change_request/process/batch` |
| Batch approve/reject | `PUT /api/{version}/change_request/approve/batch` |
| Create suspect match | `POST /api/{version}/entity/createSuspectMatch/batch` |

### Response Patterns

```json
// Success
{ "responseStatus": "SUCCESS", "data": {...} }

// Failure
{ "responseStatus": "FAILURE", "errors": [{"type": "ERROR_CODE", "message": "..."}] }

// Partial Success (batch)
{ "responseStatus": "PARTIAL_SUCCESS", "errors": [...] }
```

### Batch Limits

Standard batch operations: **500 per request** (entities, custom keys, DCRs).

Source: [Veeva Network API Reference](https://developer.veevanetwork.com/API_reference/API_reference.htm)

---

## 10. Spark Messaging (Async Events)

Spark Messaging enables **asynchronous queue-based communication** between Vault instances and external systems. It is configured and implemented through the **Vault Java SDK**, not the REST API directly.

### Components

| Component | Purpose |
|-----------|---------|
| QueueService | Manage message queuing operations |
| MessageProcessor | Custom logic for handling incoming messages |
| Message Delivery Event Handler | Post-delivery logging, record updates, downstream triggers |
| Integration Rules | Define routing logic and delivery conditions |
| Message Delivery Allowlist | Control which external systems can receive messages |

### Architecture

- Messages are signed and verified for integrity
- Queue-based delivery ensures reliability
- External systems must be on the allowlist
- Custom MessageProcessors transform or act on message content

### Relevance to Vi Operate

Spark Messaging could enable **real-time notifications** from Vault CRM to Vi Operate (e.g., when a call report is updated or an AE case status changes). However, it requires Java SDK code deployed within Vault -- it cannot be configured purely via REST API.

**Recommendation:** For the initial integration, use **polling via VQL** for change detection. Evaluate Spark Messaging for Phase 2 if real-time event delivery is needed.

---

## 11. Vault Java SDK vs REST API

### When to Use Each

| Scenario | Approach |
|----------|----------|
| External system integration (Vi Operate) | **REST API** |
| Internal Vault automation | **Java SDK** |
| Real-time event triggers inside Vault | **Java SDK** (Record Triggers) |
| Data sync from external to Vault | **REST API** |
| Complex business logic on record create/update | **Java SDK** |
| Async event delivery to external systems | **Java SDK** (Spark Messaging) |

### SDK Trigger Model

Triggers fire on `INSERT`, `UPDATE`, `DELETE` at `BEFORE` or `AFTER` timing:

```java
@RecordTriggerInfo(
    object = "call2__v",
    events = {RecordEvent.AFTER_INSERT},
    order = 1
)
public class CallReportNotifier implements RecordTrigger {
    public void execute(RecordTriggerContext context) {
        // Send Spark message to Vi Operate
        // Or call external HTTP endpoint
    }
}
```

**Constraints:**
- Max 10 triggers per event type
- Max 10 levels of nesting
- Execution limit: 100 seconds, 40MB memory
- Runs as SDK Service Account (Vault Owner permissions)
- Java 17 required (as of 25R2)
- Deployed as `.vpk` packages

### Recommendation for Vi Operate

Vi Operate is an **external system** -- use the REST API for all CRUD operations. Consider requesting Praxis deploy a Java SDK trigger inside their Vault to send Spark Messages or HTTP callouts to Vi Operate for real-time event notifications.

---

## 12. VAPIL & Client Libraries

### VAPIL (Vault API Library)

- **Language:** Java only (no Node.js/TypeScript)
- **License:** Apache 2.0 (open source)
- **Latest version:** v25.3.0
- **Release cycle:** Three releases per year (aligned with Vault API)
- **GitHub:** [github.com/veeva/vault-api-library](https://github.com/veeva/vault-api-library)

**Maven:**
```xml
<repository>
  <id>vapil</id>
  <url>https://veeva.github.io/vault-api-library/maven</url>
</repository>
<dependency>
  <groupId>com.veeva.vault</groupId>
  <artifactId>vapil</artifactId>
  <version>25.3.0</version>
</dependency>
```

### Node.js/TypeScript Strategy

**No official Veeva client library exists for Node.js/TypeScript.** We must build our own HTTP client layer.

**Recommended approach:**

```typescript
// Vault API client structure
class VaultClient {
  private sessionId: string | null = null;
  private baseUrl: string;  // https://praxis-crm.veevavault.com

  async authenticate(): Promise<void> { /* POST /api/v25.3/auth */ }
  async keepAlive(): Promise<void> { /* POST /api/v25.3/keep-alive */ }
  async query(vql: string): Promise<VQLResponse> { /* POST /api/v25.3/query */ }
  async createRecord(object: string, data: Record<string, any>): Promise<CreateResponse> { /* POST /api/v25.3/vobjects/{object} */ }
  async updateRecord(object: string, id: string, data: Record<string, any>): Promise<UpdateResponse> { /* PUT /api/v25.3/vobjects/{object}/{id} */ }
  async getRecord(object: string, id: string): Promise<ObjectRecord> { /* GET /api/v25.3/vobjects/{object}/{id} */ }
  async deleteRecord(object: string, id: string): Promise<DeleteResponse> { /* DELETE /api/v25.3/vobjects/{object}/{id} */ }
  async bulkCreate(object: string, records: Record<string, any>[]): Promise<BulkResponse> { /* POST (array body) */ }
  async getMetadata(object: string): Promise<ObjectMetadata> { /* GET /api/v25.3/metadata/vobjects/{object} */ }
}
```

**Session management considerations:**
- Implement automatic session refresh (call keep-alive before 30-min timeout)
- Cache session token with TTL
- Handle 401 responses with automatic re-authentication
- Support multiple Vault instances (CRM, Safety) with separate sessions

---

## 13. Rate Limits & Burst Protection

### General API Limits

Vault implements **burst protection** that throttles requests beyond a threshold. Specific limits are:

- **Not universally documented** -- limits are per-Vault and per-account
- Check response headers for current limits
- Check **API Usage Logs** in Vault Admin for your specific burst limit and throttling delay

### Authentication Rate Limits

Auth endpoint has separate rate limits based on:
- Username
- Domain name

Response headers include rate limit information (specific header names not documented publicly).

### Best Practices

1. Implement exponential backoff on 429/throttle responses
2. Use bulk operations (500 records/request) to minimize API calls
3. Monitor daily API usage via `GET /api/{version}/logs/api_usage` (Download Daily API Usage)
4. Use VQL pagination (`next_page` URLs) rather than repeated queries
5. Cache metadata responses (object schemas don't change frequently)
6. Use Direct Data API for large read-heavy workloads instead of paginated VQL

---

## 14. Direct Data API

High-speed, **read-only** bulk data extraction from Vault.

### Characteristics

- **100x faster** than paginated REST API for large datasets
- Returns compressed `.tar.gz` archives
- Transactionally consistent snapshots
- No additional license fee (included with Vault Platform since February 2025)
- Files > 1GB automatically partitioned

### File Types

| Type | Purpose |
|------|---------|
| `incremental_directdata` | Changed records since last extraction |
| `full_directdata` | Complete Vault snapshot |
| `log_directdata` | Audit and activity logs |

### Endpoints

```
GET /api/{version}/directdata/files         -- List available extracts
GET /api/{version}/directdata/files/{id}    -- Download extract file
```

### Accelerators

Pre-built connectors for: Amazon Redshift, Snowflake, Databricks, Microsoft Fabric, Azure SQL, SQLite.

### Relevance to Vi Operate

Use Direct Data API for:
- Initial data load (all HCP accounts, call history)
- Nightly sync of call reports and activities
- Analytics and reporting data pipelines

---

## 15. Action Triggers

**Action Triggers** (GA May 2025, 25R1) are **no-code IF-THEN-ELSE automations** for record events.

- Trigger on record create/update/delete
- No Java SDK code required
- Configured through Vault Admin UI
- Suitable for simple field defaults, notifications, status changes

**Relevance:** Praxis could configure Action Triggers in their Vault CRM to automate workflows when Vi Operate creates/updates call reports (e.g., auto-assign, set status, notify managers).

---

## 16. Integration Architecture Recommendations

### Recommended Architecture

```
                        +-------------------+
                        |   Vi Operate      |
                        |   (Node.js/TS)    |
                        +--------+----------+
                                 |
                    +------------+------------+
                    |            |            |
                    v            v            v
           +-------+---+ +------+----+ +-----+--------+
           | Vault CRM  | | Vault     | | Veeva        |
           | REST API   | | Safety    | | Network      |
           | (Session)  | | REST API  | | REST API     |
           +------------+ +-----------+ +--------------+
           Call Reports    AE Intake     HCP/HCO Master
           Activities      E2B Submit    Data, DCRs
           Med Inquiries   ACK Polling   Custom Keys
```

### Three Separate Auth Contexts

| Service | Base URL Pattern | Auth | Session Timeout |
|---------|-----------------|------|-----------------|
| Vault CRM | `https://{org}-crm.veevavault.com` | Vault session | 30 min / 48 hr max |
| Vault Safety | `https://{org}-safety.veevavault.com` | Vault session | 30 min / 48 hr max |
| Veeva Network | `https://{org}.veevanetwork.com` | Network session | 20 min |

### Implementation Phases

**Phase 1: Core Integration (MVP)**
1. Build Vault REST API client (auth, session management, retry logic)
2. Implement Call Report write-back (`POST /vobjects/call2__v`)
3. Implement VQL-based read for HCP profiles and call history
4. Implement basic AE intake via Intake Inbox Item endpoint

**Phase 2: Master Data & Enrichment**
5. Integrate Veeva Network API for HCP/HCO lookup and matching
6. Implement DCR submission for new HCP data
7. Custom key cross-referencing between Vi Operate and Network

**Phase 3: Real-Time & Scale**
8. Evaluate Spark Messaging for real-time event delivery
9. Implement Direct Data API for bulk sync / analytics
10. Add Action Triggers for no-code automation in Vault

### TypeScript Client Design Principles

1. **Separate clients per service** (VaultCRM, VaultSafety, VeevaNetwork)
2. **Automatic session management** with proactive keep-alive
3. **Retry with exponential backoff** for rate limit / transient errors
4. **Schema discovery on init** -- call metadata endpoint to validate object names and fields
5. **Bulk-first design** -- batch operations where possible (500 record limit)
6. **VQL query builder** -- type-safe query construction
7. **E2B XML generation** -- template-based E2B(R3) XML builder for AE submission

---

## 17. Open Questions & Next Steps

### Must Resolve with Praxis Vault Admin

1. **Exact CRM object names**: Is the call report `call2__v` or a custom object? Need `GET /metadata/vobjects` output.
2. **Service account credentials**: Dedicated integration user for Vi Operate with appropriate Permission Sets.
3. **Vault DNS hostnames**: Exact URLs for CRM, Safety, and Network instances.
4. **Transmission Profile**: Safety team must configure the Connection-type Transmission Profile for AE intake.
5. **OAuth vs password auth**: Does Praxis require OAuth 2.0/OIDC, or is username/password acceptable for service accounts?
6. **Network API access**: Separate credentials and subscription configuration for Veeva Network.
7. **Sandbox environment**: Development/testing Vault instance for integration development.
8. **Rate limit details**: Check Praxis-specific burst limits via API Usage Logs.

### Must Resolve Internally

9. **E2B XML generation**: Choose R2 vs R3 format for AE submissions (R3 preferred for new integrations).
10. **Idempotency strategy**: Vault API may not provide native idempotency keys -- implement client-side dedup using `External System UID` fields.
11. **Polling interval**: Determine acceptable latency for VQL-based change detection (before Spark Messaging is available).
12. **Error handling taxonomy**: Map Vault error codes to Vi Operate's error handling model.
13. **SSL certificate migration**: Vault moving from DigiCert Legacy to G2 Root (aligned with April 2026 EOL) -- ensure our Node.js trust store handles this.

### Reference Documentation

| Resource | URL |
|----------|-----|
| Vault REST API Reference (v25.3) | https://developer.veevavault.com/api/25.3/ |
| VQL Reference | https://developer.veevavault.com/vql/ |
| Vault Java SDK | https://developer.veevavault.com/sdk/ |
| VAPIL (Java client) | https://github.com/veeva/vault-api-library |
| Veeva Network API | https://developer.veevanetwork.com/API_reference/API_reference.htm |
| Vault Safety Help | https://safety.veevavault.help/ |
| Safety Intake Configuration | https://safety.veevavault.help/en/lr/01207/ |
| Safety E2B Transmission | https://safety.veevavault.help/en/gr/01286/ |
| Safety Inbox Item Fields | https://safety.veevavault.help/en/gr/01285/ |
| Migration Roadmap | https://intuitionlabs.ai/articles/veeva-vault-crm-migration-roadmap |
| Ecosystem API Overview | https://intuitionlabs.ai/articles/veeva-ecosystem-apis-comprehensive-technical-overview |
