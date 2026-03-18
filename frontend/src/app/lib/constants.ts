import type {
  AgentPersona,
  AgentType,
  DrugProduct,
  InteractionOutcome,
  SignalCategory,
  SupportPathway,
  SupportPathwayId,
  TherapeuticArea,
  UrgencyLevel,
} from './types';

// ---------------------------------------------------------------------------
// Brand palette -- Praxis + Vi
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
// Agent Types (4)
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
// Therapeutic Areas
// ---------------------------------------------------------------------------
export const THERAPEUTIC_AREAS: Record<TherapeuticArea, { label: string; color: string }> = {
  'essential-tremor': { label: 'Essential Tremor (ET)', color: '#00B9CE' },
  'dee': { label: 'DEE (Dravet Epilepsy)', color: '#7C3AED' },
};

// ---------------------------------------------------------------------------
// Drug Products
// ---------------------------------------------------------------------------
export const DRUG_PRODUCTS: Record<DrugProduct, { label: string; brandName: string; therapeuticArea: TherapeuticArea; color: string }> = {
  'euloxacaltenamide': {
    label: 'Euloxacaltenamide (ELEX)',
    brandName: 'ELEX',
    therapeuticArea: 'essential-tremor',
    color: '#00B9CE',
  },
  'relutrigine': {
    label: 'Relutrigine',
    brandName: 'Relutrigine',
    therapeuticArea: 'dee',
    color: '#7C3AED',
  },
};

// ---------------------------------------------------------------------------
// Support Pathways (6)
// ---------------------------------------------------------------------------
export const SUPPORT_PATHWAYS: SupportPathway[] = [
  {
    id: 'hub-enrollment',
    label: 'Hub Enrollment',
    description: 'Patient hub enrollment, benefits investigation, and onboarding support.',
    icon: 'clipboard-check',
    color: COLORS.hubEnrollment,
    urgencyDefault: 'soon',
    regulatoryRelevant: false,
  },
  {
    id: 'copay-assistance',
    label: 'Copay Assistance',
    description: 'Copay card activation, financial assistance programs, and affordability navigation.',
    icon: 'credit-card',
    color: COLORS.copayAssistance,
    urgencyDefault: 'soon',
    regulatoryRelevant: false,
  },
  {
    id: 'ae-reporting',
    label: 'AE Reporting',
    description: 'Adverse event detection, capture, and regulatory submission workflow.',
    icon: 'alert-triangle',
    color: COLORS.aeReporting,
    urgencyDefault: 'urgent',
    regulatoryRelevant: true,
  },
  {
    id: 'adherence-support',
    label: 'Adherence Support',
    description: 'Medication adherence counseling, refill reminders, and dose management.',
    icon: 'pill',
    color: COLORS.adherenceSupport,
    urgencyDefault: 'routine',
    regulatoryRelevant: false,
  },
  {
    id: 'sample-request',
    label: 'Sample Request',
    description: 'HCP sample fulfillment, trial supply management, and shipping coordination.',
    icon: 'package',
    color: COLORS.sampleRequest,
    urgencyDefault: 'routine',
    regulatoryRelevant: false,
  },
  {
    id: 'medical-inquiry',
    label: 'Medical Inquiry',
    description: 'Medical information requests, clinical data inquiries, and off-label question triage.',
    icon: 'stethoscope',
    color: COLORS.medicalInquiry,
    urgencyDefault: 'soon',
    regulatoryRelevant: true,
  },
];

export const SUPPORT_PATHWAY_MAP: Record<SupportPathwayId, SupportPathway> = Object.fromEntries(
  SUPPORT_PATHWAYS.map((p) => [p.id, p]),
) as Record<SupportPathwayId, SupportPathway>;

// ---------------------------------------------------------------------------
// Interaction Outcomes (13)
// ---------------------------------------------------------------------------
export const OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  'hub-enrolled': 'Hub Enrolled',
  'copay-card-issued': 'Copay Card Issued',
  'ae-report-filed': 'AE Report Filed',
  'adherence-counseling': 'Adherence Counseling',
  'sample-shipped': 'Sample Shipped',
  'medical-info-provided': 'Medical Info Provided',
  'hcp-detail-completed': 'HCP Detail Completed',
  'prior-auth-initiated': 'Prior Auth Initiated',
  'callback-requested': 'Callback Requested',
  'follow-up-scheduled': 'Follow-Up Scheduled',
  'declined': 'Declined',
  'no-answer': 'No Answer',
  'voicemail': 'Voicemail Left',
};

export const OUTCOME_COLORS: Record<InteractionOutcome, string> = {
  'hub-enrolled': '#059669',
  'copay-card-issued': '#7C3AED',
  'ae-report-filed': '#DC2626',
  'adherence-counseling': '#0891B2',
  'sample-shipped': '#D97706',
  'medical-info-provided': '#485D61',
  'hcp-detail-completed': '#00B9CE',
  'prior-auth-initiated': '#F59E0B',
  'callback-requested': '#FB923C',
  'follow-up-scheduled': '#34D399',
  'declined': '#EF4444',
  'no-answer': '#94A3B8',
  'voicemail': '#A1A1AA',
};

export const CONVERSION_OUTCOMES: InteractionOutcome[] = [
  'hub-enrolled',
  'copay-card-issued',
  'ae-report-filed',
  'adherence-counseling',
  'sample-shipped',
  'medical-info-provided',
  'hcp-detail-completed',
  'prior-auth-initiated',
  'follow-up-scheduled',
];

export const NON_CONNECT_OUTCOMES: InteractionOutcome[] = [
  'no-answer',
  'voicemail',
];

// ---------------------------------------------------------------------------
// Signal Category definitions
// ---------------------------------------------------------------------------
export const SIGNAL_CATEGORY_LABELS: Record<SignalCategory, string> = {
  SEARCH_INTENT: 'Search Intent',
  RX_PATTERN: 'Rx Pattern',
  CLAIMS_SIGNAL: 'Claims Signal',
  HCP_ACTIVITY: 'HCP Activity',
  ADHERENCE_SIGNAL: 'Adherence Signal',
  COMPETITIVE_INTEL: 'Competitive Intel',
};

export const SIGNAL_CATEGORY_COLORS: Record<SignalCategory, string> = {
  SEARCH_INTENT: '#0891B2',
  RX_PATTERN: '#7C3AED',
  CLAIMS_SIGNAL: '#D97706',
  HCP_ACTIVITY: '#00B9CE',
  ADHERENCE_SIGNAL: '#DC2626',
  COMPETITIVE_INTEL: '#485D61',
};

// ---------------------------------------------------------------------------
// Urgency levels
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
// Languages
// ---------------------------------------------------------------------------
export const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-US', label: 'Spanish (US)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'pt-BR', label: 'Portuguese (BR)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
] as const;

// ---------------------------------------------------------------------------
// Default Agent Personas -- 4 agents
// ---------------------------------------------------------------------------
export const DEFAULT_PERSONAS: Record<AgentType, AgentPersona> = {
  'patient-support': {
    name: 'Aria',
    agentType: 'patient-support',
    warmth: 90,
    empathy: 92,
    clinicalDepth: 55,
    formality: 40,
    greeting: "Hi {contactName}, this is Aria from Praxis BioSciences patient support. I'm here to help you with your {drugProduct} therapy.",
    signoff: "Thank you for your time today. We'll send you a summary of everything we discussed. Take care!",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['ae-detected', 'suicidal-ideation', 'requests-human', 'off-label-question'],
    guardrails: ['no-medical-advice', 'no-dosing-changes', 'report-all-ae', 'refer-to-hcp'],
  },
  'hcp-support': {
    name: 'Dr. Marcus',
    agentType: 'hcp-support',
    warmth: 60,
    empathy: 65,
    clinicalDepth: 90,
    formality: 75,
    greeting: "Good day, Dr. {contactName}. This is Marcus from Praxis Medical Information. How can I assist you today?",
    signoff: "Thank you, Doctor. I'll send the clinical references we discussed to your office. Have a good day.",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['off-label-request', 'ae-report', 'competitive-comparison', 'formulary-challenge'],
    guardrails: ['on-label-only', 'cite-pi-data', 'report-all-ae', 'no-promotional-claims'],
  },
  'hcp-outbound': {
    name: 'Rachel',
    agentType: 'hcp-outbound',
    warmth: 75,
    empathy: 70,
    clinicalDepth: 80,
    formality: 65,
    greeting: "Hi Dr. {contactName}, this is Rachel from Praxis BioSciences. I'm reaching out to share some updates on our neurology portfolio.",
    signoff: "Thank you for your time, Doctor. I'll follow up with the clinical materials we discussed.",
    language: 'en-US',
    therapeuticFocus: undefined,
    escalationTriggers: ['off-label-question', 'ae-report', 'formulary-objection', 'competitive-switch'],
    guardrails: ['on-label-only', 'no-off-label-promotion', 'report-all-ae', 'respect-opt-out'],
  },
  'medcomms-qa': {
    name: 'Compliance',
    agentType: 'medcomms-qa',
    warmth: 40,
    empathy: 45,
    clinicalDepth: 95,
    formality: 90,
    greeting: "This is the Praxis MedComms QA review system. Analyzing interaction transcript for compliance.",
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
export const DEMO_SCENARIOS: Record<AgentType, Array<{ id: string; label: string; description: string }>> = {
  'patient-support': [
    { id: 'ps-hub-enroll', label: 'Hub Enrollment', description: 'New patient enrolling in Praxis Support Hub for ELEX' },
    { id: 'ps-copay', label: 'Copay Card Activation', description: 'Patient activating copay assistance for Relutrigine' },
    { id: 'ps-ae', label: 'AE Report', description: 'Patient reports adverse event during adherence check-in' },
    { id: 'ps-adherence', label: 'Adherence Check-in', description: 'Proactive adherence support call for ELEX patient' },
  ],
  'hcp-support': [
    { id: 'hcp-medinfo', label: 'Medical Inquiry', description: 'Neurologist requesting ELEX clinical trial data' },
    { id: 'hcp-sample', label: 'Sample Request', description: 'Movement disorder specialist requesting ELEX samples' },
    { id: 'hcp-formulary', label: 'Formulary Support', description: 'HCP needs prior auth support for Relutrigine' },
  ],
  'hcp-outbound': [
    { id: 'hco-detail', label: 'Product Detail', description: 'Proactive ELEX detail call to neurologist' },
    { id: 'hco-switch', label: 'Switch Opportunity', description: 'Competitive switch discussion for ET patients' },
    { id: 'hco-launch', label: 'Launch Update', description: 'Relutrigine launch update to epileptologist' },
  ],
  'medcomms-qa': [
    { id: 'mqa-review', label: 'Transcript Review', description: 'QA review of patient support interaction' },
    { id: 'mqa-offlabel', label: 'Off-Label Check', description: 'Off-label mention detection in HCP call' },
    { id: 'mqa-ae-audit', label: 'AE Audit', description: 'Audit AE capture completeness across interactions' },
  ],
};

// ---------------------------------------------------------------------------
// Backend URL
// ---------------------------------------------------------------------------
export const WS_BACKEND_URL =
  process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:8080';
