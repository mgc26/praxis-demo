import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt } from './classification-prompt.js';
import type { ContactRecord, ScreeningResult } from '../types/index.js';

function makePatientContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    contactId: 'c-pat-001',
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
  return {
    contactId: 'c-hcp-001',
    contactType: 'hcp',
    agentType: 'hcp-support',
    name: 'Robert Johnson',
    phone: '+15559876543',
    age: 52,
    gender: 'Male',
    therapeuticArea: 'dee-dravet',
    npi: '1234567890',
    specialty: 'Neurology',
    institution: 'Mayo Clinic',
    prescribingVolume: 'high',
    samplesOnHand: true,
    speakerProgramMember: false,
    currentDrug: 'relutrigine',
    behavioralSignals: [],
    recommendedPathway: 'clinical-education',
    engagementLabels: ['high-value'],
    riskTier: 'HIGH',
    riskScore: 85,
    preferredChannel: 'voice',
    status: 'new',
    createdAt: new Date().toISOString(),
    callAttempts: 0,
    lastCallAttempt: null,
    callId: null,
    ...overrides,
  };
}

describe('classification-prompt', () => {
  describe('buildClassificationPrompt', () => {
    it('returns a non-empty string', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes the transcript text', () => {
      const transcript = 'Patient: I have been having headaches. Agent: I am sorry to hear that.';
      const prompt = buildClassificationPrompt(transcript, {
        contact: makePatientContact(),
      });
      expect(prompt).toContain(transcript);
    });

    it('includes transcript within <transcript> tags', () => {
      const prompt = buildClassificationPrompt('Some transcript.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('<transcript>');
      expect(prompt).toContain('</transcript>');
    });

    describe('patient contact context', () => {
      it('includes patient name', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact({ name: 'Alice Wonderland' }),
        });
        expect(prompt).toContain('Alice Wonderland');
      });

      it('includes therapeutic area', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact({ therapeuticArea: 'essential-tremor' }),
        });
        expect(prompt).toContain('Essential Tremor');
      });

      it('includes drug name for euloxacaltenamide', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact({ currentDrug: 'euloxacaltenamide' }),
        });
        expect(prompt).toContain('Euloxacaltenamide (ELEX)');
      });

      it('includes drug name for relutrigine', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact({
            currentDrug: 'relutrigine',
            therapeuticArea: 'dee-dravet',
          }),
        });
        expect(prompt).toContain('Relutrigine');
      });

      it('includes PATIENT/CAREGIVER CONTEXT label', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact(),
        });
        expect(prompt).toContain('PATIENT/CAREGIVER CONTEXT');
      });
    });

    describe('HCP contact context', () => {
      it('includes HCP CONTEXT label', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makeHcpContact(),
        });
        expect(prompt).toContain('HCP CONTEXT');
      });

      it('includes HCP name', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makeHcpContact({ name: 'Dr. Sarah Brown' }),
        });
        expect(prompt).toContain('Dr. Sarah Brown');
      });

      it('includes NPI', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makeHcpContact({ npi: '9876543210' }),
        });
        expect(prompt).toContain('9876543210');
      });

      it('includes specialty and institution', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makeHcpContact({ specialty: 'Pediatric Neurology', institution: 'Cleveland Clinic' }),
        });
        expect(prompt).toContain('Pediatric Neurology');
        expect(prompt).toContain('Cleveland Clinic');
      });
    });

    describe('includes all 16 outcome types', () => {
      const allOutcomes = [
        'ae-reported',
        'ae-escalated',
        'medical-info-provided',
        'sample-request',
        'copay-card-issued',
        'hub-enrollment',
        'prior-auth-assist',
        'nurse-educator-referral',
        'speaker-program-interest',
        'appointment-scheduled',
        'information-provided',
        'callback-requested',
        'declined',
        'no-answer',
        'voicemail',
        'crisis-escalation',
      ];

      it('lists all 16 outcomes in the prompt', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact(),
        });
        for (const outcome of allOutcomes) {
          expect(prompt).toContain(outcome);
        }
      });
    });

    describe('includes all 6 support pathways', () => {
      const allPathways = [
        'medication-access',
        'safety-reporting',
        'clinical-education',
        'patient-education',
        'adherence-support',
        'crisis-support',
      ];

      it('lists all 6 pathways in the prompt', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact(),
        });
        for (const pathway of allPathways) {
          expect(prompt).toContain(pathway);
        }
      });
    });

    it('includes aeDetected field in JSON spec', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('"ae_detected"');
    });

    it('includes competitiveIntelNotes field in JSON spec', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('"competitive_intel_notes"');
    });

    describe('behavioral signals', () => {
      it('shows "None" when no behavioral signals', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact({ behavioralSignals: [] }),
        });
        expect(prompt).toContain('BEHAVIORAL SIGNALS PRESENT');
        expect(prompt).toContain('None');
      });

      it('includes signal details when signals are present', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact({
            behavioralSignals: [
              {
                category: 'ADHERENCE_GAP',
                detail: 'Missed 2 refills',
                recency: '2 weeks ago',
                severity: 'high',
                clinicalImplication: 'Seizure risk',
              },
            ],
          }),
        });
        expect(prompt).toContain('[HIGH]');
        expect(prompt).toContain('ADHERENCE_GAP');
        expect(prompt).toContain('Missed 2 refills');
      });
    });

    describe('screening results', () => {
      it('shows "No screenings administered" when no results', () => {
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact(),
        });
        expect(prompt).toContain('No screenings administered');
      });

      it('includes screening results when provided', () => {
        const screeningResults: ScreeningResult[] = [
          {
            instrumentId: 'AE-TRIAGE',
            instrumentName: 'Adverse Event Triage Screen',
            status: 'completed',
            responses: [],
            totalScore: 5,
            maxScore: 9,
            isPositiveScreen: true,
            clinicalInterpretation: 'Potential adverse event detected.',
            requiresEscalation: true,
            regulatoryReportable: true,
            startedAt: null,
            completedAt: null,
          },
        ];
        const prompt = buildClassificationPrompt('Hello.', {
          contact: makePatientContact(),
          screeningResults,
        });
        expect(prompt).toContain('AE-TRIAGE');
        expect(prompt).toContain('POSITIVE');
        expect(prompt).toContain('5/9');
        expect(prompt).toContain('REQUIRES ESCALATION');
        expect(prompt).toContain('REGULATORY REPORTABLE');
      });
    });

    it('includes urgency guidance section', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('URGENCY GUIDANCE');
    });

    it('includes adverse event detection guidance', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('ADVERSE EVENT DETECTION GUIDANCE');
    });

    it('includes competitive intelligence extraction guidance', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('COMPETITIVE INTELLIGENCE EXTRACTION');
    });

    it('includes liaison summary guidance', () => {
      const prompt = buildClassificationPrompt('Hello.', {
        contact: makePatientContact(),
      });
      expect(prompt).toContain('LIAISON_SUMMARY GUIDANCE');
    });
  });
});
