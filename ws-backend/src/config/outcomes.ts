// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Outcome Definitions
// ---------------------------------------------------------------------------

import type { OutcomeType } from '../types/index.js';
import { getBrandConfig, type BrandBackendConfig } from '../brands/index.js';

export interface OutcomeDefinition {
  id: OutcomeType;
  label: string;
  description: string;
  smsTemplate: string | null;
  isConversion: boolean;
  color: string; // Hex color for dashboard display
}

export const OUTCOMES: OutcomeDefinition[] = [
  {
    id: 'ae-reported',
    label: 'Adverse Event Reported',
    description: 'An adverse event was identified and documented during the interaction. Routed to pharmacovigilance for review.',
    smsTemplate: 'ae_confirmation',
    isConversion: true,
    color: '#dc2626', // red-600
  },
  {
    id: 'ae-escalated',
    label: 'Adverse Event Escalated',
    description: 'A serious adverse event was identified and immediately escalated to Drug Safety for urgent review and regulatory reporting.',
    smsTemplate: 'ae_escalation_followup',
    isConversion: true,
    color: '#991b1b', // red-800
  },
  {
    id: 'medical-info-provided',
    label: 'Medical Information Provided',
    description: 'HCP or patient received on-label medical information, clinical data, or dosing guidance.',
    smsTemplate: 'medical_info_followup',
    isConversion: true,
    color: '#2563eb', // blue-600
  },
  {
    id: 'sample-request',
    label: 'Sample Request',
    description: 'HCP requested product samples. Request documented and routed for fulfillment.',
    smsTemplate: 'sample_confirmation',
    isConversion: true,
    color: '#7c3aed', // violet-600
  },
  {
    id: 'copay-card-issued',
    label: 'Copay Card Issued',
    description: 'Patient was enrolled in the Praxis copay assistance program and issued a copay card.',
    smsTemplate: 'copay_card_details',
    isConversion: true,
    color: '#16a34a', // green-600
  },
  {
    id: 'hub-enrollment',
    label: 'Hub Enrollment',
    description: 'Patient or HCP completed enrollment in PraxisConnect hub services for ongoing access and adherence support.',
    smsTemplate: 'hub_welcome',
    isConversion: true,
    color: '#059669', // emerald-600
  },
  {
    id: 'prior-auth-assist',
    label: 'Prior Auth Assistance',
    description: 'Prior authorization was initiated or supported by hub services on behalf of the patient and prescriber.',
    smsTemplate: 'prior_auth_status',
    isConversion: true,
    color: '#0891b2', // cyan-600
  },
  {
    id: 'nurse-educator-referral',
    label: 'Nurse Educator Referral',
    description: 'Patient or caregiver was referred to a Praxis nurse educator for clinical education and support.',
    smsTemplate: 'nurse_educator_intro',
    isConversion: true,
    color: '#6366f1', // indigo-600
  },
  {
    id: 'speaker-program-interest',
    label: 'Speaker Program Interest',
    description: 'HCP expressed interest in attending or participating in a Praxis speaker program or educational event.',
    smsTemplate: 'speaker_program_info',
    isConversion: false, // Not a conversion — tracking speaker interest as conversion documents a commercial incentive that OIG flags
    color: '#8b5cf6', // violet-500
  },
  {
    id: 'appointment-scheduled',
    label: 'Appointment Scheduled',
    description: 'Contact committed to a follow-up appointment with their prescriber or a specialist.',
    smsTemplate: 'appointment_confirmation',
    isConversion: true,
    color: '#22c55e', // green-500
  },
  {
    id: 'information-provided',
    label: 'Information Provided',
    description: 'Contact received general product, disease, or program information. No specific commitment made.',
    smsTemplate: 'general_followup',
    isConversion: false,
    color: '#f59e0b', // amber-500
  },
  {
    id: 'callback-requested',
    label: 'Callback Requested',
    description: 'Contact asked to be contacted at a different time.',
    smsTemplate: 'general_followup',
    isConversion: false,
    color: '#f97316', // orange-500
  },
  {
    id: 'declined',
    label: 'Declined',
    description: 'Contact explicitly declined the offered support, program, or resource.',
    smsTemplate: null,
    isConversion: false,
    color: '#ef4444', // red-500
  },
  {
    id: 'no-answer',
    label: 'No Answer',
    description: 'Outbound call was not answered.',
    smsTemplate: null,
    isConversion: false,
    color: '#94a3b8', // slate-400
  },
  {
    id: 'voicemail',
    label: 'Voicemail',
    description: 'Outbound call reached voicemail. A compliant message was left with callback information.',
    smsTemplate: 'voicemail_followup',
    isConversion: false,
    color: '#a78bfa', // violet-400
  },
  {
    id: 'crisis-escalation',
    label: 'Crisis Escalation',
    description: 'Contact was in acute distress or reported suicidal ideation. Immediately escalated to crisis resources (988 Lifeline) and prescribing physician notified.',
    smsTemplate: 'crisis_resources',
    isConversion: true,
    color: '#be123c', // rose-700
  },
];

export const CONVERSION_OUTCOMES: OutcomeType[] = OUTCOMES
  .filter((o) => o.isConversion)
  .map((o) => o.id);

export function getOutcomeDefinition(outcome: OutcomeType): OutcomeDefinition {
  return OUTCOMES.find((o) => o.id === outcome)
    ?? OUTCOMES.find((o) => o.id === 'information-provided')!;
}

// ---------------------------------------------------------------------------
// Brand-aware outcome labels
// ---------------------------------------------------------------------------
// Returns a map of outcome ID -> display label, merging base labels with
// any brand-specific overrides from config.outcomeOverrides.
// ---------------------------------------------------------------------------

export function getOutcomeLabels(
  config?: BrandBackendConfig,
): Record<string, string> {
  const cfg = config ?? getBrandConfig();
  const labels: Record<string, string> = {};
  for (const o of OUTCOMES) {
    labels[o.id] = o.label;
  }
  // Apply brand-specific overrides
  if (cfg.outcomeOverrides) {
    for (const [id, label] of Object.entries(cfg.outcomeOverrides)) {
      labels[id] = label;
    }
  }
  return labels;
}
