import type {
  AgentPersona,
  AgentType,
  SupportPathway,
  SupportPathwayId,
  TherapeuticArea,
  UrgencyLevel,
} from './types';
import type { BrandPack } from './brands';
import { praxisBrand } from './brands/praxis';

// ---------------------------------------------------------------------------
// Brand palette -- Praxis + Vi (kept as-is; already CSS-variable-driven)
// ---------------------------------------------------------------------------
export const COLORS = {
  // Praxis official (scraped from praxismedicines.com)
  primary: '#00B9CE',       // Praxis Teal
  primaryDark: '#009AAD',   // Praxis Teal Dark
  primaryLight: '#25C8D9',  // Praxis Teal Light
  secondary: '#485D61',     // Dark Teal Gray
  accent: '#DE7D00',        // Praxis Orange
  gold: '#EFBC66',          // Praxis Gold
  coral: '#FF7D78',         // Praxis Coral
  blue: '#2C59AB',          // Praxis Blue
  // Vi brand
  viNavy: '#485D61',
  viTeal: '#00B9CE',
  viTealLight: '#E0F7FA',
  // Dashboard backgrounds
  bgDashboard: '#F5F5F5',
  bgCard: '#FFFFFF',
  // Priority tier
  priorityHigh: '#FF7D78',
  priorityMedium: '#DE7D00',
  priorityLow: '#34A853',
  // Support pathways
  hubEnrollment: '#00B9CE',
  copayAssistance: '#2C59AB',
  aeReporting: '#FF7D78',
  adherenceSupport: '#EFBC66',
  sampleRequest: '#DE7D00',
  medicalInquiry: '#485D61',
  // UI neutrals
  textDashboard: '#000000',
  textMuted: '#ACB0B3',
  border: '#E2E7EA',
} as const;

// ---------------------------------------------------------------------------
// Agent Types (4) -- structural, same across all brands
// ---------------------------------------------------------------------------
export const AGENT_TYPE_CONFIG: Record<AgentType, { label: string; description: string; color: string }> = {
  'patient-support': {
    label: 'Patient Support',
    description: 'Inbound/outbound patient hub services, copay, adherence, AE capture',
    color: '#00B9CE',
  },
  'hcp-support': {
    label: 'HCP Support',
    description: 'Inbound HCP medical information, samples, formulary questions',
    color: '#485D61',
  },
  'hcp-outbound': {
    label: 'HCP Outbound',
    description: 'Proactive HCP engagement, detail calls, competitive intelligence',
    color: '#7C3AED',
  },
  'medcomms-qa': {
    label: 'MedComms QA',
    description: 'Medical communications review, off-label monitoring, compliance checks',
    color: '#D97706',
  },
};

// ---------------------------------------------------------------------------
// Brand-aware lookup functions
// ---------------------------------------------------------------------------

/** Return a Record mapping drug product IDs to their brand/generic/TA info. */
export function getDrugProducts(brand: BrandPack) {
  return Object.fromEntries(
    brand.products.map(p => [
      p.id,
      {
        label: `${p.genericName} (${p.brandName})`,
        brandName: p.brandName,
        genericName: p.genericName,
        therapeuticArea: p.therapeuticArea,
        therapeuticAreaLabel: p.therapeuticAreaLabel,
        indication: p.indication,
      },
    ]),
  );
}

/** Return a Record mapping therapeutic area IDs to { label }. */
export function getTherapeuticAreas(brand: BrandPack) {
  return Object.fromEntries(brand.therapeuticAreas.map(ta => [ta.id, { label: ta.label }]));
}

/** Return a Record mapping support pathway IDs to { label, color }. */
export function getSupportPathways(brand: BrandPack) {
  return Object.fromEntries(brand.supportPathways.map(sp => [sp.id, { label: sp.label, color: sp.color }]));
}

/** Return a Record mapping agent types to persona { name, greeting, description }. */
export function getDefaultPersonas(brand: BrandPack) {
  return Object.fromEntries(
    brand.agentPersonas.map(p => [p.agentType, { name: p.name, greeting: p.greeting, description: p.description }]),
  );
}

/** Return the outcome labels Record from a brand pack. */
export function getOutcomeLabels(brand: BrandPack) {
  return brand.outcomeLabels;
}

/** Return demo scenarios grouped by agent type from a brand pack. */
export function getDemoScenarios(brand: BrandPack) {
  const grouped: Record<string, Array<{ id: string; label: string; description: string }>> = {};

  for (const s of brand.demoScenarios) {
    if (!grouped[s.agentType]) {
      grouped[s.agentType] = [];
    }
    const prefix = s.agentType === 'patient-support' ? 'ps'
      : s.agentType === 'hcp-support' ? 'hcp'
      : s.agentType === 'hcp-outbound' ? 'hco'
      : 'mqa';
    const slug = s.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    grouped[s.agentType].push({ id: `${prefix}-${slug}`, label: s.label, description: s.description });
  }

  return grouped;
}

// ---------------------------------------------------------------------------
// Legacy static exports -- Praxis defaults for backward compatibility
// ---------------------------------------------------------------------------

/** @deprecated Use getTherapeuticAreas(brand) instead */
export const THERAPEUTIC_AREAS: Record<string, { label: string; color: string }> = {
  'essential-tremor': { label: 'Essential Tremor (ET)', color: '#00B9CE' },
  'dee-dravet': { label: 'DEE (Dravet Epilepsy)', color: '#7C3AED' },
};

/** @deprecated Use getDrugProducts(brand) instead */
export const DRUG_PRODUCTS: Record<string, { label: string; brandName: string; therapeuticArea: TherapeuticArea; color: string }> = {
  'euloxacaltenamide': {
    label: 'Euloxacaltenamide (ELEX)',
    brandName: 'ELEX',
    therapeuticArea: 'essential-tremor',
    color: '#00B9CE',
  },
  'relutrigine': {
    label: 'Relutrigine',
    brandName: 'Relutrigine',
    therapeuticArea: 'dee-dravet',
    color: '#7C3AED',
  },
};

/** @deprecated Use getSupportPathways(brand) instead */
export const SUPPORT_PATHWAYS: SupportPathway[] = [
  {
    id: 'medication-access',
    label: 'Medication Access & Reimbursement',
    description: 'Support for patients and HCPs navigating insurance coverage, prior authorizations, copay assistance, and specialty pharmacy fulfillment.',
    icon: 'clipboard-check',
    color: COLORS.hubEnrollment,
    urgencyDefault: 'soon',
    regulatoryRelevant: false,
  },
  {
    id: 'safety-reporting',
    label: 'Safety & Adverse Event Reporting',
    description: 'Capture and escalation of adverse events, product quality complaints, and safety-related inquiries per FDA and pharmacovigilance requirements.',
    icon: 'alert-triangle',
    color: COLORS.aeReporting,
    urgencyDefault: 'urgent',
    regulatoryRelevant: true,
  },
  {
    id: 'clinical-education',
    label: 'Clinical Education & Medical Information',
    description: 'Evidence-based clinical information for HCPs including MOA, clinical trial data, dosing guidance, and peer-to-peer MSL discussions.',
    icon: 'stethoscope',
    color: COLORS.copayAssistance,
    urgencyDefault: 'soon',
    regulatoryRelevant: true,
  },
  {
    id: 'patient-education',
    label: 'Patient & Caregiver Education',
    description: 'Educational support for patients and caregivers on disease management, treatment expectations, titration schedules, and living with their condition.',
    icon: 'book-open',
    color: COLORS.adherenceSupport,
    urgencyDefault: 'routine',
    regulatoryRelevant: false,
  },
  {
    id: 'adherence-support',
    label: 'Adherence & Persistence Support',
    description: 'Proactive support to help patients stay on therapy, manage side effects, and maintain their treatment schedule.',
    icon: 'pill',
    color: COLORS.sampleRequest,
    urgencyDefault: 'routine',
    regulatoryRelevant: false,
  },
  {
    id: 'crisis-support',
    label: 'Crisis Intervention & Escalation',
    description: 'Immediate support for callers in acute distress, including suicidal ideation, severe adverse events, caregiver burnout crisis, or medical emergencies.',
    icon: 'phone-call',
    color: COLORS.medicalInquiry,
    urgencyDefault: 'urgent',
    regulatoryRelevant: true,
  },
];

export const SUPPORT_PATHWAY_MAP: Record<SupportPathwayId, SupportPathway> = Object.fromEntries(
  SUPPORT_PATHWAYS.map((p) => [p.id, p]),
) as Record<SupportPathwayId, SupportPathway>;

// ---------------------------------------------------------------------------
// Interaction Outcomes (13)
// ---------------------------------------------------------------------------
/** @deprecated Use getOutcomeLabels(brand) instead */
export const OUTCOME_LABELS: Record<string, string> = getOutcomeLabels(praxisBrand);

export const OUTCOME_COLORS: Record<string, string> = {
  'ae-reported': '#dc2626',
  'ae-escalated': '#991b1b',
  'medical-info-provided': '#2563eb',
  'sample-request': '#7c3aed',
  'copay-card-issued': '#16a34a',
  'hub-enrollment': '#059669',
  'prior-auth-assist': '#0891b2',
  'nurse-educator-referral': '#6366f1',
  'speaker-program-interest': '#8b5cf6',
  'appointment-scheduled': '#22c55e',
  'information-provided': '#f59e0b',
  'callback-requested': '#f97316',
  'declined': '#ef4444',
  'no-answer': '#94a3b8',
  'voicemail': '#a78bfa',
  'crisis-escalation': '#be123c',
};

export const CONVERSION_OUTCOMES: string[] = [
  'ae-reported',
  'ae-escalated',
  'medical-info-provided',
  'sample-request',
  'copay-card-issued',
  'hub-enrollment',
  'prior-auth-assist',
  'nurse-educator-referral',
  'appointment-scheduled',
  'crisis-escalation',
];

export const NON_CONNECT_OUTCOMES: string[] = [
  'no-answer',
  'voicemail',
];

// ---------------------------------------------------------------------------
// Signal Category definitions (generic, not brand-specific)
// ---------------------------------------------------------------------------
export const SIGNAL_CATEGORY_LABELS: Record<string, string> = {
  SEARCH_INTENT: 'Search Intent',
  RX_PATTERN: 'Rx Pattern',
  CLAIMS_SIGNAL: 'Claims Signal',
  HCP_ACTIVITY: 'HCP Activity',
  ADHERENCE_SIGNAL: 'Adherence Signal',
  COMPETITIVE_INTEL: 'Competitive Intel',
};

export const SIGNAL_CATEGORY_COLORS: Record<string, string> = {
  SEARCH_INTENT: '#0891B2',
  RX_PATTERN: '#7C3AED',
  CLAIMS_SIGNAL: '#D97706',
  HCP_ACTIVITY: '#00B9CE',
  ADHERENCE_SIGNAL: '#DC2626',
  COMPETITIVE_INTEL: '#485D61',
};

// ---------------------------------------------------------------------------
// Urgency levels (generic, not brand-specific)
// ---------------------------------------------------------------------------
export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  urgent: 'Urgent',
  soon: 'Soon',
  routine: 'Routine',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  urgent: '#DC2626',
  soon: '#D97706',
  routine: '#059669',
};

// ---------------------------------------------------------------------------
// Languages (generic, not brand-specific)
// ---------------------------------------------------------------------------
export const LANGUAGES = [
  { value: 'en-US', label: 'English' },
  { value: 'es-US', label: 'Spanish' },
  { value: 'zh-CN', label: 'Mandarin' },
  { value: 'fr-FR', label: 'French' },
  { value: 'pt-BR', label: 'Portuguese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'vi-VN', label: 'Vietnamese' },
  { value: 'ar-SA', label: 'Arabic' },
] as const;

// ---------------------------------------------------------------------------
// Default Agent Personas -- 4 agents
// ---------------------------------------------------------------------------
/** @deprecated Use getDefaultPersonas(brand) instead */
export const DEFAULT_PERSONAS: Record<AgentType, AgentPersona> = {
  'patient-support': {
    name: 'Emma',
    agentType: 'patient-support',
    warmth: 90,
    empathy: 92,
    clinicalDepth: 55,
    formality: 40,
    greeting: 'Hi, this is Emma calling from Praxis Patient Support.',
    signoff: "Thank you for your time today. We'll send you a summary of everything we discussed. Take care!",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['ae-detected', 'suicidal-ideation', 'requests-human', 'off-label-question'],
    guardrails: ['no-medical-advice', 'no-dosing-changes', 'report-all-ae', 'refer-to-hcp'],
  },
  'hcp-support': {
    name: 'Aria',
    agentType: 'hcp-support',
    warmth: 60,
    empathy: 65,
    clinicalDepth: 90,
    formality: 75,
    greeting: 'Hello, this is the Praxis Medical Information line. Thank you for calling.',
    signoff: "Thank you, Doctor. I'll send the clinical references we discussed to your office. Have a good day.",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['off-label-request', 'ae-report', 'competitive-comparison', 'formulary-challenge'],
    guardrails: ['on-label-only', 'cite-pi-data', 'report-all-ae', 'no-promotional-claims'],
  },
  'hcp-outbound': {
    name: 'Marcus',
    agentType: 'hcp-outbound',
    warmth: 75,
    empathy: 70,
    clinicalDepth: 80,
    formality: 65,
    greeting: 'Hello, this is Emma from Praxis BioSciences.',
    signoff: "Thank you for your time, Doctor. I'll follow up with the clinical materials we discussed.",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['off-label-question', 'ae-report', 'formulary-objection', 'competitive-switch'],
    guardrails: ['on-label-only', 'no-off-label-promotion', 'report-all-ae', 'respect-opt-out'],
  },
  'medcomms-qa': {
    name: 'Rachel',
    agentType: 'medcomms-qa',
    warmth: 40,
    empathy: 45,
    clinicalDepth: 95,
    formality: 90,
    greeting: 'Thank you for contacting Praxis BioSciences Medical Information.',
    signoff: "Review complete. Compliance report generated and flagged items routed to Medical Affairs.",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['off-label-detected', 'ae-not-reported', 'promotional-deviation', 'data-privacy-breach'],
    guardrails: ['flag-all-deviations', 'require-pi-citations', 'escalate-ae-gaps', 'audit-trail-required'],
  },
};

// ---------------------------------------------------------------------------
// Demo scenarios per agent type
// ---------------------------------------------------------------------------
/** @deprecated Use getDemoScenarios(brand) instead */
export const DEMO_SCENARIOS: Record<AgentType, Array<{ id: string; label: string; description: string }>> =
  getDemoScenarios(praxisBrand) as Record<AgentType, Array<{ id: string; label: string; description: string }>>;

// ---------------------------------------------------------------------------
// Backend URL
// ---------------------------------------------------------------------------
export const WS_BACKEND_URL =
  process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:8080';
