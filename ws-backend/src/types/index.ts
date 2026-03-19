// Vi Praxis BioSciences — Type Definitions
//
// Brand-driven string types: these were previously narrow union literals
// scoped to Praxis products. They are now open strings so that each brand
// pack can supply its own values at runtime.

export type AgentType = 'patient-support' | 'hcp-support' | 'hcp-outbound' | 'medcomms-qa';

/** Therapeutic area identifier — brand-driven, e.g. 'essential-tremor' */
export type TherapeuticAreaId = string;
/** Drug product identifier — brand-driven, e.g. 'euloxacaltenamide' */
export type DrugProductId = string;
/** Call/interaction outcome — brand-driven, e.g. 'ae-reported' */
export type OutcomeId = string;
/** Support pathway — brand-driven, e.g. 'medication-access' */
export type SupportPathwayId = string;
/** Screening instrument identifier — brand-driven, e.g. 'AE-TRIAGE' */
export type ScreeningInstrumentId = string;

// Legacy aliases — keep downstream imports working during migration
export type TherapeuticArea = TherapeuticAreaId;
export type DrugProduct = DrugProductId;
export type OutcomeType = OutcomeId;
export type SupportPathway = SupportPathwayId;

export type RiskTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type Urgency = 'routine' | 'soon' | 'urgent';
export type CallDirection = 'outbound' | 'inbound';
export type ContactStatus = 'new' | 'calling' | 'connected' | 'completed' | 'classified' | 'followed-up' | 'no-answer';
export type CallStatus = 'initiated' | 'ringing' | 'connected' | 'completed' | 'failed' | 'no-answer';

export type SignalCategory =
  | 'COMPETITOR_RESEARCH'
  | 'FORMULARY_LOOKUP'
  | 'SYMPTOM_SEARCH'
  | 'ADHERENCE_GAP'
  | 'KOL_ENGAGEMENT'
  | 'OFF_LABEL_QUERY'
  | 'CAREGIVER_DISTRESS'
  | 'CONFERENCE_ACTIVITY';

export interface BehavioralSignal {
  category: SignalCategory;
  detail: string;
  recency: string;
  severity: 'high' | 'medium' | 'low';
  clinicalImplication: string;
}

export interface ContactRecord {
  contactId: string;
  contactType: 'patient' | 'hcp' | 'caregiver';
  agentType: AgentType;
  name: string;
  phone: string;
  age: number;
  gender: string;
  therapeuticArea: TherapeuticArea;

  // Patient fields
  diagnosis?: string;
  currentDrug?: DrugProduct;
  prescribingHcp?: string;
  prescribingHcpNpi?: string;
  treatmentStartDate?: string;
  currentDose?: string;
  titrationPhase?: string;
  hubEnrolled?: boolean;
  copayCardActive?: boolean;
  priorAuthStatus?: string;

  // HCP fields
  npi?: string;
  specialty?: string;
  institution?: string;
  prescribingVolume?: string;
  samplesOnHand?: boolean;
  speakerProgramMember?: boolean;

  // Common
  behavioralSignals: BehavioralSignal[];
  recommendedPathway: SupportPathway;
  engagementLabels: string[];
  riskTier: RiskTier;
  riskScore: number;
  preferredChannel: 'voice' | 'sms' | 'web';
  status: ContactStatus;
  createdAt: string;
  callAttempts: number;
  lastCallAttempt: string | null;
  callId: string | null;
}

export interface TranscriptEntry {
  speaker: 'agent' | 'caller';
  text: string;
  timestamp: number;
}

export interface CallRecord {
  id: string;
  contactId: string;
  callSid: string;
  direction: CallDirection;
  agentType: AgentType;
  status: CallStatus;
  duration: number;
  startedAt: string;
  connectedAt: string | null;
  endedAt: string | null;
  outcome: OutcomeType | null;
  outcomeConfidence: number | null;
  sentiment: number | null;
  summary: string | null;
  keyMoments: string[] | null;
  contactConcerns: string[] | null;
  nextAction: string | null;
  liaisonSummary: string | null;
  supportPathway: SupportPathway | null;
  urgency: Urgency | null;
  behavioralSignalsReferenced: string[] | null;
  appointmentDetails: AppointmentDetails | null;
  transcript: TranscriptEntry[];
  smsFollowUpSent: boolean;
  smsFollowUpTemplate: string | null;
  smsFollowUpSentAt: string | null;
  screeningResults: ScreeningResult[] | null;
  aeDetected: boolean;
  competitiveIntelNotes: string[] | null;
}

export interface AppointmentDetails {
  provider: string;
  specialty: string;
  date: string;
  location: string;
}

// Clinical Screening Types (pharma-adapted)
// ScreeningInstrumentId is now declared above as a brand-driven string
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
  requiresEscalation: boolean;
  regulatoryReportable: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface RecommendedScreening {
  instrumentId: ScreeningInstrumentId;
  reason: string;
  priority: number;
}

export interface ContactSubmission {
  contactId: string;
  contactType: 'patient' | 'hcp' | 'caregiver';
  agentType: AgentType;
  name: string;
  phone: string;
  age: number;
  gender: string;
  therapeuticArea: TherapeuticArea;
  diagnosis?: string;
  currentDrug?: DrugProduct;
  prescribingHcp?: string;
  npi?: string;
  specialty?: string;
  institution?: string;
  prescribingVolume?: string;
  behavioralSignals: BehavioralSignal[];
  recommendedPathway: SupportPathway;
  engagementLabels: string[];
  riskTier: RiskTier;
  riskScore: number;
  preferredChannel: 'voice' | 'sms' | 'web';
}

export interface ClassificationResult {
  outcome: OutcomeType;
  confidence: number;
  supportPathway: SupportPathway | null;
  urgency: Urgency;
  sentiment: number;
  keyMoments: string[];
  contactConcerns: string[];
  behavioralSignalsReferenced: string[];
  nextAction: string;
  liaisonSummary: string;
  appointmentDetails: AppointmentDetails | null;
  screeningResults: ScreeningResult[] | null;
  aeDetected: boolean;
  competitiveIntelNotes: string[];
}

export interface ActiveCallSession {
  callId: string;
  contactId: string;
  callSid: string;
  contact: ContactRecord;
  streamSid: string | null;
  deepgramWs: WebSocket | null;
  transcript: TranscriptEntry[];
  startedAt: string;
  connectedAt: string | null;
}
