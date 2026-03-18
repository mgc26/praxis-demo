// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Support Knowledge Configuration
// ---------------------------------------------------------------------------

import type { SupportPathway, RiskTier } from '../types/index.js';

// ---------------------------------------------------------------------------
// Support Pathway Definitions
// ---------------------------------------------------------------------------

export interface SupportPathwayDefinition {
  id: SupportPathway;
  name: string;
  description: string;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  suggestedResources: string[];
  keyTalkingPoints: string[];
  escalationCriteria: string[];
}

export const SUPPORT_PATHWAYS: Record<SupportPathway, SupportPathwayDefinition> = {
  'medication-access': {
    id: 'medication-access',
    name: 'Medication Access & Reimbursement',
    description: 'Support for patients and HCPs navigating insurance coverage, prior authorizations, copay assistance, and specialty pharmacy fulfillment.',
    urgencyLevel: 'soon',
    suggestedResources: ['Hub Services', 'Field Reimbursement Manager', 'Specialty Pharmacy'],
    keyTalkingPoints: [
      'Our hub services team can initiate and track prior authorizations on your behalf.',
      'The Praxis copay assistance program may reduce your out-of-pocket cost to as low as $0.',
      'We work with specialty pharmacies nationwide to ensure timely delivery of your medication.',
      'If your insurance has denied coverage, our team can assist with the appeals process.',
    ],
    escalationCriteria: [
      'Prior authorization denied and patient is clinically urgent',
      'Patient unable to afford medication even with copay assistance',
      'Specialty pharmacy fulfillment delay exceeding 7 days',
      'Patient at risk of treatment interruption due to access barriers',
    ],
  },
  'safety-reporting': {
    id: 'safety-reporting',
    name: 'Safety & Adverse Event Reporting',
    description: 'Capture and escalation of adverse events, product quality complaints, and safety-related inquiries per FDA and Praxis pharmacovigilance requirements.',
    urgencyLevel: 'urgent',
    suggestedResources: ['Drug Safety / Pharmacovigilance', 'Medical Information', 'Nurse Educator'],
    keyTalkingPoints: [
      'Your safety is our top priority. I want to make sure we capture this information accurately.',
      'I\'ll need to ask you a few specific questions about what you experienced and when it started.',
      'This information will be reviewed by our medical safety team.',
      'If you are experiencing a medical emergency, please call 911 or go to your nearest emergency room.',
    ],
    escalationCriteria: [
      'Serious adverse event (hospitalization, life-threatening, disability, death)',
      'Any adverse event in a pregnant or nursing patient',
      'Product quality complaint with associated adverse event',
      'Suicidal ideation or self-harm reported (immediate crisis escalation)',
    ],
  },
  'clinical-education': {
    id: 'clinical-education',
    name: 'Clinical Education & Medical Information',
    description: 'Evidence-based clinical information for HCPs including mechanism of action, clinical trial data, dosing guidance, and peer-to-peer MSL discussions.',
    urgencyLevel: 'routine',
    suggestedResources: ['Medical Science Liaison', 'Medical Information', 'Speaker Programs'],
    keyTalkingPoints: [
      'Our Medical Science Liaison team is available for a peer-to-peer discussion on the clinical data.',
      'We can provide reprints of published clinical trial results and real-world evidence.',
      'Dosing and titration guidance is available in the full prescribing information.',
      'We have upcoming speaker programs and CME-accredited educational events.',
    ],
    escalationCriteria: [
      'HCP requesting off-label information (must route to Medical Information)',
      'HCP reporting unexpected clinical outcome',
      'Request for data not available in approved labeling',
      'Urgent dosing question requiring medical review',
    ],
  },
  'patient-education': {
    id: 'patient-education',
    name: 'Patient & Caregiver Education',
    description: 'Educational support for patients and caregivers on disease management, treatment expectations, titration schedules, and living with their condition.',
    urgencyLevel: 'routine',
    suggestedResources: ['Nurse Educator', 'Patient Advocacy Organizations', 'Digital Resources'],
    keyTalkingPoints: [
      'Our nurse educators can walk you through what to expect as you start treatment.',
      'We have patient-friendly materials about your condition and how your medication works.',
      'Understanding your titration schedule helps you get the most benefit from your treatment.',
      'Patient advocacy organizations like the Dravet Syndrome Foundation and IETF offer community support.',
    ],
    escalationCriteria: [
      'Patient expressing confusion about dosing that could lead to medication error',
      'Caregiver unable to manage treatment regimen',
      'Patient not understanding critical safety information',
      'Patient requesting information beyond approved patient labeling',
    ],
  },
  'adherence-support': {
    id: 'adherence-support',
    name: 'Adherence & Persistence Support',
    description: 'Proactive support to help patients stay on therapy, manage side effects, and maintain their treatment schedule.',
    urgencyLevel: 'soon',
    suggestedResources: ['Nurse Educator', 'Hub Services', 'Specialty Pharmacy'],
    keyTalkingPoints: [
      'Staying on your medication schedule is key to getting the best results from your treatment.',
      'If you\'re experiencing side effects, there are strategies that may help — let\'s talk about them.',
      'Our specialty pharmacy can set up automatic refill reminders so you never miss a dose.',
      'If cost is making it hard to stay on your medication, our copay program may be able to help.',
    ],
    escalationCriteria: [
      'Patient has missed more than 2 consecutive refills',
      'Patient reports intolerable side effects leading to discontinuation consideration',
      'Anti-epileptic drug patient at risk of abrupt discontinuation (seizure risk)',
      'Patient self-adjusting dose without physician guidance',
    ],
  },
  'crisis-support': {
    id: 'crisis-support',
    name: 'Crisis Intervention & Escalation',
    description: 'Immediate support for callers in acute distress, including suicidal ideation, severe adverse events, caregiver burnout crisis, or medical emergencies.',
    urgencyLevel: 'urgent',
    suggestedResources: ['988 Suicide & Crisis Lifeline', 'Drug Safety / Pharmacovigilance', 'Emergency Services'],
    keyTalkingPoints: [
      'I hear you, and I want to make sure you get the right help right now.',
      'If you or someone you know is in immediate danger, please call 911.',
      'The 988 Suicide and Crisis Lifeline is available 24/7 — you can call or text 988.',
      'I\'m going to connect you with someone who can help you right away.',
    ],
    escalationCriteria: [
      'Any mention of suicidal ideation, self-harm, or harm to others',
      'Caller reports active seizure or medical emergency',
      'Severe adverse event requiring immediate medical attention',
      'Caregiver in acute emotional crisis',
    ],
  },
};

// ---------------------------------------------------------------------------
// Pharma Contact Network (replaces Provider Network)
// ---------------------------------------------------------------------------

export interface ContactResource {
  name: string;
  type: string;
  phone: string;
  coverage: string;
  availability: string;
  capabilities: string[];
}

export interface ResourceCategory {
  category: string;
  resources: ContactResource[];
}

export const PHARMA_CONTACT_NETWORK: ResourceCategory[] = [
  {
    category: 'Specialty Pharmacy',
    resources: [
      {
        name: 'Praxis Specialty Pharmacy Hub — PraxisConnect',
        type: 'Hub Specialty Pharmacy',
        phone: '+18005550101',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–8pm ET, Sat 9am–3pm ET',
        capabilities: ['Prescription fulfillment', 'Refill management', 'Cold chain shipping', 'Patient counseling'],
      },
      {
        name: 'Accredo Specialty Pharmacy',
        type: 'Contracted Specialty Pharmacy',
        phone: '+18005550102',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–10pm ET, Sat 9am–5pm ET',
        capabilities: ['Specialty fulfillment', 'Prior auth support', 'Patient education', 'Financial assistance coordination'],
      },
      {
        name: 'CVS Specialty',
        type: 'Contracted Specialty Pharmacy',
        phone: '+18005550103',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–9pm ET, Sat 9am–5pm ET',
        capabilities: ['Specialty fulfillment', 'Adherence monitoring', 'Refill reminders', 'Clinical support'],
      },
    ],
  },
  {
    category: 'Hub Services',
    resources: [
      {
        name: 'PraxisConnect Patient Hub',
        type: 'Patient Services Hub',
        phone: '+18005550201',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–8pm ET',
        capabilities: ['Benefits verification', 'Prior authorization', 'Copay assistance enrollment', 'Appeal support', 'Patient onboarding'],
      },
      {
        name: 'PraxisConnect HCP Portal Support',
        type: 'HCP Services Hub',
        phone: '+18005550202',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–6pm ET',
        capabilities: ['Enrollment processing', 'Sample request fulfillment', 'Reimbursement guidance', 'Formulary status lookup'],
      },
    ],
  },
  {
    category: 'Medical Science Liaisons',
    resources: [
      {
        name: 'Dr. Rebecca Torres, PharmD — Neurology MSL (Northeast)',
        type: 'Medical Science Liaison',
        phone: '+16175550301',
        coverage: 'Northeast US',
        availability: 'Mon–Fri 9am–6pm ET',
        capabilities: ['Peer-to-peer scientific exchange', 'Clinical data presentation', 'KOL engagement', 'Investigator-initiated trial support'],
      },
      {
        name: 'Dr. David Chen, PhD — Neurology MSL (West)',
        type: 'Medical Science Liaison',
        phone: '+14155550302',
        coverage: 'Western US',
        availability: 'Mon–Fri 9am–6pm PT',
        capabilities: ['Peer-to-peer scientific exchange', 'Clinical data presentation', 'Advisory board coordination', 'Conference follow-up'],
      },
      {
        name: 'Dr. Aisha Patel, MD — Neurology MSL (Central)',
        type: 'Medical Science Liaison',
        phone: '+13125550303',
        coverage: 'Central US',
        availability: 'Mon–Fri 9am–6pm CT',
        capabilities: ['Peer-to-peer scientific exchange', 'Clinical data presentation', 'Speaker program coordination', 'Publication support'],
      },
    ],
  },
  {
    category: 'Nurse Educators',
    resources: [
      {
        name: 'Sarah Mitchell, RN — ET Nurse Educator',
        type: 'Nurse Educator',
        phone: '+18005550401',
        coverage: 'Nationwide (phone/video)',
        availability: 'Mon–Fri 9am–5pm ET',
        capabilities: ['Patient onboarding education', 'Titration coaching', 'Side effect management', 'Adherence counseling', 'Caregiver support'],
      },
      {
        name: 'Marcus Johnson, RN — DEE Nurse Educator',
        type: 'Nurse Educator',
        phone: '+18005550402',
        coverage: 'Nationwide (phone/video)',
        availability: 'Mon–Fri 9am–5pm ET',
        capabilities: ['Patient/caregiver education', 'Seizure management guidance', 'Titration support', 'Emergency action planning', 'Emotional support'],
      },
      {
        name: 'Praxis Nurse Educator Triage Line',
        type: 'Nurse Triage',
        phone: '+18005550403',
        coverage: 'Nationwide',
        availability: 'Mon–Sat 8am–8pm ET',
        capabilities: ['Clinical triage', 'AE assessment', 'Urgent escalation', 'Provider communication'],
      },
    ],
  },
  {
    category: 'Field Reimbursement',
    resources: [
      {
        name: 'Praxis Field Reimbursement Team',
        type: 'Field Reimbursement Manager',
        phone: '+18005550501',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–6pm ET',
        capabilities: ['Payer-specific coverage guidance', 'Prior auth strategy', 'Appeals support', 'Buy-and-bill assistance', 'Benefit investigation'],
      },
    ],
  },
  {
    category: 'Drug Safety',
    resources: [
      {
        name: 'Praxis Drug Safety / Pharmacovigilance',
        type: 'Pharmacovigilance',
        phone: '+18005550601',
        coverage: 'Nationwide',
        availability: '24/7',
        capabilities: ['Adverse event intake', 'Safety assessment', 'FDA MedWatch reporting', 'Product quality complaints', 'Pregnancy registry'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Contact Communication Preferences by Risk Tier
// ---------------------------------------------------------------------------

export interface RiskTierCommunicationPrefs {
  maxCallAttempts: number;
  callbackWindowHours: number;
  smsEnabled: boolean;
  escalateToNurseOnNoAnswer: boolean;
  followUpDays: number;
}

export const RISK_TIER_PREFS: Record<RiskTier, RiskTierCommunicationPrefs> = {
  HIGH: {
    maxCallAttempts: 5,
    callbackWindowHours: 24,
    smsEnabled: true,
    escalateToNurseOnNoAnswer: true,
    followUpDays: 1,
  },
  MEDIUM: {
    maxCallAttempts: 3,
    callbackWindowHours: 48,
    smsEnabled: true,
    escalateToNurseOnNoAnswer: false,
    followUpDays: 3,
  },
  LOW: {
    maxCallAttempts: 2,
    callbackWindowHours: 72,
    smsEnabled: true,
    escalateToNurseOnNoAnswer: false,
    followUpDays: 7,
  },
};

// ---------------------------------------------------------------------------
// Engagement Label Definitions (for contact context)
// ---------------------------------------------------------------------------

export const ENGAGEMENT_LABELS: Record<string, string> = {
  'new-start': 'New Patient Start',
  'titration-phase': 'Active Titration Phase',
  'maintenance-therapy': 'Maintenance Therapy',
  'refill-overdue': 'Refill Overdue',
  'prior-auth-pending': 'Prior Authorization Pending',
  'prior-auth-denied': 'Prior Authorization Denied',
  'copay-enrolled': 'Copay Assistance Enrolled',
  'hub-enrolled': 'Hub Services Enrolled',
  'ae-history': 'Adverse Event History',
  'high-prescriber': 'High-Volume Prescriber',
  'speaker-program': 'Speaker Program Participant',
  'kol-target': 'Key Opinion Leader Target',
};
