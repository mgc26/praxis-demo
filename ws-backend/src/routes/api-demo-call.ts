// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — API Route: Demo Call
// Accepts a phone number + scenario from the Agent Config panel and initiates
// a live Twilio outbound call via the contact-outreach processor.
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { contacts, calls, callIdBySid } from '../server.js';
import { processContactOutreach } from '../services/contact-outreach-processor.js';
import type { ContactRecord, BehavioralSignal, TherapeuticArea } from '../types/index.js';

function sig(detail: string, category: BehavioralSignal['category'] = 'ADHERENCE_GAP'): BehavioralSignal {
  return { category, detail, recency: 'this week', severity: 'high', clinicalImplication: detail };
}

// ---------------------------------------------------------------------------
// Rate limiting — max 3 calls per 10 minutes per IP
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3;
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Prune timestamps older than the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX) {
    return true;
  }

  recent.push(now);
  return false;
}

// ---------------------------------------------------------------------------
// Phone validation — must be US E.164 and not premium-rate
// ---------------------------------------------------------------------------

const PHONE_REGEX = /^\+1[2-9]\d{9}$/;

function isValidPhone(phone: string): boolean {
  if (!PHONE_REGEX.test(phone)) return false;
  if (phone.startsWith('+1900') || phone.startsWith('+1976')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Scenario defaults — maps scenarioId to default contact profile
// ---------------------------------------------------------------------------

const SCENARIO_DEFAULTS: Record<string, Partial<ContactRecord>> = {
  // ---- Patient Support scenarios ----
  'patient-et-adherence': {
    name: 'Margaret Chen',
    age: 62,
    gender: 'female',
    contactType: 'patient',
    agentType: 'patient-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 78,
    diagnosis: 'Essential Tremor (moderate-severe)',
    currentDrug: 'euloxacaltenamide',
    currentDose: '150mg BID',
    titrationPhase: 'maintenance',
    prescribingHcp: 'Dr. Sarah Kim',
    prescribingHcpNpi: '1234567890',
    hubEnrolled: true,
    copayCardActive: true,
    priorAuthStatus: 'approved',
    behavioralSignals: [
      sig('Pharmacy gap: ELEX refill 10 days overdue — possible adherence issue', 'ADHERENCE_GAP'),
      sig('Searched "euloxacaltenamide side effects dizziness" 3 days ago', 'SYMPTOM_SEARCH'),
    ],
    recommendedPathway: 'adherence-support',
    engagementLabels: ['refill-overdue', 'side-effect-concern'],
  },
  'patient-dee-caregiver': {
    name: 'Jennifer Martinez',
    age: 38,
    gender: 'female',
    contactType: 'caregiver',
    agentType: 'patient-support',
    therapeuticArea: 'dee-dravet',
    riskTier: 'HIGH',
    riskScore: 85,
    diagnosis: 'Dravet Syndrome (child, age 6)',
    currentDrug: 'relutrigine',
    currentDose: '0.5mg/kg BID',
    titrationPhase: 'uptitration',
    prescribingHcp: 'Dr. Michael Torres',
    prescribingHcpNpi: '2345678901',
    hubEnrolled: true,
    copayCardActive: false,
    priorAuthStatus: 'approved',
    behavioralSignals: [
      sig('Caregiver searched "relutrigine rash" and "dravet seizure frequency" in past 48h', 'CAREGIVER_DISTRESS'),
      sig('Called nurse educator line twice this week — no answer', 'ADHERENCE_GAP'),
    ],
    recommendedPathway: 'safety-reporting',
    engagementLabels: ['caregiver-distress', 'possible-ae', 'nurse-educator-needed'],
  },

  // ---- Patient Support: Hub Enrollment ----
  'ps-hub-enroll': {
    name: 'David Nguyen',
    age: 55,
    gender: 'male',
    contactType: 'patient',
    agentType: 'patient-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'MEDIUM',
    riskScore: 60,
    diagnosis: 'Essential Tremor (mild-moderate)',
    currentDrug: 'euloxacaltenamide',
    currentDose: '75mg BID',
    titrationPhase: 'uptitration',
    prescribingHcp: 'Dr. Sarah Kim',
    prescribingHcpNpi: '1234567890',
    hubEnrolled: false,
    copayCardActive: false,
    priorAuthStatus: 'pending',
    behavioralSignals: [
      sig('New prescription filled 3 days ago — first fill', 'ADHERENCE_GAP'),
    ],
    recommendedPathway: 'medication-access',
    engagementLabels: ['new-start', 'hub-eligible', 'needs-onboarding'],
  },

  // ---- Patient Support: Copay Assistance ----
  'ps-copay': {
    name: 'Patricia Williams',
    age: 68,
    gender: 'female',
    contactType: 'patient',
    agentType: 'patient-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'MEDIUM',
    riskScore: 55,
    diagnosis: 'Essential Tremor (moderate)',
    currentDrug: 'euloxacaltenamide',
    currentDose: '150mg BID',
    titrationPhase: 'maintenance',
    prescribingHcp: 'Dr. Lisa Thompson',
    prescribingHcpNpi: '4567890123',
    hubEnrolled: true,
    copayCardActive: false,
    priorAuthStatus: 'approved',
    behavioralSignals: [
      sig('Called pharmacy asking about cost — copay $450/month without card', 'ADHERENCE_GAP'),
    ],
    recommendedPathway: 'medication-access',
    engagementLabels: ['cost-concern', 'copay-eligible'],
  },

  // ---- Patient Support: Adverse Event ----
  'ps-ae': {
    name: 'Robert Jackson',
    age: 71,
    gender: 'male',
    contactType: 'patient',
    agentType: 'patient-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 82,
    diagnosis: 'Essential Tremor (severe)',
    currentDrug: 'euloxacaltenamide',
    currentDose: '200mg BID',
    titrationPhase: 'maintenance',
    prescribingHcp: 'Dr. Richard Park',
    prescribingHcpNpi: '3456789012',
    hubEnrolled: true,
    copayCardActive: true,
    priorAuthStatus: 'approved',
    behavioralSignals: [
      sig('Searched "euloxacaltenamide liver problems" and "ELEX jaundice" yesterday', 'SYMPTOM_SEARCH'),
      sig('Missed last refill — 5 days overdue', 'ADHERENCE_GAP'),
    ],
    recommendedPathway: 'safety-reporting',
    engagementLabels: ['possible-ae', 'hepatic-concern', 'refill-overdue'],
  },

  // ---- Patient Support: Adherence ----
  'ps-adherence': {
    name: 'Margaret Chen',
    age: 62,
    gender: 'female',
    contactType: 'patient',
    agentType: 'patient-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 78,
    diagnosis: 'Essential Tremor (moderate-severe)',
    currentDrug: 'euloxacaltenamide',
    currentDose: '150mg BID',
    titrationPhase: 'maintenance',
    prescribingHcp: 'Dr. Sarah Kim',
    prescribingHcpNpi: '1234567890',
    hubEnrolled: true,
    copayCardActive: true,
    priorAuthStatus: 'approved',
    behavioralSignals: [
      sig('Pharmacy gap: ELEX refill 10 days overdue — possible adherence issue', 'ADHERENCE_GAP'),
      sig('Searched "euloxacaltenamide side effects dizziness" 3 days ago', 'SYMPTOM_SEARCH'),
    ],
    recommendedPathway: 'adherence-support',
    engagementLabels: ['refill-overdue', 'side-effect-concern'],
  },

  // ---- HCP Outbound scenarios ----
  'hcp-outbound-neurology': {
    name: 'Dr. Richard Park',
    age: 52,
    gender: 'male',
    contactType: 'hcp',
    agentType: 'hcp-outbound',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 72,
    npi: '3456789012',
    specialty: 'Neurology',
    institution: 'Pacific Neuroscience Institute',
    prescribingVolume: 'medium',
    samplesOnHand: false,
    speakerProgramMember: false,
    behavioralSignals: [
      sig('Downloaded competitor (primidone) dosing guide from medical portal', 'COMPETITOR_RESEARCH'),
      sig('Attended virtual symposium on ET treatment algorithms — high KOL engagement score', 'KOL_ENGAGEMENT'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['competitor-research', 'kol-target', 'sample-eligible'],
  },

  // ---- HCP Support scenarios ----
  'hcp-support-dosing': {
    name: 'Dr. Lisa Thompson',
    age: 45,
    gender: 'female',
    contactType: 'hcp',
    agentType: 'hcp-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'MEDIUM',
    riskScore: 55,
    npi: '4567890123',
    specialty: 'Family Medicine',
    institution: 'Meridian Primary Care Group',
    prescribingVolume: 'low',
    samplesOnHand: true,
    speakerProgramMember: false,
    behavioralSignals: [
      sig('Searched "euloxacaltenamide titration schedule" on formulary portal', 'FORMULARY_LOOKUP'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['dosing-question', 'new-prescriber'],
  },

  // ---- HCP: Medical Information ----
  'hcp-medinfo': {
    name: 'Dr. Amanda Foster',
    age: 48,
    gender: 'female',
    contactType: 'hcp',
    agentType: 'hcp-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'MEDIUM',
    riskScore: 50,
    npi: '5678901234',
    specialty: 'Neurology',
    institution: 'University Medical Center',
    prescribingVolume: 'high',
    samplesOnHand: true,
    speakerProgramMember: true,
    behavioralSignals: [
      sig('Submitted medical information request via portal — MOA clarification', 'FORMULARY_LOOKUP'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['medinfo-request', 'kol-speaker'],
  },

  // ---- HCP: Sample Request ----
  'hcp-sample': {
    name: 'Dr. James Whitfield',
    age: 39,
    gender: 'male',
    contactType: 'hcp',
    agentType: 'hcp-outbound',
    therapeuticArea: 'essential-tremor',
    riskTier: 'MEDIUM',
    riskScore: 58,
    npi: '6789012345',
    specialty: 'Internal Medicine',
    institution: 'Summit Health Partners',
    prescribingVolume: 'low',
    samplesOnHand: false,
    speakerProgramMember: false,
    behavioralSignals: [
      sig('Requested samples via rep portal — first sample request', 'KOL_ENGAGEMENT'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['sample-request', 'new-prescriber', 'trial-interest'],
  },

  // ---- HCP: Formulary ----
  'hcp-formulary': {
    name: 'Dr. Karen Mitchell',
    age: 56,
    gender: 'female',
    contactType: 'hcp',
    agentType: 'hcp-support',
    therapeuticArea: 'essential-tremor',
    riskTier: 'LOW',
    riskScore: 40,
    npi: '7890123456',
    specialty: 'Family Medicine',
    institution: 'Lakeside Family Practice',
    prescribingVolume: 'low',
    samplesOnHand: false,
    speakerProgramMember: false,
    behavioralSignals: [
      sig('Searched formulary status for euloxacaltenamide at 3 local health plans', 'FORMULARY_LOOKUP'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['formulary-question', 'access-concern'],
  },

  // ---- HCO: Detail Aid ----
  'hco-detail': {
    name: 'Dr. Steven Walsh',
    age: 50,
    gender: 'male',
    contactType: 'hcp',
    agentType: 'hcp-outbound',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 70,
    npi: '8901234567',
    specialty: 'Neurology',
    institution: 'Northeast Movement Disorders Clinic',
    prescribingVolume: 'high',
    samplesOnHand: true,
    speakerProgramMember: false,
    behavioralSignals: [
      sig('High prescribing volume but declining ELEX share — competitor switch signals', 'COMPETITOR_RESEARCH'),
      sig('Attended competitor-sponsored dinner program last month', 'KOL_ENGAGEMENT'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['high-decile', 'competitor-risk', 'detail-due'],
  },

  // ---- HCO: Formulary Switch ----
  'hco-switch': {
    name: 'Dr. Rachel Gutierrez',
    age: 44,
    gender: 'female',
    contactType: 'hcp',
    agentType: 'hcp-outbound',
    therapeuticArea: 'essential-tremor',
    riskTier: 'MEDIUM',
    riskScore: 62,
    npi: '9012345678',
    specialty: 'Neurology',
    institution: 'Valley Health System',
    prescribingVolume: 'medium',
    samplesOnHand: false,
    speakerProgramMember: false,
    behavioralSignals: [
      sig('Health system formulary committee reviewing ET treatments next quarter', 'FORMULARY_LOOKUP'),
      sig('Downloaded competitive comparison data from medical affairs portal', 'COMPETITOR_RESEARCH'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['formulary-review', 'system-influence', 'switch-opportunity'],
  },

  // ---- HCO: Launch ----
  'hco-launch': {
    name: 'Dr. Thomas Bradley',
    age: 58,
    gender: 'male',
    contactType: 'hcp',
    agentType: 'hcp-outbound',
    therapeuticArea: 'dee-dravet',
    riskTier: 'HIGH',
    riskScore: 75,
    npi: '0123456789',
    specialty: 'Pediatric Neurology',
    institution: "Children's Hospital Network",
    prescribingVolume: 'high',
    samplesOnHand: false,
    speakerProgramMember: true,
    behavioralSignals: [
      sig('KOL with high influence score — early adopter for relutrigine launch', 'KOL_ENGAGEMENT'),
      sig('Presented at ILAE conference on Dravet management — cited unmet need', 'CONFERENCE_ACTIVITY'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['launch-target', 'kol-speaker', 'early-adopter'],
  },

  // ---- MedComms QA: Review ----
  'mqa-review': {
    name: 'Dr. Nina Patel',
    age: 42,
    gender: 'female',
    contactType: 'hcp',
    agentType: 'medcomms-qa',
    therapeuticArea: 'essential-tremor',
    riskTier: 'LOW',
    riskScore: 30,
    npi: '1122334455',
    specialty: 'Medical Affairs',
    institution: 'Vi Praxis BioSciences (Internal)',
    prescribingVolume: 'low',
    behavioralSignals: [
      sig('Submitted promotional material for MLR review — claims verification needed', 'FORMULARY_LOOKUP'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['mlr-review', 'claims-check'],
  },

  // ---- MedComms QA: Off-Label ----
  'mqa-offlabel': {
    name: 'Dr. Carlos Reyes',
    age: 47,
    gender: 'male',
    contactType: 'hcp',
    agentType: 'medcomms-qa',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 80,
    npi: '2233445566',
    specialty: 'Medical Affairs',
    institution: 'Vi Praxis BioSciences (Internal)',
    prescribingVolume: 'low',
    behavioralSignals: [
      sig('Field rep flagged potential off-label promotion in speaker deck', 'OFF_LABEL_QUERY'),
    ],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['off-label-risk', 'compliance-review'],
  },

  // ---- MedComms QA: AE Audit ----
  'mqa-ae-audit': {
    name: 'Dr. Emily Chang',
    age: 40,
    gender: 'female',
    contactType: 'hcp',
    agentType: 'medcomms-qa',
    therapeuticArea: 'essential-tremor',
    riskTier: 'HIGH',
    riskScore: 85,
    npi: '3344556677',
    specialty: 'Pharmacovigilance',
    institution: 'Vi Praxis BioSciences (Internal)',
    prescribingVolume: 'low',
    behavioralSignals: [
      sig('Audit flagged 3 AE reports with incomplete follow-up in last 30 days', 'ADHERENCE_GAP'),
    ],
    recommendedPathway: 'safety-reporting',
    engagementLabels: ['ae-audit', 'pv-review', 'follow-up-needed'],
  },
};

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------

interface DemoCallBody {
  phoneNumber: string;
  scenarioId: string;
  contactName?: string;
  therapeuticArea?: TherapeuticArea;
  persona?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function apiDemoCallRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: DemoCallBody }>('/api/demo-call', async (request, reply) => {
    const { phoneNumber, scenarioId, contactName, therapeuticArea } = request.body;

    if (!phoneNumber || !scenarioId) {
      return reply.status(400).send({ error: 'Missing phoneNumber or scenarioId' });
    }

    // Phone validation
    if (!isValidPhone(phoneNumber)) {
      return reply.status(400).send({
        error: 'Invalid phone number. Must be a US number in E.164 format (+1XXXXXXXXXX) and not a premium-rate number.',
      });
    }

    // Rate limiting
    const clientIp = request.ip;
    if (isRateLimited(clientIp)) {
      return reply.status(429).send({
        error: 'Rate limit exceeded. Maximum 3 calls per 10 minutes. Please try again later.',
      });
    }

    const defaults = SCENARIO_DEFAULTS[scenarioId] || SCENARIO_DEFAULTS['patient-et-adherence']!;
    const contactId = uuidv4();

    const contact: ContactRecord = {
      contactId,
      contactType: defaults.contactType || 'patient',
      agentType: defaults.agentType || 'patient-support',
      name: contactName || defaults.name || 'Demo Contact',
      phone: phoneNumber,
      age: defaults.age || 50,
      gender: defaults.gender || 'unknown',
      therapeuticArea: therapeuticArea || defaults.therapeuticArea || 'essential-tremor',
      diagnosis: defaults.diagnosis,
      currentDrug: defaults.currentDrug,
      currentDose: defaults.currentDose,
      titrationPhase: defaults.titrationPhase,
      prescribingHcp: defaults.prescribingHcp,
      prescribingHcpNpi: defaults.prescribingHcpNpi,
      hubEnrolled: defaults.hubEnrolled,
      copayCardActive: defaults.copayCardActive,
      priorAuthStatus: defaults.priorAuthStatus,
      npi: defaults.npi,
      specialty: defaults.specialty,
      institution: defaults.institution,
      prescribingVolume: defaults.prescribingVolume,
      samplesOnHand: defaults.samplesOnHand,
      speakerProgramMember: defaults.speakerProgramMember,
      behavioralSignals: defaults.behavioralSignals || [],
      recommendedPathway: defaults.recommendedPathway || 'patient-education',
      engagementLabels: defaults.engagementLabels || [],
      riskTier: defaults.riskTier || 'MEDIUM',
      riskScore: defaults.riskScore || 50,
      preferredChannel: 'voice',
      status: 'new',
      createdAt: new Date().toISOString(),
      callAttempts: 0,
      lastCallAttempt: null,
      callId: null,
    };

    contacts.set(contactId, contact);
    fastify.log.info({ contactId, phone: phoneNumber, scenarioId, agentType: contact.agentType }, 'Demo call requested');

    try {
      const { callSid } = await processContactOutreach(contact, { contacts, calls, callIdBySid });

      return reply.status(200).send({
        status: 'initiating',
        callSid,
        contactId,
        scenarioId,
        agentType: contact.agentType,
      });
    } catch (err) {
      fastify.log.error({ err, contactId, scenarioId }, 'Failed to initiate demo call');
      return reply.status(500).send({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to initiate call',
      });
    }
  });
}
