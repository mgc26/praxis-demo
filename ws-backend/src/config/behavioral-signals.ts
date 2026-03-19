// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Behavioral Signal Configuration
// ---------------------------------------------------------------------------
// Maps pharma behavioral signal categories to clinical implications,
// support pathways, urgency levels, and agent talking points.
// ---------------------------------------------------------------------------

import type { SupportPathway, SignalCategory, ScreeningInstrumentId, RecommendedScreening } from '../types/index.js';

export interface SignalMapping {
  category: SignalCategory;
  label: string;
  description: string;
  recommendedPathway: SupportPathway;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  suggestedResource: string;
  clinicalImplication: string;
  talkingPoints: string[];
  agentOpeningHint: string;
  recommendedScreenings: ScreeningInstrumentId[];
  /**
   * Restricts outbound usage of this signal. Signals with
   * `contextRestriction: 'patient-facing-only'` should NOT trigger HCP
   * outbound commercial calls. They are intended for patient/caregiver
   * support workflows only.
   */
  contextRestriction?: 'patient-facing-only' | 'hcp-facing-only' | null;
}

export const SIGNAL_MAPPINGS: Record<SignalCategory, SignalMapping> = {
  COMPETITOR_RESEARCH: {
    category: 'COMPETITOR_RESEARCH',
    label: 'Competitor Research Activity',
    description: 'HCP or patient has been researching competitor therapies in the same therapeutic area.',
    recommendedPathway: 'clinical-education',
    urgencyLevel: 'soon',
    suggestedResource: 'Medical Science Liaison',
    clinicalImplication:
      'Active comparison research suggests the prescriber or patient may be evaluating a therapy switch. Proactive clinical differentiation data may reinforce treatment confidence.',
    talkingPoints: [
      'We have head-to-head data and real-world evidence that may help inform treatment decisions.',
      'Our MSL team is available for a peer-to-peer discussion on the latest clinical data.',
      'Recent publications show differentiated efficacy and tolerability for our therapy.',
    ],
    agentOpeningHint:
      'I wanted to reach out because we have some new clinical data that may be relevant to the therapies you\'re evaluating for your patients.',
    recommendedScreenings: [],
  },
  FORMULARY_LOOKUP: {
    category: 'FORMULARY_LOOKUP',
    label: 'Formulary / Coverage Lookup',
    description: 'HCP office or patient has been checking formulary status, tier placement, or prior authorization requirements.',
    recommendedPathway: 'medication-access',
    urgencyLevel: 'soon',
    suggestedResource: 'Hub Services / Field Reimbursement',
    clinicalImplication:
      'Formulary research indicates potential access barriers. Proactive reimbursement support may prevent treatment abandonment or switch to a less effective therapy.',
    talkingPoints: [
      'Our hub services team can verify coverage and initiate prior authorization on your behalf.',
      'We offer a copay assistance program that may reduce out-of-pocket costs.',
      'Our field reimbursement manager can provide payer-specific coverage guidance.',
    ],
    agentOpeningHint:
      'I noticed there may be some questions about coverage for your patient\'s medication, and I wanted to make sure you have all the access support available.',
    recommendedScreenings: [],
  },
  SYMPTOM_SEARCH: {
    category: 'SYMPTOM_SEARCH',
    label: 'Symptom / Condition Research',
    description: 'Patient or caregiver has been searching for information about their condition symptoms, disease progression, or treatment expectations.',
    recommendedPathway: 'patient-education',
    urgencyLevel: 'routine',
    suggestedResource: 'Nurse Educator',
    clinicalImplication:
      'Active symptom research may indicate uncontrolled symptoms, treatment expectations not being met, or a newly diagnosed patient seeking to understand their condition.',
    talkingPoints: [
      'We have educational resources about your condition that may help answer your questions.',
      'A nurse educator can walk you through what to expect with your treatment.',
      'Understanding your symptoms helps you have better conversations with your doctor.',
    ],
    agentOpeningHint:
      'I wanted to reach out and see how you\'re doing with your treatment, and to let you know about some resources that might be helpful.',
    recommendedScreenings: ['AE-TRIAGE'],
    // Patient/caregiver signal — should NOT trigger HCP outbound commercial calls
    contextRestriction: 'patient-facing-only',
  },
  ADHERENCE_GAP: {
    category: 'ADHERENCE_GAP',
    label: 'Medication Adherence Gap',
    description: 'Patient has a gap in prescription refills or hub services data indicates missed doses or delayed titration.',
    recommendedPathway: 'adherence-support',
    urgencyLevel: 'urgent',
    suggestedResource: 'Nurse Educator / Hub Services',
    clinicalImplication:
      'Medication adherence gaps in specialty therapies are associated with suboptimal outcomes and increased risk of breakthrough symptoms. For anti-epileptic drugs, abrupt discontinuation carries seizure risk.',
    talkingPoints: [
      'Staying on schedule with your medication is really important for getting the best results.',
      'If cost is a concern, our copay assistance program may be able to help.',
      'Our specialty pharmacy can set up automatic refill reminders.',
      'If you\'re experiencing side effects, please let us know so we can help.',
    ],
    agentOpeningHint:
      'I\'m reaching out because it looks like your prescription may not have been refilled recently, and I want to make sure everything is going okay with your treatment.',
    recommendedScreenings: ['MMAS-4', 'AE-TRIAGE'],
    // Patient/caregiver signal — should NOT trigger HCP outbound commercial calls
    contextRestriction: 'patient-facing-only',
  },
  KOL_ENGAGEMENT: {
    category: 'KOL_ENGAGEMENT',
    label: 'KOL / Speaker Program Activity',
    description: 'HCP has attended or expressed interest in speaker programs, advisory boards, or KOL-led events.',
    recommendedPathway: 'clinical-education',
    urgencyLevel: 'routine',
    suggestedResource: 'Medical Science Liaison',
    clinicalImplication:
      'Active engagement with educational programs indicates a high-influence prescriber who may benefit from deeper scientific exchange and peer-to-peer discussion.',
    talkingPoints: [
      'We have upcoming speaker programs and peer-to-peer events that may be of interest.',
      'Our MSL team can arrange a scientific exchange on the latest data.',
      'We appreciate your engagement and want to ensure you have the most current clinical information.',
    ],
    agentOpeningHint:
      'Thank you for your interest in our educational programs. I wanted to follow up and see if there\'s any additional clinical information that would be helpful.',
    recommendedScreenings: [],
  },
  OFF_LABEL_QUERY: {
    category: 'OFF_LABEL_QUERY',
    label: 'Off-Label / Unsupported Use Query',
    description: 'HCP or patient has inquired about using the product for an indication or population not covered by the approved label.',
    recommendedPathway: 'clinical-education',
    urgencyLevel: 'urgent',
    suggestedResource: 'Medical Information / MSL',
    clinicalImplication:
      'Off-label queries require careful handling to maintain regulatory compliance. Must be routed to Medical Information for balanced, evidence-based responses.',
    talkingPoints: [
      'Our Medical Information team can provide published literature on that topic.',
      'I can connect you with a Medical Science Liaison for a peer-to-peer discussion.',
      'We can only share information consistent with our approved labeling, but our medical team can provide relevant published data.',
    ],
    agentOpeningHint:
      'I understand you had a question about our product. Let me connect you with our Medical Information team who can provide the most accurate and complete information.',
    recommendedScreenings: [],
  },
  CAREGIVER_DISTRESS: {
    category: 'CAREGIVER_DISTRESS',
    label: 'Caregiver Distress Signal',
    description: 'Caregiver has shown signs of burden, emotional distress, or need for support resources.',
    recommendedPathway: 'crisis-support',
    urgencyLevel: 'urgent',
    suggestedResource: 'Nurse Educator / Patient Advocacy',
    clinicalImplication:
      'Caregiver burnout significantly impacts patient treatment adherence and outcomes. For DEE (Dravet) patients, caregivers face extreme burden due to unpredictable seizures and developmental concerns.',
    talkingPoints: [
      'Caring for someone with this condition is incredibly demanding, and you don\'t have to do it alone.',
      'We have caregiver support resources and can connect you with patient advocacy organizations.',
      'A nurse educator can help you understand what to expect and how to manage day-to-day challenges.',
      'There are support communities where you can connect with other caregivers going through similar experiences.',
    ],
    agentOpeningHint:
      'I wanted to check in with you to see how you\'re doing. We know that caring for someone with this condition can be really challenging, and we\'re here to support you too.',
    recommendedScreenings: ['C-SSRS-LITE'],
    // Patient/caregiver signal — should NOT trigger HCP outbound commercial calls
    contextRestriction: 'patient-facing-only',
  },
  CONFERENCE_ACTIVITY: {
    category: 'CONFERENCE_ACTIVITY',
    label: 'Conference / Publication Activity',
    description: 'HCP has been engaging with conference proceedings, poster presentations, or recent publications related to the therapeutic area.',
    recommendedPathway: 'clinical-education',
    urgencyLevel: 'routine',
    suggestedResource: 'Medical Science Liaison',
    clinicalImplication:
      'Active engagement with scientific conferences indicates the HCP is staying current with the latest evidence. This is an opportunity to provide context and differentiation data.',
    talkingPoints: [
      'We had several presentations at the recent conference that highlight our latest data.',
      'Our MSL can walk you through the key takeaways from recent publications.',
      'We have reprints and supplementary materials available from recent presentations.',
    ],
    agentOpeningHint:
      'I wanted to follow up after the recent conference to see if there are any presentations or data you\'d like to discuss in more detail.',
    recommendedScreenings: [],
  },
};

// ---------------------------------------------------------------------------
// Extended Signal Categories
// ---------------------------------------------------------------------------
// These signal categories supplement the core SignalCategory type. They
// represent CRM-derived and access-related signals that may not originate
// from behavioral/digital signals but are important for complete contact
// context. When the core SignalCategory type is extended to include these,
// they can be merged into SIGNAL_MAPPINGS above.
// ---------------------------------------------------------------------------

export interface ExtendedSignalMapping {
  category: string;
  label: string;
  description: string;
  recommendedPathway: SupportPathway;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  suggestedResource: string;
  clinicalImplication: string;
  talkingPoints: string[];
  agentOpeningHint: string;
  recommendedScreenings: ScreeningInstrumentId[];
  contextRestriction?: 'patient-facing-only' | 'hcp-facing-only' | null;
}

export const EXTENDED_SIGNAL_MAPPINGS: Record<string, ExtendedSignalMapping> = {
  FIRST_PARTY_ENGAGEMENT: {
    category: 'FIRST_PARTY_ENGAGEMENT',
    label: 'First-Party CRM Engagement',
    description:
      'Contact has engaged with Praxis first-party channels: website visits, email opens, webinar attendance, hub portal logins, ' +
      'or PraxisConnect app activity. These are CRM-derived signals indicating active interest or need for support.',
    recommendedPathway: 'patient-education',
    urgencyLevel: 'routine',
    suggestedResource: 'Hub Services / Nurse Educator',
    clinicalImplication:
      'First-party engagement signals indicate the contact is actively seeking information or managing their treatment. ' +
      'This is an opportunity to provide timely, relevant support and deepen the relationship.',
    talkingPoints: [
      'Thank you for being an active part of the PraxisConnect community — we want to make sure you have everything you need.',
      'I noticed you may have some questions about your treatment, and I wanted to reach out to see how we can help.',
      'Our digital resources are a great starting point, and I can connect you with a nurse educator for personalized guidance.',
    ],
    agentOpeningHint:
      'I wanted to reach out because we noticed you\'ve been engaging with some of our resources, and I want to make sure you have all the support you need.',
    recommendedScreenings: [],
    contextRestriction: null,
  },
  ACCESS_RESTRICTION: {
    category: 'ACCESS_RESTRICTION',
    label: 'Formulary / Access Restriction',
    description:
      'Contact is facing a formulary restriction, step-therapy requirement, prior authorization denial, or other access barrier ' +
      'that may prevent or delay treatment initiation or continuation.',
    recommendedPathway: 'medication-access',
    urgencyLevel: 'urgent',
    suggestedResource: 'Field Reimbursement Manager / Hub Services',
    clinicalImplication:
      'Access restrictions create a critical risk of treatment abandonment or delay. For anti-epileptic drugs, delays in ' +
      'treatment initiation or gaps in therapy carry risk of breakthrough seizures. For ET patients, access barriers during ' +
      'titration may lead to suboptimal dosing and perceived treatment failure.',
    talkingPoints: [
      'We understand that navigating insurance requirements can be frustrating, and we\'re here to help.',
      'Our field reimbursement team has experience with your specific payer and can guide the appeals process.',
      'PraxisConnect can provide bridge supply in some cases to ensure there is no gap in your therapy while access issues are resolved.',
      'If prior authorization has been denied, our hub team can assist with a peer-to-peer review or formal appeal.',
    ],
    agentOpeningHint:
      'I\'m reaching out because it looks like there may be a coverage issue with your medication, and I want to make sure we get that resolved as quickly as possible.',
    recommendedScreenings: [],
    contextRestriction: null,
  },
};

// ---------------------------------------------------------------------------
// Signal severity -> urgency escalation
// ---------------------------------------------------------------------------

export function getSignalUrgency(
  signals: Array<{ severity: 'high' | 'medium' | 'low' }>,
): 'routine' | 'soon' | 'urgent' {
  const hasHigh = signals.some((s) => s.severity === 'high');
  const hasMedium = signals.some((s) => s.severity === 'medium');

  if (hasHigh) return 'urgent';
  if (hasMedium) return 'soon';
  return 'routine';
}

// ---------------------------------------------------------------------------
// Determine primary pathway from a contact's behavioral signal set
// ---------------------------------------------------------------------------

export function getPrimaryPathway(
  signals: Array<{ category: SignalCategory; severity: 'high' | 'medium' | 'low' }>,
): SupportPathway | null {
  if (signals.length === 0) return null;

  // Score each pathway by signal severity weight
  const pathwayScores = new Map<SupportPathway, number>();
  const weights = { high: 3, medium: 2, low: 1 };

  for (const signal of signals) {
    const mapping = SIGNAL_MAPPINGS[signal.category];
    if (mapping) {
      const current = pathwayScores.get(mapping.recommendedPathway) ?? 0;
      pathwayScores.set(mapping.recommendedPathway, current + weights[signal.severity]);
    }
  }

  let topPathway: SupportPathway | null = null;
  let topScore = 0;

  for (const [pathway, score] of pathwayScores.entries()) {
    if (score > topScore) {
      topScore = score;
      topPathway = pathway;
    }
  }

  return topPathway;
}

// ---------------------------------------------------------------------------
// Build a human-readable signal context summary for the agent prompt
// ---------------------------------------------------------------------------

export function buildSignalContextSummary(
  signals: Array<{ category: SignalCategory; detail: string; recency: string; severity: 'high' | 'medium' | 'low' }>,
): string {
  if (signals.length === 0) return 'No behavioral signals available.';

  return signals
    .map((s) => {
      const mapping = SIGNAL_MAPPINGS[s.category];
      return `- [${s.severity.toUpperCase()}] ${mapping?.label ?? s.category}: ${s.detail} (${s.recency})`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Resolve recommended screenings from contact signals and context
// ---------------------------------------------------------------------------

export function getRecommendedScreenings(
  contact: {
    behavioralSignals: Array<{ category: SignalCategory; severity: string }>;
    age: number;
    therapeuticArea: string;
    currentDrug?: string;
  },
): RecommendedScreening[] {
  const screeningSet = new Map<ScreeningInstrumentId, RecommendedScreening>();
  let priority = 1;

  // Drug-specific: anti-epileptic drugs carry FDA black box for suicidal ideation
  if (contact.therapeuticArea === 'dee-dravet' && contact.currentDrug === 'relutrigine') {
    screeningSet.set('C-SSRS-LITE', {
      instrumentId: 'C-SSRS-LITE',
      reason: 'FDA black box warning — anti-epileptic drug suicidal ideation risk',
      priority: priority++,
    });
  }

  // Signal-driven screenings
  for (const signal of contact.behavioralSignals) {
    const mapping = SIGNAL_MAPPINGS[signal.category];
    if (!mapping) continue;
    for (const instrumentId of mapping.recommendedScreenings) {
      if (!screeningSet.has(instrumentId)) {
        screeningSet.set(instrumentId, {
          instrumentId,
          reason: `${signal.category} signal — ${mapping.label}`,
          priority: priority++,
        });
      }
    }
  }

  // Therapeutic area-based: ET patients get tremor assessment
  if (contact.therapeuticArea === 'essential-tremor' && !screeningSet.has('TETRAS-LITE')) {
    screeningSet.set('TETRAS-LITE', {
      instrumentId: 'TETRAS-LITE',
      reason: 'Essential tremor patient — tremor severity assessment',
      priority: priority++,
    });
  }

  // Universal: adherence screening for all patients on therapy
  if (contact.currentDrug && !screeningSet.has('MMAS-4')) {
    screeningSet.set('MMAS-4', {
      instrumentId: 'MMAS-4',
      reason: 'Active therapy — medication adherence assessment',
      priority: priority++,
    });
  }

  return Array.from(screeningSet.values()).sort((a, b) => a.priority - b.priority);
}
