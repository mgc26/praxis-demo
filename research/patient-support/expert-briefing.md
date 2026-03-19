# Patient Support Agent — Expert Briefing

**Date:** 2026-03-18
**Scope:** JTBD coverage audit, gap analysis, regulatory risk, caregiver experience, 90-day abandonment prevention, and concrete recommendations for the Emma patient-support voice agent.

**Source files analyzed:**
- Research: `research/Top Jobs-to-Be-Done on US Manufacturer Patient.md`
- Agent prompt: `ws-backend/src/prompts/agents/patient-support.ts`
- Support knowledge config: `ws-backend/src/config/support-knowledge.ts`
- Screening instruments: `ws-backend/src/config/screening-instruments.ts`
- Behavioral signals: `ws-backend/src/config/behavioral-signals.ts`
- SMS templates: `ws-backend/src/prompts/sms-templates.ts`
- Outcomes: `ws-backend/src/config/outcomes.ts`

---

## 1. JTBD Coverage Audit

The research identifies 10 discrete jobs-to-be-done for inbound hub callers. Below is each job, its coverage rating in the current agent implementation, and the evidence for that rating.

### Job 1: Find out if the therapy is covered and what the patient will actually pay
**Rating: ADEQUATE**

The prompt's `[GOAL]` section (item 2) says: "For refill/access questions: check hub enrollment, copay card status, specialty pharmacy." The `medication-access` pathway in `support-knowledge.ts` includes talking points about PA initiation, copay assistance, and appeals. The `ADHERENCE_GAP` signal guidance in the prompt mentions checking "specialty pharmacy status" and "insurance or prior auth issues."

**Weaknesses:** The research emphasizes that callers need a "clear answer on coverage status, expected out-of-pocket cost range, what's blocking access, and an explicit next-step timeline." The prompt does not instruct Emma to provide an estimated timeline, nor does it tell her to proactively explain the status of what is blocking access (PA, step therapy, routing) in plain language. The prompt also has no instruction to avoid making coverage promises or guarantees — a specific regulatory constraint the research calls out.

### Job 2: Get enrolled and give the hub permission to act
**Rating: ADEQUATE**

The prompt includes `enroll_in_hub` as a function and the `[GOAL]` section (item 5) says: "For enrollment: guide through hub enrollment and copay card activation." The SMS template `hub_enrollment_confirmation` exists.

**Weaknesses:** The research emphasizes that enrollment should "feel simple" with "clear explanation of what the consent enables" and "options to complete via phone, electronic signature, fax, or secure upload." The prompt has no guidance on explaining what enrollment authorizes (disclosure to insurers, pharmacies, manufacturer), what it does NOT authorize, or how to handle the HIPAA authorization component of enrollment. The caregiver-as-signer scenario (common in Dravet) is not addressed.

### Job 3: Resolve prior authorization, denial, or appeal status
**Rating: ADEQUATE**

The `medication-access` pathway lists "Prior authorization," "Appeal support," and "Benefit investigation" as capabilities. The prompt mentions PA in the adherence gap guidance. The outcomes config includes `prior-auth-assist`.

**Weaknesses:** The prompt has no specific flow for handling a caller who has received a denial letter or is mid-appeal. The research describes this caller as in "anger, panic, and distrust" and says the hub should be able to "explain, in plain language, what the payer needs and what the prescriber must submit." The prompt gives Emma no instructions on how to explain PA mechanics, what to do when a denial is in hand, or how to coordinate appeal documentation. There is no function for checking PA status or initiating an appeal.

### Job 4: Get the prescription to the right dispensing channel and get shipment scheduled
**Rating: WEAK**

The prompt mentions "specialty pharmacy" in the adherence gap guidance and the goal section, and the `support-knowledge.ts` lists three specialty pharmacies. However, there are no prompt instructions for handling shipment scheduling, routing issues, cold-chain logistics, or fulfillment delays.

**Weaknesses:** The research describes callers told "you must use a different specialty pharmacy" or experiencing shipment delays as feeling "medically unsafe" (especially Dravet caregivers). The prompt has no guidance for explaining pharmacy routing, coordinating shipment timing, or preventing handoff failures between pharmacy and patient. There is no function for checking shipment status or initiating pharmacy coordination.

### Job 5: Lower out-of-pocket cost or find a viable financial pathway
**Rating: ADEQUATE**

The prompt includes copay card activation as both a goal and a function. The `medication-access` pathway mentions the copay program. The adherence gap guidance says "We can also check if your copay card is active so cost isn't a barrier."

**Weaknesses:** The research describes multiple financial pathways: copay savings, bridge/quick-start supply, patient assistance programs (PAPs) for uninsured/underinsured, and independent foundation referrals. The prompt only addresses copay cards. There is no mention of PAP screening, bridge supply, or foundation referrals. Critically, there is no instruction about federal healthcare program beneficiary exclusions (Medicare/Medicaid/VA-DoD cannot use copay cards) — a specific anti-kickback/OIG requirement the research highlights. An AI agent offering a copay card to a Medicare beneficiary would be a compliance violation.

### Job 6: Learn how to start safely, administer correctly, and reduce practical errors
**Rating: ADEQUATE**

The prompt's `[GOAL]` section (item 4) says: "For dosing/titration questions: offer nurse educator scheduling." The `schedule_nurse_educator` function exists. The nurse educator resources in `support-knowledge.ts` include "Titration coaching" and "Side effect management."

**Weaknesses:** The research emphasizes that the first-fill moment is when caregivers need "scripted guidance consistent with labeling, teach-back behavior, and easy escalation." The prompt has no instructions for providing labeling-consistent information about the medication being taken (storage, titration expectations, what early weeks look like). It simply routes to a nurse educator. For a voice agent taking calls from nervous first-fill caregivers, the gap between "I'll schedule a nurse educator" and "let me walk you through what to expect in the first week" is significant. The research also calls out "teach-back" as a best practice; the prompt has no such instruction.

### Job 7: Coordinate required monitoring and REMS or coverage re-evaluations
**Rating: MISSING**

The research describes this as a critical job, especially for Dravet (mandatory echocardiograms, REMS enrollment) and essential tremor devices (Medicare day 60-91 re-evaluation). The prompt contains zero references to REMS, echocardiograms, monitoring requirements, or coverage re-evaluation milestones. There is no function for checking monitoring status, sending monitoring reminders, or coordinating REMS compliance.

The `support-knowledge.ts` and `behavioral-signals.ts` configs also have no REMS or monitoring concepts. This is a complete gap.

### Job 8: Troubleshoot early side effects or safety concerns and decide who to call next
**Rating: STRONG**

The `[SAFETY]` section is detailed and well-structured. It covers AE detection triggers, a structured capture protocol, serious-event escalation, and clear instructions not to minimize or offer medical advice. The `AE-TRIAGE` screening instrument provides systematic detection. The Dravet-specific safety block adds crisis awareness.

**Weaknesses:** Minor. The research notes that "side-effect discussions can trigger adverse event reporting requirements, and agents must capture minimum required elements." The prompt lists the elements to capture but does not explicitly name the four FDA minimum criteria (identifiable patient, identifiable reporter, suspect product, adverse event). Also, the prompt does not distinguish between drug AEs and device-related complaints, which matters for essential tremor where the product may be a device with different MDR reporting requirements under 21 CFR Part 803.

### Job 9: Report an adverse event or product complaint and feel confident it was handled
**Rating: STRONG**

The AE capture protocol is well-defined. The `report_adverse_event` function, `escalate_to_safety` function, product complaint capture section, and `ae_followup` SMS template create a complete flow. The prompt correctly instructs Emma to inform the caller what happens next.

**Weaknesses:** The research emphasizes the caller should "feel heard" and "told what will happen next." The prompt says "Our medical team will review this and may follow up" but does not instruct Emma to ask whether there is additional information the caller wants to share, or to confirm back what was captured. The research also describes that the "clock starts when any company personnel receive the minimum information" — the prompt has no instruction to capture all four minimum elements in every AE interaction.

### Job 10: Replace therapy, fix dispensing issues, or resolve a "break in therapy" risk
**Rating: WEAK**

The `adherence-support` pathway in `support-knowledge.ts` mentions "Refill Overdue" as an engagement label and has escalation criteria for "missed more than 2 consecutive refills." The prompt has adherence gap guidance.

**Weaknesses:** The research describes panic scenarios: missed refill, lost medication, contaminated supply, damaged shipment, travel without medication. The prompt has no specific guidance for break-in-therapy emergencies. There is no mention of bridge supply, quick-start programs, or replacement logistics — all of which the research identifies as standard hub capabilities. For anti-epileptic drugs, abrupt discontinuation carries seizure risk, which makes this gap clinically dangerous.

### Job 11 (Research-labeled as Job 10): Get caregiver support, validation, and resources that reduce burnout
**Rating: ADEQUATE**

The prompt has a dedicated `[CAREGIVER SUPPORT]` block triggered by `CAREGIVER_DISTRESS` signals. It includes empathy language, resource offers, and a "how are YOU doing?" prompt. The Dravet-specific safety block adds crisis detection. The `C-SSRS-LITE` screening is recommended for caregiver distress signals.

**Weaknesses:** The research describes best-in-class caregiver support as operational — removing steps, reducing cognitive load, providing written follow-up, offering peer support and structured programs (e.g., Dravet Syndrome Foundation Caregiver Connect). The prompt's caregiver support is emotionally warm but operationally thin. It says "We have support groups and resources specifically for caregivers" but gives Emma no specific resources to name. There is no mention of DSF, peer support platforms, caregiver care-coordination tools, or modular burnout content. The "remind them of respite resources if available" instruction has no backing content.

---

## 2. Gap Analysis

### Critical Gaps (jobs or scenarios the research identifies that the implementation does not address)

**Gap 1: REMS and Monitoring Coordination — Completely Missing**

The research states: "echocardiograms are required before treatment, every 6 months during treatment, and once 3 to 6 months after stopping; the therapy is available only through a restricted REMS program with prescriber, patient, and pharmacy enrollment/certification requirements." And for ET: "Medicare continued coverage beyond three months requires a re-evaluation between day 60 and day 91."

The prompt contains no reference to REMS, echocardiograms, monitoring schedules, or coverage re-evaluation milestones. A Dravet caregiver calling about a REMS question would get no specific help. An ET patient at day 55 of Medicare coverage would get no proactive guidance about their approaching re-evaluation cliff.

**Gap 2: Bridge/Quick-Start Supply and Break-in-Therapy Prevention — Missing**

The research says: "Bridge supply, quick-start programs, and replacement logistics are standard hub capabilities." And: "A specialty pharmacy supporting patient support programs lists 'QuickStart,' 'Bridge,' and 'Replacement' among free-goods program types."

The prompt and supporting configs have no concept of bridge supply, quick-start, or emergency replacement. The `medication-access` pathway mentions "Patient at risk of treatment interruption due to access barriers" as an escalation criterion, but there is no corresponding agent behavior or function.

**Gap 3: Federal Program Beneficiary Exclusion from Copay Programs — Missing**

The research is explicit: "A copay savings program describes ineligibility for Medicare/Medicaid/VA-DoD and prohibits submission of reimbursement claims to government programs." And: "The industry norm is to exclude federal program beneficiaries from typical commercial copay cards."

The prompt has no instruction to screen for federal program beneficiary status before offering copay card activation. The `activate_copay_card` function has no safeguard. This is a direct anti-kickback statute / OIG compliance risk.

**Gap 4: Coverage Promise Prohibition — Missing**

The research states: "Agents must avoid making coverage promises ('guarantees') and must treat payer decisions as payer-controlled; manufacturers' own patient support pages often caveat that support does not guarantee coverage outcomes."

The prompt's `medication-access` talking points include "The Praxis copay assistance program may reduce your out-of-pocket cost to as low as $0" — which, while qualified with "may," is close to a guarantee. There is no explicit instruction to Emma to never promise coverage or specific cost outcomes.

**Gap 5: Essential Tremor Device-Specific Handling — Weak**

The research devotes significant space to ET device therapies (neuromodulation, TAPS) with different coverage dynamics, MDR reporting under 21 CFR Part 803, patient training needs, and payer classification as "investigational." The prompt treats ET as a drug-only therapeutic area. The AE capture protocol is drug-focused (references pills, packaging). There is no device-specific training, setup support, or device-complaint handling.

**Gap 6: Unsolicited Off-Label Question Routing — Incomplete**

The research describes the FDA constraint: "You can respond [to unsolicited off-label requests], but you must do it in a controlled, non-promotional way, typically via medical information rather than frontline access staff."

The prompt says: "If asked about off-label use: 'That's a great question for your doctor.'" This is the correct redirect for patients, but the research indicates that if an HCP asks an unsolicited off-label question, the proper route is to medical information, not to "your doctor." The prompt does not distinguish between patient and HCP off-label queries. (Note: the patient-support agent primarily handles patient/caregiver calls, so this risk is lower but not zero.)

**Gap 7: Consent and Authorization Explanation — Missing**

The research details: "The hub makes the enrollment process feel simple: minimal steps, clear explanation of what the consent enables, and options to complete via phone, electronic signature, fax, or secure upload. The caregiver clearly understands what the hub can and cannot do."

The prompt's enrollment flow (`enroll_in_hub`) captures name, DOB, HCP, and insurance but has no instruction to explain what the patient/caregiver is consenting to, what data will be shared and with whom, or the HIPAA authorization component. For a voice-based AI agent handling enrollment, this is both a regulatory risk and a trust gap.

---

## 3. Regulatory Risk Assessment

### HIGH RISK

**1. Missing Federal Program Beneficiary Screen (Anti-Kickback Statute / OIG)**

The copay card activation flow has no guard against enrolling Medicare/Medicaid/VA-DoD beneficiaries. The research explicitly identifies this as a fraud-and-abuse constraint. An AI agent that activates a copay card for a government-program beneficiary would create a documentable compliance violation.

*Mitigation:* Add a mandatory eligibility check question before `activate_copay_card` that asks about government insurance. If positive, redirect to PAP or other eligible programs.

**2. Incomplete AE Minimum Data Elements (FDA 21 CFR 314.80)**

The research states the four minimum criteria for a valid AE report: identifiable patient, identifiable reporter, suspect product, and adverse event/reaction. The prompt's AE capture protocol lists "event description, onset date, severity, ongoing/resolved, action taken, reporter relationship" — it does not explicitly require confirmation of the identifiable patient (could already be known from call context) or suspect product. While the agent likely has this from the contact record, the prompt should enforce explicit capture to survive audit.

*Mitigation:* Add the four minimum elements as a checklist in the AE capture protocol.

**3. No Drug vs. Device AE Reporting Distinction (21 CFR Part 803 vs. 21 CFR 314.80)**

For essential tremor, if the product is a device, medical device reporting (MDR) follows different rules and timelines (30-day vs. 15-day). The prompt treats all products as drugs.

*Mitigation:* Add therapeutic-area-aware AE routing logic that distinguishes drug AE reporting from device MDR.

### MEDIUM RISK

**4. No Coverage Guarantee Prohibition**

The prompt does not explicitly prohibit Emma from making coverage promises. While the current talking points are qualified ("may"), in a free-form conversation an LLM could inadvertently promise outcomes.

*Mitigation:* Add an explicit `[NEVER]` instruction: "Never promise or guarantee insurance coverage, specific copay amounts, or approval outcomes."

**5. No Consent/Authorization Explanation During Enrollment**

HIPAA requires that patients understand what they are authorizing. The enrollment flow captures data but provides no authorization disclosure language.

*Mitigation:* Add scripted consent explanation to the `enroll_in_hub` flow.

**6. No State-Level Call Recording Consent Handling**

The research identifies one-party vs. all-party consent as a key state-level constraint. The prompt has no instruction for Emma to confirm recording consent in all-party consent states.

*Mitigation:* If the system records calls, add a state-aware consent check at call opening or in the pre-greeting IVR.

### LOWER RISK

**7. REMS Compliance Support Gap**

Not a direct regulatory violation by the agent, but failure to support REMS coordination could result in downstream dispensing holds and patient harm, which could create liability.

**8. Nursing Licensure (Indirect)**

The prompt routes to nurse educators but does not verify state-of-residence licensure compatibility. This is a system design issue, not an agent prompt issue, but worth noting.

---

## 4. Caregiver Experience Assessment

### What the Research Says

The research dedicates an entire section to caregiver experience in DEE/Dravet, documenting:

- **77% abnormal sleep quality (PSQI)** in Dravet caregivers, with substantial proportions above clinical cutoffs for anxiety and depressive symptoms.
- **Compressed cognition:** Caregivers ask the same thing repeatedly, lose track of dates and steps, need the agent to restate plans in simpler form.
- **Anger without rudeness intent:** Hostility driven by exhaustion and payer friction, not interpersonal aggression.
- **Hypervigilance and over-triage:** Ambiguous symptoms treated as emergencies, consistent with chronic traumatic stress.

The research identifies four operational best practices:
1. Remove steps (take ownership of BV, PA, pharmacy triage, status updates).
2. Design caregiver-facing mental health support as education and referral, not therapy.
3. Provide nurse navigation that addresses "practical challenges" over time.
4. Use caregiver tools that centralize care information.

### How the Current Prompt Handles It

**What it does well:**
- The `CAREGIVER_DISTRESS` signal triggers a dedicated empathy block.
- The Dravet-specific safety block listens for crisis signals and suicidal ideation.
- The C-SSRS-LITE screening is recommended for caregiver distress.
- The personality section says "Match their energy. If they're anxious, slow down."
- The hostile-caller guidance ("I completely understand your frustration") is present.

**What is missing or weak:**

1. **No compressed-cognition accommodation.** The research describes caregivers who "ask the same thing repeatedly" and "need the agent to restate a plan in simpler form." The prompt has a strict 35-word limit with no exception for callers who need repetition or simplified restatement. A caregiver with impaired cognition from sleep deprivation needs MORE words and MORE structure, not less.

2. **No load-reduction behavior.** The research says best-in-class hubs "remove steps, not just provide information." The prompt positions Emma as an information provider and router, not as someone who takes ownership of multi-step tasks. There is no instruction like "Offer to handle the next steps so the caregiver doesn't have to make another call."

3. **No specific caregiver resources.** The prompt says "We have support groups and resources specifically for caregivers" and "Remind them of respite resources if available" — but gives Emma zero specific resources to reference. The research names the Dravet Syndrome Foundation Caregiver Connect modules, caregiver coordination platforms, and structured tip sheets. Emma cannot offer what she does not know exists.

4. **No written-summary follow-up.** The research says load reduction includes "summaries, written follow-up, fewer handoffs." The prompt has `send_sms` capability but no instruction to proactively offer a written summary of what was discussed and what next steps are. The existing SMS templates are transactional (copay card, enrollment confirmation), not summary/action-plan oriented.

5. **No acknowledgment of the caregiver-as-primary-interlocutor pattern.** In Dravet, the caregiver IS the operational center. The prompt recognizes the contact type (patient vs. caregiver) but does not adjust its operational posture — for example, assuming the caregiver may need to coordinate with school, manage multiple medications, or handle emergency plans.

---

## 5. 90-Day Abandonment Prevention

### What the Research Says Causes Early Abandonment

The research identifies six dominant drivers:

| # | Driver | Research Evidence |
|---|--------|-------------------|
| 1 | **Out-of-pocket cost shock** | Abandonment under 5% at $0 OOP, 45% when cost exceeds $125, up to 75% above $100 for certain specialty drugs |
| 2 | **Unresolved payer controls / claim rejections** | ~33% of commercially insured patients rejected at first fill still unable to access therapy 30 days later |
| 3 | **Channel complexity and handoff delays** | Limited distribution networks, redundant BV, extra authorizations, inability to reach patient |
| 4 | **Monitoring burden / program friction** | Mandatory echocardiograms (Dravet), REMS enrollment, Medicare day 60-91 re-eval (ET devices) |
| 5 | **Early side effects and perceived tradeoffs** | Decreased appetite, somnolence, weight changes in first weeks; hepatic monitoring anxiety |
| 6 | **Caregiver/patient psychosocial overload** | 77% abnormal sleep quality, anxiety, "we cannot do this" tipping point |

### Which Drivers the Current Agent Addresses

| Driver | Addressed? | How |
|--------|-----------|-----|
| **Cost shock** | PARTIALLY | Copay card activation is supported. But no PAP screening, no bridge supply, no federal-program screening, no foundation referrals. |
| **Unresolved payer controls** | PARTIALLY | PA is mentioned in adherence gap guidance and medication-access pathway. But no specific denial-handling flow, no appeal scaffolding, no status-check function. |
| **Channel/handoff delays** | WEAK | Specialty pharmacies are listed in the config. But no shipment tracking, no pharmacy routing explanation, no fulfillment delay intervention. |
| **Monitoring burden** | NOT ADDRESSED | Zero REMS, echocardiogram, or coverage re-evaluation content. |
| **Early side effects** | STRONG | AE detection, triage screening, nurse educator referral, structured capture protocol. |
| **Psychosocial overload** | PARTIALLY | Empathy, caregiver distress recognition, crisis escalation. But no load-reduction behaviors, no specific resources, no summary follow-up. |

### Net Assessment

The agent addresses approximately 2 of the 6 abandonment drivers well (early side effects, partially psychosocial). It partially addresses 2 more (cost, payer controls) but without the depth needed to actually prevent abandonment. It weakly or entirely misses the remaining 2 (channel delays, monitoring burden). The research is clear that the highest-addressability items for a phone agent are exactly the administrative, financial, and behavioral drivers — the agent's current prompt underleverages the phone channel's potential.

---

## 6. Concrete Recommendations (Prioritized by Impact)

### Priority 1 — HIGH IMPACT, COMPLIANCE-CRITICAL

**Recommendation 1: Add Federal Program Beneficiary Screening to Copay Card Flow**

Before `activate_copay_card`, Emma must ask: "Before I set up your copay card, I need to confirm — are you or the patient covered by Medicare, Medicaid, TRICARE, or any other government insurance program?" If yes, redirect to patient assistance program or other eligible support. This is a direct anti-kickback statute compliance requirement.

**Recommendation 2: Add the Four FDA Minimum AE Elements as an Explicit Checklist**

Amend the AE CAPTURE PROTOCOL to require confirmation of: (1) identifiable patient, (2) identifiable reporter, (3) suspect product, (4) adverse event description. Even if some elements come from the contact record, the prompt should instruct Emma to confirm them verbally. Add a note that the regulatory clock starts the moment any of these elements is received.

**Recommendation 3: Add a "Never Promise" Block for Coverage/Cost Guarantees**

Add to `[SAFETY — GENERAL]`: "NEVER promise or guarantee insurance coverage outcomes, specific copay amounts, or prior authorization approval. Always qualify: 'We'll do everything we can to help, but coverage decisions are ultimately made by your insurance plan.'"

### Priority 2 — HIGH IMPACT, PATIENT EXPERIENCE

**Recommendation 4: Build a REMS and Monitoring Coordination Module**

Add a `[REMS & MONITORING]` section to the prompt that is therapeutic-area-aware:
- For Dravet/DEE (ELEX): echocardiogram schedule, REMS enrollment status check, monitoring reminders.
- For ET (if device): Medicare day 60-91 re-evaluation requirement, adherence documentation.
- Add a `check_monitoring_status` function and a `send_monitoring_reminder` SMS template.

**Recommendation 5: Add Bridge Supply, Quick-Start, and PAP Pathways**

Expand the financial support section beyond copay cards. Add instructions for:
- Screening for PAP eligibility (uninsured/underinsured).
- Offering bridge or quick-start supply when coverage is pending.
- Referral to independent foundations when manufacturer programs are not sufficient.
- Add corresponding functions or at minimum, explicit routing instructions.

**Recommendation 6: Build a Break-in-Therapy Emergency Flow**

Add a `[BREAK IN THERAPY — URGENT]` section triggered when a caller reports: missed refill on an anti-epileptic drug, lost/damaged medication, shipment failure, or travel without medication. The flow should: (a) assess urgency, (b) check bridge/replacement eligibility, (c) coordinate with specialty pharmacy, (d) ensure no gap in anti-seizure coverage (abrupt discontinuation = seizure risk).

### Priority 3 — MEDIUM IMPACT, CAREGIVER EXPERIENCE

**Recommendation 7: Add Specific Caregiver Resources with Named Programs**

Replace the generic "We have support groups and resources" with specific, named resources:
- Dravet Syndrome Foundation Caregiver Connect (modular burnout education)
- IETF (International Essential Tremor Foundation) caregiver resources
- Caregiver care-coordination tools
- Respite care referral pathways

Give Emma actual content to offer, not just the promise of content.

**Recommendation 8: Add a Cognitive-Load Adaptation Rule**

Amend the `[RESPONSE RULES]` to include: "If the caller seems confused, repeats questions, or is clearly overwhelmed, you may exceed the 35-word limit to provide clear, structured summaries. Offer to send a written summary via SMS: 'Would it be helpful if I texted you a summary of everything we talked about and the next steps?'" Add an `action_plan_summary` SMS template.

**Recommendation 9: Add Enrollment Consent Explanation Language**

When executing `enroll_in_hub`, instruct Emma to explain in plain language: what the hub will do, what information will be shared (with insurers, pharmacies, the manufacturer), and that the caregiver's authorization is needed. For pediatric patients, confirm the caller has legal authority to authorize. This addresses both HIPAA compliance and trust.

### Priority 4 — LOWER IMPACT, COMPLETENESS

**Recommendation 10: Add PA Denial / Appeal Handling Flow**

Add a specific sub-flow for callers who have received a denial or are mid-appeal. Include: (a) plain-language explanation of what happened, (b) what documentation the prescriber needs to submit, (c) offer to coordinate with the field reimbursement team, (d) realistic timeline expectations. This is the third most common JTBD in the research and one of the highest-addressability abandonment drivers.

---

## Summary Table

| JTBD | Rating | Top Gap |
|------|--------|---------|
| Coverage / cost discovery | ADEQUATE | No timeline, no guarantee prohibition |
| Hub enrollment / consent | ADEQUATE | No authorization explanation |
| PA / denial / appeal | ADEQUATE | No specific denial flow |
| Pharmacy routing / shipment | WEAK | No shipment coordination |
| Financial pathway | ADEQUATE | No PAP, bridge, or federal-program guard |
| Safe start / administration | ADEQUATE | No labeling content, no teach-back |
| REMS / monitoring | **MISSING** | Zero coverage |
| Side effect troubleshooting | STRONG | Minor: no drug/device distinction |
| AE / product complaint reporting | STRONG | Minor: no 4-element checklist |
| Break-in-therapy | WEAK | No bridge/replacement flow |
| Caregiver support / burnout | ADEQUATE | Generic resources, no load reduction |

**Highest-priority actions:** Federal program beneficiary screening (compliance), REMS/monitoring module (completeness), AE minimum elements (regulatory), bridge/break-in-therapy flow (patient safety), caregiver resource specificity (experience).
