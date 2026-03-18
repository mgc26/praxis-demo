// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — API Route: Demo Call
// Accepts a phone number + scenario from the Agent Config panel and initiates
// a live Twilio outbound call via the contact-outreach processor.
// ---------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { contacts, calls, callIdBySid } from '../server.js';
import { processContactOutreach } from '../services/contact-outreach-processor.js';
import type { ContactRecord, BehavioralSignal } from '../types/index.js';

function sig(detail: string, category: BehavioralSignal['category'] = 'ADHERENCE_GAP'): BehavioralSignal {
  return { category, detail, recency: 'this week', severity: 'high', clinicalImplication: detail };
}

// Maps scenarioId to default contact profile for the demo call
const SCENARIO_DEFAULTS: Record<string, Partial<ContactRecord>> = {
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
};

interface DemoCallBody {
  phoneNumber: string;
  scenarioId: string;
  persona?: Record<string, unknown>;
}

export async function apiDemoCallRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: DemoCallBody }>('/api/demo-call', async (request, reply) => {
    const { phoneNumber, scenarioId } = request.body;

    if (!phoneNumber || !scenarioId) {
      return reply.status(400).send({ error: 'Missing phoneNumber or scenarioId' });
    }

    const defaults = SCENARIO_DEFAULTS[scenarioId] || SCENARIO_DEFAULTS['patient-et-adherence']!;
    const contactId = uuidv4();

    const contact: ContactRecord = {
      contactId,
      contactType: defaults.contactType || 'patient',
      agentType: defaults.agentType || 'patient-support',
      name: defaults.name || 'Demo Contact',
      phone: phoneNumber,
      age: defaults.age || 50,
      gender: defaults.gender || 'unknown',
      therapeuticArea: defaults.therapeuticArea || 'essential-tremor',
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
