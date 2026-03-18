// ---------------------------------------------------------------------------
// Vi Operate -- Praxis BioSciences Pharma Engagement Platform
// Core domain types
// ---------------------------------------------------------------------------

export type AgentType =
  | 'patient-support'
  | 'hcp-support'
  | 'hcp-outbound'
  | 'medcomms-qa';

export type TherapeuticArea = 'essential-tremor' | 'dee';

export type DrugProduct = 'euloxacaltenamide' | 'relutrigine';

export type PriorityTier = 'HIGH' | 'MEDIUM' | 'LOW';

export type SupportPathwayId =
  | 'hub-enrollment'
  | 'copay-assistance'
  | 'ae-reporting'
  | 'adherence-support'
  | 'sample-request'
  | 'medical-inquiry';

export type UrgencyLevel = 'routine' | 'soon' | 'urgent';

export type InteractionOutcome =
  | 'hub-enrolled'
  | 'copay-card-issued'
  | 'ae-report-filed'
  | 'adherence-counseling'
  | 'sample-shipped'
  | 'medical-info-provided'
  | 'hcp-detail-completed'
  | 'prior-auth-initiated'
  | 'callback-requested'
  | 'follow-up-scheduled'
  | 'declined'
  | 'no-answer'
  | 'voicemail';

export type ChannelType = 'voice' | 'sms' | 'web';

export type SignalCategory =
  | 'SEARCH_INTENT'
  | 'RX_PATTERN'
  | 'CLAIMS_SIGNAL'
  | 'HCP_ACTIVITY'
  | 'ADHERENCE_SIGNAL'
  | 'COMPETITIVE_INTEL';

// ---------------------------------------------------------------------------
// Behavioral Signal -- enrichment layer
// ---------------------------------------------------------------------------
export interface BehavioralSignal {
  category: SignalCategory;
  detail: string;
  recency: string;
  severity: 'high' | 'medium' | 'low';
  clinicalImplication: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Contact Record -- patients and HCPs in the engagement queue
// ---------------------------------------------------------------------------
export interface ContactRecord {
  contactId: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  contactType: 'patient' | 'hcp';
  therapeuticArea: TherapeuticArea;
  drugProduct: DrugProduct;
  // Patient-specific
  diagnosis?: string;
  currentMedications?: string[];
  insurancePlan?: string;
  // HCP-specific
  specialty?: string;
  npiNumber?: string;
  practiceLocation?: string;
  patientsOnTherapy?: number;
  // Shared
  behavioralSignals: BehavioralSignal[];
  recommendedPathway: SupportPathwayId;
  openActions: string[];
  priorityTier: PriorityTier;
  priorityScore: number;
  preferredChannel: ChannelType;
}

// ---------------------------------------------------------------------------
// Liaison Summary -- generated post-call for medical liaison review
// ---------------------------------------------------------------------------
export interface LiaisonSummary {
  engagementScore: number; // 0-100
  engagementAssessment: string;
  engagementWindow: string;
  behavioralContextIndicators: string[];
  clinicalRiskPattern: string;
  supportNeeds: string;
  recommendedActions: string[];
  enrichmentData: {
    prescribingPattern: string;
    adherenceProfile: string;
    digitalEngagement: string;
    competitiveIntelligence: string;
  };
  channelEffectiveness: {
    sms: number;
    voiceAgent: number;
    fieldLiaison: number;
  };
  callSummaryForLiaison: string;
  aeDetected: boolean;
  aeDetails?: string;
}

// ---------------------------------------------------------------------------
// Classification -- AI-generated after each call
// ---------------------------------------------------------------------------
export interface Classification {
  outcome: InteractionOutcome;
  confidence: number;
  support_pathway: SupportPathwayId;
  urgency: UrgencyLevel;
  sentiment: 'positive' | 'neutral' | 'negative';
  key_moments: string[];
  contact_concerns: string[];
  behavioral_signals_referenced: string[];
  next_action: string;
  liaison_summary: string;
  aeDetected: boolean;
  aeNarrative?: string;
}

// ---------------------------------------------------------------------------
// Screening Types (for AE detection / adherence assessments)
// ---------------------------------------------------------------------------
export type ScreeningInstrumentId = 'AE-SCREEN' | 'ADHERENCE-CHECK' | 'DOSING-VERIFY' | 'SWITCH-ASSESS';

export type ScreeningStatus = 'pending' | 'in-progress' | 'completed' | 'declined';

export interface ScreeningQuestionResponse {
  questionIndex: number;
  questionText: string;
  contactResponse: string;
  scoreValue: number;
  timestamp: number;
}

export interface ScreeningResult {
  instrumentId: ScreeningInstrumentId;
  instrumentName: string;
  status: ScreeningStatus;
  responses: ScreeningQuestionResponse[];
  totalScore: number;
  maxScore: number;
  isPositiveScreen: boolean;
  clinicalInterpretation: string;
  reportRequired: boolean;
  reportType: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Transcript Entry
// ---------------------------------------------------------------------------
export interface TranscriptEntry {
  speaker: 'agent' | 'contact';
  text: string;
  timestamp: number; // seconds from call start
}

// ---------------------------------------------------------------------------
// Call Record -- the core data entity for the dashboard
// ---------------------------------------------------------------------------
export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  contactAge: number;
  contactType: 'patient' | 'hcp';
  agentType: AgentType;
  therapeuticArea: TherapeuticArea;
  drugProduct: DrugProduct;
  supportPathway: SupportPathwayId;
  behavioralSignals: BehavioralSignal[];
  priorityTier: PriorityTier;
  outcome: InteractionOutcome;
  urgency: UrgencyLevel;
  sentiment: 'positive' | 'neutral' | 'negative';
  duration: number; // seconds
  timestamp: string; // ISO 8601
  transcript: TranscriptEntry[];
  classification: Classification;
  liaisonSummary: LiaisonSummary;
  smsSent: boolean;
  channel: ChannelType;
  screeningResults?: ScreeningResult[] | null;
  aeDetected: boolean;
}

// ---------------------------------------------------------------------------
// Agent Persona -- configurable voice identity per agent type
// ---------------------------------------------------------------------------
export interface AgentPersona {
  name: string;
  agentType: AgentType;
  warmth: number;      // 0-100
  empathy: number;     // 0-100
  clinicalDepth: number; // 0-100
  formality: number;   // 0-100
  greeting: string;
  signoff: string;
  language: string;
  therapeuticFocus?: TherapeuticArea;
  escalationTriggers?: string[];
  guardrails?: string[];
}

// ---------------------------------------------------------------------------
// KPI Data -- dashboard summary metrics
// ---------------------------------------------------------------------------
export interface KPIData {
  totalInteractions: number;
  aeReportsCaptured: number;
  hubEnrollments: number;
  copayCardsIssued: number;
  hcpEngagements: number;
  adherenceRate: number;          // percentage
  sampleRequests: number;
  avgHandleTime: number;          // seconds
  engagementRate: number;         // percentage
  medicalInquiries: number;
}

// ---------------------------------------------------------------------------
// Contact Signal Feed -- live enrichment events
// ---------------------------------------------------------------------------
export interface ContactSignalFeed {
  id: string;
  contactIdAnon: string;
  signalType: SignalCategory;
  detectedBehavior: string;
  recommendedAction: string;
  urgency: UrgencyLevel;
  supportPathway: SupportPathwayId;
  therapeuticArea: TherapeuticArea;
  timestamp: string;
  status: 'new' | 'queued' | 'in-progress' | 'completed';
}

// ---------------------------------------------------------------------------
// Support Pathway definition
// ---------------------------------------------------------------------------
export interface SupportPathway {
  id: SupportPathwayId;
  label: string;
  description: string;
  icon: string;
  color: string;
  urgencyDefault: UrgencyLevel;
  regulatoryRelevant: boolean;
}

// ---------------------------------------------------------------------------
// Dashboard filter / pagination helpers
// ---------------------------------------------------------------------------
export interface CallFilters {
  supportPathway?: SupportPathwayId;
  outcome?: InteractionOutcome;
  priorityTier?: PriorityTier;
  agentType?: AgentType;
  therapeuticArea?: TherapeuticArea;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CallsPageResponse {
  calls: CallRecord[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Analytics Response
// ---------------------------------------------------------------------------
export interface AnalyticsResponse {
  kpis: KPIData;
  outcomeDistribution: Record<string, number>;
  pathwayDistribution: Record<string, number>;
  priorityTierDistribution: Record<PriorityTier, number>;
  agentTypeDistribution: Record<AgentType, number>;
  therapeuticAreaDistribution: Record<TherapeuticArea, number>;
  dailyTrend: Array<{ date: string; interactions: number; engagements: number; conversions: number }>;
  topConcerns: Array<{ concern: string; count: number; percentage: number }>;
  recentCalls: CallRecord[];
}
