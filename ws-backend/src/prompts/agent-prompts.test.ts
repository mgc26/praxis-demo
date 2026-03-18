import { describe, it, expect } from 'vitest';
import {
  buildAgentPrompt,
  buildAgentGreeting,
  buildAgentVoicemailMessage,
} from './agent-prompts.js';
import type { ContactRecord, RecommendedScreening } from '../types/index.js';

function makeContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    contactId: 'c-001',
    contactType: 'patient',
    agentType: 'patient-support',
    name: 'Jane Doe',
    phone: '+15551234567',
    age: 45,
    gender: 'Female',
    therapeuticArea: 'essential-tremor',
    diagnosis: 'Essential Tremor',
    currentDrug: 'euloxacaltenamide',
    prescribingHcp: 'Dr. Smith',
    treatmentStartDate: '2025-06-01',
    currentDose: '50mg BID',
    titrationPhase: 'Maintenance',
    hubEnrolled: true,
    copayCardActive: true,
    priorAuthStatus: 'Approved',
    behavioralSignals: [],
    recommendedPathway: 'patient-education',
    engagementLabels: [],
    riskTier: 'LOW',
    riskScore: 20,
    preferredChannel: 'voice',
    status: 'new',
    createdAt: new Date().toISOString(),
    callAttempts: 0,
    lastCallAttempt: null,
    callId: null,
    ...overrides,
  };
}

function makeHcpContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return makeContact({
    contactId: 'c-hcp-001',
    contactType: 'hcp',
    agentType: 'hcp-support',
    name: 'Robert Johnson',
    npi: '1234567890',
    specialty: 'Neurology',
    institution: 'Mayo Clinic',
    prescribingVolume: 'high',
    samplesOnHand: true,
    speakerProgramMember: false,
    therapeuticArea: 'dee-dravet',
    currentDrug: 'relutrigine',
    riskTier: 'HIGH',
    riskScore: 85,
    ...overrides,
  });
}

describe('agent-prompts', () => {
  describe('buildAgentPrompt', () => {
    it('dispatches to patient-support builder', () => {
      const contact = makeContact({ agentType: 'patient-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      // Patient support prompt should mention "Emma" and "Patient Support Coordinator"
      expect(prompt).toContain('Emma');
      expect(prompt).toContain('Patient Support Coordinator');
    });

    it('dispatches to hcp-support builder', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Medical Information representative');
    });

    it('dispatches to hcp-outbound builder', () => {
      const contact = makeHcpContact({ agentType: 'hcp-outbound' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Field Engagement Coordinator');
    });

    it('dispatches to medcomms-qa builder', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('Medical Information representative');
      expect(prompt).toContain('omnichannel');
    });
  });

  describe('patient-support prompt content', () => {
    it('includes AE detection instructions', () => {
      const contact = makeContact({ agentType: 'patient-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('ADVERSE EVENT');
      expect(prompt).toContain('report_adverse_event');
    });

    it('includes safety section with crisis escalation', () => {
      const contact = makeContact({ agentType: 'patient-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('SUICIDAL IDEATION');
      expect(prompt).toContain('escalate_crisis');
    });

    it('includes Dravet-specific safety block for dee-dravet patients', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        therapeuticArea: 'dee-dravet',
        currentDrug: 'relutrigine',
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('DRAVET-SPECIFIC SAFETY');
      expect(prompt).toContain('C-SSRS');
    });

    it('does not include Dravet safety block for ET patients', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        therapeuticArea: 'essential-tremor',
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).not.toContain('DRAVET-SPECIFIC SAFETY');
    });

    it('includes adherence guidance when ADHERENCE_GAP signal present', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        behavioralSignals: [
          {
            category: 'ADHERENCE_GAP',
            detail: 'Missed refill',
            recency: '1 week ago',
            severity: 'high',
            clinicalImplication: 'Risk of breakthrough symptoms',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('MEDICATION ADHERENCE GAP');
    });

    it('includes caregiver guidance for caregiver with distress signal', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        contactType: 'caregiver',
        behavioralSignals: [
          {
            category: 'CAREGIVER_DISTRESS',
            detail: 'Burnout indicators',
            recency: 'recently',
            severity: 'high',
            clinicalImplication: 'Caregiver fatigue',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('CAREGIVER SUPPORT');
    });

    it('includes screening block when recommended screenings provided', () => {
      const contact = makeContact({ agentType: 'patient-support' });
      const screenings: RecommendedScreening[] = [
        { instrumentId: 'MMAS-4', reason: 'Adherence check', priority: 1 },
      ];
      const prompt = buildAgentPrompt({ contact, recommendedScreenings: screenings });
      expect(prompt).toContain('CLINICAL SCREENINGS');
      expect(prompt).toContain('MMAS-4');
    });

    it('includes off-label promotion prohibition', () => {
      const contact = makeContact({ agentType: 'patient-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('OFF-LABEL PROMOTION');
      expect(prompt).toContain('NEVER');
    });
  });

  describe('hcp-support prompt content', () => {
    it('includes off-label guardrails', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('off-label');
      expect(prompt).toContain('FDA-approved labeling');
    });

    it('includes off-label inquiry guidance when OFF_LABEL_QUERY signal present', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-support',
        behavioralSignals: [
          {
            category: 'OFF_LABEL_QUERY',
            detail: 'Asked about pediatric use',
            recency: '3 days ago',
            severity: 'high',
            clinicalImplication: 'Regulatory compliance risk',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('OFF-LABEL INQUIRY DETECTED');
    });

    it('includes competitor context when COMPETITOR_RESEARCH signal present', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-support',
        behavioralSignals: [
          {
            category: 'COMPETITOR_RESEARCH',
            detail: 'Researching competitor drug',
            recency: 'last week',
            severity: 'medium',
            clinicalImplication: 'Possible switch consideration',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('COMPETITOR CONTEXT');
    });

    it('includes AE capture from HCPs section', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('ADVERSE EVENT CAPTURE FROM HCPs');
      expect(prompt).toContain('report_adverse_event');
    });
  });

  describe('hcp-outbound prompt content', () => {
    it('includes signal-driven opening blocks when signals present', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-outbound',
        behavioralSignals: [
          {
            category: 'COMPETITOR_RESEARCH',
            detail: 'Researched competitor',
            recency: 'last week',
            severity: 'medium',
            clinicalImplication: 'Evaluating alternatives',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('COMPETITOR RESEARCH DETECTED');
    });

    it('includes formulary lookup block when FORMULARY_LOOKUP signal present', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-outbound',
        behavioralSignals: [
          {
            category: 'FORMULARY_LOOKUP',
            detail: 'Checked tier status',
            recency: '2 days ago',
            severity: 'medium',
            clinicalImplication: 'Access barriers',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('FORMULARY LOOKUP DETECTED');
    });

    it('includes conference activity block when signal present', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-outbound',
        behavioralSignals: [
          {
            category: 'CONFERENCE_ACTIVITY',
            detail: 'Attended AAN conference',
            recency: 'last month',
            severity: 'low',
            clinicalImplication: 'Staying current',
          },
        ],
      });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('CONFERENCE ACTIVITY DETECTED');
    });

    it('includes competitive intelligence section', () => {
      const contact = makeHcpContact({ agentType: 'hcp-outbound' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('COMPETITIVE INTELLIGENCE');
    });

    it('includes NEVER promote off-label', () => {
      const contact = makeHcpContact({ agentType: 'hcp-outbound' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('NEVER promote off-label');
    });
  });

  describe('medcomms-qa prompt content', () => {
    it('includes medical information boundaries', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('MEDICAL INFORMATION BOUNDARIES');
    });

    it('includes AE capture section', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('ADVERSE EVENT CAPTURE');
      expect(prompt).toContain('report_adverse_event');
    });

    it('adapts for HCP callers', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('healthcare provider');
    });

    it('adapts for patient callers', () => {
      const contact = makeContact({ agentType: 'medcomms-qa', contactType: 'patient' });
      const prompt = buildAgentPrompt({ contact });
      expect(prompt).toContain('patient');
    });
  });

  describe('buildAgentGreeting', () => {
    it('produces greeting for patient-support agent', () => {
      const contact = makeContact({ agentType: 'patient-support', name: 'Jane Doe' });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Jane');
      expect(greeting).toContain('Praxis Patient Support');
    });

    it('produces caregiver-distress-specific greeting', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        contactType: 'caregiver',
        name: 'Sarah Parent',
        behavioralSignals: [
          {
            category: 'CAREGIVER_DISTRESS',
            detail: 'Burnout',
            recency: 'recent',
            severity: 'high',
            clinicalImplication: 'Impact',
          },
        ],
      });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Sarah');
      expect(greeting).toContain('personally check in');
    });

    it('produces adherence-gap-specific greeting', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        name: 'Mike Patient',
        currentDrug: 'euloxacaltenamide',
        behavioralSignals: [
          {
            category: 'ADHERENCE_GAP',
            detail: 'Missed refill',
            recency: '1 week ago',
            severity: 'high',
            clinicalImplication: 'Risk',
          },
        ],
      });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Mike');
      expect(greeting).toContain('on track');
    });

    it('produces high-risk-specific greeting for patient-support', () => {
      const contact = makeContact({
        agentType: 'patient-support',
        name: 'Alice Risk',
        riskTier: 'HIGH',
        riskScore: 90,
      });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Alice');
      expect(greeting).toContain('personally reach out');
    });

    it('produces greeting for hcp-support agent', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support', name: 'Robert Johnson' });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Dr.');
      expect(greeting).toContain('Johnson');
      expect(greeting).toContain('Praxis Medical Information');
    });

    it('produces greeting for hcp-outbound agent', () => {
      const contact = makeHcpContact({ agentType: 'hcp-outbound', name: 'Robert Johnson' });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Dr.');
      expect(greeting).toContain('Johnson');
      expect(greeting).toContain('Praxis BioSciences');
    });

    it('produces competitor-research-specific greeting for hcp-outbound', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-outbound',
        name: 'Robert Johnson',
        behavioralSignals: [
          {
            category: 'COMPETITOR_RESEARCH',
            detail: 'Researching',
            recency: 'last week',
            severity: 'medium',
            clinicalImplication: 'Evaluating',
          },
        ],
      });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('clinical developments');
    });

    it('produces greeting for medcomms-qa agent with HCP', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa', name: 'Robert Johnson' });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Dr.');
      expect(greeting).toContain('Johnson');
      expect(greeting).toContain('Medical Information');
    });

    it('produces greeting for medcomms-qa agent with non-HCP', () => {
      const contact = makeContact({
        agentType: 'medcomms-qa',
        contactType: 'patient',
        name: 'Jane Doe',
      });
      const greeting = buildAgentGreeting(contact);
      expect(greeting).toContain('Praxis BioSciences');
      expect(greeting).toContain('questions about our products');
    });
  });

  describe('buildAgentVoicemailMessage', () => {
    it('produces voicemail for patient-support agent', () => {
      const contact = makeContact({ agentType: 'patient-support', name: 'Jane Doe' });
      const msg = buildAgentVoicemailMessage(contact);
      expect(msg).toContain('Jane');
      expect(msg).toContain('Praxis Patient Support');
      expect(msg).toContain('1-800-PRAXIS-PS');
    });

    it('produces voicemail for hcp-outbound agent', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-outbound',
        name: 'Robert Johnson',
        therapeuticArea: 'essential-tremor',
      });
      const msg = buildAgentVoicemailMessage(contact);
      expect(msg).toContain('Dr.');
      expect(msg).toContain('Johnson');
      expect(msg).toContain('Essential Tremor');
      expect(msg).toContain('1-800-PRAXIS-MI');
    });

    it('produces voicemail for hcp-support agent', () => {
      const contact = makeHcpContact({ agentType: 'hcp-support' });
      const msg = buildAgentVoicemailMessage(contact);
      expect(msg).toContain('Praxis Medical Information');
      expect(msg).toContain('1-800-PRAXIS-MI');
    });

    it('produces voicemail for medcomms-qa agent', () => {
      const contact = makeHcpContact({ agentType: 'medcomms-qa' });
      const msg = buildAgentVoicemailMessage(contact);
      expect(msg).toContain('Praxis Medical Information');
      expect(msg).toContain('1-800-PRAXIS-MI');
    });

    it('uses DEE / Dravet Syndrome for dee-dravet therapeutic area', () => {
      const contact = makeHcpContact({
        agentType: 'hcp-outbound',
        therapeuticArea: 'dee-dravet',
      });
      const msg = buildAgentVoicemailMessage(contact);
      expect(msg).toContain('DEE / Dravet Syndrome');
    });
  });
});
