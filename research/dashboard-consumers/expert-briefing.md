# Expert Briefing: Dashboard Consumer Analysis
## Vi Praxis BioSciences Engagement Platform

**Date:** 2026-03-18
**Scope:** Gap analysis between what dashboard consumers need (per research) and what the current system delivers

---

## 1. Stakeholder-Dashboard Fit

### Neurology MSL: WEAK

The research identifies the MSL's #1 need as **count of unresolved, explicit scientific follow-up requests from priority stakeholders** -- the "open loop" that demands the next touch. The current dashboard has no concept of this. There is no follow-up request queue, no open-loop tracker, and no stakeholder-level longitudinal view. The "Medical Liaison" tab shows AE reports requiring review, competitive intelligence signals, and compliance monitoring -- all useful but secondary to the MSL's core workflow of pre-call prep and post-call follow-up triage. The `LiaisonSummary` type includes `recommendedActions` and `callSummaryForLiaison`, but these are per-call, not aggregated across interactions with a given HCP. An MSL cannot look at this dashboard and answer: "Which of my priority HCPs has an open scientific question I haven't closed?"

### FRM (Field Reimbursement Manager): MISSING

The research identifies the FRM's #1 need as **top prior authorization denial reason by payer/plan, with volume trending**. The current system has zero FRM-relevant infrastructure. The data model has no fields for payer/plan, denial reason, PA status tracking, appeal status, site-of-care, benefit design, or time-to-therapy. The `InteractionOutcome` type includes `prior-auth-initiated` as a single outcome value, and the classification prompt includes `prior-auth-assist` as an outcome -- but these are binary event markers, not the structured denial-reason-by-payer data that FRMs need to decide where to intervene. The `ContactRecord` type has an `insurancePlan` field for patients, but it is a free-text string with no payer taxonomy. No dashboard tab or view addresses access/coverage workflows.

### Commercial Operations / Brand Team: WEAK

The research identifies commercial ops' #1 need as **incremental lift or ROI by channel/journey at the segment level**, and the brand director's as **which message is moving new-to-brand prescribing in the priority segment**. The current dashboard provides activity counts (total interactions, hub enrollments, copay cards, engagement rate, sample requests) and an "Engagement Funnel" (signals detected -> outreach initiated -> contact engaged -> action completed). These are reach-and-frequency metrics, which the research explicitly warns is the fallback when lift attribution is unavailable. The `AnalyticsResponse` includes `outcomeDistribution`, `pathwayDistribution`, `dailyTrend`, and `topConcerns`, but none of these connect engagement activity to downstream behavioral outcomes (prescribing changes, new-to-brand Rx, refill rates). There is no message-level effectiveness view, no segment-level breakdowns beyond therapeutic area, and no channel comparison that ties to conversion. The "Performance" tab is organized around system throughput, not commercial decision-making.

### Pharmacovigilance Team: ADEQUATE

The research identifies PV's #1 need as **seriousness flag on a valid case**. The current system handles AE detection reasonably well. The classification prompt includes explicit AE detection guidance with seriousness criteria. The `Classification` type has `aeDetected` and `aeNarrative` fields. The `ScreeningResult` type captures structured AE screening with `isPositiveScreen`, `reportRequired`, and `reportType`. The "Medical Liaison" tab prominently surfaces AE reports requiring review with narrative details and timestamps. What is missing: the four minimum ICSR validity elements (identifiable patient, suspect product, adverse event, identifiable reporter) are not surfaced as a structured checklist. The `aeNarrative` is a free-text string -- not parsed into onset, severity, seriousness, causality, or regulatory timeline fields. There is no "clock" visualization showing time since initial receipt vs. the 15-day expedited reporting deadline. Still, this is the stakeholder best served by the current dashboard.

### Competitive Intelligence: WEAK

The research identifies the CI analyst's #1 need as **corroboration count across independent sources for a specific competitor claim within a time window**. The current system captures competitive intelligence in two places: (1) `BehavioralSignal` entries with `category: 'COMPETITIVE_INTEL'` on contact records and call records, and (2) `LiaisonSummary.enrichmentData.competitiveIntelligence` as a single free-text string per call. The classification prompt explicitly instructs CI extraction into `competitive_intel_notes` as an array -- but the `Classification` type in the frontend does not include this field, meaning CI notes extracted by the backend prompt are silently dropped when data reaches the dashboard. The "Medical Liaison" tab has a "Competitive Intelligence Signals" section that filters calls with `COMPETITIVE_INTEL` behavioral signals, but it shows signal detail and enrichment text, not structured claims. There is no deduplication, no corroboration count, no trending, and no distinction between gossip and decision-grade intelligence.

---

## 2. Data Model Gaps

### What MSLs need that the data model lacks

| Research requirement | Current model status |
|---|---|
| Open scientific follow-up requests with urgency/topic tags | Not modeled. `Classification.next_action` is a single string, not a trackable item with status. |
| Stakeholder-level interaction history (longitudinal view) | `CallRecord` has `contactId` but no aggregation layer. No `StakeholderProfile` or `EngagementHistory` type exists. |
| Scientific footprint (publications, trial involvement, congress activity) | Not modeled. `ContactRecord` has `specialty` and `practiceLocation` but no scientific activity data. |
| Meeting objective and purpose per interaction | Not modeled. The classification prompt generates a `liaison_summary` but there is no `meetingObjective` field. |
| "What changed since last touch" delta | Not modeled. No diffing or changelog across contacts over time. |

### What FRMs need that the data model lacks

| Research requirement | Current model status |
|---|---|
| Payer/plan identification | `ContactRecord.insurancePlan` is a single free-text string. No payer taxonomy type. |
| PA denial reason (structured) | Not modeled at all. |
| Denial volume by payer/plan (trending) | Not modeled. |
| Appeal status and timeline | Not modeled. |
| Time-to-therapy tracking | Not modeled. |
| Site-of-care data | Not modeled. |
| Benefit design signals (step therapy, medical necessity, NDC block) | Not modeled. |

### What Commercial Ops / Brand needs that the data model lacks

| Research requirement | Current model status |
|---|---|
| Incremental lift / ROI by channel | Not modeled. `CallRecord.channel` exists but is always `'voice'`. No downstream outcome linkage. |
| Message effectiveness (which message moves NBRx) | Not modeled. No message content tracking, no message ID on calls. |
| Segment-level breakdowns | Only `therapeuticArea` and `agentType` as segmentation dimensions. No HCP decile, geography, account, or formulary status. |
| Cross-channel orchestration data | Only `voice` channel in use. `ChannelType` supports `'voice' | 'sms' | 'web'` but SMS is only a follow-up flag. |
| Prescribing behavior linkage | Not modeled. No Rx data, no claims integration, no behavioral outcome tracking. |

### What PV needs that the data model partially lacks

| Research requirement | Current model status |
|---|---|
| Four ICSR validity elements as structured fields | Partially present. Patient and product are identifiable from `CallRecord`; reporter is implicit; AE is in `aeNarrative` as free text -- but not structured as four discrete validity checks. |
| Seriousness classification (structured) | Not modeled as a separate field. The prompt mentions seriousness but the output schema has only `aeDetected: boolean`. |
| Reporting timeline / clock | Not modeled. No `aeReceivedDate` or `aeReportingDeadline`. |
| Case validity completeness score | Not modeled. |

### What CI analysts need that the data model lacks

| Research requirement | Current model status |
|---|---|
| Structured competitor claims with corroboration count | Not modeled. CI is free text in `enrichmentData.competitiveIntelligence`. |
| Cross-source deduplication / trending | Not modeled. |
| `competitive_intel_notes` array from classification | Extracted by the backend prompt but absent from the frontend `Classification` type -- data is lost in transit. |
| Net switch intent at priority accounts | Not modeled. |
| Clinical objection themes (repeatable) | Not modeled as structured data. |

---

## 3. Liaison Summary Quality

### What the research says makes a useful liaison summary

The research defines five required blocks:

1. **Purpose and meeting objective** (one sentence, scientific, not "relationship building")
2. **What changed since last touch** (new trial involvement, publication, congress activity, new barrier)
3. **Top clinical questions raised** (verbatim-ish, short)
4. **Actionable insight** (the "so what" for medical strategy, evidence generation, or patient journey barriers)
5. **Next actions with owners and due dates**, including PV submission if needed

What the research says is noise: long transcripts, generic "engagement scores" without context, and untethered sentiment that does not connect to a medical question, barrier, or decision.

### How the current system performs against this standard

The classification prompt generates a `liaison_summary` field described as: "2-3 sentence summary written for the medical liaison team. Include: support pathway discussed, caller's stated needs/barriers, outcome, recommended follow-up, and any safety signals."

The `LiaisonSummary` type in the frontend includes:
- `engagementScore` (0-100) -- **this is exactly what the research calls noise**
- `engagementAssessment` -- generic text ("High -- contact is actively engaged")
- `callSummaryForLiaison` -- the most useful field, but structured as a single narrative paragraph
- `recommendedActions` -- present but without owners or due dates
- `behavioralContextIndicators` -- useful for context but not structured around clinical questions
- `enrichmentData` (prescribingPattern, adherenceProfile, digitalEngagement, competitiveIntelligence) -- useful for pre-call prep but randomly assigned in seed data

**Verdict: The liaison summary is closer to a CRM activity note than a decision object.** It covers blocks 1 (partially, via pathway mention), 4 (partially, via supportNeeds), and 5 (partially, via recommendedActions without owners/dates). It entirely misses block 2 (what changed since last touch) and block 3 (top clinical questions raised). The engagement score, which the research explicitly flags as noise, is the most prominently displayed element in both the call detail drawer and the liaison tab.

---

## 4. Competitive Intelligence

### What the research says

CI from calls is mostly noise. What survives the filter is intelligence that is:
1. **Corroborated** -- mentioned independently across multiple sources
2. **Actionable** -- implies a change in message, evidence, access approach, or resource allocation
3. **Compliant** -- not solicited via deception

Three stakeholders consume CI differently:
- **CI analyst**: Needs corroboration count for a specific competitor claim within a time window
- **Brand director**: Needs net switch intent at priority accounts
- **Medical director**: Needs repeatable clinical objection themes tied to competitive context

### How the current system handles CI

**Capture**: The classification prompt explicitly instructs extraction of `competitive_intel_notes` as an array -- this is well-designed. It asks for competitor product names, switching context, formulary status, clinical comparisons.

**Fatal gap**: The frontend `Classification` type does not include `competitive_intel_notes`. The backend extracts it, but the data has no place to land in the frontend type system. This means CI extracted during classification is lost before it reaches the dashboard.

**Surface**: The "Medical Liaison" tab shows CI in two forms:
1. Calls that have `COMPETITIVE_INTEL` behavioral signals (pre-call enrichment data, not call-derived intelligence)
2. The `enrichmentData.competitiveIntelligence` string from the `LiaisonSummary` (randomly assigned from four template strings in seed data)

Neither of these represents actual call-derived competitive intelligence. The first is input data (what we knew before the call), not output data (what we learned from the call). The second is a template string, not extracted from the conversation.

**Corroboration**: There is no mechanism to count how many independent calls mention the same competitor claim. Each CI signal exists in isolation. The dashboard cannot answer: "How many HCPs mentioned switching to fenfluramine this month?"

**Trending**: There is no time-series view of CI signals. No way to see if a competitive threat is growing or fading.

---

## 5. The One Metric That Matters (per stakeholder)

| Stakeholder | Research-identified metric | In the dashboard? | Assessment |
|---|---|---|---|
| Neurology MSL | Count of unresolved scientific follow-up requests from priority stakeholders | No. No follow-up request tracking exists. | MISSING |
| FRM | Top PA denial reason by payer/plan with volume trending | No. No payer, denial, or PA data model. | MISSING |
| Commercial Ops | Incremental lift / ROI by channel or journey at segment level | No. Only activity counts and engagement rates. | MISSING |
| Brand Director | Which message moves new-to-brand prescribing in the priority segment | No. No message tracking, no Rx linkage. | MISSING |
| PV Team | Seriousness flag on a valid case | Partially. `aeDetected` is boolean, not a seriousness classification. AE narrative exists but is unstructured. | PARTIAL |
| CI Analyst | Corroboration count for a competitor claim within a time window | No. CI signals are isolated free text. | MISSING |
| Medical Director | Repeatable clinical objection theme tied to competitive context | No. No theme extraction or aggregation. | MISSING |

**Summary: Six of seven one-metrics-that-matter are entirely missing. The seventh (PV seriousness) is partially present.**

---

## 6. Dashboard UX vs. Workflow

### Current tab structure

| Tab | Organized around |
|---|---|
| Overview | System throughput (KPIs, contact queue, funnel, pathway breakdown) |
| Call Log | Data type (chronological call records) |
| Contact Signals | Data type (behavioral signals feed) |
| Medical Liaison | Mixed: AE review queue + CI signals + compliance monitoring |
| System Performance | Data type (distributions and trends of system metrics) |
| Agent Storyboard | Demo/config workflow (data drop -> agent config -> conversation -> transcript -> call log) |

### Research-implied workflows

The research describes dashboard consumption at two high-frequency moments:
1. **Morning prep**: MSL reviews stakeholder context, open requests, and scientific footprint before visits
2. **Post-call triage**: MSL/team reviews what happened, what needs follow-up, and what to escalate

And three centralized-team workflows:
3. **AE triage**: PV reviews flagged cases against validity criteria and reporting clocks
4. **Trend diagnosis**: Commercial/brand reviews distributions and patterns to explain performance
5. **CI synthesis**: CI analyst aggregates and corroborates field-sourced competitive mentions

### Assessment

**The current dashboard is organized around data types, not user workflows.** The tabs correspond to "here are your calls," "here are your signals," "here are your liaison summaries" -- not "here is what you need to do next."

Specific mismatches:
- The "Medical Liaison" tab bundles three unrelated workflows (AE review, CI synthesis, compliance monitoring) that serve three different stakeholders with different urgencies
- The "Overview" tab shows KPIs that matter to platform operators (total interactions, avg handle time, engagement rate) but not to any identified stakeholder's primary decision
- The "Contact Signals" tab shows a live feed but provides no mechanism to act on signals -- no "assign to MSL," no "route to FRM," no "create follow-up task"
- The "System Performance" tab shows outcome and agent-type distributions -- useful for platform operators, not for any of the five identified stakeholder groups
- There is no "My Open Loops" view for MSLs, no "Access Barriers" view for FRMs, no "Message Effectiveness" view for brand teams

The Agent Storyboard tab is the exception -- it is organized around a clear demo workflow (data ingestion -> config -> conversation -> analysis -> logging) and serves its purpose well.

---

## 7. Concrete Recommendations

Prioritized by impact on stakeholder decision-making and implementation feasibility:

### Priority 1: Fix the CI data pipeline (HIGH IMPACT, LOW EFFORT)

**Problem:** The backend classification prompt extracts `competitive_intel_notes` as an array, but the frontend `Classification` type does not include this field. CI data is captured then lost.

**Action:** Add `competitive_intel_notes?: string[]` to the `Classification` interface in `types.ts`. Ensure the API passes this field through. Surface it in the call detail drawer and the liaison tab's CI section.

**Why first:** This is a data loss bug, not a feature request. The system already does the hard work (extraction) but throws away the result.

### Priority 2: Add a structured follow-up request tracker (HIGH IMPACT, MEDIUM EFFORT)

**Problem:** The MSL's #1 metric -- unresolved scientific follow-up requests -- has no data model or UI representation.

**Action:** Add a `FollowUpRequest` type with fields: `id`, `contactId`, `topic`, `urgency`, `requestedDate`, `dueDate`, `status` (open/in-progress/closed), `owner`, `source` (callId). Generate these from the classification prompt's `next_action` and `liaison_summary`. Add a "My Open Loops" view, filterable by priority and due date.

**Why second:** This is the single highest-value feature for the primary identified user (MSL). It transforms the dashboard from a retrospective log into a forward-looking action queue.

### Priority 3: Restructure the liaison summary around the five-block format (HIGH IMPACT, MEDIUM EFFORT)

**Problem:** The current `LiaisonSummary` type leads with engagement score (identified as noise by research) and lacks meeting objective, "what changed," and clinical questions raised.

**Action:** Refactor `LiaisonSummary` to include: `meetingObjective: string`, `deltaSinceLastTouch: string[]`, `clinicalQuestionsRaised: string[]`, `actionableInsight: string`, `nextActionsWithOwners: Array<{action: string, owner: string, dueDate: string}>`. Update the classification prompt to generate these fields. Demote `engagementScore` from primary display to a secondary indicator.

**Why third:** This directly improves the quality of every liaison summary generated, affecting all downstream consumers.

### Priority 4: Add seriousness classification and ICSR validity checklist for PV (MEDIUM IMPACT, LOW EFFORT)

**Problem:** PV's one-metric-that-matters (seriousness on a valid case) is not structured. `aeDetected` is boolean; there is no seriousness field and no validity checklist.

**Action:** Add to `Classification`: `aeSeriousness?: 'serious' | 'non-serious' | 'unknown'` and `aeValidityElements?: {identifiablePatient: boolean, suspectProduct: boolean, adverseEvent: boolean, identifiableReporter: boolean}`. Update the classification prompt to extract these. Add a "time since receipt" indicator in the AE review queue.

**Why fourth:** PV is the stakeholder closest to being well-served. A small structural improvement makes the AE queue genuinely usable for regulatory triage.

### Priority 5: Reorganize tabs around stakeholder workflows (HIGH IMPACT, HIGH EFFORT)

**Problem:** Tabs are organized by data type, not by user workflow.

**Action:** Replace the current tab structure with role-oriented views:
- **Action Queue** (replaces Overview): Open follow-ups, unresolved requests, items needing human action -- sorted by urgency
- **Call Log** (keep, but add richer filtering): Allow filtering by follow-up status, AE status, CI flag
- **Safety & Compliance** (split from Medical Liaison): Dedicated AE triage queue with validity checklist, seriousness flags, and reporting clocks
- **Competitive Intelligence** (split from Medical Liaison): Corroborated CI claims with trending, not raw signal feeds
- **Engagement Analytics** (replaces Performance): Rename and refocus on metrics that matter to commercial ops -- conversion by pathway, not just throughput
- **Agent Storyboard** (keep as-is): Well-designed for its demo purpose

### Priority 6: Add corroboration logic for competitive intelligence (MEDIUM IMPACT, MEDIUM EFFORT)

**Problem:** CI signals exist in isolation. No mechanism to count how many independent sources mention the same competitor claim.

**Action:** Normalize CI notes into a `CompetitorClaim` type with fields: `competitorProduct`, `claimCategory` (switching, formulary, efficacy comparison, safety concern), `sourceCallIds: string[]`, `firstMentionDate`, `lastMentionDate`, `corroborationCount`. Deduplicate and aggregate across calls. Surface claims sorted by corroboration count, with a threshold indicator (e.g., >= 3 independent mentions = "escalation-grade").

### Priority 7: Build a stakeholder-level longitudinal profile (MEDIUM IMPACT, HIGH EFFORT)

**Problem:** The dashboard shows individual calls but not the engagement history with a specific HCP or patient over time. MSLs cannot see "what changed since last touch" because there is no cross-call view per contact.

**Action:** Add a `StakeholderProfile` view accessible from any call or contact record. Aggregate: interaction count, last touch date, all open follow-ups, liaison summary timeline, scientific questions asked, CI signals sourced from this contact, AE history.

### Priority 8: Expand the data model for access/reimbursement workflows (LOW IMPACT NOW, HIGH STRATEGIC VALUE)

**Problem:** FRM workflows are entirely unserved. The platform cannot capture denial reasons, PA status, payer/plan data, or time-to-therapy metrics.

**Action:** Add types: `PayerPlan`, `PriorAuthCase` (with `status`, `denialReason`, `denialDate`, `appealStatus`, `payerPlanId`), and `AccessBarrier`. This is foundational work that would require new data capture in the call flow, not just dashboard changes.

**Why lower priority:** This is a new capability, not a fix to existing capability. It requires upstream changes in the conversation agent and data ingestion pipeline, not just the dashboard. But the research is clear: if the dashboard does not make denial reasons trendable and sliceable by payer, FRMs will ignore it.

### Priority 9: Add message-level tracking for commercial effectiveness (LOW IMPACT NOW, HIGH STRATEGIC VALUE)

**Problem:** Brand teams cannot determine which message drives behavioral outcomes because there is no message identifier on interactions.

**Action:** Add `messageId` or `messageTheme` to `CallRecord` or `Classification`. This enables future message effectiveness analysis when downstream prescribing data is available.

### Priority 10: Connect the signal feed to action routing (MEDIUM IMPACT, MEDIUM EFFORT)

**Problem:** The "Contact Signals" tab shows a live feed of behavioral signals but provides no mechanism to act on them. Signals are displayed but not routable.

**Action:** Add action buttons to each signal: "Assign to MSL," "Route to FRM," "Create Follow-Up," "Dismiss." Track signal-to-action conversion. This transforms the signal feed from a display into a triage tool.

---

## Summary of Key Findings

The current Vi Praxis dashboard is well-built as a **platform operations dashboard** -- it tells you how many calls happened, what outcomes occurred, and whether the system is working. It is not yet built as a **stakeholder decision dashboard** -- it does not tell each consumer what to do next.

The most critical gap is not missing data or missing features -- it is the absence of **decision objects**. The research repeatedly emphasizes that engagement platforms pay for themselves when they produce objects that change what someone does tomorrow. The current system produces activity records. The path from activity record to decision object requires:

1. Structured follow-up requests (not just narrative summaries)
2. Aggregation across interactions per stakeholder (not just per-call views)
3. CI corroboration and trending (not just raw mentions)
4. Seriousness classification and validity checklists (not just AE detected yes/no)
5. Workflow-oriented navigation (not data-type-oriented tabs)

The single most impactful quick win is fixing the CI data pipeline (Priority 1) -- the system already extracts `competitive_intel_notes` in the classification prompt but the frontend type system drops the data on the floor. The single most impactful structural change is adding a follow-up request tracker (Priority 2) -- this is the feature that would make the MSL open the dashboard every morning.
