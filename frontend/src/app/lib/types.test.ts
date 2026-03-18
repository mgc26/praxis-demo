import { describe, it, expect } from 'vitest';

// Type-only imports -- if these fail to resolve, vitest will error at compile time
import type {
  AgentType,
  TherapeuticArea,
  DrugProduct,
  PriorityTier,
  SupportPathwayId,
  UrgencyLevel,
  InteractionOutcome,
  ChannelType,
  SignalCategory,
  BehavioralSignal,
  ContactRecord,
  LiaisonSummary,
  Classification,
  ScreeningInstrumentId,
  ScreeningStatus,
  ScreeningQuestionResponse,
  ScreeningResult,
  TranscriptEntry,
  CallRecord,
  MSLFollowUpRequest,
  AgentPersona,
  KPIData,
  ContactSignalFeed,
  SupportPathway,
  CallFilters,
  CallsPageResponse,
  AnalyticsResponse,
  OutcomeTimepoint,
  PatientOutcomeRecord,
  CohortTimepointStats,
  CohortOutcomeData,
  PayerEvidenceCard,
} from './types';

describe('types.ts -- type exports compile correctly', () => {
  it('should allow constructing a valid AgentType value', () => {
    const value: AgentType = 'patient-support';
    expect(value).toBe('patient-support');
  });

  it('should allow constructing a valid TherapeuticArea value', () => {
    const value: TherapeuticArea = 'essential-tremor';
    expect(value).toBe('essential-tremor');
  });

  it('should allow constructing a valid DrugProduct value', () => {
    const value: DrugProduct = 'euloxacaltenamide';
    expect(value).toBe('euloxacaltenamide');
  });

  it('should allow constructing a valid PriorityTier value', () => {
    const value: PriorityTier = 'HIGH';
    expect(value).toBe('HIGH');
  });

  it('should allow constructing all SupportPathwayId values', () => {
    const ids: SupportPathwayId[] = [
      'hub-enrollment',
      'copay-assistance',
      'ae-reporting',
      'adherence-support',
      'sample-request',
      'medical-inquiry',
    ];
    expect(ids).toHaveLength(6);
  });

  it('should allow constructing all InteractionOutcome values', () => {
    const outcomes: InteractionOutcome[] = [
      'hub-enrolled',
      'copay-card-issued',
      'ae-report-filed',
      'adherence-counseling',
      'sample-shipped',
      'medical-info-provided',
      'hcp-detail-completed',
      'prior-auth-initiated',
      'callback-requested',
      'follow-up-scheduled',
      'declined',
      'no-answer',
      'voicemail',
    ];
    expect(outcomes).toHaveLength(13);
  });

  it('should allow constructing a minimal BehavioralSignal object', () => {
    const signal: BehavioralSignal = {
      category: 'SEARCH_INTENT',
      detail: 'test',
      recency: 'today',
      severity: 'high',
      clinicalImplication: 'none',
      timestamp: '2026-01-01T00:00:00Z',
    };
    expect(signal.category).toBe('SEARCH_INTENT');
  });

  it('should allow constructing a minimal KPIData object', () => {
    const kpi: KPIData = {
      totalInteractions: 0,
      aeReportsCaptured: 0,
      hubEnrollments: 0,
      copayCardsIssued: 0,
      hcpEngagements: 0,
      adherenceRate: 0,
      sampleRequests: 0,
      avgHandleTime: 0,
      engagementRate: 0,
      medicalInquiries: 0,
    };
    expect(kpi.totalInteractions).toBe(0);
  });

  it('should allow constructing a CallFilters object', () => {
    const filters: CallFilters = {
      agentType: 'hcp-support',
      therapeuticArea: 'dee',
      page: 1,
      limit: 10,
    };
    expect(filters.agentType).toBe('hcp-support');
  });

  it('should allow constructing an AgentPersona object', () => {
    const persona: AgentPersona = {
      name: 'Test',
      agentType: 'patient-support',
      warmth: 50,
      empathy: 50,
      clinicalDepth: 50,
      formality: 50,
      greeting: 'Hello',
      signoff: 'Goodbye',
      language: 'en-US',
    };
    expect(persona.name).toBe('Test');
  });
});

// ---------------------------------------------------------------------------
// Classification interface -- new CI data pipeline fields
// ---------------------------------------------------------------------------
describe('Classification interface -- competitive intel and FRM fields', () => {
  // Helper: builds a minimal valid Classification for testing.
  // We construct it inline to verify the interface shape at compile time.
  function buildClassification(overrides: Partial<Classification> = {}): Classification {
    return {
      outcome: 'hcp-detail-completed',
      confidence: 0.91,
      support_pathway: 'medical-inquiry',
      urgency: 'routine',
      sentiment: 'positive',
      key_moments: [],
      contact_concerns: [],
      behavioral_signals_referenced: [],
      next_action: 'Follow up in 7 days',
      liaison_summary: 'Summary text',
      aeDetected: false,
      competitiveIntelNotes: [],
      ...overrides,
    };
  }

  it('should include competitiveIntelNotes field', () => {
    // WHY: CI notes power the competitive intel data pipeline; missing field breaks downstream aggregation.
    const classification = buildClassification({
      competitiveIntelNotes: ['Prescriber mentioned switching from propranolol due to fatigue'],
    });
    expect(classification.competitiveIntelNotes).toEqual([
      'Prescriber mentioned switching from propranolol due to fatigue',
    ]);
  });

  it('should accept empty array for competitiveIntelNotes when no CI captured', () => {
    // WHY: Empty array (not undefined) is required so consumers can safely .map() without null checks.
    const classification = buildClassification({ competitiveIntelNotes: [] });
    expect(Array.isArray(classification.competitiveIntelNotes)).toBe(true);
    expect(classification.competitiveIntelNotes).toHaveLength(0);
  });

  it('should include mslFollowupRequested field', () => {
    // WHY: MSL follow-up extraction flag triggers the follow-up request creation pipeline.
    const classification = buildClassification({ mslFollowupRequested: true });
    expect(classification.mslFollowupRequested).toBe(true);
  });

  it('should allow mslFollowupRequested to be undefined when not applicable', () => {
    // WHY: Patient calls and calls without MSL topics should omit this field.
    const classification = buildClassification();
    expect(classification.mslFollowupRequested).toBeUndefined();
  });

  it('should include payerNameExtracted field', () => {
    // WHY: FRM needs payer name extraction to track access/reimbursement patterns.
    const classification = buildClassification({ payerNameExtracted: 'Aetna PPO' });
    expect(classification.payerNameExtracted).toBe('Aetna PPO');
  });

  it('should allow payerNameExtracted to be undefined for HCP calls', () => {
    // WHY: HCP calls don't have payer info; field must be optional.
    const classification = buildClassification();
    expect(classification.payerNameExtracted).toBeUndefined();
  });

  it('should include priorAuthStatusExtracted field', () => {
    const classification = buildClassification({ priorAuthStatusExtracted: 'denied' });
    expect(classification.priorAuthStatusExtracted).toBe('denied');
  });

  it('should include denialReasonExtracted field', () => {
    const classification = buildClassification({ denialReasonExtracted: 'Step therapy not met' });
    expect(classification.denialReasonExtracted).toBe('Step therapy not met');
  });
});

// ---------------------------------------------------------------------------
// LiaisonSummary -- structured 5-block fields
// ---------------------------------------------------------------------------
describe('LiaisonSummary -- structured 5-block liaison format', () => {
  function buildLiaisonSummary(overrides: Partial<LiaisonSummary> = {}): LiaisonSummary {
    return {
      engagementScore: 80,
      engagementAssessment: 'High engagement',
      engagementWindow: 'Next 48 hours',
      behavioralContextIndicators: [],
      clinicalRiskPattern: 'HIGH priority',
      supportNeeds: 'Adherence support needed',
      recommendedActions: ['Follow up within 48 hours'],
      enrichmentData: {
        prescribingPattern: 'Growing prescriber',
        adherenceProfile: 'Good',
        digitalEngagement: 'Moderate',
        competitiveIntelligence: 'No signals',
      },
      channelEffectiveness: { sms: 40, voiceAgent: 75, fieldLiaison: 85 },
      callSummaryForLiaison: 'Call summary text',
      aeDetected: false,
      contextSummary: 'Dr. Thornton, HCP, Essential Tremor, ELEX, HIGH risk tier',
      whatHappened: 'Successful hub enrollment completed. No safety signals.',
      whatChangedSinceLastTouch: 'No new signals since last interaction',
      clinicalQuestionsRaised: [],
      recommendedAction: 'MSL to follow up within 5 business days',
      ...overrides,
    };
  }

  it('should include contextSummary field', () => {
    // WHY: Block 1 of the 5-block format -- who, what TA, drug, risk tier at a glance.
    const summary = buildLiaisonSummary({ contextSummary: 'Margaret Sullivan, patient, Essential Tremor, ELEX, HIGH risk tier' });
    expect(summary.contextSummary).toContain('Margaret Sullivan');
    expect(typeof summary.contextSummary).toBe('string');
  });

  it('should include whatHappened field', () => {
    // WHY: Block 2 -- call outcome and key moments for the liaison to scan quickly.
    const summary = buildLiaisonSummary({ whatHappened: 'AE screening call completed. Adverse event captured.' });
    expect(summary.whatHappened).toContain('AE screening');
    expect(typeof summary.whatHappened).toBe('string');
  });

  it('should include whatChangedSinceLastTouch field', () => {
    // WHY: Block 3 -- delta between interactions helps liaisons prioritize follow-ups.
    const summary = buildLiaisonSummary({ whatChangedSinceLastTouch: 'HIGH signal: ELEX refill 8 days overdue' });
    expect(summary.whatChangedSinceLastTouch).toContain('HIGH signal');
  });

  it('should include clinicalQuestionsRaised as array field', () => {
    // WHY: Block 4 -- unresolved questions drive the MSL follow-up pipeline.
    const summary = buildLiaisonSummary({
      clinicalQuestionsRaised: ['Is dizziness dose-related?', 'Should the dose be reduced?'],
    });
    expect(Array.isArray(summary.clinicalQuestionsRaised)).toBe(true);
    expect(summary.clinicalQuestionsRaised).toHaveLength(2);
  });

  it('should accept empty clinicalQuestionsRaised when no questions were raised', () => {
    // WHY: Some calls don't raise clinical questions; the array should be empty, not undefined.
    const summary = buildLiaisonSummary({ clinicalQuestionsRaised: [] });
    expect(summary.clinicalQuestionsRaised).toHaveLength(0);
  });

  it('should include recommendedAction field', () => {
    // WHY: Block 5 -- specific next action with timeframe so the liaison knows exactly what to do.
    const summary = buildLiaisonSummary({
      recommendedAction: 'Pharmacovigilance team to complete AE review within 24 hours.',
    });
    expect(summary.recommendedAction).toContain('24 hours');
  });
});

// ---------------------------------------------------------------------------
// CallRecord -- FRM (Field Reimbursement Manager) fields
// ---------------------------------------------------------------------------
describe('CallRecord -- FRM access/reimbursement fields', () => {
  function buildMinimalCallRecord(overrides: Partial<CallRecord> = {}): CallRecord {
    return {
      id: 'call-001',
      contactId: 'PAT-001',
      contactName: 'Margaret Sullivan',
      contactAge: 68,
      contactType: 'patient',
      agentType: 'patient-support',
      therapeuticArea: 'essential-tremor',
      drugProduct: 'euloxacaltenamide',
      supportPathway: 'adherence-support',
      behavioralSignals: [],
      priorityTier: 'HIGH',
      outcome: 'adherence-counseling',
      urgency: 'soon',
      sentiment: 'positive',
      duration: 240,
      timestamp: '2026-03-17T10:30:00Z',
      transcript: [{ speaker: 'agent', text: 'Hello', timestamp: 0 }],
      classification: {
        outcome: 'adherence-counseling',
        confidence: 0.92,
        support_pathway: 'adherence-support',
        urgency: 'soon',
        sentiment: 'positive',
        key_moments: [],
        contact_concerns: [],
        behavioral_signals_referenced: [],
        next_action: 'Follow up',
        liaison_summary: 'Summary',
        aeDetected: false,
        competitiveIntelNotes: [],
      },
      liaisonSummary: {
        engagementScore: 80,
        engagementAssessment: 'High',
        engagementWindow: 'Next 48 hours',
        behavioralContextIndicators: [],
        clinicalRiskPattern: 'HIGH priority',
        supportNeeds: 'Adherence support',
        recommendedActions: ['Follow up'],
        enrichmentData: {
          prescribingPattern: 'N/A',
          adherenceProfile: 'Good',
          digitalEngagement: 'Moderate',
          competitiveIntelligence: 'None',
        },
        channelEffectiveness: { sms: 40, voiceAgent: 75, fieldLiaison: 85 },
        callSummaryForLiaison: 'Summary',
        aeDetected: false,
        contextSummary: 'Margaret Sullivan, patient, ET, ELEX, HIGH',
        whatHappened: 'Adherence check-in completed.',
        whatChangedSinceLastTouch: 'No new signals',
        clinicalQuestionsRaised: [],
        recommendedAction: 'Follow up in 48 hours',
      },
      smsSent: true,
      channel: 'voice',
      aeDetected: false,
      ...overrides,
    };
  }

  it('should include payerName optional field', () => {
    // WHY: FRM needs to track which payers are associated with patient calls for access analytics.
    const call = buildMinimalCallRecord({ payerName: 'Aetna PPO' });
    expect(call.payerName).toBe('Aetna PPO');
  });

  it('should allow payerName to be undefined for HCP calls', () => {
    // WHY: HCP calls don't have payer info attached at the call level.
    const call = buildMinimalCallRecord({ contactType: 'hcp' });
    expect(call.payerName).toBeUndefined();
  });

  it('should include priorAuthStatus optional field', () => {
    // WHY: Prior auth status tracking is critical for time-to-therapy analytics.
    const call = buildMinimalCallRecord({ priorAuthStatus: 'pending' });
    expect(call.priorAuthStatus).toBe('pending');
  });

  it('should accept all valid priorAuthStatus values', () => {
    // WHY: Each status drives different FRM workflows -- all must be representable.
    const statuses: CallRecord['priorAuthStatus'][] = ['not-needed', 'pending', 'approved', 'denied', 'appealing'];
    for (const status of statuses) {
      const call = buildMinimalCallRecord({ priorAuthStatus: status });
      expect(call.priorAuthStatus).toBe(status);
    }
  });

  it('should include denialReason optional field', () => {
    // WHY: Denial reasons feed into the appeals strategy and payer intelligence dashboards.
    const call = buildMinimalCallRecord({
      priorAuthStatus: 'denied',
      denialReason: 'Step therapy requirement not met',
    });
    expect(call.denialReason).toBe('Step therapy requirement not met');
  });

  it('should include timeToTherapyDays optional field', () => {
    // WHY: Time-to-therapy is a key FRM metric -- measures days from Rx to patient receiving drug.
    const call = buildMinimalCallRecord({ timeToTherapyDays: 7 });
    expect(call.timeToTherapyDays).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// MSLFollowUpRequest interface
// ---------------------------------------------------------------------------
describe('MSLFollowUpRequest interface', () => {
  function buildMSLRequest(overrides: Partial<MSLFollowUpRequest> = {}): MSLFollowUpRequest {
    return {
      id: 'msl-001',
      callId: 'call-001',
      contactId: 'HCP-001',
      contactName: 'Dr. James Thornton',
      contactType: 'hcp',
      requestType: 'peer-to-peer',
      topic: 'ELEX Phase 3 subgroup analysis',
      urgency: 'soon',
      status: 'new',
      createdAt: '2026-03-15T14:30:00Z',
      ...overrides,
    };
  }

  it('should define all required fields (id, callId, contactId, etc.)', () => {
    // WHY: Missing required fields would break the MSL dashboard and follow-up tracking.
    const req = buildMSLRequest();
    expect(typeof req.id).toBe('string');
    expect(typeof req.callId).toBe('string');
    expect(typeof req.contactId).toBe('string');
    expect(typeof req.contactName).toBe('string');
    expect(typeof req.topic).toBe('string');
    expect(typeof req.createdAt).toBe('string');
    expect(['patient', 'hcp']).toContain(req.contactType);
  });

  it('should accept requestType "peer-to-peer"', () => {
    const req = buildMSLRequest({ requestType: 'peer-to-peer' });
    expect(req.requestType).toBe('peer-to-peer');
  });

  it('should accept requestType "clinical-data"', () => {
    const req = buildMSLRequest({ requestType: 'clinical-data' });
    expect(req.requestType).toBe('clinical-data');
  });

  it('should accept requestType "off-label-inquiry"', () => {
    // WHY: Off-label inquiries require special compliance tracking in the MSL workflow.
    const req = buildMSLRequest({ requestType: 'off-label-inquiry' });
    expect(req.requestType).toBe('off-label-inquiry');
  });

  it('should accept requestType "scientific-exchange"', () => {
    const req = buildMSLRequest({ requestType: 'scientific-exchange' });
    expect(req.requestType).toBe('scientific-exchange');
  });

  it('should accept status "new"', () => {
    const req = buildMSLRequest({ status: 'new' });
    expect(req.status).toBe('new');
  });

  it('should accept status "assigned"', () => {
    const req = buildMSLRequest({ status: 'assigned' });
    expect(req.status).toBe('assigned');
  });

  it('should accept status "scheduled"', () => {
    const req = buildMSLRequest({ status: 'scheduled' });
    expect(req.status).toBe('scheduled');
  });

  it('should accept status "completed"', () => {
    const req = buildMSLRequest({ status: 'completed' });
    expect(req.status).toBe('completed');
  });

  it('should allow assignedMSL to be optional', () => {
    // WHY: New requests may not yet have an assigned MSL.
    const req = buildMSLRequest();
    expect(req.assignedMSL).toBeUndefined();
  });

  it('should accept an assigned MSL name when provided', () => {
    const req = buildMSLRequest({ assignedMSL: 'Dr. Sarah Mitchell' });
    expect(req.assignedMSL).toBe('Dr. Sarah Mitchell');
  });
});

// ---------------------------------------------------------------------------
// Evidence Engine -- outcome tracking types
// ---------------------------------------------------------------------------
describe('ScreeningInstrumentId -- extended instrument set', () => {
  it('should accept TETRAS-LITE as a valid ScreeningInstrumentId', () => {
    // WHY: TETRAS-LITE is required for tremor outcome tracking in the Evidence Engine.
    const id: ScreeningInstrumentId = 'TETRAS-LITE';
    expect(id).toBe('TETRAS-LITE');
  });

  it('should accept MMAS-4 as a valid ScreeningInstrumentId', () => {
    // WHY: MMAS-4 is the adherence instrument used in the Evidence Engine.
    const id: ScreeningInstrumentId = 'MMAS-4';
    expect(id).toBe('MMAS-4');
  });
});

describe('OutcomeTimepoint type', () => {
  it('should allow all valid timepoint values', () => {
    // WHY: All four timepoints are required to build the complete outcome trajectory.
    const timepoints: OutcomeTimepoint[] = ['baseline', '30d', '60d', '90d'];
    expect(timepoints).toHaveLength(4);
  });
});

describe('PatientOutcomeRecord interface', () => {
  it('should allow constructing a valid PatientOutcomeRecord', () => {
    // WHY: PatientOutcomeRecord is the core unit of evidence data; shape must be correct.
    const record: PatientOutcomeRecord = {
      patientId: 'PAT-001',
      therapeuticArea: 'essential-tremor',
      drugProduct: 'euloxacaltenamide',
      enrolledAt: '2026-01-01T00:00:00Z',
      tetrasScores: { baseline: 28, '90d': 14 },
      mmasScores: { baseline: 3, '90d': 1 },
      persistedAt90d: true,
      aeReported: false,
      seriousAeReported: false,
    };
    expect(record.patientId).toBe('PAT-001');
    expect(record.persistedAt90d).toBe(true);
  });

  it('should allow partial tetrasScores (only some timepoints recorded)', () => {
    // WHY: Partial<Record<...>> means patients may not have data at every timepoint.
    const record: PatientOutcomeRecord = {
      patientId: 'PAT-002',
      therapeuticArea: 'essential-tremor',
      drugProduct: 'euloxacaltenamide',
      enrolledAt: '2026-02-01T00:00:00Z',
      tetrasScores: { baseline: 22 },
      mmasScores: {},
      persistedAt90d: false,
      aeReported: false,
      seriousAeReported: false,
    };
    expect(record.tetrasScores.baseline).toBe(22);
    expect(record.tetrasScores['90d']).toBeUndefined();
  });
});

describe('CohortTimepointStats interface', () => {
  it('should allow constructing a valid CohortTimepointStats object', () => {
    // WHY: This is the statistical summary shape expected by payer evidence reports.
    const stats: CohortTimepointStats = {
      timepoint: '90d',
      n: 142,
      mean: 13.4,
      median: 13.0,
      stdDev: 4.2,
      ci95Lower: 12.7,
      ci95Upper: 14.1,
      percentImprovedFromBaseline: 81.2,
    };
    expect(stats.timepoint).toBe('90d');
    expect(stats.percentImprovedFromBaseline).toBe(81.2);
  });
});

describe('CohortOutcomeData interface', () => {
  it('should allow constructing a valid CohortOutcomeData object', () => {
    // WHY: CohortOutcomeData is the top-level evidence payload submitted to payers.
    const data: CohortOutcomeData = {
      therapeuticArea: 'essential-tremor',
      drugProduct: 'euloxacaltenamide',
      instrumentId: 'TETRAS-LITE',
      instrumentLabel: 'TETRAS-Lite Tremor Score',
      totalEnrolled: 142,
      trajectory: [],
      persistenceRate: { '30d': 0.96, '60d': 0.91, '90d': 0.87 },
      aeIncidenceRate: 0.12,
    };
    expect(data.instrumentId).toBe('TETRAS-LITE');
    expect(data.totalEnrolled).toBe(142);
  });

  it('persistenceRate should exclude baseline (only 30d, 60d, 90d keys)', () => {
    // WHY: Exclude<OutcomeTimepoint, 'baseline'> enforces that baseline has no persistence rate.
    const data: CohortOutcomeData = {
      therapeuticArea: 'essential-tremor',
      drugProduct: 'euloxacaltenamide',
      instrumentId: 'MMAS-4',
      instrumentLabel: 'MMAS-4 Adherence Score',
      totalEnrolled: 98,
      trajectory: [],
      persistenceRate: { '30d': 0.95, '60d': 0.90, '90d': 0.85 },
      aeIncidenceRate: 0.08,
    };
    // Verify only non-baseline keys are present
    const keys = Object.keys(data.persistenceRate);
    expect(keys).not.toContain('baseline');
    expect(keys).toContain('30d');
    expect(keys).toContain('60d');
    expect(keys).toContain('90d');
  });
});

describe('PayerEvidenceCard interface', () => {
  it('should allow constructing a valid PayerEvidenceCard object', () => {
    // WHY: PayerEvidenceCard is the formatted output for payer contracting submissions.
    const card: PayerEvidenceCard = {
      generatedAt: '2026-03-18T00:00:00Z',
      cohortSize: 142,
      meanBaselineScore: 27.8,
      mean90dScore: 13.4,
      meanImprovementPct: 51.8,
      ci95: [12.7, 14.1],
      persistenceRate90d: 0.87,
      adherenceRate90d: 0.85,
      aeRate: 0.12,
      seriousAeRate: 0.02,
      headline: '52% mean TETRAS-Lite improvement at 90 days (n=142)',
    };
    expect(card.cohortSize).toBe(142);
    expect(card.ci95).toHaveLength(2);
    expect(typeof card.headline).toBe('string');
  });
});
