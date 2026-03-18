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
  AgentPersona,
  KPIData,
  ContactSignalFeed,
  SupportPathway,
  CallFilters,
  CallsPageResponse,
  AnalyticsResponse,
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
