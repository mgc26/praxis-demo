import { describe, it, expect } from 'vitest';
import type {
  AgentType,
  TherapeuticArea,
  DrugProduct,
  OutcomeType,
  SupportPathway,
  RiskTier,
  Urgency,
  CallDirection,
  ContactStatus,
  CallStatus,
  SignalCategory,
  ScreeningInstrumentId,
  ScreeningStatus,
  BehavioralSignal,
  ContactRecord,
  TranscriptEntry,
  CallRecord,
  AppointmentDetails,
  ScreeningQuestionResponse,
  ScreeningResult,
  RecommendedScreening,
  ContactSubmission,
  ClassificationResult,
  ActiveCallSession,
} from './index.js';

describe('types/index', () => {
  describe('AgentType', () => {
    it('accepts valid agent types', () => {
      const values: AgentType[] = [
        'patient-support',
        'hcp-support',
        'hcp-outbound',
        'medcomms-qa',
      ];
      expect(values).toHaveLength(4);
    });
  });

  describe('TherapeuticArea', () => {
    it('accepts valid therapeutic areas', () => {
      const values: TherapeuticArea[] = ['essential-tremor', 'dee-dravet'];
      expect(values).toHaveLength(2);
    });
  });

  describe('DrugProduct', () => {
    it('accepts valid drug products', () => {
      const values: DrugProduct[] = ['euloxacaltenamide', 'relutrigine'];
      expect(values).toHaveLength(2);
    });
  });

  describe('OutcomeType', () => {
    it('accepts all 16 outcome types', () => {
      const values: OutcomeType[] = [
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
      expect(values).toHaveLength(16);
    });
  });

  describe('SupportPathway', () => {
    it('accepts all 6 support pathways', () => {
      const values: SupportPathway[] = [
        'medication-access',
        'safety-reporting',
        'clinical-education',
        'patient-education',
        'adherence-support',
        'crisis-support',
      ];
      expect(values).toHaveLength(6);
    });
  });

  describe('RiskTier', () => {
    it('accepts HIGH, MEDIUM, LOW', () => {
      const values: RiskTier[] = ['HIGH', 'MEDIUM', 'LOW'];
      expect(values).toHaveLength(3);
    });
  });

  describe('Urgency', () => {
    it('accepts routine, soon, urgent', () => {
      const values: Urgency[] = ['routine', 'soon', 'urgent'];
      expect(values).toHaveLength(3);
    });
  });

  describe('CallDirection', () => {
    it('accepts outbound and inbound', () => {
      const values: CallDirection[] = ['outbound', 'inbound'];
      expect(values).toHaveLength(2);
    });
  });

  describe('ContactStatus', () => {
    it('accepts all contact statuses', () => {
      const values: ContactStatus[] = [
        'new',
        'calling',
        'connected',
        'completed',
        'classified',
        'followed-up',
        'no-answer',
      ];
      expect(values).toHaveLength(7);
    });
  });

  describe('CallStatus', () => {
    it('accepts all call statuses', () => {
      const values: CallStatus[] = [
        'initiated',
        'ringing',
        'connected',
        'completed',
        'failed',
        'no-answer',
      ];
      expect(values).toHaveLength(6);
    });
  });

  describe('SignalCategory', () => {
    it('accepts all 8 signal categories', () => {
      const values: SignalCategory[] = [
        'COMPETITOR_RESEARCH',
        'FORMULARY_LOOKUP',
        'SYMPTOM_SEARCH',
        'ADHERENCE_GAP',
        'KOL_ENGAGEMENT',
        'OFF_LABEL_QUERY',
        'CAREGIVER_DISTRESS',
        'CONFERENCE_ACTIVITY',
      ];
      expect(values).toHaveLength(8);
    });
  });

  describe('ScreeningInstrumentId', () => {
    it('accepts all 4 screening instrument IDs', () => {
      const values: ScreeningInstrumentId[] = [
        'AE-TRIAGE',
        'C-SSRS-LITE',
        'TETRAS-LITE',
        'MMAS-4',
      ];
      expect(values).toHaveLength(4);
    });
  });

  describe('ScreeningStatus', () => {
    it('accepts all screening statuses', () => {
      const values: ScreeningStatus[] = [
        'pending',
        'in-progress',
        'completed',
        'declined',
      ];
      expect(values).toHaveLength(4);
    });
  });

  describe('BehavioralSignal interface', () => {
    it('can be constructed with required fields', () => {
      const signal: BehavioralSignal = {
        category: 'ADHERENCE_GAP',
        detail: 'Missed 2 refills',
        recency: '2 weeks ago',
        severity: 'high',
        clinicalImplication: 'Seizure risk',
      };
      expect(signal.category).toBe('ADHERENCE_GAP');
      expect(signal.severity).toBe('high');
    });
  });

  describe('ContactRecord interface', () => {
    it('can be constructed with required fields for a patient', () => {
      const contact: ContactRecord = {
        contactId: 'c-001',
        contactType: 'patient',
        agentType: 'patient-support',
        name: 'Jane Doe',
        phone: '+15551234567',
        age: 45,
        gender: 'Female',
        therapeuticArea: 'essential-tremor',
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
      };
      expect(contact.contactId).toBe('c-001');
      expect(contact.contactType).toBe('patient');
    });

    it('can include optional HCP fields', () => {
      const contact: ContactRecord = {
        contactId: 'c-002',
        contactType: 'hcp',
        agentType: 'hcp-support',
        name: 'Dr. Smith',
        phone: '+15551234568',
        age: 50,
        gender: 'Male',
        therapeuticArea: 'dee-dravet',
        npi: '1234567890',
        specialty: 'Neurology',
        institution: 'Mayo Clinic',
        prescribingVolume: 'high',
        samplesOnHand: true,
        speakerProgramMember: false,
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
      };
      expect(contact.npi).toBe('1234567890');
      expect(contact.specialty).toBe('Neurology');
    });
  });

  describe('TranscriptEntry interface', () => {
    it('can be constructed with required fields', () => {
      const entry: TranscriptEntry = {
        speaker: 'agent',
        text: 'Hello, how can I help?',
        timestamp: Date.now(),
      };
      expect(entry.speaker).toBe('agent');
    });
  });

  describe('AppointmentDetails interface', () => {
    it('can be constructed with required fields', () => {
      const appt: AppointmentDetails = {
        provider: 'Dr. Smith',
        specialty: 'Neurology',
        date: '2026-04-01',
        location: '123 Main St',
      };
      expect(appt.provider).toBe('Dr. Smith');
    });
  });

  describe('ScreeningResult interface', () => {
    it('can be constructed with all fields', () => {
      const result: ScreeningResult = {
        instrumentId: 'AE-TRIAGE',
        instrumentName: 'Adverse Event Triage Screen',
        status: 'completed',
        responses: [],
        totalScore: 5,
        maxScore: 9,
        isPositiveScreen: true,
        clinicalInterpretation: 'Potential AE detected',
        requiresEscalation: true,
        regulatoryReportable: true,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      expect(result.instrumentId).toBe('AE-TRIAGE');
      expect(result.isPositiveScreen).toBe(true);
    });
  });

  describe('ClassificationResult interface', () => {
    it('can be constructed with required fields', () => {
      const result: ClassificationResult = {
        outcome: 'ae-reported',
        confidence: 0.95,
        supportPathway: 'safety-reporting',
        urgency: 'urgent',
        sentiment: 40,
        keyMoments: ['AE reported'],
        contactConcerns: ['Side effects'],
        behavioralSignalsReferenced: ['ADHERENCE_GAP'],
        nextAction: 'Follow up with drug safety',
        liaisonSummary: 'Patient reported AE.',
        appointmentDetails: null,
        screeningResults: null,
        aeDetected: true,
        competitiveIntelNotes: [],
      };
      expect(result.outcome).toBe('ae-reported');
      expect(result.aeDetected).toBe(true);
    });
  });
});
