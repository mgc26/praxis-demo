# HCP-Support Agent: Expert Briefing

## Audit of the current `hcp-support.ts` prompt against the JTBD research, regulatory framework, and industry MI standards

---

## 1. JTBD Coverage Audit

The research identifies six primary jobs-to-be-done when an HCP calls a manufacturer Medical Information line. Below is how the current `hcp-support` agent prompt handles each.

### JTBD 1 — Clarify how to use the product safely and correctly (operational dosing job)

**Rating: STRONG**

The prompt explicitly lists "dosing, administration, pharmacokinetic, and drug interaction questions within approved labeling" as Goal #1. It instructs the agent to "reference the approved prescribing information" for dosing and the "Pharmacokinetics section" for interactions. The example response ("The recommended starting dose is 25mg once daily with titration over 4 weeks") is well-calibrated to what the research describes as the #1 MI question type (83.8% of HCPs ask dosing/administration questions). The `send_clinical_data` function allows fulfillment of titration schedules and dosing guides.

**Gap**: The prompt does not explicitly address the neurology-specific subtypes the research highlights — titration schedules, cross-tapering/switching protocols, rescue-use patterns, perioperative/ED administration, or missed-dose guidance. These are where the highest clinical stakes sit for anti-seizure medications. A more granular prompt could give the agent better scaffolding for the exact question shapes that dominate neurology MI.

### JTBD 2 — Validate safety in a specific regimen context (interaction and contraindication job)

**Rating: ADEQUATE**

Drug interactions are covered under Clinical Information Boundaries ("reference the Pharmacokinetics section of approved labeling"). The research emphasizes that neurology patients have unusually high polypharmacy and that interactions are the #2 question type (76.1%). The prompt handles this at a general level.

**Gap**: The prompt makes no distinction between straightforward DDI lookups (answerable from labeling) and complex polypharmacy scenarios that the research explicitly flags as requiring "deeper evidence synthesis" and potentially a custom response or MSL escalation. The agent has no guidance for when a DDI question exceeds what a label section can answer — it should escalate, but the prompt does not define that threshold.

### JTBD 3 — Make a risk-benefit decision under constraints (special populations and monitoring job)

**Rating: WEAK**

This is the most significant coverage gap. The research identifies pregnancy/lactation, renal impairment, hepatic impairment, geriatric frailty, and pediatrics as high-complexity, high-pain call types that are "more common than in some other therapeutic areas" for neurology. The current prompt contains zero explicit guidance for special-population questions. There is no mention of pregnancy reporting (contrast with `medcomms-qa`, which has a dedicated `[PREGNANCY REPORTING]` section), no renal/hepatic dose adjustment language, and no pediatric boundaries.

These questions are also the ones most likely to cross into off-label territory (e.g., pediatric use beyond the approved age range, pregnancy exposure data). The agent needs specific guardrails and escalation logic here.

### JTBD 4 — Report or triage possible safety events (pharmacovigilance job)

**Rating: ADEQUATE**

The prompt includes a structured `[SAFETY — ADVERSE EVENT CAPTURE FROM HCPs]` section with a clear protocol: acknowledge, collect minimum data elements, call `report_adverse_event`, escalate serious AEs via `escalate_to_safety`, and provide a safety reporting number. This aligns with what the research describes as MI's role as "one of the first customer-facing functions that will receive potential AEs/PQCs."

**Gaps**:
- The research defines an expanded scope of reportable events beyond classic AEs: off-label use reports, pregnancy exposure, overdose, medication errors, drug-drug interactions, and lack of therapeutic effect. The prompt only triggers on "adverse event" language — it does not instruct the agent to screen for these adjacent safety-reportable categories.
- There is no mention of product quality complaints (PQCs), which the research describes as a parallel mandatory capture obligation with 24-72 hour SOP timelines.
- There is no pregnancy-specific reporting path (unlike `medcomms-qa` which has one).
- The research emphasizes SOP-driven reconciliation between MI and Safety; the prompt has no language about timeline expectations or follow-up confirmation.

### JTBD 5 — Get the right document for a downstream process (documentation job)

**Rating: WEAK**

The `send_clinical_data` function can send "prescribing information, clinical trial summaries, or dosing guides," which partially addresses this. But the research describes a much richer documentation need: HCPs want materials they can place in a chart, share with a P&T committee, or use for internal review. The research also distinguishes between Standard Response Documents (SRDs) and custom MI response letters — the prompt has no awareness of this distinction and cannot tell the caller what form the response will take or when they should expect it.

The prompt also lacks any concept of follow-up written response fulfillment — a core MI workflow where the call is intake and the deliverable arrives later.

### JTBD 6 — Resolve access friction (coverage and pathway job)

**Rating: MISSING**

The research explicitly identifies this as a common call type ("How do I get this for my patient?") and notes it should be routed to reimbursement support hubs, patient services, or managed markets teams. The research also warns that FDA's HCEI/payor framework is scoped to payor audiences and explicitly excludes prescribers making individual patient decisions.

The current prompt has no routing logic for access, coverage, formulary, prior authorization, or reimbursement questions. It does not mention hub services, copay cards, or specialty pharmacy support (all of which exist in the platform — the `hcp-outbound` prompt references them). An HCP calling about "how to get my patient started" would get no meaningful help and no clear handoff.

### JTBD Coverage Summary Table

| Job-to-Be-Done | Rating | Key Gap |
|---|---|---|
| Operational dosing | STRONG | Missing neurology-specific subtypes (titration, switching, rescue) |
| Interaction/contraindication | ADEQUATE | No threshold for when DDI complexity requires escalation |
| Special populations | WEAK | No pregnancy, renal, hepatic, pediatric, or geriatric guidance |
| Pharmacovigilance | ADEQUATE | Narrow AE definition; no PQCs, no pregnancy path, no expanded safety event types |
| Documentation fulfillment | WEAK | No SRD vs custom distinction; no follow-up letter workflow |
| Access/coverage routing | MISSING | No routing to hub, managed markets, or reimbursement |

---

## 2. Regulatory Compliance Assessment

### On-label vs off-label boundary enforcement

The prompt's on-label boundary is stated clearly: "ONLY provide information within FDA-approved labeling for Praxis products." The off-label deflection is also present: "That's outside the current approved indication. I can connect you with our Medical Information department for a comprehensive response, or arrange an MSL visit."

**Problem 1: Identity confusion.** The agent IS the Medical Information department. The off-label deflection says "I can connect you with our Medical Information department" — but the agent is already representing the MI line. This creates a confusing loop and implies there is a separate, higher-authority MI function. The correct framing per the research is: "I'd like to route this to our Medical Information team for a comprehensive, referenced written response" (which is how `medcomms-qa` handles it). The distinction is between real-time phone response and a researched, written custom MI response letter — not between two different departments.

**Problem 2: No FDAMA 114 / HCEI guardrail.** The research is explicit that FDAMA 114 is a payor-audience safe harbor, not an MI-to-prescriber loophole, and that FDA's HCEI guidance "does not apply to dissemination to other audiences such as healthcare providers making individual patient prescribing decisions." The prompt has no guardrail for when an HCP asks economic, formulary, or cost-effectiveness questions that could drift into HCEI territory. This is a regulatory gap.

**Problem 3: No "solicitation by interface" awareness.** The research warns that FDA treats "websites with prepared standard responses for off-label uses generated via menus/search" as solicitation. An AI agent that proactively surfaces off-label information — even in response to a question — could be characterized similarly. The prompt does not instruct the agent to avoid expanding scope, avoid suggesting related off-label topics, or avoid making off-label content "easy to discover." The behavioral signals section (which includes `OFF_LABEL_QUERY` detection) actually creates a risk here: the prompt gives the agent pre-knowledge that the HCP is interested in off-label use, which could subtly bias the agent's responses toward that topic.

### Unsolicited vs solicited request handling

The research identifies this as "the compliance hinge." The current prompt has no concept of the solicited/unsolicited distinction. This matters because:

- If a Praxis sales rep (or the `hcp-outbound` agent) prompted the HCP to call, any off-label question that results is arguably solicited, and the response rules are much more restrictive.
- The prompt should capture and document whether the inquiry was self-initiated or prompted by company contact — this is a basic MI compliance requirement per the research.

### Recordkeeping and documentation requirements

FDA's unsolicited off-label guidance requires maintaining "records of the request, what was provided, and follow-up inquiries." The classification prompt partially addresses this post-hoc (via transcript analysis and structured JSON output), but the agent prompt itself has no instruction to confirm and document: what was asked, what was provided, what disclosures were made, and what follow-up was promised. The research makes clear this is not optional.

### Independence from sales/marketing

The research emphasizes FDA's requirement that off-label responses be "generated by medical/scientific personnel independent from sales/marketing" and that OIG compliance guidance reinforces structural separation. The current prompt includes behavioral signals that come from what appear to be commercial intelligence sources (competitor research, formulary lookups, prescribing volume, risk scores). While the prompt says "never mention data or tracking," the mere availability of commercial signals to the MI agent blurs the independence line. The competitor guidance block explicitly says "Focus on the differentiated clinical profile of Praxis products" — this is promotional framing, not MI framing.

### Regulatory Compliance Summary

| Requirement | Status | Risk Level |
|---|---|---|
| On-label boundary | Present but has identity confusion | Medium |
| Off-label deflection/routing | Present but self-referential | Medium |
| Solicited vs unsolicited distinction | MISSING | High |
| FDAMA 114 / HCEI audience guardrail | MISSING | High |
| Anti-solicitation-by-interface controls | MISSING | High |
| Expanded safety event screening | Partial (AEs only, not PQCs/pregnancy/med errors) | High |
| Recordkeeping/documentation of what was provided | MISSING from agent; partial in classification | Medium |
| Independence from commercial signals | COMPROMISED by behavioral signals + competitor block | High |
| Required disclosures (boxed warning, approved indications, etc.) | MISSING | Medium |

---

## 3. HCP-Support vs MedComms-QA Overlap and Correct Delineation

### Current state: near-total overlap

The two agents are functionally almost identical for HCP callers. Both:
- Identify as "Medical Information representative for Praxis BioSciences"
- Answer dosing, administration, PK, DDI, clinical trial, and safety questions
- Deflect off-label to "Medical Information" (creating the same self-referential loop)
- Capture adverse events with the same protocol
- Use the same functions (`send_clinical_data`, `report_adverse_event`, `escalate_to_safety`, `send_sms`, `hang_up`)
- Operate within FDA-approved labeling boundaries

The differences are minor:
- `medcomms-qa` handles both HCPs and non-HCPs (patients/caregivers), adjusting language register
- `medcomms-qa` has a `[PREGNANCY REPORTING]` section (absent from `hcp-support`)
- `medcomms-qa` has a line about ongoing clinical trials / clinicaltrials.gov
- `hcp-support` has sample requests and speaker program features
- `hcp-support` has competitor intelligence guidance and behavioral signal blocks
- `hcp-support` has `request_samples` and `request_msl_visit` functions

### What the research says the correct delineation should be

Based on the research, the correct architecture maps to the MI operational model used by peer neurology companies:

**`hcp-support` should be the primary MI line for HCPs.** This is the inbound phone line that handles the full scope of MI work: on-label Q&A, safety event capture, MSL routing, document fulfillment, and intake for complex queries that will be fulfilled via written response. It should be the "front door" described in the research — with explicit separation from commercial functions.

**`medcomms-qa` should be the omnichannel/non-voice MI intake channel** — handling web forms, email, chat, and patient/caregiver inquiries. Its key differentiator should be audience flexibility (HCP vs patient/caregiver language) and channel flexibility (not phone-optimized). For HCPs calling by phone, `hcp-support` should always be the agent.

**Neither agent should include commercial features.** Sample requests, speaker program invitations, and competitor intelligence gathering belong in `hcp-outbound` (the commercial engagement agent). The research is unambiguous: MI must demonstrate non-promotional intent and independence, and industry standards report "no respondents reporting MI into commercial." Putting sample requests and speaker programs in the MI agent creates exactly the kind of commercial/medical blurring that OIG compliance guidance warns against.

### Recommended delineation

| Capability | hcp-support (MI phone) | medcomms-qa (omnichannel MI) | hcp-outbound (commercial) |
|---|---|---|---|
| On-label Q&A | Yes | Yes | Limited (share data only) |
| Off-label intake + routing to written response | Yes | Yes | No (route to MI) |
| AE / safety event capture | Yes | Yes | Yes (regulatory requirement) |
| Pregnancy reporting | Yes | Yes | Yes (regulatory requirement) |
| PQC capture | Yes | Yes | No |
| MSL visit request | Yes | Yes | Yes |
| Sample requests | No | No | Yes |
| Speaker program | No | No | Yes |
| Competitor intelligence | No | No | Yes (passive capture) |
| Hub/access routing | Route to hub | Route to hub | Yes |
| Patient/caregiver callers | Route to patient-support or medcomms-qa | Yes | N/A |

---

## 4. Standard Response vs Custom MI Response

### What the research describes

The research draws a clear operational line:

**Standard Response (SRD/SRL)**: Pre-approved content assets that answer anticipated, on-label FAQ-level topics — dosing/administration, known interactions, storage/stability, approved efficacy and safety data. These are "straightforward" inquiries answerable from prescribing information or established SRDs. An AI agent can retrieve and present these end-to-end.

**Custom MI Response Letter**: Newly researched, written, medically reviewed, and documented responses triggered when no existing SRD covers the question. Common triggers include: off-label dosing or populations, complex polypharmacy not in labeling, evidence synthesis requests (comparative trials, long-term safety), and novel/nuanced questions. FDA's unsolicited off-label guidance effectively makes certain topics "custom by default" because the response must be tailored, balanced, include non-supportive data, carry specific disclosures, and be documented.

### How the current implementation handles this

**It does not.** The `hcp-support` prompt treats all questions the same way: answer from labeling if you can, deflect to "Medical Information" if you cannot. There is no concept of:

1. Checking whether an SRD exists for the question topic
2. Telling the caller "We have a standard response document on this topic that I can send you"
3. Telling the caller "This will require a custom written response from our medical team — I'll capture your question and contact details and you'll receive a response within [timeframe]"
4. Intake workflow for custom requests (capturing the specific question, HCP contact details, clinical context, and urgency)
5. Setting response time expectations
6. Follow-up confirmation

This is a significant functional gap. In real MI operations, a large percentage of calls result in document fulfillment rather than a complete answer during the call itself. The AI agent should be able to serve as an effective intake and triage layer for the full response workflow.

---

## 5. Handoff Workflows

### MI to Pharmacovigilance / Drug Safety

**Research says**: This is the most time-critical handoff. MI is the first receiver of AEs/PQCs. SOPs define 24-hour timelines for potential AEs and 24-72 hours for PQCs. There must be reconciliation processes so nothing is missed.

**Current implementation**: The prompt has `report_adverse_event` and `escalate_to_safety` functions, with a structured capture protocol. This is the best-implemented handoff.

**Gaps**: No PQC capture path. No expanded safety event types (off-label use reports, medication errors, lack of effect, overdose). No pregnancy-specific path (present in `medcomms-qa` but absent here). No mention of timeline expectations or reconciliation. No MedWatch reference for direct FDA reporting.

### MI to MSL (Field Medical)

**Research says**: The trigger is complexity requiring dialogue, context, or scientific exchange beyond document fulfillment. Peer companies provide explicit "connect with an MSL" paths. FDA's guidance warns that MSL interactions at promotional events can create solicitation risk.

**Current implementation**: The `request_msl_visit` function exists and the prompt offers MSL visits for "deeper scientific exchange" and off-label questions. This is directionally correct.

**Gaps**: The prompt does not define clear escalation criteria — when specifically should the agent proactively suggest an MSL vs waiting for the HCP to ask? The research suggests: complex polypharmacy, evidence synthesis needs, comparative effectiveness questions, and any off-label topic where a written response alone is insufficient. The prompt also does not capture the MSL request reason in enough clinical detail to be actionable for the MSL.

### MI to Commercial / Patient Access Hubs

**Research says**: MI must not become a sales engine. Access/coverage/reimbursement questions should route to managed markets, patient services, or hub programs. FDA's HCEI framework is for payors only, not prescribers. Industry standards show zero companies report MI into commercial.

**Current implementation**: This handoff is entirely missing. The prompt has no routing for access, coverage, formulary, prior auth, copay, or specialty pharmacy questions. There is no function to transfer to hub services. The prompt actually includes commercial features (samples, speaker programs) that should not be in MI at all.

### Handoff Summary

| Handoff | Implementation Status | Priority Fix |
|---|---|---|
| MI to PV/Safety | Partially implemented | Add PQCs, pregnancy, expanded event types, timelines |
| MI to MSL | Implemented | Add clearer escalation criteria and structured reason capture |
| MI to Commercial/Hub | MISSING | Add routing function and access/coverage deflection language |
| MI to Written Response Team | MISSING | Add custom response intake workflow |

---

## 6. AI Suitability Analysis

### What the research says AI can handle end-to-end

1. **On-label factual lookups from pre-approved content** — dosing, administration, approved PK, labeled DDIs, storage/stability, approved efficacy/safety data from labeling or existing SRDs. These are "straightforward" inquiries.
2. **Routing, intake, and records capture** — including mandatory screening for AEs/PQCs, capturing requestor demographics, and documenting interactions.
3. **Non-substantive triage responses** — redirecting off-label or complex questions into appropriate channels without providing substantive off-label content.

### What the research says must escalate to humans

1. **Any off-label response content generation** — unless strictly drawn from an already-approved SRD and delivered with required disclosures. The risk of "solicitation by interface" is too high for an AI to manage autonomously.
2. **Complex polypharmacy scenarios** — require clinical judgment about which evidence is relevant and how to balance it.
3. **Any case that is or becomes a safety report** — AEs, pregnancy exposure, overdose, medication errors, lack of effect. AI can assist capture but escalation is the default.
4. **Patient-specific medical advice** — the agent must preserve the boundary that MI does not advise on individual patients.
5. **HCEI / formulary / coverage information targeted to prescribers** — requires audience detection and routing, not substantive response.

### How this maps to the current implementation

The current prompt positions the AI as a real-time answer engine for on-label questions, which is the correct "end-to-end" zone. The off-label deflection exists but is poorly framed (self-referential). AE capture is present.

**What is missing is the "human-supervised acceleration" model the research recommends as most defensible.** The research explicitly says the near-term design should be "AI that accelerates MI work under supervision" — with LLMs integrated into "a series of human-supervised and curated steps" rather than full automation. The current prompt gives no indication that a human is monitoring, reviewing, or supervising the interaction. Adding a concept of "live MI specialist available for transfer" and making escalation to a human a first-class workflow would significantly improve both compliance defensibility and clinical safety.

---

## 7. Concrete Recommendations

Ordered by impact (highest first).

### Recommendation 1: Remove commercial features from the MI agent

**Impact: Critical (regulatory)**

Remove sample requests, speaker program mentions, and competitor intelligence guidance from `hcp-support`. These belong exclusively in `hcp-outbound`. Their presence in the MI agent compromises the independence-from-commercial requirement that both FDA and OIG expect. The competitor guidance block ("Focus on the differentiated clinical profile of Praxis products") is overtly promotional language that has no place in an MI interaction.

### Recommendation 2: Add solicited/unsolicited request tracking

**Impact: Critical (regulatory)**

At the start of every interaction, the agent should determine and document whether the inquiry was self-initiated or prompted by company contact (e.g., following an outbound call, a rep visit, a company-sponsored event, or a promotional website). This is "the compliance hinge" per FDA guidance and determines what the agent is permitted to say about off-label topics. If the request is solicited, the off-label response must be even more restrictive (essentially limited to labeling only).

### Recommendation 3: Add special-population handling with pregnancy reporting

**Impact: High (clinical safety + regulatory)**

Port the `[PREGNANCY REPORTING]` section from `medcomms-qa` into `hcp-support` and expand it. Add explicit guidance for renal impairment, hepatic impairment, pediatric, and geriatric questions — including when these cross into off-label territory and require escalation. Pregnancy exposure is a mandatory safety report; the current `hcp-support` prompt does not treat it as one.

### Recommendation 4: Add expanded safety-event screening

**Impact: High (regulatory)**

Replace the narrow AE-only trigger with the expanded safety-reportable categories from the research: off-label use reports, pregnancy exposure, overdose, medication errors, drug-drug interactions (when clinically consequential), lack of therapeutic effect, and product quality complaints. Add PQC capture as a separate function with its own SOP timeline (24-72 hours). Reference MedWatch for direct FDA reporting.

### Recommendation 5: Fix the off-label deflection to eliminate the self-referential loop

**Impact: High (operational clarity)**

Change "I can connect you with our Medical Information department" to language that accurately describes what will happen: "That question is outside the approved labeling. I'd like to capture your question and have our medical team prepare a comprehensive, referenced written response. May I get your contact details and the specific clinical scenario?" This converts the deflection into a functional intake workflow for custom MI response letters.

### Recommendation 6: Add access/coverage/hub routing

**Impact: High (JTBD coverage)**

Add a clear routing path for access, coverage, formulary, prior authorization, copay, and specialty pharmacy questions. The agent should say something like: "For questions about patient access and coverage, I'd like to connect you with our Patient Access team who can help with benefits verification, prior authorization, and copay support. May I transfer you?" Add a function (e.g., `transfer_to_hub` or `route_to_access`) to execute this.

### Recommendation 7: Implement the standard response vs custom response distinction

**Impact: High (operational realism)**

The agent should distinguish between questions answerable from existing approved content (real-time response) and questions requiring a custom written response (intake workflow). For the latter, the agent should: capture the specific question, confirm contact details and preferred delivery method, set a response time expectation, and log the request. This transforms the agent from a partial answer engine into a complete MI intake system.

### Recommendation 8: Add required disclosure elements for off-label adjacent responses

**Impact: Medium (regulatory)**

When the agent provides information that touches areas near the off-label boundary (e.g., discussing approved dosing for a population where off-label use is common), it should include the disclosure elements FDA recommends: approved indications statement, prominent safety information including boxed warnings where applicable, and a reference to the full prescribing information. The current prompt has no instruction to include these disclosures.

### Recommendation 9: Add clear escalation criteria for MSL routing

**Impact: Medium (operational)**

Define explicit triggers for when the agent should proactively offer MSL involvement rather than waiting for the HCP to ask: complex polypharmacy beyond labeling, evidence synthesis or comparative effectiveness requests, repeated or detailed off-label questions, requests for clinical trial information beyond published data, and KOL-level scientific exchange needs. Capture a structured reason when `request_msl_visit` is called.

### Recommendation 10: Add human-in-the-loop escalation as a first-class capability

**Impact: Medium (defensibility + trust)**

Add a `transfer_to_live_specialist` function and instruct the agent that at any point, if the HCP requests a human, or if the question exceeds the agent's confidence in providing a compliant and accurate answer, the agent should offer and execute a warm transfer. The research's recommended model is "human-supervised acceleration" — the AI should always have a human backstop available and should be transparent about it. This also improves trust with HCPs who may be skeptical of AI in a clinical information context.

---

## Appendix: Mapping of Research-Identified MI Call Types to Agent Capability

| Call Type (Research) | Frequency | Current Agent Capability | Recommended Capability |
|---|---|---|---|
| Dosing / administration | 83.8% | Can answer from labeling | Add neurology-specific subtypes |
| Drug-drug interactions | 76.1% | Can answer simple DDIs from labeling | Add complexity threshold + escalation |
| Adverse events / safety | 70.6% | AE capture present | Expand to full safety event taxonomy |
| Clinical practice guidelines | 66.9% | Not addressed | Add SRD retrieval or MSL routing |
| Disease state information | 55.4% | Not addressed | Add within approved labeling scope |
| Special populations (pregnancy, renal, etc.) | High pain, lower frequency | NOT addressed | Add with escalation logic |
| PK/PD questions | Medium frequency | Partially addressed ("pharmacokinetic questions") | Adequate with labeling reference |
| Storage / stability | Medium frequency | Not mentioned | Add to standard response capability |
| Access / reimbursement | Common | NOT addressed | Add routing to hub/access team |
| Comparative effectiveness | Medium frequency | Deflects to MSL | Correct approach — keep |
| Product quality complaints | Lower frequency | NOT addressed | Add PQC capture function |
