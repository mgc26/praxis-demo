# Research — Jobs to Be Done

Background research for validating and sharpening the four Vi Praxis agent types
and the cross-cutting concerns they share.

Drop files (PDFs, text dumps, Claude research outputs, notes) into the relevant folder.

## Structure

```
research/
  patient-support/       # Agent 1: Emma (inbound patient/caregiver support)
  hcp-support/           # Agent 2: Inbound medical information line for HCPs
  hcp-outbound/          # Agent 3: Emma (signal-driven outbound HCP engagement)
  medcomms-qa/           # Agent 4: Omnichannel medical information Q&A
  pharmacovigilance/     # Cross-cutting: AE reporting, C-SSRS, FDA requirements
  dashboard-consumers/   # Cross-cutting: MSL, FRM, brand team, PV team workflows
```

## Research prompts

The prompts used to generate this research are captured below for reference.

### 1. Patient Support (Emma — inbound)

In the US specialty pharma patient support model for rare/orphan neurology drugs
(specifically anti-epileptic drugs for Dravet Syndrome/DEE and treatments for
Essential Tremor), what are the top 10 jobs-to-be-done for patients and caregivers
when they call a manufacturer's patient support hub line? For each job, describe:
(a) the triggering event that causes the call, (b) the emotional state of the caller,
(c) what "done well" looks like from the caller's perspective, (d) the regulatory
constraints the agent must operate within (FDA, HIPAA, state-level), and (e) how
current human-staffed hub services (e.g., run by Eversana, Lash Group, ConnectiveRx)
handle each job today. Pay special attention to the caregiver experience in pediatric
DEE/Dravet — how does caregiver burnout manifest in these calls, and what do
best-in-class programs do about it? Also: what are the most common reasons patients
abandon a specialty drug within the first 90 days, and which of those reasons are
addressable by a phone-based support agent?

### 2. HCP Support (inbound medical information line)

What are the primary jobs-to-be-done when a US physician or pharmacist calls a
pharmaceutical manufacturer's Medical Information (MI) line, specifically for a
neurology product (anti-epileptic / movement disorder drug)? Research: (a) the
FDA/OIG regulatory framework governing what an MI representative can and cannot say
(on-label vs. off-label, the FDAMA 114 / FDCA Section 505 boundaries, unsolicited
vs. solicited requests), (b) the typical call types ranked by frequency, (c) what
differentiates a "standard response" from one requiring a "custom medical information
response letter," (d) how MI calls are triaged at companies like Biogen, Jazz
Pharmaceuticals, and UCB (peer companies in neurology), and (e) what the typical
handoff looks like from MI to MSL, pharmacovigilance, or commercial. What are the
highest-value MI interactions from the manufacturer's perspective, and which of those
could an AI agent handle end-to-end vs. which require human escalation?

### 3. HCP Outbound (Emma — signal-driven proactive engagement)

For pharmaceutical companies conducting outbound engagement with neurologists and
epileptologists in the US (specifically around branded specialty drugs for Essential
Tremor and DEE/Dravet), what are the jobs-to-be-done from BOTH the manufacturer's
and the HCP's perspective? Research: (a) the OIG/PhRMA Code/Sunshine Act compliance
boundaries for proactive outbound HCP engagement, (b) how signal-driven or "next best
action" outreach actually works at pharma companies today, (c) what makes an HCP
receptive vs. hostile to an unsolicited pharma call, (d) the specific "jobs" the HCP
needs done that make them willing to engage, and (e) how the gatekeeper problem is
handled in real-world field engagement. What conversion benchmarks exist for outbound
pharma HCP engagement?

### 4. MedComms QA (inbound omnichannel medical information)

In the pharmaceutical Medical Communications (MedComms) function, what are the
jobs-to-be-done for a medical information service that handles both HCP and
patient/caregiver inquiries about neurology drugs? Research: (a) the regulatory
distinction between Medical Affairs-owned MI responses and Commercial-owned call
center responses, (b) how pharma companies structure their Standard Response Documents
(SRDs), (c) the role of AMCP dossiers, compendia listings, and formulary kits in MI
responses, (d) the specific challenge of handling "unsolicited off-label requests"
compliantly, and (e) what metrics MedComms teams track and how AI is currently being
piloted in this space. What are the highest-risk failure modes for an AI handling MI
requests?

### 5. Pharmacovigilance & AE Reporting (cross-cutting)

For a US pharmaceutical company with approved neurology products (anti-epileptic drugs
with FDA black box warnings for suicidality), what are the complete regulatory
requirements for adverse event capture during patient and HCP interactions? Research:
(a) FDA 21 CFR 314.80/314.81 requirements, (b) telephonic C-SSRS administration in
pharma patient support programs, (c) the AE detection-to-documentation workflow,
(d) pregnancy exposure registries for anti-epileptic drugs, and (e) regulatory
guidance on AI-mediated safety reporting. What are the liability implications if an AI
agent fails to capture a reportable AE?

### 6. Dashboard Consumers (cross-cutting)

Who actually consumes the output of a pharma engagement platform and what are THEIR
jobs-to-be-done? Research: (a) MSL daily workflow and how they use engagement data,
(b) Field Reimbursement Manager workflows, (c) how commercial ops / brand teams use
aggregated data, (d) how PV teams review AI-flagged AE reports, and (e) what
competitive intelligence from HCP calls actually gets used. For each stakeholder, what
is the ONE metric or data point that most changes their next action?
