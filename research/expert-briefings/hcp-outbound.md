# HCP Outbound Agent: Expert Briefing

## Overview

This briefing audits the current `hcp-outbound` agent (Emma) against the two primary research documents — the US neurologist outbound engagement research and the MedComms/pharma deep research report — plus the codebase implementation (prompt, behavioral signals config, outcomes config, types, and greeting logic). The goal is to identify coverage gaps, compliance risks, signal-to-action misalignments, and concrete improvement opportunities.

---

## 1. JTBD Coverage Audit

The research identifies six core HCP jobs-to-be-done and their paired manufacturer jobs. Below is the assessment of how the current prompt handles each.

### 1.1 "Make a high-confidence patient decision quickly"

**HCP need:** Get decision-grade evidence in minutes — efficacy data, safety data, mechanism of action — calibrated to the specific therapeutic area (ET vs. DEE/Dravet). The research emphasizes that ET needs quick differentiation from entrenched generics, while DEE/Dravet needs evidence under uncertainty with complex polypharmacy.

**Manufacturer paired job:** Deliver decision-grade evidence in minutes, not marketing-grade claims in 15 minutes, with fair balance and approved materials.

**Current prompt coverage:** The prompt's `[KEY TALKING POINTS]` section includes reference to "approved efficacy data" and drug names. The `COMPETITOR_RESEARCH` signal block instructs the agent to "lead with Praxis clinical data and differentiation — mechanism of action, efficacy endpoints, and safety profile from approved labeling." The `send_clinical_data` function exists for fulfillment.

**Rating: ADEQUATE**

**Gaps:**
- No differentiation between ET and DEE/Dravet conversation strategies. The research is explicit that these require fundamentally different engagement economics and clinical framing — ET is about earning attention in a crowded, time-starved setting with entrenched generics; DEE/Dravet is about high-stakes decisions under uncertainty with complex safety monitoring. The prompt uses a single flow for both.
- No "fair balance" enforcement mechanism. The prompt says "stay within FDA-approved labeling" in the safety section, but provides no structured way to ensure the agent delivers balanced risk/benefit when citing efficacy data.
- The "in minutes" time constraint from the research is partially addressed by the 40-word response limit, but the agent has no structured "clinical elevator pitch" — a 60-second decision-grade summary tailored to the therapeutic area.

### 1.2 "Solve access friction fast"

**HCP need:** Benefit verification, PA templates, appeals support, specialty pharmacy coordination, patient support services. The research emphasizes this is especially critical in pediatric epileptology where payer delays are more damaging.

**Manufacturer paired job:** Provide these services without making access support contingent on prescribing volume or choice.

**Current prompt coverage:** The `FORMULARY_LOOKUP` signal block mentions "benefits verification and prior auth support" and "copay card information." The `[KEY TALKING POINTS]` reference "hub services, copay assistance, and nurse educators." The outcomes config includes `copay-card-issued`, `hub-enrollment`, and `prior-auth-assist`.

**Rating: ADEQUATE**

**Gaps:**
- The prompt does not differentiate access friction between ET (likely commercial, simpler PA landscape) and DEE/Dravet (specialty pharmacy, REMS-like monitoring, multi-payer complexity). The research is clear that the access job is qualitatively different across these TAs.
- No function call for initiating benefit verification or PA support directly from the call. The outcomes exist but there is no `initiate_pa_support` or `connect_to_hub` function in the prompt's function list. The agent can only verbally offer — it cannot take action.
- The compliance boundary from the research ("without making access support contingent on prescribing volume or choice") is not reflected in the prompt. The prompt exposes `prescribingVolume` to the agent, which creates a risk that the agent could unconsciously (or consciously) modulate service intensity based on prescribing volume.

### 1.3 "Operationalize safe use in real workflow"

**HCP need:** Enrollment steps, required monitoring, dosing titration logistics, avoiding errors. The research emphasizes this is critical for complex specialty drugs and that even "no-rep" offices may want operational clarity.

**Manufacturer paired job:** Make the "right way to use the drug" easy, audit-ready, and accessible via preferred channels.

**Current prompt coverage:** The `send_clinical_data` function mentions "prescribing information" and "patient support materials." The talking points mention "nurse educators."

**Rating: WEAK**

**Gaps:**
- No specific operational workflow content. The research identifies concrete operational needs: enrollment steps, REMS/monitoring requirements (e.g., Fintepla's pre-treatment echocardiogram requirement as an analog), dosing titration logistics, and error-avoidance checklists. The prompt has none of this.
- No function for sending operational materials specifically (quick-start guides, titration calendars, monitoring checklists). The `send_clinical_data` function is generic.
- No mention of nurse educator referral as a primary action for operational support, even though it exists in the outcomes config as `nurse-educator-referral`.
- The research's insight that "even offices that don't want reps may want operational clarity" is not leveraged — the prompt has no operational-help positioning for resistant HCPs.

### 1.4 "Get credible answers to complex scientific questions without sales pressure"

**HCP need:** Comparative effectiveness, sequencing, rare comorbidities, edge-case safety — often adjacent to off-label territory. The research is explicit: the sales rep is structurally the wrong messenger for these questions, and MSL/medical information is the correct channel.

**Manufacturer paired job:** Triage medical questions correctly, respond with validated scientific content, keep sales incentives out of the medical exchange channel.

**Current prompt coverage:** The `OFF_LABEL_QUERY` signal and the `request_msl_visit` function address this. The prompt says "Offer an MSL visit for deeper scientific exchange if the HCP has complex questions." The safety section says "NEVER promote off-label use."

**Rating: ADEQUATE**

**Gaps:**
- The triage trigger is passive — the agent waits for the HCP to ask an off-label question or express complexity, then offers MSL. The research suggests proactive triage is better: when the HCP's signals (or the therapeutic area profile) indicate the conversation is likely to require scientific depth, the agent should route to MSL early rather than attempting to handle it commercially.
- No explicit instruction for what to do when the HCP asks a question that is on-label but scientifically complex (e.g., drug-drug interactions, special populations). The prompt does not distinguish "simple on-label" from "complex on-label" — only "on-label" from "off-label."
- The MedComms research emphasizes the DRESS model (Define, Research, Evaluate, Synthesize, Share) for MI responses. The outbound agent should not be attempting to execute this model; it should be recognizing when the question requires it and handing off cleanly.

### 1.5 "Obtain samples or bridge therapy when appropriate"

**HCP need:** Samples remain a high-value service and a common follow-up action after clinical engagement. The research cites data that 54% of physicians who complete an e-detail say sample request is the most likely follow-up action.

**Manufacturer paired job:** Run a PDMA-compliant, auditable program; position samples as patient benefit, not prescriber reward.

**Current prompt coverage:** The `request_samples` function exists and captures drug, quantity, shipping address, NPI. The prompt says "Offer samples for eligible HCPs" as goal #5.

**Rating: ADEQUATE**

**Gaps:**
- No PDMA compliance guardrails in the prompt. The research is specific: 21 CFR 203.30 requires a signed written request from a licensed practitioner, state license verification, and a signed receipt. The function captures NPI but the prompt does not instruct the agent to verify licensure or explain the written-request requirement.
- Samples are listed as goal #5 — last in priority. The research suggests samples should be offered more naturally as a bridge-to-therapy action, especially after clinical data engagement, not as a closing afterthought.
- No distinction between "samples available" vs. "samples not available for this product" — the prompt assumes samples exist for all products.

### 1.6 "Get peer context and education that feels legitimate"

**HCP need:** Peer context for where a therapy fits, but sensitivity to "manufactured education." The PhRMA Code restricts speaker programs (bona fide educational need, venue restrictions, no repeat attendance on same topic with meals).

**Manufacturer paired job:** Use peer-to-peer programs sparingly and defensibly; invest more in friction-removing services and high-integrity scientific exchange.

**Current prompt coverage:** The `CONFERENCE_ACTIVITY` and `KOL_ENGAGEMENT` signal blocks offer speaker program details and MSL visits. The talking points include "speaker program where you can hear from peers about their clinical experience."

**Rating: WEAK**

**Gaps:**
- The prompt treats speaker programs as a primary conversion action, which contradicts the research's warning that "more dinners" is exactly where OIG is looking. The prompt should de-emphasize speaker program invitations and emphasize MSL visits and self-directed digital content.
- No guardrails against repeatedly offering speaker programs to the same HCP — the research cites OIG's flag on "repeated programs on the same topic."
- The `speakerProgramMember` field is exposed but the prompt does not differentiate behavior based on whether the HCP is already a member (in which case pushing more speaker programs could look like inducement).
- No mention of accredited CME as a separate, higher-integrity alternative to company speaker programs.

---

## 2. Compliance Boundary Analysis

### 2.1 OIG/Anti-Kickback Statute Risks

The research defines the core compliance boundary: the AKS makes it criminal to offer "any remuneration" to induce referrals, and even FMV arrangements can be risky if context suggests the purpose is prescribing influence.

**Current risks in the prompt:**

1. **Prescribing volume visibility.** The prompt exposes `prescribingVolume` to the agent as contact context. While the instruction says "use to personalize, never recite," the research warns that selection, frequency, or context that suggests prescribing influence creates AKS risk. If the agent modulates service intensity or offer aggressiveness based on prescribing volume, this could be construed as directing more resources toward higher prescribers — a classic inducement pattern.

2. **Speaker program as conversion goal.** The prompt lists "Invite to speaker programs if appropriate" as goal #4 and the outcomes config tracks `speaker-program-interest` as a conversion outcome (`isConversion: true`). The research documents OIG's Special Fraud Alert flagging speaker programs as an enforcement hotspot. Tracking speaker program interest as a commercial conversion metric is exactly the pattern that creates enforcement risk.

3. **Sample offers without PDMA workflow.** The `request_samples` function does not enforce the written-request or licensure-verification requirements of 21 CFR 203.30. While this may be handled downstream, the agent-level UX creates a "frictionless samples" experience that could look improper if audited.

4. **Access support + prescribing volume = potential quid pro quo framing.** The prompt offers hub services, copay assistance, and PA support while also having visibility into prescribing volume. If the agent's behavior differs based on prescribing volume (even implicitly through signal severity), this creates a paper trail that looks like access support is being allocated based on commercial value.

### 2.2 Education vs. Promotion Line

The research is clear: "it's education" is not a safe phrase. If it is controlled by the company, tied to a brand, and delivered by a paid representative, treat it as promotion.

**Current risks:**

1. **Greeting framing.** The greeting says "exciting clinical developments" and "compelling clinical data" — these are promotional frames, not educational ones. The research emphasizes that a promotional communication must be truthful and non-misleading, and that framing must not pre-judge benefit. "Exciting" and "compelling" are evaluative terms that cross the education-promotion line.

2. **"Many of your colleagues have been asking about..."** This phrase in the behavioral signals section is a social-proof persuasion technique, not a scientific exchange. It is exactly the kind of framing the Persuasion Knowledge Model predicts will trigger resistance in experienced specialists.

3. **No fair balance mechanism.** The prompt instructs the agent to share efficacy data but has no structured mechanism for ensuring safety information accompanies efficacy claims. FDA requires fair balance in all promotional communications.

### 2.3 Sunshine Act Exposure

The research frames Sunshine Act compliance as "assume it will be public." The prompt handles this implicitly — samples, speaker programs, and MSL visits would all generate reportable transfers of value.

**Current risk:** The prompt does not instruct the agent to disclose that interactions may be reportable under Open Payments. While this may not be legally required in every interaction, the research suggests defensibility and audit-readiness should be designed in from the start.

### 2.4 Off-Label Promotion Risk

The MedComms research documents the three-part test for unsolicited off-label requests: unsolicited, truthful/non-misleading, and balanced. The research also warns that if a system is designed such that search terms generate standard responses that go beyond the scope of what is being requested, requests can be deemed solicited.

**Current risk:** The `OFF_LABEL_QUERY` signal category means the system has detected that an HCP previously queried about off-label use. If the outbound agent then proactively calls and discusses the therapeutic area, the HCP may naturally raise the off-label topic again. But the call itself was initiated by the company based on the off-label signal — which creates an argument that the "unsolicited" character of any off-label discussion was compromised by the company's signal-driven outreach.

**Recommendation:** When `OFF_LABEL_QUERY` is a signal, the call should be explicitly routed to MSL/medical affairs, not the commercial outbound agent. The research is unambiguous: sales/marketing personnel should have no input on off-label responses.

---

## 3. Signal-to-Action Mapping

### 3.1 Current Signal Categories vs. Research NBA Frameworks

The research identifies five signal families used in pharma NBA systems:

| Research Signal Family | Codebase Signal Category | Mapping Quality |
|---|---|---|
| First-party engagement signals (CRM, email, rep insights) | Not mapped | MISSING — no signal category for prior rep interactions, email engagement, or CRM history |
| Patient-journey / prescribing proxies (claims, Rx data) | `FORMULARY_LOOKUP` (partial) | WEAK — formulary lookup is one proxy but the research describes much richer prescribing-behavior segmentation |
| Digital intent signals (content consumption, point-of-learning) | `COMPETITOR_RESEARCH`, `SYMPTOM_SEARCH` | ADEQUATE — these capture the intent dimension, though SYMPTOM_SEARCH is patient-facing and unlikely for HCP outbound |
| Conference and event attendance | `CONFERENCE_ACTIVITY`, `KOL_ENGAGEMENT` | STRONG — good coverage of the event/education signal family |
| EHR-adjacent outreach channels | Not mapped | MISSING — no integration with clinical workflow signals |

### 3.2 Signal-to-Action Alignment

**COMPETITOR_RESEARCH -> Clinical differentiation:** STRONG. The prompt correctly routes this signal toward differentiation data and MSL offers rather than competitive disparagement.

**FORMULARY_LOOKUP -> Access support:** STRONG. The signal correctly maps to hub services, copay cards, and PA support. However, the prompt characterizes this as "high-value engagement — the HCP is close to a prescribing decision," which is a commercial frame that should be an access-support frame.

**CONFERENCE_ACTIVITY -> Post-event follow-up:** ADEQUATE. The prompt references "recent clinical data presentations" but does not specify which conference or what data — the agent has no content to make this specific and credible.

**KOL_ENGAGEMENT -> Scientific exchange:** ADEQUATE. Routes to MSL visits and speaker programs. The speaker program emphasis is problematic per compliance analysis above.

**OFF_LABEL_QUERY -> Commercial outbound call:** PROBLEMATIC. As documented in the compliance section, this signal should not trigger a commercial outbound call at all. It should trigger an MSL outreach or medical affairs contact.

**SYMPTOM_SEARCH and ADHERENCE_GAP:** These are patient-facing signal categories (pathway is `patient-education` and `adherence-support`). They appear in the signal config but should never appear on an HCP outbound contact. There is no guard in the prompt preventing the agent from receiving and acting on patient-centric signals in an HCP context.

**CAREGIVER_DISTRESS:** Similarly patient/caregiver-facing. Should not appear in HCP outbound context.

### 3.3 Missing Signal-Action Mappings

The research identifies several action patterns not currently mapped:

1. **"No SRD exists" / content gap signal:** When an HCP asks a question that has no standard response document, this should be captured and fed back to medical strategy. The codebase has no mechanism for this.
2. **Opt-in/pull conversion:** The research emphasizes converting "no access" offices into inbound requests through self-directed e-detailing and content offers. There is no signal or action for "offered digital self-service content."
3. **Channel preference signal:** The contact record has `preferredChannel` but the outbound prompt does not reference or adapt to it. If an HCP prefers SMS or web, calling them is already misaligned.
4. **Access restriction signal:** ZS's framework distinguishes accessible (>70% rep meetings), restricted (31-70%), and severely restricted (<30%) physicians. There is no signal for institutional or individual access restrictions.

---

## 4. Gatekeeper Handling

### 4.1 What the Research Says

The research identifies gatekeeping as multi-layered:
- **Policy-driven:** Health systems require structured scheduling, advance approval, sign-in, and constraints on where reps can go.
- **Workflow-driven:** Staff triage because the schedule is full — they are optimizing throughput, not protecting the physician from knowledge.
- **Academic center restrictions:** Centralized policies, reduced individual physician autonomy.

Effective strategies from the research:
- **Make the ask tiny:** "7 minutes on one specific patient-relevant decision point."
- **Use staff as workflow partners:** Offer clear logistics (who, what topic, what time cost, what materials).
- **Build opt-in loops:** Convert "no access" into inbound requests through digital content offers.
- **Route scientific questions to MSL fast.**

### 4.2 Current Prompt Handling

The prompt has exactly one gatekeeper instruction:

> If gatekeeper answers: "Hi, I'm Emma from Praxis BioSciences. I was hoping to speak with Dr. [Name] briefly about some clinical data in [TA]. Is the doctor available?"

**Rating: WEAK**

**Gaps:**

1. **No detection mechanism.** The `answeredBy` parameter is accepted by the interface but never used in the prompt logic. The prompt relies on the agent to infer from conversational context that a gatekeeper answered — which is unreliable for a voice AI agent.

2. **No gatekeeper-specific conversation flow.** The single script line does not handle common gatekeeper scenarios:
   - "The doctor is with patients all day" — no instruction for requesting a callback window or offering to send materials.
   - "We don't take calls from pharma reps" — no instruction for positioning as non-promotional support or offering digital alternatives.
   - "Can I take a message?" — no instruction for what message to leave with staff.
   - "What company are you with? What is this regarding?" — no instruction for being transparent about the purpose without the full clinical pitch.

3. **No staff-as-partner framing.** The research says office staff respond to clear logistics: who you are, what topic, what the time cost is, what materials you have. The current script gives none of this — just a vague "clinical data" reference and a request for availability.

4. **No opt-in conversion path.** When the gatekeeper says the doctor is unavailable, the prompt has no mechanism for offering to send a brief email summary, a link to self-directed content, or scheduling a specific callback time through the office's preferred scheduling process.

5. **No institutional restriction awareness.** Academic medical centers and health systems often have formal rep-visit policies. The prompt has no awareness of or adaptation to institutional context (the `institution` field exists but is never used to modulate behavior).

---

## 5. Conversion Benchmarks

### 5.1 What the Research Provides

| Metric | Benchmark | Source/Notes |
|---|---|---|
| **Physician accessibility (traditional rep)** | 44% accessible (>70% of reps seen), 38% restricted (31-70%), 18% severely restricted (<30%) | ZS AccessMonitor |
| **Overall connect willingness** | Near historic lows; overload drives opt-out | ZS commentary |
| **Triggered email open rate** | 33% (vs. 25.3% broadcast) | IQVIA 2024 |
| **Email engagement trend** | +47% YoY in 2024 | IQVIA |
| **Post-e-detail sample request** | 54% of physicians most likely follow-up action | SDI 2008 (directional, dated) |
| **MSL referral rate** | No reliable public benchmark; treated as quality-of-engagement indicator, not volume target | Multiple |

### 5.2 Implications for Agent Design

1. **Connect rate expectations should be low.** If 38% of neurologists are "restricted" and 18% are "severely restricted," plus willingness to engage is at historic lows, the agent should be designed for a world where most calls do not reach the physician. This means the voicemail message, SMS follow-up, and gatekeeper interaction are arguably more important than the live physician conversation — and currently receive far less design attention.

2. **Every connected call is precious.** The research's message is clear: when you do connect, the interaction must be maximally relevant and minimally intrusive. The current prompt's generic greeting ("exciting clinical developments") wastes the most valuable seconds of the call with promotional framing instead of immediate clinical relevance.

3. **Sample requests as a conversion signal are validated.** The 54% post-engagement sample request rate (even from 2008 data) suggests the agent should be structured so that sample offers follow naturally from clinical data engagement, not as a standalone pitch.

4. **MSL referral should not be a volume metric.** The research explicitly warns against tying medical engagement to commercial objectives. The current outcomes config treats all outcomes as binary conversions. MSL referral should be tracked as a quality indicator with no volume target.

5. **Digital follow-up is the highest-leverage channel.** The 33% triggered email open rate vs. 25.3% broadcast rate validates the signal-driven approach. The agent's SMS follow-up templates (referenced in outcomes config) are well-positioned but underspecified in the prompt — the agent has no guidance on what makes a good follow-up message.

---

## 6. HCP Psychology

### 6.1 What the Research Says

Three interlocking psychological dynamics govern HCP receptivity:

**Reactance:** When people perceive a threat to their autonomy, they resist. Triggered by controlling language, high-frequency check-ins, and cues that the interaction is for the company's benefit. The research states: "the default emotional state is not curiosity, it's resistance."

**Persuasion Knowledge Model:** Experienced professionals recognize persuasion attempts and adapt by discounting, resisting, or reframing. Specialists with high persuasion literacy will penalize shallow marketing claims faster than less-targeted provider groups.

**Trust skepticism:** Evidence links physician-industry interactions with prescribing behavior changes. In neurology specifically, Open Payments analyses show high prevalence of payments and associations with prescribing patterns. HCPs are guarded because scrutiny is real.

Three factors that increase receptivity:
1. **Immediate clinical relevance** — data that helps with an active patient decision.
2. **Channel control** — HCPs are more receptive when they choose the channel and cadence.
3. **Burden reduction** — help with access barriers, paperwork, operational friction.

### 6.2 Prompt Calibration Assessment

**Rating: WEAK**

**Problems:**

1. **Greeting triggers reactance.** "Exciting clinical developments" and "compelling clinical data" are evaluative frames that signal promotional intent. The Persuasion Knowledge Model predicts that experienced neurologists will immediately classify this as a sales call and activate resistance. The research's recommendation is to lead with the HCP's immediate clinical context, not the company's enthusiasm about its data.

2. **"Many of your colleagues" is social proof.** The behavioral signals section suggests saying "Many of your colleagues have been asking about..." This is a textbook persuasion technique (social proof / bandwagon). High-persuasion-literacy HCPs will recognize it instantly and discount everything that follows.

3. **No autonomy preservation.** The research says channel control is a key receptivity driver. The prompt does not offer the HCP control over the interaction format: "Would you prefer I send this as a brief email instead?" or "Would you rather schedule a time that works better for your workflow?"

4. **Company-benefit framing.** The greeting says "I thought you'd find our latest data particularly relevant" — this frames the value proposition as the company's judgment about what the HCP should find relevant, rather than asking what the HCP actually needs.

5. **No burden-reduction lead.** The research identifies "burden reduction" as a top receptivity driver. The prompt leads with clinical data offers and only mentions access support as a secondary topic. For many neurologists, leading with "I can help with PA support for your patients on [therapy]" would open more doors than "exciting clinical developments."

6. **No hostile-call de-escalation depth.** The "hostile/do-not-call" response is a single line: apologize, update records, hang up. The research's insight is that hostility is often driven by perceived autonomy threat. A brief acknowledgment that "I understand your time is valuable and you may prefer a different way to receive clinical information" preserves the relationship for future digital outreach.

---

## 7. Concrete Recommendations

Prioritized by impact (compliance risk first, then conversion uplift, then polish).

### P0 — Compliance-Critical

**1. Remove OFF_LABEL_QUERY as a trigger for commercial outbound calls.**

The research and MedComms deep-dive are both unambiguous: when an HCP has queried about off-label use, the response channel must be Medical Affairs / MSL, not the commercial team. Having a commercial outbound agent call someone specifically because they showed off-label interest creates a solicitation risk that could vitiate the "unsolicited" character of any subsequent off-label discussion. Route these contacts to MSL outreach instead.

**2. Remove or restrict prescribingVolume visibility in the prompt.**

Exposing prescribing volume to a commercial agent creates an implicit inducement risk — the agent may (even without explicit instruction) allocate more resources, more aggressive offers, or more follow-up to high-volume prescribers. The research warns this is exactly the pattern that creates AKS exposure. Either remove this field from the prompt entirely or replace it with a generic engagement-priority tier that is disconnected from prescribing behavior.

**3. Add fair balance enforcement to clinical data discussions.**

When the agent references efficacy data, the prompt must require that safety context accompanies it. Add a structured instruction: "When discussing clinical efficacy, you MUST include the key safety consideration in the same response. Never present benefit without risk." This is a basic FDA promotional communication requirement that the prompt currently does not enforce.

**4. Reclassify speaker-program-interest as a non-conversion outcome or remove it from commercial tracking.**

OIG's Special Fraud Alert explicitly flags speaker programs as an enforcement hotspot. Tracking "speaker program interest" as a commercial conversion metric creates a documented incentive to push speaker programs — exactly the pattern OIG scrutinizes. Either reclassify this as `isConversion: false` in the outcomes config or remove it from the outbound agent's goals entirely.

### P1 — Conversion-Critical

**5. Build a gatekeeper-specific conversation flow.**

The current single-line gatekeeper script is the weakest part of the prompt. Given that 56% of neurologists are restricted or severely restricted, gatekeeper interactions may outnumber physician interactions. Build a multi-turn gatekeeper flow:
- Identify self clearly: name, company, purpose in one sentence.
- Offer logistics: "It would take about 5 minutes and is about [specific clinical topic] for [TA]."
- If unavailable: "Could I send a brief clinical summary to the office? Or would there be a better time to call back?"
- If "no pharma calls" policy: "I completely understand. Could I leave my contact information in case the doctor has questions about patient access support in the future?"
- Build opt-in conversion: offer to send a link to self-directed digital content or email clinical summaries.

**6. Differentiate ET vs. DEE/Dravet conversation strategies.**

Create two distinct conversation tracks:
- **ET track:** Lead with differentiation from generics. Emphasize mechanism of action novelty. Keep it fast (these are high-volume practices). Position samples as bridge-to-therapy. Anticipate the objection "propranolol/primidone works fine for most patients."
- **DEE/Dravet track:** Lead with clinical complexity acknowledgment. Emphasize safety monitoring support and operational help. Offer MSL engagement earlier in the conversation. Position access support (PA, specialty pharmacy coordination) as the primary value. Anticipate polypharmacy and drug-drug interaction questions.

**7. Replace promotional greeting language with clinical-relevance framing.**

Change greetings from evaluative language ("exciting developments," "compelling data") to need-based language. Examples:
- Instead of: "There have been some exciting clinical developments in Essential Tremor treatment."
- Use: "I'm reaching out to see if our clinical team can support any of your Essential Tremor patients — we have Phase 3 data and access support available."
- Instead of: "I wanted to share some compelling clinical data."
- Use: "I'm checking in to see if there's anything our team can help with for your DEE patients — clinical data, access support, or connecting you with one of our MSLs."

This shifts from company-excitement framing to HCP-need framing, which the research identifies as the primary receptivity driver.

### P2 — Architecture and Polish

**8. Wire up the `answeredBy` parameter for gatekeeper detection.**

The parameter exists in the interface and is passed through the Twilio/Deepgram pipeline, but `buildHcpOutboundPrompt` never uses it. When `answeredBy` is not `human`, the prompt should activate a gatekeeper-specific mode that changes the opening, the goals, and the available actions (e.g., add `leave_message_with_staff`, `send_office_email`).

**9. Add channel-preference awareness to the prompt.**

The contact record has `preferredChannel` but the outbound prompt ignores it. If the HCP's preferred channel is `sms` or `web`, the voice call is already misaligned. The prompt should acknowledge this: "I know you may prefer receiving information digitally — I can send you a brief text with a link to our clinical data if that's easier." This aligns with the research's finding that channel control is a key receptivity driver.

**10. Add a "burden reduction lead" option for high-formulary-lookup or high-access-friction contacts.**

When signals indicate access friction (FORMULARY_LOOKUP), restructure the opening to lead with operational help instead of clinical data: "I'm reaching out because our team can help with coverage and prior authorization for your patients on [therapy] — would that be useful?" The research identifies burden reduction as one of the three factors that consistently increase HCP receptivity. Currently, access support is always positioned as secondary to clinical data, which inverts the priority for many HCPs.

---

## Appendix: Signal Category Audit for HCP Outbound Context

| Signal Category | Appropriate for HCP Outbound? | Notes |
|---|---|---|
| COMPETITOR_RESEARCH | Yes | Core commercial signal |
| FORMULARY_LOOKUP | Yes | Access-friction signal, high value |
| CONFERENCE_ACTIVITY | Yes | Education follow-up signal |
| KOL_ENGAGEMENT | Yes | Scientific exchange signal |
| OFF_LABEL_QUERY | **No — should route to MSL** | Compliance risk; commercial agent should not handle |
| SYMPTOM_SEARCH | **No — patient-facing** | Should not appear on HCP outbound contacts |
| ADHERENCE_GAP | **No — patient-facing** | Should not appear on HCP outbound contacts |
| CAREGIVER_DISTRESS | **No — patient/caregiver-facing** | Should not appear on HCP outbound contacts |

## Appendix: Outcome Type Audit for HCP Outbound

| Outcome | Current isConversion | Recommended | Notes |
|---|---|---|---|
| sample-request | true | true | Validated by research (54% post-engagement action) |
| medical-info-provided | true | true | Core job fulfillment |
| speaker-program-interest | true | **false** | OIG enforcement hotspot; should not be a commercial conversion metric |
| hub-enrollment | true | true | Access support — legitimate |
| prior-auth-assist | true | true | Burden reduction — high value |
| copay-card-issued | true | true | Patient access — legitimate |
| callback-requested | false | false | Pipeline, not conversion |
| declined | false | false | Correct |
| information-provided | false | false | Correct — no commitment |
| ae-reported | true | true | Regulatory requirement |
| nurse-educator-referral | true | true | Operational support |

---

*This briefing is based on analysis of the research documents and codebase as of the date of review. It is not legal advice. Compliance recommendations should be validated with regulatory counsel before implementation.*
