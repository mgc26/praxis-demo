# CRM/CM Integration Feasibility Report for Vi Operate

**Date:** March 18, 2026
**Purpose:** Assess feasibility of integrating Vi Operate (pharma voice agent platform) with Praxis's target CRM/CM systems
**Integration Requirements:**
1. **WRITE** call outcomes, transcripts, liaison summaries, AE flags, and next actions back as Activities/Cases
2. **READ** contact/account data before calls for agent context enrichment
3. **RECEIVE** webhook triggers to initiate outbound agent calls

---

## 1. Salesforce Health Cloud / Life Sciences Cloud

### Overview

Salesforce Health Cloud is Praxis's direction for DEE patient services and case management. As of late 2025, Salesforce rebranded and expanded this into **Life Sciences Cloud** (also marketed as "Agentforce Life Sciences"), now GA for Customer Engagement. Over 70 life sciences companies have deployed it, including Pfizer, Takeda, Novartis, and AstraZeneca. This is the most strategically aligned system for Vi Operate integration.

### API Capabilities

**REST API (Standard Salesforce)**
- Full CRUD on all standard and custom objects via `/services/data/vXX.0/sobjects/{ObjectName}`
- Case, Task, Activity, Event objects are fully accessible
- Health Cloud-specific objects: CarePlan, CareTeamMember, Patient (Person Account or custom), Clinical Encounter (EhrEncounter), HealthcareProvider, Medication
- Life Sciences Cloud adds: Participant Recruitment, E-consent, Pharmacy Benefits Verification, Medical Inquiry routing, Adverse Event reporting workflows
- **Composite API** for multi-object operations in a single call
- **Bulk API 2.0** for high-volume data operations (up to 15,000 batches/24hr)

**Health Cloud Business APIs**
- Purpose-built REST APIs wrapping complex multi-step Health Cloud operations into single calls
- Designed for building integrations and custom UI components

**FHIR APIs**
- Inbound FHIR R4 API library for reading/writing data using open healthcare standards
- MuleSoft Direct for Health Cloud provides pre-built EHR/payer integrations

**Platform Events / Change Data Capture / Outbound Triggers**
- **Platform Events**: Custom pub/sub events; external systems can publish via REST API or Pub/Sub API; Flows can subscribe and trigger actions
- **Change Data Capture (CDC)**: Publishes events on record create/update/delete/undelete for any object; ideal for one-way outbound broadcast to external systems
- **Outbound Messages**: SOAP-based record-change notifications
- **Flow HTTP Callout Actions**: Push REST/JSON webhooks to external endpoints on any trigger
- **Apex Callouts**: Custom HTTP callouts to any external webhook URL
- Multiple patterns available for triggering Vi Operate outbound calls from Salesforce events

**Authentication**
- Standard OAuth 2.0 (Authorization Code, Client Credentials, JWT Bearer flows)
- Well-documented, industry-standard
- Token refresh recommended no more than every 20 minutes
- Service Principal patterns well-supported

**Rate Limits**
- Enterprise Edition: 100,000+ API calls per rolling 24-hour period (scales with licenses)
- Concurrent long-running requests: 25 (5 for developer orgs)
- Per-call timeout: 10 minutes
- Bulk API: 15,000 batches per 24-hour period

**Pharma-Specific Capabilities**
- Life Sciences Cloud (GA Oct 2025): Medical inquiry routing, adverse event triage, MedWatch draft automation
- ComplianceQuest integration (Feb 2025): Automated AE triage, compliance workflows
- Agentforce AI agents: Pre-built agent templates for life sciences
- AppExchange: Vodori (MLR content review), Definitive, H1, Viz.ai, athenahealth integrations
- HIPAA compliant, FDA 21 CFR Part 11 support with e-signatures and audit trails

### Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **API Maturity** | 5/5 | Best-documented API in enterprise SaaS. REST, SOAP, Bulk, Streaming, Composite APIs all mature. |
| **Write-back Feasibility** | **Easy** | Full CRUD on Case, Task, Activity, custom objects. Can write transcripts as ContentDocument attachments, AE flags as Case fields, next actions as Tasks. |
| **Read Feasibility** | **Easy** | SOQL queries via REST for Contact, Account, CarePlan, Medication, prior Activities. Real-time pre-call enrichment straightforward. |
| **Trigger Feasibility** | **Easy** | Platform Events, CDC, Flow HTTP Callouts, Apex Callouts all support pushing events to Vi Operate to trigger outbound calls. |
| **Auth Complexity** | Standard OAuth | OAuth 2.0 with multiple flow options. JWT Bearer ideal for server-to-server. |
| **Pharma-Specific Fit** | **Strong** | Purpose-built Health Cloud + Life Sciences Cloud data model. AE reporting, medical inquiries, patient services workflows native. |
| **Known Gotchas** | Rate limits scale with license tier; daily API limit can be hit with high-volume integrations; need Enterprise Edition or higher; MuleSoft adds cost for advanced integrations; Life Sciences Cloud licensing is separate from base Health Cloud. |
| **Overall Feasibility Score** | **9/10** | Best-in-class for our use case. Mature APIs, pharma-native data model, excellent trigger mechanisms, strong AI/agent ecosystem (Agentforce). Only deduction: licensing cost and potential complexity layering Health Cloud + Life Sciences Cloud + MuleSoft. |

### Recommended Integration Architecture
```
Vi Operate --> Salesforce REST API --> Create/Update Case, Task, Activity
                                  --> Attach transcript as ContentDocument
                                  --> Flag AE via Case field update
Salesforce --> Platform Event / CDC --> Vi Operate webhook --> Trigger outbound call
Salesforce <-- REST API (SOQL) <-- Vi Operate (pre-call read of Contact, CarePlan, Medication)
```

---

## 2. Veeva CRM / Vault CRM

### Overview

Praxis is activating Veeva for HCP CRM. Critical context: **Veeva is in the middle of a major platform migration**. The Salesforce-based "Veeva CRM" is being replaced by the proprietary "Vault CRM" built on Veeva's own Vault platform. The Veeva-Salesforce partnership expired September 2025. Migration timeline: most customers migrate between 2026-2029, complete by September 2030. Over 80 Vault CRM deployments are live as of early 2026.

**This migration fundamentally changes the integration story.** If Praxis is on legacy Veeva CRM (Salesforce-based), they inherit Salesforce APIs. If/when they migrate to Vault CRM, all integrations must be rebuilt on Vault's REST API.

### API Capabilities

**Vault REST API (Vault CRM / New Platform)**
- REST API: CRUD on documents and object records via HTTPS
- Endpoint pattern: `https://{vault}.veevavault.com/api/v25.3/objects/{object_type}/{id}`
- Current GA: v25.3; Beta: v26.1 (as of Jan 2026)
- Bulk operations: up to 500 records per request
- **Vault Query Language (VQL)**: SQL-like querying via `/query` endpoint with filtering, projections, joins
- **Direct Data API**: Up to 100x faster than traditional APIs for bulk extraction (GA, included at no additional cost since Feb 2025)
- **VAPIL (Vault API Library)**: Open-source Java library (Apache 2.0) with full endpoint coverage

**Veeva CRM API (Legacy Salesforce-Based)**
- Native Salesforce REST, SOAP, Bulk APIs
- Veeva-specific REST endpoints for Order Management, CLM content, MyInsights
- **MyInsights JavaScript SDK**: queryRecord, updateRecord, createRecord methods
- Authentication via Salesforce session tokens (`sfSession` + `sfEndpoint` headers)

**Call Report / Activity Objects**
- Call Report object (`call2__v` in Vault CRM) supports custom fields
- Medical Inquiry objects can be launched from Call Reports
- Custom fields can be added but not all field types supported on call report
- **Key limitation**: Veeva handles standard data migration but custom code, custom objects, and third-party integrations must be re-implemented by the customer on Vault CRM

**Veeva Network API (HCP/HCO Master Data)**
- REST API returning JSON for HCP/HCO record retrieval
- Match incoming records against master database
- Submit Data Change Requests (DCRs) for additions/updates
- Authentication: POST credentials to `/api/{version}/auth`, returns `sessionId` (valid 20 min inactivity)
- Bulk operations via file-based subscriptions (FTP or API retrieval)

**Veeva OpenData API (Global Reference Data)**
- REST API for retrieving HCP/HCO entities from global reference database
- Batch operations: max 500 records per call
- Location-based search, geographic sorting
- Change request submission for corrections
- Follows Common Data Architecture (CDA) for life sciences

**Veeva Vault Safety (Pharmacovigilance)**
- REST endpoint: Intake Inbox Item API for submitting E2B files
- Required objects: Transmission Profile, Transmission (`transmission__v`), Inbox Item (`inbox_item__v`)
- Case document: `case__v > source__v > adverse_event_report__v`
- Supports HL7 FHIR and E2B standards
- API user needs specific permissions for transmission and case document creation
- Automated case intake, triaging, processing, and submission

**Outbound Triggers / Webhooks**
- **Spark Messaging**: Asynchronous, near real-time messaging between Vaults or external applications via outbound queue
- **Vault Java SDK**: Custom code entry points for HTTP callouts to external webhooks on record triggers
- **Action Triggers** (25R1+): No-code IF-THEN-ELSE automation on record create/update/delete; can trigger notifications
- No native "webhook" concept equivalent to Salesforce Platform Events; requires more configuration

**Authentication (Vault)**
- Session token via POST to `/api/{version}/auth`
- OAuth 2.0/OIDC and SAML SSO supported
- Sessions valid up to 48 hours maximum
- Client ID filtering: Vault rejects requests from unregistered client IDs
- All API actions execute with authenticated user's permission level

**Rate Limits**
- Burst protection implemented (specific numbers not publicly documented)
- Three releases yearly; backward compatibility maintained across versions

### Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **API Maturity** | 3.5/5 | Vault API is functional and well-versioned, but significantly less documented and less ecosystem-supported than Salesforce. VQL is capable. Migration from SFDC to Vault CRM creates uncertainty. |
| **Write-back Feasibility** | **Medium** | Can write Call Reports, Medical Inquiries, Activities via Vault REST API. Custom fields supported but with type restrictions. Transcript storage possible as document attachments. AE flags require Vault Safety integration (E2B format). Third-party integrations are NOT migrated by Veeva during Vault CRM transition -- must be rebuilt. |
| **Read Feasibility** | **Easy-Medium** | Veeva Network API provides excellent HCP/HCO master data access. VQL queries for CRM data. OpenData API for reference data. However, data access is permission-gated and Client ID filtering adds friction. |
| **Trigger Feasibility** | **Medium-Hard** | Spark Messaging provides async pub/sub but is not a simple webhook. Action Triggers (25R1) add no-code automation but outbound HTTP callouts still require Java SDK custom code or workarounds. No equivalent to Salesforce Platform Events for easy external triggers. |
| **Auth Complexity** | Custom | Session-based auth with Client ID filtering. OAuth 2.0 supported but less standardized than Salesforce. Client ID registration adds administrative overhead. |
| **Pharma-Specific Fit** | **Strong** | Purpose-built for life sciences. Call Reports, Medical Inquiries, Vault Safety (AE/ICSR management), Network (HCP MDM), OpenData (reference data) are all pharma-native. |
| **Known Gotchas** | **Platform migration is the biggest risk.** Veeva will NOT handle third-party integration migration. No Apex in Vault CRM (must use Java SDK or declarative tools). Client ID filtering can block unregistered integrations. Veeva ecosystem is relatively closed -- validated partner programs control access. Historical antitrust friction with IQVIA over data access. Vault Safety API requires E2B format for AE intake. Specific rate limit numbers not publicly documented. |
| **Overall Feasibility Score** | **6/10** | The APIs exist and are capable, but the platform migration creates significant integration risk and rework. The closed ecosystem mentality, lack of native webhook support, and requirement to rebuild integrations on Vault CRM reduce the score. If Praxis is still on legacy (SFDC-based) Veeva CRM, feasibility is higher (7/10) since Salesforce APIs apply. |

### Recommended Integration Architecture
```
[Legacy SFDC-based Veeva CRM]
Vi Operate --> Salesforce REST API --> Create/Update Call Report, Activity
Vi Operate <-- Salesforce SOQL   <-- Read HCP profile, call history
Vi Operate <-- Veeva Network API <-- HCP/HCO master data enrichment

[Vault CRM - post-migration]
Vi Operate --> Vault REST API   --> Create/Update call2__v, medical_inquiry objects
Vi Operate --> Vault Safety API --> Submit AE via Intake Inbox Item (E2B)
Vi Operate <-- VQL queries      <-- Read HCP data from Vault CRM
Vi Operate <-- Veeva Network API <-- HCP/HCO master data
Vault CRM  --> Spark Messaging / Java SDK callout --> Vi Operate webhook
```

---

## 3. Databricks

### Overview

Ambit (Praxis's consulting partner) is building data foundations on Databricks. Databricks serves as the data lakehouse layer rather than a CRM, making it a complementary integration target for analytics, data persistence, and cross-system data exchange rather than a primary operational CRM.

### API Capabilities

**SQL Statement Execution API**
- POST to `/api/2.0/sql/statements` to execute any SQL (including INSERT, UPDATE, MERGE) against Delta Lake tables via SQL Warehouses
- Parameterized SQL statements with typed parameters for safe data insertion
- Supports synchronous and asynchronous execution
- Results retrieval via GET on `/sql/statements/{statement_id}`
- **This is the primary mechanism for writing structured call outcomes, transcripts, and AE flags to Delta Lake tables**

**Unity Catalog**
- Centralized governance for tables, views, models, and data shares
- Fine-grained access control (row/column-level security)
- External tables: create, read, and write from external Delta Lake clients (Public Preview)
- Unity REST API provides external read access to tables; some clients support write
- Supports both Delta Lake and Iceberg table formats

**Jobs API (Lakeflow Jobs)**
- REST API to create, trigger, and monitor automated workflows
- Webhook notifications: configurable for `on_start`, `on_success`, `on_failure` events
- Webhook destinations: Slack, PagerDuty, MS Teams, custom HTTP webhooks
- Can be triggered externally via POST to `/api/2.0/jobs/run-now`
- Rate limit: 30 requests/second on `/jobs/runs/list`; up to 2,000 concurrent task executions

**Delta Sharing**
- Open protocol for cross-organization data sharing regardless of compute platform
- Databricks-to-Databricks sharing via Unity Catalog
- Open sharing with token-based authentication for non-Databricks recipients
- SQL management: `CREATE SHARE`, `GRANT` access, audit centrally
- Foundation for Databricks Marketplace and Clean Rooms
- Real-time sharing (no data copying required)

**Direct Data Connectors**
- Native integrations with Redshift, Snowflake, Azure SQL, Fabric Warehouse
- Partner Connect for ecosystem tool integrations

**Authentication**
- **OAuth 2.0** (strongly recommended): Service principal secrets, tokens valid 1 hour with auto-refresh
- OAuth token federation: Use existing IdP tokens (no Databricks secrets needed)
- Personal Access Tokens (PATs): Legacy method, still supported but deprecated path
  - PATs inactive for 90 days are auto-revoked
  - Max lifetime: 2 years for new PATs
- Service principals can have up to 5 OAuth secrets, each valid up to 2 years

**Rate Limits**
- API-specific rate limits (e.g., `/jobs/runs/list` at 30 req/sec)
- 429 responses returned when exceeded
- Limit increases available through account team
- SQL Warehouse compute scales independently based on cluster configuration

### Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **API Maturity** | 4.5/5 | Excellent documentation, modern REST APIs, SQL Statement Execution API is GA and well-documented. Unity Catalog and Delta Sharing are mature. |
| **Write-back Feasibility** | **Easy** | SQL Statement Execution API allows direct INSERT/MERGE into Delta Lake tables. Can write call outcomes, transcripts (as structured records or references to blob storage), AE flags, liaison summaries. Schema design is fully under our control. |
| **Read Feasibility** | **Easy** | SQL queries via Statement Execution API or direct JDBC/ODBC. Unity Catalog provides governed access to all tables. Can query any enrichment data Ambit has staged. |
| **Trigger Feasibility** | **Medium** | Databricks Jobs can send webhook notifications on events, but this is designed for job lifecycle events, not CRM-style record triggers. For outbound call triggers, would need a pattern: CRM event --> Databricks job --> webhook to Vi Operate, or bypass Databricks for triggers entirely. Can also trigger Databricks jobs via REST API from external events. |
| **Auth Complexity** | Standard OAuth | OAuth 2.0 with service principals. Well-documented and standard. Token federation available for advanced setups. |
| **Pharma-Specific Fit** | **Weak** | No pharma-specific data model -- it is a general-purpose data platform. However, the flexibility means Ambit can design pharma-specific schemas. Value is as a data backbone, not an operational CRM. |
| **Known Gotchas** | SQL Warehouse must be running to accept queries (auto-start adds latency on cold start). Compute costs scale with usage. Not designed for real-time transactional CRM operations. Delta Sharing requires setup for cross-org data exchange. No built-in concept of "Contact" or "Case" -- all schema design is custom. |
| **Overall Feasibility Score** | **7/10** | Excellent as a **data persistence and analytics layer** alongside the primary CRM. Not a CRM replacement. Best used for: archiving all call data, cross-system analytics, training data for AI models, compliance audit trail, Delta Sharing with Praxis data teams. |

### Recommended Integration Architecture
```
Vi Operate --> SQL Statement Execution API --> INSERT call outcomes, transcripts, AE flags into Delta Lake
Vi Operate <-- SQL Statement Execution API <-- SELECT enrichment data (HCP profiles, prior interactions, etc.)
Salesforce/Veeva --> Databricks (ETL/sync) --> Unified analytics tables
Databricks --> Delta Sharing --> Praxis / Ambit data consumers
Databricks Jobs --> Webhook notification --> Vi Operate (for batch/scheduled trigger patterns)
```

---

## 4. IQVIA OCE (Orchestrated Customer Engagement)

### Overview

IQVIA OCE is a potential Veeva alternative for HCP CRM. **Critical strategic context**: IQVIA licensed OCE CRM software to Salesforce in 2024 and the two companies are co-developing Salesforce Life Sciences Cloud. IQVIA continues to support ~400 global OCE customers through 2029, but new innovation is being directed into Salesforce LS Cloud. OCE is effectively a **sunset platform transitioning to Salesforce**.

### API Capabilities

**Current OCE (Salesforce-Based)**
- Built on Salesforce Sales Cloud, inheriting all Salesforce REST, SOAP, Bulk APIs
- IQVIA-specific API layer called "Lexi" connecting applications and data
- OCE Apps: Developer framework for custom applications and extensions on the platform
- Standard Salesforce object model with IQVIA-specific extensions for pharma
- Integration with OneKey (IQVIA's HCP/HCO master data, equivalent to Veeva Network)
- IQVIA Developer Hub at developer.iqvia.com for API documentation

**Integration Methods**
- Salesforce REST APIs for CRUD operations
- SFTP-based data loads for bulk operations
- MuleSoft-compatible (via Salesforce ecosystem)
- Pre-built connectors: SAP Concur, Org Manager tools, MDM/OneKey
- OCE Data Load API for bulk data ingestion

**Authentication**
- Salesforce OAuth 2.0 (inherited from SFDC platform)
- Managed package approach may restrict certain API operations

**Known Limitations**
- Specific API documentation is behind IQVIA support portal (not publicly accessible)
- Dual governance layers: IQVIA compliance + Salesforce compliance
- OCE-specific managed package restrictions on which objects/fields can be modified
- Developer documentation (e.g., "OCE Personal Development Operations Technical Guide") focuses on Salesforce deployment tools

**Future State (Salesforce Life Sciences Cloud)**
- All OCE innovations folding into Salesforce LS Cloud
- Sales automation functions available for sale after September 2025
- Full Salesforce API ecosystem (same as Section 1 above)
- IQVIA data and analytics available as integrations within LS Cloud

### Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **API Maturity** | 3/5 | Inherits Salesforce API maturity but OCE-specific documentation is gated behind support portal. Lexi API connector not publicly documented. Developer Hub exists but limited public content. |
| **Write-back Feasibility** | **Medium** | Can write via Salesforce REST APIs since OCE runs on SFDC. However, OCE managed package may restrict direct writes to certain pharma-specific objects. Need to validate which objects are accessible via API vs. locked by managed package. |
| **Read Feasibility** | **Easy-Medium** | Salesforce SOQL works for reading. OneKey integration provides HCP data but may require separate IQVIA data licensing agreement. |
| **Trigger Feasibility** | **Medium** | Salesforce Platform Events and CDC available since platform is SFDC-based. However, OCE-specific automation (Next Best Action engine) may not expose trigger hooks for external systems. |
| **Auth Complexity** | Standard OAuth | Salesforce OAuth 2.0 inherited. Straightforward. |
| **Pharma-Specific Fit** | **Strong** | Built for pharma HCP engagement. Call planning, sample management, medical inquiries, next-best-action AI native. OneKey HCP/HCO master data. |
| **Known Gotchas** | **Platform is sunsetting.** IQVIA supports through 2029, but new features go to Salesforce LS Cloud. Managed package restrictions on object access. OneKey data requires separate IQVIA licensing. API documentation not publicly accessible. Historical antitrust disputes with Veeva over data portability. If Praxis adopts OCE, they will eventually need to migrate to Salesforce LS Cloud anyway. |
| **Overall Feasibility Score** | **4/10** | **Not recommended as a new integration target.** The platform is transitioning to Salesforce LS Cloud. If Praxis already has OCE, integrate via standard Salesforce APIs with awareness that migration to LS Cloud is inevitable. If choosing a new platform, go directly to Salesforce Life Sciences Cloud (Section 1). |

### Strategic Recommendation

Do not invest in OCE-specific integration. If Praxis evaluates OCE, advise them that the strategic direction is Salesforce Life Sciences Cloud, which provides the same pharma capabilities with a much better integration story and long-term viability.

---

## 5. Axtria SalesIQ / DataMAx

### Overview

Axtria is a pharma commercial analytics company. SalesIQ handles sales planning and operations (territory alignment, incentive compensation, targeting/segmentation). DataMAx is an AI-powered data management platform for ingesting and curating pharma data. These are **not CRM systems** -- they are analytics and data management platforms that sit alongside CRMs.

### API Capabilities

**Axtria DataMAx**
- Integrates 20+ data sources via SFTP and APIs (Veeva CRM, Javelin, Marketo)
- "Enterprise-grade APIs" mentioned in marketing but no public developer documentation
- Built on AWS infrastructure
- Available on Azure Marketplace
- Spring 2025 release added GenAI-powered enhancements
- Pharma-specific data models and data quality frameworks pre-configured
- Business rules management system (BRMS) for data governance

**Axtria SalesIQ**
- Built on Force.com platform (Salesforce)
- Available on Salesforce AppExchange (Incentive Compensation, Segmentation & Targeting modules)
- Inherits Salesforce API ecosystem where deployed on SFDC
- Focuses on: territory alignment, call planning, incentive compensation, segmentation

**Integration Approach**
- Primarily a data consumer (ingests from CRMs, claims data, prescription data)
- SFTP-based bulk data exchange is primary integration pattern
- API specifications are not publicly documented
- Contact Axtria for integration partnerships

### Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **API Maturity** | 2/5 | No public API documentation. "Enterprise-grade APIs" claimed but not verifiable. SFTP is primary integration method. SalesIQ on Salesforce inherits SFDC APIs. |
| **Write-back Feasibility** | **Hard** | Not designed as a system of record for call outcomes. Could potentially write to DataMAx tables for analytics, but no documented API for this. Would need custom engagement with Axtria. |
| **Read Feasibility** | **Medium-Hard** | DataMAx may have useful enrichment data (segmentation, targeting scores) but no public API to read from. SalesIQ on Salesforce would be queryable via SOQL. |
| **Trigger Feasibility** | **Blocked** | No documented webhook or event trigger capabilities. Not designed to trigger external systems. |
| **Auth Complexity** | Unknown | No public documentation on authentication methods. SalesIQ on SFDC would use Salesforce OAuth. |
| **Pharma-Specific Fit** | **Moderate** | Strong pharma analytics data models but not an operational CRM. Useful for enrichment data (HCP segmentation, targeting lists) but not for recording call interactions. |
| **Known Gotchas** | No public developer documentation. Integration requires direct partnership with Axtria. SFTP-based integrations are batch, not real-time. Not a CRM -- cannot replace Salesforce or Veeva for operational workflows. Pricing/licensing terms opaque. |
| **Overall Feasibility Score** | **2/10** | **Not a viable primary integration target for Vi Operate.** Could be a useful data enrichment source (HCP segmentation, targeting lists) via batch SFTP if Praxis uses it, but not for real-time call outcome recording or trigger-based outbound calling. Would require custom Axtria partnership for API access. |

### Strategic Recommendation

Treat Axtria as a potential **data enrichment source** only, not as a CRM integration target. If Praxis uses Axtria for HCP segmentation/targeting, consider a batch file-based integration to pull targeting lists into Vi Operate's pre-call context. Do not attempt real-time API integration.

---

## Comparative Summary

| Dimension | Salesforce Health Cloud | Veeva CRM/Vault | Databricks | IQVIA OCE | Axtria |
|---|---|---|---|---|---|
| **API Maturity** | 5/5 | 3.5/5 | 4.5/5 | 3/5 | 2/5 |
| **Write-back** | Easy | Medium | Easy | Medium | Hard |
| **Read** | Easy | Easy-Medium | Easy | Easy-Medium | Medium-Hard |
| **Triggers** | Easy | Medium-Hard | Medium | Medium | Blocked |
| **Auth** | Standard OAuth | Custom | Standard OAuth | Standard OAuth | Unknown |
| **Pharma Fit** | Strong | Strong | Weak | Strong | Moderate |
| **Overall Score** | **9/10** | **6/10** | **7/10** | **4/10** | **2/10** |

---

## Strategic Recommendations for Vi Operate Integration Roadmap

### Priority 1: Salesforce Health Cloud / Life Sciences Cloud (Score: 9/10)

**Build first.** This is the highest-value, lowest-risk integration. Praxis is heading here for patient services. The API ecosystem is mature, well-documented, and purpose-built for pharma. The Agentforce/AI agent ecosystem aligns with Vi Operate's positioning.

**Integration scope:**
- Write: Case creation/update, Task/Activity logging, ContentDocument attachment (transcripts), AE flag fields
- Read: Contact/Account, CarePlan, Medication, prior Activities for pre-call enrichment
- Trigger: Platform Events or CDC to push events to Vi Operate for outbound call initiation

**Estimated effort:** 4-6 weeks for core integration (assuming standard Salesforce org)

### Priority 2: Databricks (Score: 7/10)

**Build second, as a data layer.** Not a CRM but the data backbone where Ambit is building Praxis's analytics foundation. Every call outcome, transcript, and AE flag should also land in Databricks for analytics, ML training, and compliance audit.

**Integration scope:**
- Write: All call data into Delta Lake tables (structured records + transcript references)
- Read: Enrichment data from Ambit-curated tables (HCP profiles, segmentation, prior engagement)
- Share: Delta Sharing for cross-org data access with Praxis analytics teams

**Estimated effort:** 2-3 weeks (simpler API, schema design is the main work)

### Priority 3: Veeva CRM/Vault (Score: 6/10)

**Build third, with caution.** Necessary for HCP CRM integration but complicated by the Vault CRM migration. Recommend building against the Salesforce-based Veeva CRM APIs first (if Praxis is still on legacy), with a planned rebuild for Vault CRM when they migrate.

**Integration scope:**
- Write: Call Reports, Medical Inquiries, Activities via Vault REST API (or SFDC API if legacy)
- Read: HCP profiles via Veeva Network API, CRM data via VQL
- AE: Vault Safety Intake Inbox Item API for adverse event case submission (E2B format)
- Trigger: Spark Messaging or Java SDK callouts for outbound triggers (requires Veeva admin involvement)

**Estimated effort:** 6-10 weeks (higher due to Veeva ecosystem complexity, Client ID registration, potential dual-build for legacy + Vault)

### Not Recommended: IQVIA OCE (Score: 4/10)

Do not build a dedicated OCE integration. If Praxis uses OCE, they are on Salesforce, so the Salesforce Health Cloud integration (Priority 1) covers the API layer. Advise Praxis that OCE is transitioning to Salesforce LS Cloud.

### Not Recommended: Axtria SalesIQ/DataMAx (Score: 2/10)

Not a CRM. No public APIs. If Praxis uses Axtria for HCP segmentation, consider a batch file (SFTP) integration for enrichment data only.

---

## Key Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Veeva Vault CRM migration timeline uncertainty | Integration rework | Build abstraction layer; design Veeva connector to be swappable between SFDC and Vault APIs |
| Salesforce API rate limits at high call volume | Throttling during peak periods | Use Bulk API 2.0 for batch operations; implement retry logic with exponential backoff; monitor usage via Salesforce API dashboard |
| Veeva Client ID registration blocking | Integration blocked until admin approval | Engage Praxis Veeva admin early; register Client IDs in sandbox before production |
| AE reporting compliance requirements | Regulatory exposure | Validate Vault Safety E2B format compliance; implement audit trails; ensure AE flags are immutable once written |
| IQVIA OCE sunset causing platform migration | Rework if Praxis is on OCE | Advise Praxis to adopt Salesforce LS Cloud directly; do not invest in OCE-specific integration |
| Databricks SQL Warehouse cold start latency | Delayed pre-call enrichment | Configure auto-start with appropriate warm-up or use always-on warehouse for real-time queries |

---

## Sources

### Salesforce Health Cloud / Life Sciences Cloud
- [REST Reference | Salesforce Health Cloud Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/hc_business_apis_rest_reference.htm)
- [Health Cloud Data Model](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/sforce_api_objects.htm)
- [Health Cloud Business APIs](https://developer.salesforce.com/docs/atlas.en-us.health_cloud_object_reference.meta/health_cloud_object_reference/hc_business_apis.htm)
- [Salesforce API Rate Limits](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_api.htm)
- [Bulk API 2.0 Limits](https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/bulk_common_limits.htm)
- [Salesforce Health Cloud for Biopharma Technical Guide](https://intuitionlabs.ai/articles/salesforce-health-cloud-biopharma)
- [Salesforce Life Sciences Cloud](https://www.salesforce.com/life-sciences/cloud/)
- [Platform Events and Change Data Capture](https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/platform_events_objects_change_data_capture.htm)
- [Salesforce Webhooks Guide](https://hookdeck.com/webhooks/platforms/guide-to-salesforce-webhooks-features-and-best-practices)
- [ComplianceQuest and Salesforce LifeQuest 360](https://www.compliancequest.com/press-release/compliancequest-and-salesforce-boost-life-sciences-cloud-platform/)

### Veeva CRM / Vault
- [Veeva Vault Developer Portal](https://developer.veevavault.com/)
- [Vault API Reference](https://developer.veevavault.com/api/)
- [Veeva CRM API Documentation](https://developer.veevacrm.com/)
- [Veeva Network API Reference](https://developer.veevanetwork.com/API_reference/API_reference.htm)
- [Veeva OpenData API](https://developer.veevaopendata.com/Content/API_reference/API_reference.htm)
- [Vault Safety Intake Inbox Item API](https://safety.veevavault.help/en/gr/01207/)
- [Veeva Ecosystem APIs Overview](https://intuitionlabs.ai/articles/veeva-ecosystem-apis-comprehensive-technical-overview)
- [Vault Integrations](https://developer.veevavault.com/integration/)
- [Vault CRM Migration Considerations](https://clarkstonconsulting.com/insights/veeva-vault-crm-migration/)
- [Veeva-Salesforce Split Impact](https://intuitionlabs.ai/articles/veeva-salesforce-split-integration-data-impact)
- [VAPIL (Vault API Library)](https://github.com/veeva/vault-api-library)

### Databricks
- [Statement Execution API Tutorial](https://docs.databricks.com/aws/en/dev-tools/sql-execution-tutorial)
- [Unity Catalog](https://docs.databricks.com/aws/en/data-governance/unity-catalog/)
- [Delta Sharing](https://docs.databricks.com/aws/en/delta-sharing/)
- [Jobs API Notifications](https://docs.databricks.com/aws/en/jobs/notifications)
- [Resource Limits](https://docs.databricks.com/aws/en/resources/limits)
- [OAuth M2M Authentication](https://docs.databricks.com/aws/en/dev-tools/auth/oauth-m2m)
- [Delta Lake External Tables](https://docs.databricks.com/aws/en/external-access/unity-rest)

### IQVIA OCE
- [IQVIA Developer Hub](https://developer.iqvia.com/)
- [OCE Integration FAQs](https://www.customerservice.iqvia.com/support/s/article/OCE-Sales-FAQs-Integration)
- [IQVIA-Salesforce Partnership Announcement](https://www.salesforce.com/news/press-releases/2024/04/08/iqvia-and-salesforce-expand-global-partnership-to-accelerate-the-development-of-life-sciences-cloud/)
- [IQVIA CRM vs Veeva CRM Comparison](https://intuitionlabs.ai/articles/iqvia-crm-vs-veeva-crm)
- [Veeva vs IQVIA vs Salesforce 2025 Guide](https://intuitionlabs.ai/articles/veeva-iqvia-salesforce-crm-comparison)

### Axtria
- [Axtria DataMAx](https://www.axtria.com/cloud-products/axtria-datamax-ai-driven-data-management/)
- [Axtria SalesIQ on AppExchange](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000FN7fMUAT)
- [Axtria Salesforce Partnership](https://www.axtria.com/about-us/partnerships-alliances/salesforce/)
