**To:** Spencer Honeyman, Noah Smith, Bobby Doyle
**Subject:** Praxis Integration POV — CRM/CM System Feasibility Rankings for Workshop

---

Hey team,

Following up on the Praxis call and the integration questions Megan and Allison raised. I did a deep dive into the official docs and APIs for every system in play. Here's where we land.

---

## The Bottom Line

We can integrate with everything Praxis is evaluating, but the systems are not equal. Here's our ranked recommendation — ordered by how easy it is for us to plug in and how much value it delivers:

| Rank | System | Feasibility | Recommendation |
|------|--------|:-----------:|----------------|
| 1 | **Salesforce Health Cloud** | **9/10** | Build first. Best APIs in enterprise SaaS, pharma-native data model, standard OAuth. |
| 2 | **Databricks** | **7/10** | Build second. Excellent data layer — this is where Ambit lives. |
| 3 | **Veeva CRM** | **6/10** | Build third, carefully. Platform migration creates rework risk. |
| 4 | IQVIA OCE | 4/10 | Skip. Sunsetting — IQVIA licensed it to Salesforce. |
| 5 | Axtria | 2/10 | Not a CRM. No public APIs. Batch enrichment only. |

---

## System-by-System Breakdown

### 1. Salesforce Health Cloud / Life Sciences Cloud — BUILD FIRST

Praxis is heading here for DEE patient services (Suzanne's team). This is also our strongest integration story.

**Why it's a 9/10:**
- Full REST API with CRUD on Case, Task, Activity, CarePlan, Medication objects
- Health Cloud has purpose-built pharma objects; the new Life Sciences Cloud (GA Oct 2025) adds AE triage, medical inquiry routing, and MedWatch draft automation out of the box
- **Platform Events** let Salesforce push events to us — perfect for triggering outbound agent calls when a case status changes or a PA gets denied
- Standard OAuth 2.0, rate limits scale with license tier (100k+ calls/day on Enterprise)
- Over 70 life sciences companies deployed (Pfizer, Takeda, Novartis)

**What we'd build:**
- Write: Create/update Cases per call, log Activities with transcripts, flag AEs, create Tasks for next actions
- Read: Pull Contact, CarePlan, Medication, prior auth status before each call for agent context
- Trigger: Subscribe to Platform Events to fire outbound calls on care plan changes

**Effort estimate:** 4-6 weeks for core integration.

**For the workshop:** This is the story we should lead with. Megan asked "what do we have to build in the middle layer?" — with Salesforce, the answer is very little. Their API does the heavy lifting.

---

### 2. Databricks — BUILD SECOND (Data Layer)

Ambit (Osuke's team) is already building Praxis's data foundations here. This isn't a CRM — it's the integration bus and analytics backbone.

**Why it's a 7/10:**
- SQL Statement Execution API lets us INSERT/MERGE structured call data directly into Delta Lake tables
- Unity Catalog for governance, Delta Sharing for cross-org data exchange with Praxis teams
- Jobs API can send webhook notifications — useful for batch trigger patterns
- Standard OAuth 2.0 with service principals

**What we'd build:**
- Write: Every call outcome, transcript, classification, AE flag, and liaison summary lands in Delta Lake as structured records
- Read: Query Ambit-curated enrichment tables (HCP profiles, segmentation, prior engagement) for pre-call context
- Share: Delta Sharing so Praxis analytics teams can consume interaction data without ETL

**Effort estimate:** 2-3 weeks (simpler API — schema design is the main work).

**Strategic angle:** Routing all Vi Operate events through Databricks means Praxis isn't locked into any single CRM. If they swap Veeva for something else, the data layer doesn't change.

---

### 3. Veeva CRM / Vault — BUILD THIRD, WITH CAUTION

Praxis is activating Veeva for HCP CRM and the contract is in Ironclad. But this is the most complicated integration for a specific reason.

**Why it's only a 6/10:**

**The Vault migration is the headline risk.** Veeva is migrating from their Salesforce-based CRM to their proprietary "Vault CRM" platform. The Veeva-Salesforce partnership expired September 2025. Migration window: 2026-2029, complete by September 2030. Here's the kicker: **Veeva explicitly does not migrate third-party integrations.** Anything we build against the Salesforce-based Veeva CRM APIs today will need to be rebuilt on Vault's REST API when Praxis migrates.

**What the Vault API looks like:**
- REST API with CRUD on Call Reports (`call2__v`), Medical Inquiries, Activities
- VQL (Vault Query Language) for querying — SQL-like but proprietary
- Veeva Network API for HCP/HCO master data — this part is solid
- Vault Safety API for AE case submission via Intake Inbox Item (E2B format)
- **No native webhook support** — outbound triggers require Spark Messaging or Java SDK callouts, which need Veeva admin involvement
- Client ID registration required — Veeva can reject unregistered integrations

**What we'd build:**
- Write: Call Reports, Medical Inquiries, Activities via Vault REST API
- Read: HCP profiles via Veeva Network API, CRM data via VQL
- AE: Vault Safety Intake Inbox Item for adverse event case submission
- Trigger: Spark Messaging for async events (requires Veeva admin setup)

**Effort estimate:** 6-10 weeks (higher due to ecosystem complexity and potential dual-build for legacy + Vault).

**Contract language Megan needs (for the Ironclad signing):**

Spencer — per your commitment on the call, here are the specific clauses we need in the Veeva contract:

1. **Third-party agent write access:** "Praxis and its authorized technology partners may create, update, and read Call Report, Activity, Medical Inquiry, and custom objects via the Vault REST API or legacy Salesforce API without requiring Veeva professional services engagement."

2. **Email engagement data export:** "Veeva shall provide API or bulk export access to email engagement metrics including open, delivered, clicked, and reply events, including the raw text of email replies, for emails sent through Veeva CRM/Engage."

3. **Data portability:** "Upon termination or migration, Praxis retains full ownership of and export access to all interaction data, call reports, transcripts, and derived analytics generated by or through Praxis's agent systems."

4. **No integration blocking:** "Veeva shall not implement technical restrictions that prevent authorized third-party systems from reading from or writing to Praxis's Veeva CRM instance via documented APIs."

---

### 4. IQVIA OCE — SKIP

If Allison asks about IQVIA OCE as a Veeva alternative, the answer is: don't. IQVIA licensed OCE to Salesforce in 2024. They're co-developing Salesforce Life Sciences Cloud together. OCE is supported through 2029 but all new innovation goes to Salesforce LS Cloud. Praxis would be adopting a sunset platform and migrating again in 2-3 years.

**Our recommendation:** Go directly to Salesforce Life Sciences Cloud. It's where OCE's pharma capabilities end up anyway, with a much better API story.

---

### 5. Axtria — NOT A CRM

If it comes up: Axtria SalesIQ/DataMAx are analytics tools, not CRMs. No public APIs. SFTP-based batch integrations only. Potentially useful as an HCP segmentation data source down the road, but not an integration target for Vi Operate.

---

## Architecture Recommendation for the Workshop

Here's the diagram Megan asked for — "a single diagram of how all these pieces fit":

```
  Inbound/Outbound Channels
  (Voice, SMS, Chat, Email)
            │
            ▼
    ┌───────────────────┐
    │    Vi Operate      │  ← Interaction Layer
    │  (4 Agent Types)   │    Produces structured events per interaction
    └───────────────────┘
            │
            ▼
    Structured Event Payload
    (classification, transcript, AE flag,
     liaison summary, next action, CI notes)
            │
            ▼
    ┌───────────────────┐
    │    Databricks      │  ← Data Layer (Ambit)
    │  Delta Lake + UC   │    Persistence, analytics, governance
    └───────────────────┘
       │         │         │
       ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ Veeva  │ │  SFHC  │ │   PV   │
   │  CRM   │ │Patient │ │ System │
   │ (HCP)  │ │  CM    │ │(Safety)│
   └────────┘ └────────┘ └────────┘
```

**The key message for Megan and Allison:** Vi Operate is the interaction layer, not the system of record. We produce rich structured data from every conversation and push it wherever Praxis needs it. CRMs become single sources of truth that agents write *back to* — not systems agents operate *within*. This means Praxis can swap any downstream system without touching the agent layer.

---

## For the Boston Meeting (Tue/Wed Next Week)

I'd suggest we bring:
1. The integration architecture diagram above (cleaned up for whiteboard)
2. The Veeva contract language for Megan's Ironclad signing
3. A list of questions for Osuke/Ambit about the Databricks schema they're building
4. The Integrations tab we built into the demo dashboard (shows this architecture visually with the decision matrix)

Let me know if you want me to prep anything else before Boston.

— Matt
