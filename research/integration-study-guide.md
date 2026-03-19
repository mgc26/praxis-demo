# Enterprise Integration Study Guide
### For a technical leader getting up to speed on pharma CRM/CM integrations

**Context:** Vi Operate is a pharma voice agent platform. It makes and receives phone calls with patients and HCPs, classifies the outcomes with AI, and needs to write those outcomes back to Praxis's CRM/CM systems. This guide covers everything you need to know to lead that integration work.

**Audience:** Head of Product, clinical informaticist background, new to enterprise integration patterns and pharma CRM vendor landscape.

---

## PART 1: Integration Fundamentals

You know code. You know clinical data. This section fills the gap on how enterprise systems talk to each other.

---

### 1.1 REST API Patterns

**CRUD maps to HTTP methods:**

| Operation | HTTP Method | Success Code | Notes |
|-----------|------------|-------------|-------|
| Create | POST | 201 Created | Returns the new resource ID |
| Read | GET | 200 OK | Idempotent — safe to retry |
| Update (full) | PUT | 200 OK | Replaces entire resource |
| Update (partial) | PATCH | 200 OK | Modifies specific fields only |
| Delete | DELETE | 204 No Content | Some APIs return 200 with body |

**Status codes that matter in practice:**

| Code | Meaning | Your response |
|------|---------|--------------|
| 200/201 | Success | Proceed |
| 400 | Bad request (your fault) | Fix the payload, don't retry |
| 401 | Auth expired | Refresh token, retry once |
| 403 | Insufficient permissions | Escalate — this is a config problem, not code |
| 404 | Resource not found | Check the ID. Could be a data sync issue |
| 409 | Conflict (duplicate) | Check if the resource already exists |
| 429 | Rate limited | Back off and retry (see below) |
| 500 | Server error (their fault) | Retry with backoff |
| 503 | Service unavailable | Retry with backoff, longer wait |

**Pagination patterns:**

| Pattern | How it works | Who uses it |
|---------|-------------|-------------|
| Offset-based | `?offset=100&limit=50` — skip N records | Simple, but breaks if records are inserted mid-pagination |
| Cursor-based | Response includes `nextPageUrl` or `cursor` token — pass it to get the next page | Salesforce (nextRecordsUrl), Veeva, most modern APIs |
| Keyset-based | `?after=lastRecordId` — uses a stable sort key | Databricks result chunks |

Cursor-based is the most reliable. Always use it when available.

**Rate limiting — what it is, how to handle it:**

APIs enforce request quotas to prevent abuse. When you exceed them, you get HTTP 429.

1. Check the `Retry-After` header — it tells you how many seconds to wait
2. If no `Retry-After`, use exponential backoff: wait 1s, then 2s, then 4s, then 8s
3. Add jitter (random 0-500ms) to prevent thundering herd when multiple workers retry simultaneously
4. Set a max retry count (typically 3-5) — if you're still hitting limits, you have a design problem, not a retry problem

**Idempotency — why it matters for writes:**

Network failures happen. If your POST to create a Case in Salesforce times out, did it succeed? You don't know. If you retry, you might create a duplicate.

Solutions:
- **Idempotency keys**: Send a unique ID (UUID) with write requests. If the server has seen that key before, it returns the original response instead of creating a duplicate. OpenAI supports this via the `Idempotency-Key` header.
- **External ID upserts**: Salesforce supports PATCH to `/sobjects/{Type}/{externalIdField}/{value}` — creates if not found, updates if found. This is our primary pattern for CRM writes.
- **MERGE statements**: Databricks SQL supports `MERGE INTO ... WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT`. One statement, no duplicates.

---

### 1.2 Authentication Patterns

**API Keys — simplest form:**

A static string passed in the request header. No expiry, no refresh, no ceremony.

```
Authorization: Bearer dg-abc123...
Authorization: Token dg-abc123...
```

Used by: Deepgram, OpenAI, Twilio (Account SID + Auth Token as basic auth).

Risk: if leaked, full access until revoked. Rotate periodically. Never commit to source control.

**OAuth 2.0 — the enterprise standard:**

OAuth separates "who are you" (credentials) from "what can you do" (access token). You exchange credentials for a short-lived token, then use that token for API calls.

**Grant types that matter for server-to-server:**

| Grant Type | When to use | How it works |
|------------|-------------|-------------|
| Client Credentials | Server-to-server, no user context | POST client_id + client_secret to token endpoint, get access_token back. Simplest OAuth flow. Databricks uses this. |
| JWT Bearer | Server-to-server, Salesforce specifically | Sign a JWT with your private key, POST it to Salesforce token endpoint, get access_token back. No client secret needed — the cryptographic signature IS the proof. |
| Authorization Code | User-interactive (not our case) | User logs in via browser, redirect back with code, exchange code for token. Used for apps where a human clicks "Allow." We don't need this. |

**JWT Bearer step by step (Salesforce):**

1. Generate RSA key pair. Upload public cert to Salesforce Connected App.
2. Build JWT claims: `iss` = client ID, `sub` = Salesforce username, `aud` = login URL, `exp` = now + 3 min
3. Sign the JWT with the private key (RS256)
4. POST to `https://login.salesforce.com/services/oauth2/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion={signed_jwt}`
5. Get back `access_token` + `instance_url`
6. Use `Authorization: Bearer {access_token}` for all subsequent calls

Token lifetime: 1-2 hours. No refresh token returned. When it expires, repeat steps 2-5.

**Session tokens — Veeva's approach:**

Veeva doesn't use OAuth for most integrations. Instead:

1. POST username + password to `/api/{version}/auth`
2. Get back a `sessionId`
3. Use `Authorization: {sessionId}` for all subsequent calls
4. Session expires after 30 min of inactivity or 48 hours max

This is older-school. The credentials travel over the wire (HTTPS encrypted, but still). OAuth avoids this by using short-lived tokens that aren't the actual credentials.

**Token refresh patterns:**

| Strategy | How | When |
|----------|-----|------|
| Pre-emptive refresh | Cache the token with its expiry. Refresh 5 min BEFORE it expires. | Best for high-throughput systems. No requests ever fail due to expired tokens. |
| Reactive refresh | When you get a 401, refresh the token and retry the request. | Simpler. Works fine for low-throughput. |
| Combined | Pre-emptive as primary, reactive as fallback. | What we should build. |

Cache tokens in memory (not on disk). For Salesforce, don't refresh more often than every 20 minutes — they rate-limit the token endpoint.

---

### 1.3 Webhook / Event-Driven Patterns

**Webhooks — the basics:**

Instead of polling an API ("any new records?"), the system calls YOUR endpoint when something happens. You register a URL; they POST to it when an event fires.

- You must expose an HTTPS endpoint
- Verify the sender (signature verification — the payload is signed with a shared secret)
- Respond with 200 quickly (< 5 seconds). Do heavy processing async.
- If you respond with 5xx, most systems retry (3-5 times with backoff)

**Real-time communication patterns:**

| Pattern | Direction | Persistence | Use case |
|---------|-----------|-------------|----------|
| Webhooks | Server → your server | None — fire and forget | CRM record changes triggering outbound calls |
| Server-Sent Events (SSE) | Server → client (one-way) | Auto-reconnect built in | OpenAI streaming completions |
| WebSockets | Bidirectional | Persistent connection | Deepgram voice agent (audio streaming), Twilio Media Streams |

**Platform Events (Salesforce):**

Salesforce's native pub/sub system. Define a custom event (e.g., `Outbound_Call_Requested__e`), publish it from a Flow or Apex trigger when a Case reaches a certain state. External systems subscribe via the Pub/Sub API (gRPC) or poll via the REST Streaming API.

- Durable: events are retained for 72 hours
- Replay: you can replay missed events from a stored `replayId`
- This is how Salesforce would tell Vi Operate "call this patient now"

**Spark Messaging (Veeva):**

Veeva's equivalent, but less mature. Asynchronous message queue between Vaults or to external systems. Requires more configuration than Salesforce Platform Events. No simple webhook equivalent — outbound HTTP callouts require Java SDK custom code or the newer Action Triggers (25R1+).

**Delivery guarantees:**

| Guarantee | Meaning | Reality |
|-----------|---------|---------|
| At-most-once | Message sent once, might be lost | Acceptable only for non-critical notifications |
| At-least-once | Message will arrive, but possibly duplicated | Most webhook systems. YOUR receiver must be idempotent. |
| Exactly-once | Message arrives once, guaranteed | Extremely hard. In practice, you get at-least-once delivery and idempotent processing. |

Build every receiver to handle duplicates. Store the event ID; if you've seen it before, skip it.

**Dead letter queues:**

When a message repeatedly fails processing (your endpoint is down, your handler throws an error), it goes to a dead letter queue (DLQ) instead of being retried forever. You review and reprocess DLQ messages when the issue is resolved. Essential for production reliability.

---

### 1.4 Data Integration Patterns

**ETL vs ELT vs real-time streaming:**

| Pattern | Process | When |
|---------|---------|------|
| ETL (Extract-Transform-Load) | Pull data, reshape it, then write to destination | Legacy. Transform before load. |
| ELT (Extract-Load-Transform) | Pull data, write raw to destination, transform there | Modern. Databricks/data lake pattern. Load everything, transform with SQL later. |
| Real-time streaming | Events flow continuously, processed as they arrive | Call outcomes written immediately post-call. No batching. |

For Vi Operate: post-call writes are real-time (event-driven, one record at a time). Bulk historical analysis uses ELT through Databricks.

**Change Data Capture (CDC):**

Salesforce publishes an event every time a record is created, updated, deleted, or undeleted. The event contains the changed fields (not the full record). External systems subscribe and react.

Use case: a CarePlan is updated in Salesforce → CDC event fires → Vi Operate receives it → agent uses updated care plan in next call.

CDC vs Platform Events: CDC is automatic for any object you enable it on (no code needed). Platform Events are custom-defined for specific business events. Use CDC for "mirror data changes." Use Platform Events for "trigger a specific action."

**Delta Lake:**

An open-source storage layer that adds ACID transactions (atomicity, consistency, isolation, durability) to data lakes. Data lakes are normally just files in cloud storage (S3/ADLS) — no transactions, no schema enforcement, no rollback. Delta Lake fixes that.

Why Databricks uses it: every table in Databricks is a Delta table. You get SQL semantics (INSERT, UPDATE, MERGE, DELETE) on top of cloud object storage. Time travel (query historical versions). Schema enforcement. This is where all Vi Operate call data lands for analytics.

**Bulk vs real-time — decision framework:**

| Scenario | Pattern | Why |
|----------|---------|-----|
| Post-call outcome write to CRM | Real-time (single API call) | Patient/HCP expects immediate record update |
| Post-call write to Databricks | Real-time (SQL INSERT) | Ambit analytics needs fresh data |
| Pre-call context enrichment | Real-time (single query) | Agent needs data before the call starts |
| Nightly HCP list sync | Bulk (Salesforce Bulk API 2.0 or Veeva Direct Data API) | High volume, latency doesn't matter |
| Historical transcript migration | Bulk (Databricks batch INSERT) | One-time or periodic |

**Schema evolution:**

Adding a field to a JSON payload or database table without breaking existing consumers. Delta Lake handles this natively — you can add columns to a Delta table and existing queries still work (new columns return NULL for old rows). Salesforce custom fields work the same way — add a field, existing integrations that don't reference it are unaffected.

Rule: always add fields, never remove or rename them without coordinating with all consumers.

---

### 1.5 Integration Architecture Patterns

**Hub-and-spoke:**

One system sits in the middle and routes data to many endpoints.

```
                    ┌─→ Salesforce
Vi Operate → Databricks ─→ Veeva
                    └─→ PV System
```

This is our architecture. Vi Operate writes to Databricks once. Ambit (Praxis's consulting partner) routes data from Databricks to whatever downstream systems Praxis uses. If Praxis swaps Veeva for something else, our code doesn't change.

**Point-to-point:**

Direct API calls between systems. Simple for 2 systems, unmanageable at scale.

```
Vi Operate → Salesforce
Vi Operate → Veeva
Vi Operate → PV System
```

Three integrations to build and maintain. Each has different auth, different object models, different error handling. We use this selectively — direct writes to Salesforce for real-time CRM updates where latency matters.

**Event bus:**

Decouple producers from consumers. Vi Operate publishes "call completed" events to a bus. Any system that cares subscribes. Vi Operate doesn't know or care who's listening.

Salesforce Platform Events and Veeva Spark Messaging are both event bus patterns, scoped to their respective platforms.

**API gateway:**

A single entry point that handles auth, rate limiting, routing, and logging for all API traffic. In our case, we don't have a standalone gateway — each integration has its own client. If integration count grows beyond 3-4 systems, consider adding one.

**Abstraction layers — the key architectural decision:**

We build adapter interfaces so we can swap vendors. The Salesforce adapter implements the same `CrmClient` interface as the Veeva adapter. Application code calls `crmClient.createActivity(data)` and doesn't know which CRM it's talking to. When Praxis migrates from Veeva CRM (Salesforce-based) to Vault CRM, we swap the adapter, not the application logic.

This is critical given the Veeva platform migration happening through 2030.

---

## PART 2: The Pharma CRM/CM Vendor Landscape

---

### 2.1 Salesforce Health Cloud / Life Sciences Cloud

**What it is:** Salesforce + pharma-specific data model. Person Accounts (patients), CarePlan, CareTeamMember, HealthcareProvider, Medication, Clinical Encounter objects are native. Life Sciences Cloud (GA Oct 2025) adds medical inquiry routing, adverse event triage, MedWatch draft automation.

**Why pharma uses it:** 70+ life sciences companies deployed (Pfizer, Takeda, Novartis, AstraZeneca). HIPAA compliant. FDA 21 CFR Part 11 support for e-signatures and audit trails. Agentforce AI agents for life sciences.

**Why Praxis is going here:** Patient services and case management for DEE. This is the strategic direction. Allison is leading the launch integration across the company.

**Key objects for Vi Operate:**

| Object | Purpose |
|--------|---------|
| Case | Patient inquiry, complaint, AE report — primary record for a call outcome |
| Task | Next action items from a call (follow-up, referral) |
| Activity | Logged interaction record (call happened, what was discussed) |
| CarePlan | Patient's care pathway — context for the agent before a call |
| ContentDocument | File attachment (transcript, call recording reference) |
| Platform Event | Custom event to trigger outbound calls |

**API surface:**

| API | Use |
|-----|-----|
| REST API | CRUD on all objects. `/services/data/v62.0/sobjects/{Object}/{Id}` |
| SOQL | Query language. `SELECT Name, Phone FROM Contact WHERE Id = '003...'` |
| Composite API | Multi-object operations in a single call. Counts as 1 API call. Atomic (all-or-nothing). |
| Bulk API 2.0 | High-volume data operations. Up to 15,000 batches/24hr. For nightly syncs, not real-time. |
| Pub/Sub API | gRPC subscription to Platform Events and CDC. For receiving triggers. |

**Auth:** OAuth 2.0 JWT Bearer (server-to-server, no user interaction). Token lifetime 1-2 hours. Pre-emptive refresh.

**Strengths:**
- Best API documentation in enterprise SaaS. Period.
- Pharma data model is native, not bolted on
- JSforce v3 Node.js library covers the full API surface with TypeScript types
- Composite API for atomic multi-object writes (create Case + Task + attach transcript in one call)
- Agentforce AI ecosystem aligns with Vi Operate positioning

**Weaknesses:**
- Expensive. Enterprise Edition is $325/user/month. Unlimited is $500/user/month.
- Licensing complexity: Health Cloud, Life Sciences Cloud, and MuleSoft are separate SKUs
- Daily API limit can be hit with high-volume integrations (100K+ calls/day scales with licenses)

**Feasibility score: 9/10**

**What to look up first:**
- JSforce v3 npm package and its TypeScript types
- Composite API docs (for atomic multi-object writes)
- Platform Events developer guide (for triggering outbound calls)
- Health Cloud Object Reference (for the pharma data model)

---

### 2.2 Veeva Vault CRM

**What it is:** The dominant HCP CRM in pharma. 90%+ market share in large pharma for field force CRM (rep visit tracking, medical inquiries, sample management).

**The migration — this is the critical context:**

Veeva CRM was built on Salesforce. The Veeva-Salesforce partnership ended September 2025. Veeva is migrating all customers to a proprietary "Vault CRM" platform. 125+ customers live on Vault CRM as of Q1 2026. Bulk migration period: 2026-2029. End of support for legacy CRM: December 31, 2029.

**Why the migration matters to us:**
- Legacy Veeva CRM = Salesforce APIs (SOQL, Apex, REST). If Praxis is still on this, we inherit Salesforce integration patterns.
- Vault CRM = Veeva's own REST API, VQL (not SOQL), Java SDK (not Apex). Completely different integration.
- Veeva explicitly states: third-party integrations are NOT migrated automatically. We must rebuild.
- Major companies already on Vault CRM: Novo Nordisk, Roche, GSK.

**Key objects:**

| Object | Vault CRM Name | Purpose |
|--------|---------------|---------|
| Call Report | `call2__v` | Record of an HCP interaction (our primary write target) |
| Medical Inquiry | Standard Vault object | Medical info request from HCP |
| Activity | Standard Vault object | General interaction record |
| Custom objects | `{name}__c` | Anything Praxis has added |

**Vault Safety (pharmacovigilance) — separate module:**

For adverse event reporting. Uses E2B XML format (the international standard for individual case safety reports). Intake path: submit E2B file via Intake Inbox Item API → Veeva processes, creates case, routes for review.

This is how Vi Operate's AE flags get into the safety system. The agent detects a potential adverse event during a call → we generate an E2B XML file → POST to Vault Safety Intake Inbox Item API.

**Veeva Network (HCP/HCO master data) — separate service:**

Separate API, separate auth, separate URL. This is where canonical HCP and HCO data lives (NPI, specialty, address, affiliations). We read from Network for pre-call enrichment ("who is this doctor").

Auth: POST credentials to `/api/{version}/auth`, get `sessionId` (valid 20 min inactivity timeout). Different from Vault CRM auth.

**VQL — Veeva's query language:**

```sql
SELECT id, name__v, call_date__v FROM call2__v WHERE account__v = 'V0C000000001001'
```

Similar to SOQL but not identical. Different operators, different join syntax, different function library.

**Auth:** Session tokens. POST username + password to `/api/{version}/auth`. Get `sessionId` valid up to 48 hours max (30 min inactivity timeout). Client ID registration required — Vault rejects requests from unregistered client IDs. OAuth 2.0/OIDC is supported but less common.

**Strengths:**
- Pharma-native. Call reports, medical inquiries, sample management, Vault Safety PV module are purpose-built for life sciences.
- Veeva Network is the gold standard for HCP master data.
- 90%+ market share means Praxis likely already has deep Veeva expertise internally.

**Weaknesses:**
- Closed ecosystem. Validated partner programs control access. No public developer community.
- No Node.js SDK. VAPIL is Java only (Apache 2.0, open source). We build our own HTTP client.
- Migration uncertainty. Praxis could be on legacy or Vault CRM — different integration for each.
- Documentation is weaker than Salesforce. Rate limits are "burst protection" with undocumented specifics.
- Antitrust history. Veeva has had friction with IQVIA over data access. Contract terms may restrict third-party agent integrations.

**Feasibility score: 6/10**

**The contract risk:**

Veeva can technically block third-party agent integrations through contract terms. The Praxis-Veeva contract must explicitly allow: agent write access to CRM objects, email data export, and data portability. Megan is signing the contract in Ironclad — the team needs to get the required clauses reviewed before she signs.

**What to look up first:**
- Vault REST API v25.3 reference at developer.veevavault.com/api
- VQL syntax guide
- Vault Safety Intake Inbox Item API docs
- VAPIL Java library (github.com/veeva/vault-api-library) — read for API pattern reference even though we won't use Java
- Spark Messaging docs for async event patterns

---

### 2.3 Databricks

**What it is:** A data lakehouse platform. Combines data lake storage (cheap, scalable, any format) with data warehouse query capabilities (SQL, schema enforcement, ACID transactions). Not a CRM. Not a replacement for Salesforce or Veeva.

**Why we use it:** Ambit (Praxis's consulting partner) is building Praxis's data foundations on Databricks. This is where analytics, ML training data, compliance audit trails, and cross-system data exchange live.

**Our role:** Vi Operate writes call outcomes, transcripts, AE flags, and classification results to Delta Lake tables. Ambit routes that data to downstream systems (Salesforce, Veeva, PV system). We write once; they distribute.

**Key concepts:**

| Concept | What it is |
|---------|-----------|
| Delta Lake | Open-source storage layer adding ACID transactions to data lakes. Every table is a Delta table. |
| Unity Catalog | Centralized data governance. Controls who can access what tables, columns, and rows. |
| Delta Sharing | Cross-org data sharing protocol. Praxis analytics teams consume our data without ETL or data copying. |
| SQL Warehouse | Compute cluster that executes SQL queries. Must be running to accept queries. Auto-start available but has cold-start latency (seconds to minutes). |

**How we write data:**

SQL Statement Execution API. POST SQL to `/api/2.0/sql/statements`.

```sql
INSERT INTO vi_operate.call_outcomes (call_id, contact_id, outcome, ...)
VALUES (:call_id, :contact_id, :outcome, ...)
```

Supports parameterized queries (typed parameters for safe insertion). Synchronous and asynchronous execution. This is the primary mechanism for writing structured call outcomes to Delta Lake.

**How we receive triggers:**

Jobs API webhook notifications. Databricks Jobs can POST to a webhook URL on `on_start`, `on_success`, `on_failure`. Not designed for CRM-style record triggers — it's for job lifecycle events. For outbound call triggers, the better pattern is: CRM event → Platform Event/webhook → Vi Operate directly, bypassing Databricks.

**Auth:** OAuth 2.0 with service principals. Standard client credentials flow. Tokens valid 1 hour with auto-refresh. Service principals can hold up to 5 OAuth secrets, each valid up to 2 years.

**No Node.js REST SDK.** `@databricks/sql` exists for Thrift-based SQL connectivity (good for high-throughput queries). For the REST API surface (Jobs, Unity Catalog, Delta Sharing, SQL Statement Execution), build a custom TypeScript HTTP client.

**Strengths:**
- Open ecosystem. Delta Lake and Delta Sharing are open-source protocols.
- Excellent for analytics. All Vi Operate data in one place for reporting, ML, compliance.
- Avoids CRM lock-in. We write to a neutral layer; data flows to whatever systems Praxis uses.
- Schema design is fully under our control (no managed package restrictions like CRMs).

**Weaknesses:**
- Not a CRM. No Contact, Case, Task, CarePlan objects. All schema design is custom.
- SQL Warehouse cold start. If the warehouse is paused, first query takes seconds to minutes to spin up. For real-time pre-call enrichment, use an always-on warehouse or accept latency.
- Compute costs scale with usage. Every query burns compute. Monitor and set budgets.

**Feasibility score: 7/10** (as a data layer, not as a CRM replacement)

**What to look up first:**
- SQL Statement Execution API tutorial at docs.databricks.com/en/dev-tools/sql-execution-tutorial
- Unity Catalog setup guide
- Delta Sharing protocol docs
- `@databricks/sql` npm package for Thrift connectivity

---

### 2.4 IQVIA OCE (Context Only — We Recommend Skipping)

**What it was:** Veeva competitor for HCP CRM, built on Salesforce.

**What happened:** IQVIA licensed OCE CRM software to Salesforce in 2024. They are co-developing Salesforce Life Sciences Cloud together. OCE is supported through 2029 for ~400 existing customers but receives no new innovation. It is a sunset platform transitioning to Salesforce.

**If Praxis asks about OCE:** Go directly to Salesforce Life Sciences Cloud. Same pharma capabilities, better integration story, long-term viability. Do not invest in OCE-specific integration.

**Feasibility score: 4/10** — not recommended as a new integration target.

---

## PART 3: Our Current Stack

What Vi Operate already integrates with. These are the systems you'll encounter in the codebase.

---

### 3.1 Deepgram Voice Agent API

**What it does:** Real-time conversational AI over a single WebSocket connection. Speech-to-text (STT) + LLM reasoning + text-to-speech (TTS) in one pipe. This IS the voice agent.

**Protocol:** WebSocket to `wss://agent.deepgram.com/v1/agent/converse`

**Auth:** API key in Authorization header (`Token dg-xxxx` or `Bearer dg-xxxx`). Permanent key, no refresh.

**Connection lifecycle:**

1. Open WebSocket with auth header
2. Server sends `Welcome`
3. Client sends `Settings` message (MUST be first client message — configures everything)
4. Server sends `SettingsApplied`
5. Bidirectional audio streaming begins
6. JSON control messages flow alongside audio

**Settings config controls everything:** STT model, LLM provider/model, TTS voice, system prompt, function definitions, audio encoding. One JSON message sets the entire agent's behavior for the session.

**Function calling — how the agent takes action:**

We define functions in the Settings message (e.g., `scheduleCallback`, `escalateToNurse`, `flagAdverseEvent`). When the LLM decides to call one, Deepgram sends a `FunctionCallRequest`. Our server executes the function and responds with a `FunctionCallResponse`. The LLM incorporates the result into its next response.

**Key message types:**

| Message | Direction | Purpose |
|---------|-----------|---------|
| ConversationText | Server → Client | Real-time transcript of what user said and agent responded |
| FunctionCallRequest | Server → Client | LLM wants to execute a function |
| FunctionCallResponse | Client → Server | Our function result |
| UserStartedSpeaking | Server → Client | Barge-in detection |
| AgentAudioDone | Server → Client | Agent finished speaking |

**Models in use:**
- STT: Nova-3 (best accuracy). Nova-3 Medical available for clinical terminology.
- TTS: Aura-2 Thalia voice (warm professional female). 95+ voice options.
- LLM: OpenAI GPT-4o-mini, routed through Deepgram.

**What we're missing:**
- `keyterms` configuration: boost recognition accuracy for drug names (e.g., "Euloxacaltenamide", "ELEX"). Without this, STT may misrecognize novel drug names.
- `mip_opt_out`: opt out of Deepgram's Model Improvement Partnership. Required for pharma data compliance — we don't want patient call audio training Deepgram's models.

**What to look up:** Deepgram Agent API docs, Settings schema reference, keyterms configuration guide, KeepAlive protocol (send every 8 seconds during silence).

---

### 3.2 Twilio

**What it does:** Phone calls (voice) and SMS. The telephony layer between the PSTN (phone network) and our WebSocket-based voice agent.

**Three separate APIs we use:**

| API | Purpose | Protocol |
|-----|---------|----------|
| Voice REST API | Create outbound calls, control call flow | HTTPS REST |
| Media Streams | Bidirectional real-time audio | WebSocket |
| Messaging API | Post-call SMS follow-ups | HTTPS REST |

**Audio path:**

```
Caller ←→ PSTN ←→ Twilio ←→ WebSocket (Media Streams) ←→ Our Server ←→ WebSocket ←→ Deepgram Agent
```

All audio is mu-law 8000Hz mono, base64 encoded. This is the telephony standard. Deepgram is configured to match.

**Auth:** Account SID + Auth Token (basic auth over HTTPS). Permanent credentials. Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.

**TwiML — call flow control:**

XML-based language that tells Twilio what to do with a call. We return TwiML from our webhook endpoints.

Live call path:
```xml
<Response>
  <Connect>
    <Stream url="wss://our-server/twilio/media-stream">
      <Parameter name="contactId" value="..." />
    </Stream>
  </Connect>
</Response>
```

Voicemail path:
```xml
<Response>
  <Say>{message}</Say>
  <Hangup />
</Response>
```

**Media Streams protocol:**

Bidirectional WebSocket. Only 1 stream per call. Message types: `connected`, `start`, `media` (audio payload), `stop`, `mark`. We bridge this WebSocket to the Deepgram Agent WebSocket — audio from Twilio goes to Deepgram, audio from Deepgram goes back to Twilio.

**AMD (Answering Machine Detection):**

Determines if a human or voicemail answered. Currently disabled in our implementation — the agent handles detection itself. Available as `asyncAmd` mode if we want Twilio-level detection.

**Key compliance issue:**

A2P 10DLC registration is required for production SMS in the US. Without it, SMS messages will be blocked or heavily throttled by carriers. This is a registration process, not a code change.

**Rate limits:** 1 call/second per number (default). Calls exceeding CPS are queued, not rejected. For production volume, Business Profile approval needed.

**What to look up:** Twilio Media Streams bidirectional docs, AMD async mode, A2P 10DLC registration process, TwiML verb reference.

---

### 3.3 OpenAI Chat Completions

**What it does:** Post-call classification. Takes a transcript and outputs structured JSON: outcome category, sentiment score, AE flags, next actions, liaison summary, etc.

**Current implementation:**
- Model: `gpt-4o`
- Response format: JSON mode (`{ type: 'json_object' }`)
- Temperature: 0.1 (low, for deterministic classification)
- 20+ output fields including enums, arrays, nested objects, booleans

**The problem with JSON mode:**

JSON mode guarantees valid JSON but does NOT enforce schema. The model can omit keys, invent extra keys, or hallucinate invalid enum values. We manually validate every field with fallback defaults. This is fragile.

**Upgrade available — Structured Outputs:**

```typescript
response_format: {
  type: 'json_schema',
  json_schema: { name: 'classification', schema: {...}, strict: true }
}
```

With `strict: true`, OpenAI guarantees the response matches our schema. No manual validation needed. Invalid enum values are impossible. Missing fields are impossible. This eliminates an entire class of bugs.

**Cost optimization available:**

| Model | Cost per call (est.) | Quality for classification |
|-------|---------------------|---------------------------|
| gpt-4o (current) | ~$0.009 | Overkill |
| gpt-4.1-mini | ~$0.0014 | Strong — better instruction following than 4o |
| gpt-4.1-nano | ~$0.0004 | Purpose-built for high-volume structured tasks. 25x cheaper than gpt-4o. |

Recommendation: test `gpt-4.1-nano` first. If AE detection accuracy is insufficient on edge cases, step up to `gpt-4.1-mini`.

**What to look up:** Structured Outputs docs (platform.openai.com/docs/guides/structured-outputs), gpt-4.1 family model card, Batch API for bulk historical classification.

---

## PART 4: Architecture Decision Record

---

### Why Databricks as the integration bus

Praxis has 3+ downstream systems: Salesforce (patient services), Veeva (HCP CRM), PV system (pharmacovigilance). If Vi Operate writes directly to each one:

- We maintain 3+ integration adapters
- Each has different auth, schema, rate limits, error patterns
- If Praxis swaps or adds a system, we write new code

With Databricks in the middle:

- Vi Operate writes to Databricks once (SQL INSERT to Delta Lake tables)
- Ambit routes data from Databricks to whatever systems Praxis uses
- If Praxis swaps Veeva for something else, our code doesn't change
- Delta Sharing means Praxis analytics teams consume our data without building ETL pipelines
- Compliance audit trail lives in one place (Delta Lake time travel)

This is a hub-and-spoke pattern. Databricks is the hub.

**Caveat:** For real-time CRM updates where latency matters (e.g., creating a Case in Salesforce immediately post-call), we also write directly to the CRM. Databricks is the system of record for analytics; the CRM is the system of record for operations.

---

### Why Salesforce first, not Veeva

| Factor | Salesforce | Veeva |
|--------|-----------|-------|
| API feasibility | 9/10 | 6/10 |
| Node.js SDK | JSforce v3 (full coverage) | None (build custom client) |
| Auth | Standard OAuth JWT Bearer | Session tokens + Client ID registration |
| Pharma data model | Native (Health Cloud + Life Sciences Cloud) | Native (but HCP-only, not patient) |
| Migration risk | None | Active migration 2026-2030, must rebuild integrations |
| Praxis direction | Going here for patient services | Used for HCP CRM only |
| Documentation | Best in class | Adequate but closed ecosystem |

Salesforce is lower risk, lower effort, higher strategic alignment. Build it first.

Veeva covers HCPs but not patients. Salesforce covers both. For a patient services hub, Salesforce is the natural home.

---

### Why we say "interaction layer, not system of record"

Vi Operate produces data: call outcomes, transcripts, AI classifications, AE flags, next actions.

CRMs store the golden record: patient profile, HCP account, care plans, medication history.

We write TO CRMs. We don't replace them. We don't store the canonical patient record. We don't own the care plan.

This framing matters because:
- It prevents scope creep ("can Vi Operate also manage care plans?")
- It keeps us out of data governance politics (CRM team owns CRM data)
- It aligns with how pharma orgs think about system hierarchy
- It makes our value prop clear: we produce high-quality interaction data, you consume it however you want

---

### The Veeva contract risk

Veeva's contract terms can restrict third-party system access. Specifically:

1. **Agent write access** — can Vi Operate write call reports and activities to Vault CRM via API?
2. **Email data export** — can Praxis export HCP email engagement data for Vi Operate to use as context?
3. **Data portability** — can Praxis move their data out of Veeva if they switch platforms?

Megan is signing the Veeva contract in Ironclad. The team needs to review these clauses before signature. If the contract doesn't explicitly permit third-party agent integrations, Veeva could block us after we've built the integration.

This is not theoretical. Veeva has a history of restrictive data access policies and antitrust friction with IQVIA over data portability.

---

## PART 5: Technical Lookup Index

Quick reference tables. Print these or pin them.

---

### Authentication Flows

| System | Method | Token Lifetime | Refresh Pattern |
|--------|--------|---------------|-----------------|
| Deepgram | API key in header | Permanent | N/A — rotate manually |
| Twilio | Account SID + Auth Token (basic auth) | Permanent | N/A — rotate manually |
| OpenAI | API key in header | Permanent | N/A — rotate manually |
| Salesforce | OAuth 2.0 JWT Bearer | 1-2 hours | Re-sign JWT, re-exchange. Pre-emptive refresh 5 min before expiry. Don't refresh more than every 20 min. |
| Veeva Vault CRM | Session token (POST /auth) | 48 hours max, 30 min inactivity | Re-authenticate on 401. Keep-alive endpoint available. |
| Veeva Network | Session token (POST /auth) | 20 min inactivity timeout | Re-authenticate on expiry. |
| Databricks | OAuth 2.0 client credentials | 1 hour | Re-request with same client_id/secret. |

---

### Rate Limits

| System | Limit | What Happens When Exceeded |
|--------|-------|---------------------------|
| Salesforce | 100K+ calls/day (Enterprise), scales with licenses | HTTP 429 with Retry-After header |
| Veeva Vault | Undocumented burst protection | HTTP 429 |
| Databricks | 20-100 req/sec (endpoint-dependent) | HTTP 429 |
| OpenAI | Tier-dependent TPM/RPM | HTTP 429 with Retry-After header |
| Twilio Voice | 1 call/sec per number (default) | Calls queued, not rejected |
| Twilio SMS | 200 msg/sec (short code), lower for long codes | Queue delay |
| Deepgram | 45-100 concurrent WebSocket connections (plan-dependent) | Connection refused |

---

### Node.js Libraries

| System | Library | npm Package | Notes |
|--------|---------|-------------|-------|
| Salesforce | JSforce v3 | `jsforce` | Full API coverage. TypeScript types. Covers REST, SOQL, Bulk, Streaming, Composite. |
| Veeva | None | Build custom REST client | VAPIL is Java only. Read it for API pattern reference. |
| Databricks | SQL connector | `@databricks/sql` | Thrift-based, good for queries. REST API surface needs custom client. |
| OpenAI | Official SDK | `openai` | Excellent. Includes Structured Outputs helpers, Zod integration. |
| Twilio | Official SDK | `twilio` | Mature. v5.x. Full Voice, Messaging, Media Streams coverage. |
| Deepgram | Raw WebSocket | `ws` | No official Agent API SDK yet. We use the standard WebSocket library. |

---

### Key Docs to Bookmark

**Salesforce:**
- REST API Reference: developer.salesforce.com/docs/atlas.en-us.api_rest.meta
- Health Cloud Object Reference: developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta
- Composite API: developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_composite_sobject_tree_flat.htm
- Platform Events: developer.salesforce.com/docs/atlas.en-us.platform_events.meta

**Veeva:**
- Vault REST API: developer.veevavault.com/api
- Veeva Network API: developer.veevanetwork.com
- Vault Safety Intake: safety.veevavault.help/en/gr/01207

**Databricks:**
- SQL Statement Execution Tutorial: docs.databricks.com/en/dev-tools/sql-execution-tutorial
- Unity Catalog: docs.databricks.com/en/data-governance/unity-catalog
- Delta Sharing: docs.databricks.com/en/delta-sharing
- OAuth M2M Auth: docs.databricks.com/en/dev-tools/auth/oauth-m2m

**Current Stack:**
- Deepgram Agent API: developers.deepgram.com/docs/voice-agent
- Twilio Media Streams: twilio.com/docs/voice/media-streams
- OpenAI Structured Outputs: platform.openai.com/docs/guides/structured-outputs

---

### Integration Priority Order

| Priority | System | Score | Effort | Status |
|----------|--------|-------|--------|--------|
| 1 | Salesforce Health Cloud | 9/10 | 4-6 weeks | Strategic direction for patient services |
| 2 | Databricks | 7/10 | 2-3 weeks | Data backbone, Ambit routing hub |
| 3 | Veeva Vault CRM | 6/10 | 6-10 weeks | HCP CRM, higher risk due to migration |
| Skip | IQVIA OCE | 4/10 | — | Sunset platform, go to Salesforce directly |
| Skip | Axtria | 2/10 | — | Not a CRM, no public APIs |

---

### Glossary

| Term | Definition |
|------|-----------|
| AE | Adverse Event — an undesirable medical occurrence in a patient. Must be reported to regulators. |
| CDC | Change Data Capture — Salesforce feature that publishes events on record changes. |
| CRM | Customer Relationship Management — system of record for contacts and interactions. |
| CM | Case Management — workflows for handling patient/HCP inquiries. |
| Delta Lake | Open-source ACID transaction layer on top of data lake storage. |
| E2B | Electronic submission format for individual case safety reports (ICH standard). |
| HCP | Healthcare Professional — doctors, nurses, pharmacists. |
| HCO | Healthcare Organization — hospitals, clinics, practices. |
| ICSR | Individual Case Safety Report — the formal AE report. |
| JWT | JSON Web Token — a signed token used for authentication. |
| MDM | Master Data Management — single source of truth for entity data (e.g., HCP profiles). |
| NPI | National Provider Identifier — unique 10-digit ID for US healthcare providers. |
| PV | Pharmacovigilance — the science of monitoring drug safety. |
| SOQL | Salesforce Object Query Language. |
| STT | Speech-to-Text — converting audio to text (transcription). |
| TTS | Text-to-Speech — converting text to audio (voice synthesis). |
| TwiML | Twilio Markup Language — XML for controlling call flow. |
| VQL | Vault Query Language — Veeva's query language for Vault CRM objects. |
