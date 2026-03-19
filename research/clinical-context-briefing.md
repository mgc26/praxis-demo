# Vi Praxis BioSciences -- Clinical Context Expert Briefing

**Prepared:** 2026-03-18
**Sources:**
- Scheffer et al., "Developmental and epileptic encephalopathies," *Nature Reviews Disease Primers* 10:61 (2024)
- Dash et al., "Update on Medical Treatments for Essential Tremor: An International Parkinson and Movement Disorder Society Evidence-Based Medicine Review," *Movement Disorders* (2026)
- Platform codebase: agent prompts, types, screening instruments

---

## 1. Disease Landscape Summary

### Essential Tremor (ET)

**Definition and prevalence.** ET is a bilateral, symmetric action tremor of the hands/forearms lasting at least 3 years, without other neurological signs. Estimated prevalence: 0.32%--0.9% worldwide, making it one of the most common movement disorders (Dash et al., refs 1-3). It is far more common than Parkinson disease.

**Functional impact.** ET significantly impairs daily functioning -- eating, writing, dressing, pouring liquids. It hinders independence in both personal and professional life. The MDS review notes that people with ET experience decline in quality of life due to functional impairment and psychosocial burden (Dash, p.2).

**Psychosocial burden.** ET is associated with increased anxiety, depression, and social isolation (Dash, refs 4-5). Psychosocial factors including embarrassment, social withdrawal, and fear of public eating/drinking are major contributors to reduced quality of life -- often exceeding the physical disability itself.

**Standard of care.** First-line treatments are propranolol (beta-blocker, 120-240 mg/day) and primidone (barbiturate-derivative, 125-750 mg/day). Topiramate is a second-line option. Newer agents evaluated include perampanel (AMPA receptor antagonist), flunarizine, and gabapentin. Botulinum toxin type A is used for refractory cases. Surgical options (DBS, focused ultrasound) exist for medically refractory ET.

**Critical unmet need -- the evidence gap.** The 2026 MDS-EBM review is devastating for the current standard of care: **all 16 interventions evaluated against placebo received a conclusion of "insufficient evidence."** The GRADE framework found that even propranolol, primidone, and topiramate -- the most commonly used agents -- lack sufficient high-quality evidence. Key problems: small sample sizes (5-117 participants), high risk of bias, short follow-up (4-28 weeks), imprecision, and use of non-validated rating scales. This is a massive opportunity for a new entrant with well-designed Phase 3 trials.

**Patient journey pain points:**
- Diagnosis often delayed years (average 3+ years of tremor required for diagnosis)
- Trial-and-error approach with existing medications
- Side effects drive discontinuation (sedation, cognitive difficulties, dizziness are common across all current treatments)
- Progressive worsening over time with no disease-modifying therapy
- Social stigma and functional limitation often undertreated
- High dropout rates in existing clinical trials (20-37.6% in some topiramate arms)

### DEE / Dravet Syndrome

**Definition.** Developmental and epileptic encephalopathies (DEEs) are the most severe group of epilepsies, characterized by seizures and frequent epileptiform activity associated with developmental slowing or regression. Onset typically occurs in infancy or childhood. DEEs incorporate two facets: developmental encephalopathy (leading to intellectual disability) and epileptic encephalopathy (where epileptic activity itself contributes to cognitive/behavioral impairment beyond the underlying pathology).

**Dravet syndrome specifically** is defined by electroclinical features, with >90% of cases having a pathogenic variant in *SCN1A* (the alpha-1 subunit of the voltage-gated sodium channel, Nav1.1). It presents in the first year of life, typically with febrile status epilepticus, and evolves to multiple seizure types including myoclonic, absence, and focal seizures.

**Prevalence.** DEEs have a cumulative incidence of 1 in 590 children (up to age 16, Wellington NZ study). Dravet syndrome specifically: incidence 5.1-6.5 per 100,000 live births across studies. DEEs account for approximately 86.1% of all epilepsies presenting under age 3 (Scotland).

**Mortality.** Patients with DEEs have increased mortality risk. Primary cause: sudden unexpected death in epilepsy (SUDEP). Dravet syndrome SUDEP rate: 4.4 per 1,000 person-years. Patients with seizure onset in early infancy have even higher mortality -- 50% dying by age 2 years in the most severe cases.

**Standard of care for Dravet syndrome:**
- **CRITICAL SAFETY POINT:** Sodium channel blockers (SCBs) such as carbamazepine, oxcarbazepine, and phenytoin are **contraindicated** in Dravet syndrome -- they exacerbate seizures and cause adverse developmental consequences. This is because Dravet is caused by loss-of-function in SCN1A, and SCBs further reduce already-impaired sodium channel function in inhibitory interneurons.
- Approved/evidence-based therapies: cannabidiol (Epidiolex), fenfluramine, stiripentol (in combination with clobazam/valproate)
- Valproate and clobazam are commonly used broad-spectrum ASMs
- Fenfluramine showed particular efficacy: seizure freedom in 7 of 12 Dravet patients in one study; dose-dependent reductions with >50% reduction in 54-68% of patients vs 5-12% placebo
- Cannabidiol: median reduction of 38.9% in target seizures vs placebo in Dravet
- Emerging: antisense oligonucleotides (ASOs) targeting SCN1A are in clinical trials, gene therapy approaches

**Comorbidities (critical for platform accuracy):**
- Intellectual disability (nearly universal)
- Motor dysfunction: cerebral palsy, gait decline, movement disorders
- Psychiatric: ASD, behavioral problems, mood disorders, psychosis
- Speech and language problems
- Sleep disorders
- Gastrointestinal/feeding problems
- Musculoskeletal/orthopedic deformities
- Respiratory issues (aspiration pneumonia risk)

**Caregiver burden.** The Scheffer et al. primer devotes substantial attention to this: Carers of Dravet patients have more depressive symptoms than carers of other drug-resistant epilepsies or those in seizure remission. They are more likely to resign from employment, resulting in greater financial burden -- mostly falling on female carers. Parents of LGS children (the vast majority mothers) report constant anxiety, difficulty accessing child care, restriction of social life, and poor mental health. Transition to adult care is described as "a particularly stressful and anxiety-provoking period." 75% of people who developed epilepsy during childhood felt the disease led to isolation and social withdrawal.

---

## 2. Drug Product Accuracy -- Plausible Mechanisms of Action

### Euloxacaltenamide (ELEX) for Essential Tremor

**Most plausible drug class:** Based on the ET treatment landscape, ELEX would most credibly be one of the following:

1. **Novel AMPA receptor antagonist / glutamate modulator** (similar to perampanel but with improved selectivity) -- This is the most compelling positioning because perampanel showed improvement in TETRAS-P scores in a single RCT but had high risk of bias and incomplete data. A "next-generation" AMPA antagonist with a better trial program would fill the exact gap the MDS review identifies.

2. **T-type calcium channel blocker** -- A novel mechanism not yet tested in ET RCTs but with neurobiological rationale for tremor suppression.

3. **Selective GABA-A modulator** -- Given that progabide (GABA mechanism) showed no benefit and alprazolam (benzodiazepine/GABA) showed improvement but very low evidence, a more selective GABA-A modulator could be positioned as an improvement.

**Recommended positioning for the demo:** ELEX as a **novel, selective T-type calcium channel modulator** or **AMPA receptor antagonist** -- something genuinely new that addresses the devastating evidence gap documented in the 2026 MDS-EBM review.

**Plausible dosing pattern:**
- Oral tablet, once or twice daily
- Titration schedule: start 25-50 mg daily, titrate to 100-200 mg over 2-4 weeks
- Maintenance dose: 100-200 mg/day
- Justification: Most ET treatments use daily oral dosing. Topiramate averaged 215-296 mg/day; propranolol 120-240 mg/day. A similar range is realistic.

**Plausible side effect profile (based on the class and ET literature patterns):**
- Dizziness (most common across all ET drugs)
- Fatigue/somnolence (common; reported with gabapentin, levetiracetam, pregabalin)
- Nausea (common with many CNS-active agents)
- Cognitive difficulties (reported with topiramate; ELEX should be positioned as having LESS cognitive impact than topiramate -- a key differentiator)
- Paresthesia (reported with acetazolamide at 10% rate)
- Weight changes (topiramate causes weight loss; some agents cause weight gain)
- Notably: should NOT include hand weakness (that is a BtA-specific side effect and would be ironic for a tremor drug)

### Relutrigine for DEE / Dravet Syndrome

**Most plausible drug class:** The name "Relutrigine" strongly evokes lamotrigine (an existing ASM). Based on the DEE literature:

1. **Precision sodium channel modulator with selective Nav1.1 upregulation** -- The most scientifically compelling and timely mechanism. The Scheffer primer discusses how lamotrigine and phenytoin may exacerbate seizures in some Dravet patients (because they are broad SCBs that further suppress already-impaired Nav1.1 in inhibitory interneurons). A drug that selectively upregulates or stabilizes Nav1.1 function while sparing other sodium channel subtypes would be a genuine precision therapy. This aligns with the ASO approaches currently in clinical trials for Dravet.

2. **Selective sodium channel modulator with gain-of-function correction** -- The Scheffer primer extensively discusses how different SCN1A variants (LOF vs GOF) require very different treatment approaches. GOF SCN1A variants cause EIDEE, and these patients may respond to SCBs. A drug that could address the broader DEE population by selectively modulating specific sodium channel subtypes would be transformative.

**CRITICAL SAFETY NOTE for the platform:** The Scheffer primer explicitly states that lamotrigine "may exacerbate seizures in some patients" with Dravet syndrome. If Relutrigine is positioned as lamotrigine-like, the platform MUST address this: Relutrigine should be described as having a **differentiated mechanism** that avoids the Nav1.1 inhibition that makes traditional sodium channel blockers contraindicated in Dravet. This is essential for clinical credibility.

**Recommended positioning for the demo:** Relutrigine as a **selective sodium channel modulator** with a novel mechanism that enhances inhibitory interneuron function (unlike traditional SCBs) -- effectively a precision therapy for SCN1A-related DEEs. This mirrors the real-world development pipeline (ASOs targeting SCN1A upregulation).

**Plausible dosing pattern:**
- Oral solution or dispersible tablet (pediatric population -- critical)
- Weight-based dosing: 0.5-2 mg/kg/day in 2 divided doses
- Slow titration over 4-6 weeks (standard for ASMs, especially in DEE to monitor for seizure exacerbation)
- Justification: Fenfluramine uses weight-based dosing; stiripentol is 50 mg/kg/day; cannabidiol starts at 5 mg/kg/day titrating to 10-20 mg/kg/day

**Plausible side effect profile (based on DEE treatment literature):**
- Decreased appetite (most common AE with cannabidiol at 22%, fenfluramine at similar rates)
- Somnolence/sedation (13% with fenfluramine; very common across ASMs)
- Fatigue (13% with fenfluramine)
- Diarrhea/GI effects
- Weight changes
- Rash (the lamotrigine-class concern -- should be mentioned as a monitoring requirement, especially given the "trigine" suffix suggesting this drug class)
- Suicidal ideation risk (FDA class warning for all anti-epileptic drugs -- already correctly handled in the C-SSRS-LITE screening instrument)
- Notably: should NOT include cardiac concerns unless explicitly designed as a fenfluramine-like agent (fenfluramine requires echocardiographic monitoring due to valvular heart disease risk)

---

## 3. Clinical Talking Points for HCP Outbound Agent

### For ELEX (Essential Tremor)

The HCP outbound agent currently has only placeholder text: `${drugName} has shown [reference approved efficacy data naturally when relevant].` This needs to be populated with specific, credible clinical talking points:

**Evidence gap framing (the killer opening):**
- "As you may have seen from the recent MDS evidence-based medicine review, the 2026 update found insufficient evidence for all 16 currently available ET interventions, including propranolol and primidone. ELEX was designed to address that gap with a rigorous Phase 3 program."
- "The MDS-EBM review highlighted that existing ET trials suffer from small sample sizes, short follow-up, and non-validated scales. Our ELEX program used TETRAS as the primary endpoint with [X]-week follow-up in [N] patients."

**Efficacy endpoints to reference (fictional but plausible):**
- Primary: Statistically significant reduction in TETRAS Performance Subscale score vs placebo at Week 12/24
- Secondary: Improvement in QUEST (Quality of Life in Essential Tremor) score
- Functional endpoints: Improvement in Activities of Daily Living (ADL) subscale
- Responder analysis: Percentage achieving >50% reduction in TETRAS-P score

**Differentiation points:**
- "Unlike propranolol, ELEX does not cause cardiovascular effects like bradycardia or hypotension, making it suitable for elderly patients with cardiac comorbidities."
- "Compared to topiramate, ELEX showed a significantly lower rate of cognitive adverse events in our Phase 3 program." (Topiramate had 20-37% dropout rates partly due to cognitive effects.)
- "ELEX was studied with a validated outcome measure (TETRAS) and adequate follow-up -- addressing the key methodological gaps identified in the MDS-EBM review."

**Safety profile highlights:**
- No hand weakness (unlike botulinum toxin, reported in 30-50% of patients)
- No significant cognitive dulling (unlike topiramate)
- No sedation/dependency concerns (unlike alprazolam/benzodiazepines)
- Well-tolerated with low discontinuation rates

### For Relutrigine (DEE / Dravet)

**Precision medicine framing:**
- "Relutrigine represents a new approach to DEE treatment -- rather than broadly suppressing neuronal activity, it selectively modulates sodium channel function to restore inhibitory/excitatory balance."
- "For SCN1A-related DEEs including Dravet syndrome, Relutrigine was designed to avoid the seizure exacerbation seen with traditional sodium channel blockers."

**Efficacy endpoints to reference:**
- Primary: Median percentage reduction in convulsive seizure frequency vs placebo
- Responder rate: Percentage achieving >50% reduction in convulsive seizures (comparable to fenfluramine's 54-68% responder rate vs 5-12% placebo)
- Secondary: Seizure-free days, status epilepticus events, rescue medication use
- Caregiver-reported outcomes: Quality of life measures

**Differentiation from existing therapies:**
- vs. cannabidiol: "Relutrigine does not require monitoring for hepatotoxicity or drug-drug interactions with clobazam."
- vs. fenfluramine: "Relutrigine does not require echocardiographic monitoring for valvular heart disease."
- vs. stiripentol: "Relutrigine can be used as monotherapy or adjunctive therapy without mandatory combination with clobazam/valproate."

**Comorbidity awareness (critical for HCP credibility):**
- "We understand that seizure control is just one piece of the puzzle for DEE patients. Our patient support program addresses the full spectrum of comorbidities including developmental, behavioral, and caregiver needs."
- "The Praxis hub provides resources for the multidisciplinary care team -- neurologists, developmental pediatricians, behavioral specialists, and therapists."

---

## 4. Screening Instrument Relevance Assessment

### AE-TRIAGE (Adverse Event Detection Screen -- 3 questions)

**Assessment: Clinically appropriate and regulatory sound.**

This is a custom instrument but is well-designed for its purpose. It captures the three essential elements for post-marketing AE detection: (1) new/worsening symptoms, (2) functional impact, and (3) temporal relationship to medication. This aligns with FDA pharmacovigilance requirements for post-marketing surveillance.

**Recommendation:** Add specificity for each therapeutic area. For ET: ask specifically about hand weakness (if on BtA), cognitive changes (if on topiramate), and cardiovascular symptoms (if on propranolol). For DEE/Dravet: ask about seizure frequency changes, behavioral changes, and rash (if on any ASM with rash risk).

### C-SSRS-LITE (Columbia Suicide Severity Rating Scale -- 2 questions)

**Assessment: Highly appropriate, regulatory required.**

The platform correctly identifies that this is an FDA requirement for anti-epileptic drugs (the 2008 FDA class-wide suicidality warning applies to all ASMs). The C-SSRS is the gold standard for suicidal ideation screening, and the 2-question "Screener" version is validated for brief telephonic administration.

**Relevance to both TAs:**
- DEE/Dravet: Directly relevant. Relutrigine would carry the FDA ASM class warning. Additionally, the Scheffer primer documents that DEE caregivers experience depression, isolation, and poor mental health -- the C-SSRS-LITE should also be considered for caregivers.
- ET: If ELEX is positioned as a non-ASM (e.g., AMPA antagonist or calcium channel modulator), the C-SSRS may not be strictly required by the class warning, but would still be appropriate given the documented association of ET with depression and anxiety. The platform should clarify whether ELEX carries this warning.

**Current implementation note:** The preamble text ("Because your medication is in a class that the FDA monitors closely") is accurate for DEE/Relutrigine but may not be accurate for ET/ELEX depending on drug class. This should be conditional.

### TETRAS-LITE (Tremor Severity Assessment -- 2 questions)

**Assessment: Clinically appropriate and well-designed for purpose.**

The TETRAS (The Essential Tremor Rating Assessment Scale) is explicitly referenced in the MDS-EBM review as a validated instrument. The review notes that one perampanel RCT used a "video-rated version of the Essential Tremor Rating Assessment Scale -- Performance Subscale (TETRAS-P)" (Dash, p.6). The Fahn-Tolosa-Marin (FTM) tremor rating scale is another validated instrument used in ET trials.

The 2-question adaptation captures the two most clinically meaningful domains: (1) tremor severity and (2) functional impact on ADLs. This is appropriate for a telephonic patient support context where a full TETRAS-P administration is not feasible.

**Recommendation:** Consider adding a question about the specific functional domains most affected (eating, drinking, writing, dressing) to give the HCP more actionable information. The current questions are good but could be enriched with the ADL specificity that the full TETRAS captures.

### MMAS-4 (Morisky Medication Adherence Scale -- 4 items)

**Assessment: Appropriate for adherence monitoring, with a licensing caveat.**

The MMAS-4 is a widely validated adherence screening tool across chronic diseases. It is relevant to both TAs:
- ET: Adherence is critical because the MDS review documents that many patients discontinue treatment due to side effects (topiramate dropout 20-37%, zonisamide 30% AE-related dropout).
- DEE/Dravet: Adherence is literally life-or-death -- missed doses can trigger seizure exacerbation and status epilepticus.

**Important licensing note:** The Morisky scales (MMAS-4 and MMAS-8) are proprietary and require a license for commercial use. If this platform is intended for commercial deployment, a licensing agreement with Donald Morisky / MMAS Research LLC would be needed. For a demo, this is acceptable but should be flagged.

**Recommendation:** For the DEE/Dravet caregiver context, consider adding a question about barriers specific to pediatric medication administration (e.g., difficulty with liquid formulations, child refusal, missed doses during school hours).

---

## 5. Patient/Caregiver Experience Insights

### ET Patient Experience (informed by Dash et al.)

**Key themes the patient support agent should understand:**

1. **Progressive social withdrawal.** ET patients increasingly avoid social situations -- restaurants, public speaking, meetings -- because of visible tremor. The agent should understand that a patient calling about medication may have a deeper concern about their social life, self-image, and independence.

2. **Frustration with treatment inadequacy.** The MDS review reveals that ALL current treatments have "insufficient evidence." Real-world patients have often cycled through multiple medications. The agent should be prepared for patients who express frustration or skepticism about yet another medication.

3. **Employment and functional independence.** For working-age adults, tremor can threaten careers -- surgeons, artists, craftspeople, and anyone in a role requiring fine motor control. The agent should recognize that "how bad is your tremor?" is not just a clinical question but an existential one.

4. **Side effect burden vs. tremor burden.** The literature documents significant dropout rates due to side effects across all ET treatments. Patients frequently face a choice between tolerating tremor and tolerating side effects. The agent should validate this tension rather than dismissing side effect complaints.

5. **Elderly population considerations.** ET prevalence increases with age. Many patients are elderly with comorbidities (cardiac, cognitive). Drug interactions and polypharmacy are practical concerns.

### DEE/Dravet Caregiver Experience (informed by Scheffer et al.)

**Key themes the patient support agent should understand:**

1. **The diagnosis is devastating.** The primer describes DEE diagnosis in infancy as carrying "considerable consequences that require proactive clinical management." Families experience "considerable grief and need intense support as the disease evolves." The agent should be prepared for calls from caregivers in varying stages of grief and acceptance.

2. **Information overload and empowerment paradox.** "With the accessibility of the internet and social media, families are faced with far more information than ever before, which is both empowering and daunting, as the future may appear bleak with so many issues that could develop." The agent should be a calm, trusted voice -- not another source of overwhelming information.

3. **Multimorbidity is the daily reality.** Seizures are often not the primary concern for experienced caregivers. Sleep problems, behavioral challenges, feeding difficulties, communication deficits, and developmental regression are the day-to-day burden. The agent should not assume the call is about seizures -- it may be about accessing therapies, managing behavioral crises, or navigating school services.

4. **SUDEP terror.** The mortality data (4.4 per 1,000 person-years for Dravet; 50% mortality by age 2 for early-onset DEEs) means caregivers live with constant fear of death. The primer describes a 10-year-old girl with Dravet who had been seizure-free for 2 years and died after walking outside on a hot day (46.5C). The agent should understand that even "stable" patients' caregivers carry this fear.

5. **Caregiver mental health crisis.** The primer explicitly documents: carers have more depressive symptoms, are more likely to resign from employment, face greater financial burden (mostly falling on female carers). Parents report "constant anxiety, difficulties in accessing child care, restriction of social life and poor mental health." The agent should validate caregiver distress as legitimate and expected, not pathological.

6. **Transition to adult care is traumatic.** The primer describes this as "a particularly stressful and anxiety-provoking period." 90% of adults with TSC remain on anti-seizure medication, but almost 40% lack neurological follow-up. The agent should be prepared for calls from adult patients or their caregivers navigating this transition.

7. **Contraindicated medications are a real danger.** The primer repeatedly emphasizes that SCBs exacerbate seizures in Dravet. "A still common example is the use of SCBs, such as carbamazepine or oxcarbazepine, in infants with hemiclonic or tonic-clonic seizures who have undiagnosed Dravet syndrome, as these specific ASMs commonly cause seizure exacerbation with adverse developmental consequences." The agent should NEVER suggest medication changes but should be alert to concerns about medication interactions.

8. **Environmental triggers are life-threatening.** Hyperthermia, fever, hot baths, stress, excitement, and photic stimulation can trigger seizures and SUDEP. Caregivers need practical support around trigger avoidance.

---

## 6. Concrete Recommendations for Clinical Accuracy Improvements

### Priority 1 (Critical -- affects clinical credibility in any demo)

**1. Populate the HCP outbound talking points with specific clinical data.**
The current prompt has placeholder text: `${drugName} has shown [reference approved efficacy data naturally when relevant].` This is the single most visible gap. Replace with fictional but plausible Phase 3 data points (see Section 3 above). For ELEX: TETRAS-P reduction, responder rates, QUEST improvement. For Relutrigine: convulsive seizure frequency reduction, responder rates, seizure-free days.
- **File:** `/ws-backend/src/prompts/agents/hcp-outbound.ts`, line 155
- **Impact:** Without this, any HCP-facing demo falls flat because the agent cannot discuss clinical data.

**2. Add the ET evidence gap as a key HCP talking point.**
The 2026 MDS-EBM review's finding that ALL 16 ET interventions have "insufficient evidence" is the single most powerful context for positioning a new ET therapy. The HCP outbound agent should be able to reference this: "The recent MDS evidence-based medicine review found insufficient evidence for all available ET treatments. ELEX addresses this gap..."
- **File:** `/ws-backend/src/prompts/agents/hcp-outbound.ts`, KEY TALKING POINTS section
- **Impact:** This positions Praxis as scientifically informed and gives the agent a compelling reason for outreach.

**3. Add Dravet-specific contraindicated medication awareness.**
The patient support agent should know that sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin, lamotrigine) are contraindicated in Dravet syndrome. If a caregiver mentions their child was prescribed one of these, the agent should flag it (without giving medical advice) and urgently recommend speaking with their neurologist.
- **File:** `/ws-backend/src/prompts/agents/patient-support.ts`, DRAVET-SPECIFIC SAFETY block
- **Impact:** Getting this wrong in a demo with a knowledgeable HCP audience would destroy credibility.

### Priority 2 (High -- significantly improves realism)

**4. Add disease-specific context to the patient support agent prompt.**
Currently, the prompt has only `taShort` ("Essential Tremor" or "DEE / Dravet Syndrome") with no clinical context. Add a block for each TA that gives the agent disease-specific knowledge:
- For ET: common patient concerns (social embarrassment, functional limitation, treatment fatigue), common side effects to listen for per drug class, and the progressive nature of the condition.
- For Dravet: multimorbidity reality, caregiver dynamics, SUDEP awareness, environmental trigger awareness, developmental milestone monitoring.
- **File:** `/ws-backend/src/prompts/agents/patient-support.ts`
- **Impact:** Transforms the agent from generic to disease-expert.

**5. Add specific AE profiles for each drug product.**
The AE detection section currently lists generic side effects ("nausea, dizziness, rash, fatigue, headache, weight changes"). These should be drug-specific:
- ELEX: dizziness, somnolence, fatigue, nausea, paresthesia (avoid cognitive dulling as a key differentiator from topiramate)
- Relutrigine: decreased appetite, somnolence, fatigue, diarrhea, rash (with specific rash monitoring guidance given the "-trigine" suffix suggesting lamotrigine-class), potential hepatic effects
- **File:** `/ws-backend/src/prompts/agents/patient-support.ts`, AE DETECTION section
- **Impact:** A pharma-savvy demo audience will notice if AE lists are not drug-specific.

**6. Add comorbidity awareness for DEE/Dravet caregiver calls.**
The caregiver support block is currently generic ("Caring for a loved one with DEE / Dravet Syndrome is a lot"). It should include awareness that caregivers may call about non-seizure issues: behavioral crises, sleep problems, feeding difficulties, school accommodations, developmental regression, adult care transition. The agent should normalize these concerns and have pathways for them.
- **File:** `/ws-backend/src/prompts/agents/patient-support.ts`, CAREGIVER SUPPORT block
- **Impact:** Demonstrates understanding of the real caregiver journey.

### Priority 3 (Medium -- enhances depth for sophisticated audiences)

**7. Condition the C-SSRS preamble on the therapeutic area.**
The current C-SSRS preamble says "Because your medication is in a class that the FDA monitors closely" -- this is correct for Relutrigine (ASM class warning) but may not be accurate for ELEX depending on its drug class. Add TA-conditional preamble text.
- **File:** `/ws-backend/src/config/screening-instruments.ts`, C-SSRS-LITE conversationalPreamble
- **Impact:** Minor but noticeable to a clinical audience.

**8. Add environmental trigger guidance for Dravet patient support.**
The Scheffer primer documents that hyperthermia, fever, hot baths, stress, excitement, and photic stimulation are known seizure triggers in Dravet. The patient support agent should be able to provide practical guidance on trigger avoidance and seizure action plans when caregivers ask.
- **File:** `/ws-backend/src/prompts/agents/patient-support.ts`, DRAVET-SPECIFIC SAFETY block
- **Impact:** Demonstrates clinical depth and practical utility.

**9. Add the "titration phase" concept with clinical accuracy.**
The contact record includes `titrationPhase` but the prompts do not define what titration looks like for each drug. For ELEX: likely a 2-4 week upward titration. For Relutrigine: likely a slower 4-6 week titration (standard for ASMs in pediatric DEE to monitor for seizure exacerbation). The agent should be able to reassure patients/caregivers about the titration timeline and expected experience.
- **File:** `/ws-backend/src/prompts/agents/patient-support.ts`
- **Impact:** Adds realism to the most common patient support call type.

**10. Add precision medicine framing for HCP outbound DEE conversations.**
The Scheffer primer extensively discusses the move toward precision/genetic therapy in DEEs. The HCP agent should be able to reference: genetic testing importance, genotype-phenotype correlations, the principle that identifying the underlying aetiology enables precision treatment. This positions Praxis as a scientifically sophisticated company.
- **File:** `/ws-backend/src/prompts/agents/hcp-outbound.ts`
- **Impact:** Differentiates the demo from a generic pharma platform by showing precision medicine awareness.

---

## Appendix: Key Data Points for Quick Reference

### Essential Tremor Quick Facts
| Metric | Value | Source |
|--------|-------|--------|
| Prevalence | 0.32--0.9% worldwide | Dash, ref 3 |
| Most common movement disorder | Yes (more common than PD) | Dash, ref 3 |
| First-line treatments | Propranolol, primidone | Dash, Table 1 |
| Evidence quality for ALL treatments | Insufficient (GRADE) | Dash, Table 1 |
| RCTs reviewed | 31 RCTs, 16 interventions | Dash, Results |
| Propranolol total N | 71 treated, 72 placebo | Dash, Propranolol section |
| Topiramate total N | 172 treated | Dash, Topiramate section |
| Topiramate dropout rate | 20.9--37.6% | Dash, Topiramate section |
| Key validated scales | TETRAS, FTM, QUEST | Dash, Methods |
| Psychosocial effects | Anxiety, depression, social isolation | Dash, refs 4-5 |

### DEE / Dravet Quick Facts
| Metric | Value | Source |
|--------|-------|--------|
| DEE cumulative incidence | 1 in 590 children (to age 16) | Scheffer, p.3 |
| Dravet incidence | 5.1--6.5 per 100,000 live births | Scheffer, Table 1 |
| Dravet SCN1A mutation rate | >90% | Scheffer, p.3 |
| DEE genes identified | >900 (>1,000 established monogenic) | Scheffer, p.3/10 |
| Dravet SUDEP rate | 4.4 per 1,000 person-years | Scheffer, p.3 |
| Early-onset mortality | 50% by age 2 years | Scheffer, p.3 |
| Genetic aetiology identification rate | ~50% of patients | Scheffer, p.10 |
| Cannabidiol median seizure reduction | 38.9% vs placebo (Dravet) | Scheffer, p.12 |
| Fenfluramine >50% responder rate | 54--68% vs 5--12% placebo | Scheffer, p.12 |
| Fenfluramine >75% responder rate | 35--50% vs 2--12% placebo | Scheffer, p.12 |
| Stiripentol >50% responder rate | 71% vs 5% placebo (add-on) | Scheffer, p.12 |
| SCBs contraindicated in Dravet | Yes (carbamazepine, oxcarbazepine, phenytoin) | Scheffer, p.4, 10, 13 |
| Lamotrigine in Dravet | May exacerbate seizures in some patients | Scheffer, p.13 |
| Caregiver depression | Higher than other epilepsy caregivers | Scheffer, p.14 |
| Caregiver employment impact | More likely to resign | Scheffer, p.14 |
