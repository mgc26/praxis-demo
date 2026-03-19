'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AgentType,
  AnalyticsResponse,
  CallRecord,
  CohortTimepointStats,
  ContactRecord,
  ContactSignalFeed,
  MSLFollowUpRequest,
  PatientOutcomeRecord,
  SupportPathwayId,
  TherapeuticArea,
  AgentPersona,
  InteractionOutcome,
  UrgencyLevel,
} from '@/app/lib/types';
import { CONVERSION_OUTCOMES, getDemoScenarios } from '@/app/lib/constants';
import { getCohortOutcomeData, getPatientOutcomes, getPayerEvidenceCard } from '@/app/lib/seed-data';
import { useBrand } from '@/app/components/BrandContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = 'agent-storyboard' | 'interaction-data' | 'medical-intelligence' | 'performance' | 'outcomes-evidence' | 'implementation';

// ---------------------------------------------------------------------------
// Brand Design Tokens (resolved via CSS variables from ThemeInjector)
// ---------------------------------------------------------------------------
const PX: Record<string, string> = {
  bg: 'var(--brand-surface-hex)',
  cardBg: 'var(--brand-bg-hex)',
  cardBorder: 'var(--brand-border-hex)',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
  teal: 'var(--brand-primary-hex)',
  tealLight: 'var(--brand-primary-light-hex)',
  tealBg: '#E0F7FA',
  navy: 'var(--brand-secondary-hex)',
  navyDeep: 'var(--brand-primary-dark-hex)',
  textPrimary: 'var(--brand-text-hex)',
  textSecondary: 'var(--brand-text-muted-hex)',
  textMuted: '#ACB0B3',
  btnDark: 'var(--brand-secondary-hex)',
  btnDarkHover: 'var(--brand-primary-dark-hex)',
  success: '#34A853',
  error: 'var(--brand-accent3-hex)',
  warning: 'var(--brand-accent-hex)',
  purple: 'var(--brand-info-hex)',
  priorityHigh: 'var(--brand-accent3-hex)',
  priorityMedium: 'var(--brand-accent-hex)',
  priorityLow: '#34A853',
  skelBase: 'var(--brand-border-hex)',
  skelShimmer: '#F0F2F3',
  accent: 'var(--brand-accent-hex)',
  gold: 'var(--brand-accent2-hex)',
  coral: 'var(--brand-accent3-hex)',
  blue: 'var(--brand-info-hex)',
};

const AGENT_TYPE_LABELS: Record<AgentType, { label: string; color: string }> = {
  'patient-support': { label: 'Patient Support', color: PX.teal },
  'hcp-support': { label: 'HCP Support', color: PX.navy },
  'hcp-outbound': { label: 'HCP Outbound', color: PX.blue },
  'medcomms-qa': { label: 'MedComms QA', color: PX.accent },
};

const PATHWAY_LABELS: Record<SupportPathwayId, string> = {
  'hub-enrollment': 'Hub Enrollment',
  'copay-assistance': 'Copay Assistance',
  'ae-reporting': 'AE Reporting',
  'adherence-support': 'Adherence Support',
  'sample-request': 'Sample Request',
  'medical-inquiry': 'Medical Inquiry',
};

const PATHWAY_COLORS: Record<SupportPathwayId, string> = {
  'hub-enrollment': PX.teal,
  'copay-assistance': PX.blue,
  'ae-reporting': PX.coral,
  'adherence-support': PX.gold,
  'sample-request': PX.accent,
  'medical-inquiry': PX.navy,
};

const OUTCOME_LABELS: Record<string, string> = {
  'hub-enrolled': 'Hub Enrolled',
  'copay-card-issued': 'Copay Card Issued',
  'ae-report-filed': 'AE Report Filed',
  'adherence-counseling': 'Adherence Counseling',
  'sample-shipped': 'Sample Shipped',
  'medical-info-provided': 'Medical Info Provided',
  'hcp-detail-completed': 'HCP Detail Completed',
  'prior-auth-initiated': 'Prior Auth Initiated',
  'callback-requested': 'Callback Requested',
  'follow-up-scheduled': 'Follow-Up Scheduled',
  'declined': 'Declined',
  'no-answer': 'No Answer',
  'voicemail': 'Voicemail Left',
};

const OUTCOME_COLORS: Record<string, string> = {
  'hub-enrolled': PX.teal,           // primary action — teal
  'copay-card-issued': PX.blue,      // financial — blue
  'ae-report-filed': PX.coral,       // safety — coral
  'adherence-counseling': PX.navy,   // support — navy
  'sample-shipped': PX.accent,       // commercial — accent orange
  'medical-info-provided': PX.navy,  // information — navy
  'hcp-detail-completed': PX.teal,   // engagement — teal
  'prior-auth-initiated': PX.gold,   // pending action — gold
  'callback-requested': PX.accent,   // deferred — accent orange
  'follow-up-scheduled': PX.success, // positive next step — green
  'declined': PX.coral,              // negative — coral
  'no-answer': PX.textMuted,         // inactive — muted
  'voicemail': PX.textMuted,         // inactive — muted
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  HIGH: { text: PX.coral, bg: `${PX.coral}10`, border: `${PX.coral}30` },
  MEDIUM: { text: PX.accent, bg: `${PX.accent}10`, border: `${PX.accent}30` },
  LOW: { text: PX.success, bg: `${PX.success}10`, border: `${PX.success}30` },
};

// TA_LABELS: built dynamically from brand inside the component via useMemo

// TA_COLORS: built dynamically from brand inside the component via useMemo
const TA_COLOR_PALETTE = [PX.teal, PX.purple, PX.blue, PX.accent, PX.navy, PX.coral];

const SIGNAL_LABELS: Record<string, string> = {
  SEARCH_INTENT: 'Search Intent',
  RX_PATTERN: 'Rx Pattern',
  CLAIMS_SIGNAL: 'Claims Signal',
  HCP_ACTIVITY: 'HCP Activity',
  ADHERENCE_SIGNAL: 'Adherence',
  COMPETITIVE_INTEL: 'Competitive Intel',
};

const SIGNAL_COLORS: Record<string, string> = {
  SEARCH_INTENT: PX.teal,
  RX_PATTERN: PX.blue,
  CLAIMS_SIGNAL: PX.gold,
  HCP_ACTIVITY: PX.navy,
  ADHERENCE_SIGNAL: PX.coral,
  COMPETITIVE_INTEL: PX.accent,
};

// ---------------------------------------------------------------------------
// Per-agent guardrail & escalation sets (pharma-specific)
// ---------------------------------------------------------------------------
const AGENT_GUARDRAILS: Record<AgentType, { active: string[]; available: string[] }> = {
  'patient-support': {
    active: ['No medical advice', 'No dosage recommendations', 'No coverage guarantees', 'No off-label information', 'Anti-kickback copay screening', 'AE capture mandatory'],
    available: ['Caregiver crisis detection', 'Break-in-therapy escalation', 'REMS compliance check', 'Pediatric safeguards', 'Pregnancy exposure protocol'],
  },
  'hcp-support': {
    active: ['On-label only', 'No comparative claims', 'No patient-specific advice', 'AE capture mandatory', 'Solicited/unsolicited tracking'],
    available: ['Special population warnings', 'Off-label intake workflow', 'Fair balance enforcement', 'MSL escalation criteria', 'Product complaint capture'],
  },
  'hcp-outbound': {
    active: ['No off-label promotion', 'No competitor disparagement', 'Fair balance required', 'AE capture mandatory', 'No prescribing volume bias'],
    available: ['Gatekeeper protocol', 'Do-not-call compliance', 'Speaker program disclosure', 'Autonomy preservation', 'Clinical data only — no promotional claims'],
  },
  'medcomms-qa': {
    active: ['FDA-approved labeling only', 'AE capture mandatory', 'Balanced response required', 'No patient-specific advice'],
    available: ['Custom MI response workflow', 'Crisis protocol', 'Pregnancy exposure reporting', 'Off-label intake documentation', 'Literature citation required'],
  },
};

const AGENT_ESCALATIONS: Record<AgentType, { active: string[]; available: string[] }> = {
  'patient-support': {
    active: ['Suicidal ideation (C-SSRS)', 'Adverse event reported', 'Pregnancy exposure', 'Medical emergency'],
    available: ['Caregiver burnout crisis', 'Medication out-of-stock', 'Insurance denial', 'Seizure escalation', 'Treatment discontinuation'],
  },
  'hcp-support': {
    active: ['Serious adverse event', 'Off-label request', 'Pregnancy report'],
    available: ['Product quality complaint', 'Medication error', 'Overdose report', 'Lack of effectiveness', 'Patient safety concern'],
  },
  'hcp-outbound': {
    active: ['Adverse event mentioned', 'Hostile response / DNC'],
    available: ['Pregnancy exposure', 'Off-label interest detected', 'Crisis mention', 'Product complaint', 'Competitive switch signal'],
  },
  'medcomms-qa': {
    active: ['Adverse event reported', 'Crisis / suicidality', 'Pregnancy exposure'],
    available: ['Off-label inquiry escalation', 'Product complaint', 'Medical emergency', 'Complex clinical question', 'Regulatory reporting trigger'],
  },
};

// ---------------------------------------------------------------------------
// Personality presets per agent type
// ---------------------------------------------------------------------------
interface PersonalityPreset {
  label: string;
  warmth: number;
  empathy: number;
  clinicalDepth: number;
  formality: number;
}

const PERSONALITY_PRESETS: Record<AgentType, PersonalityPreset[]> = {
  'patient-support': [
    { label: 'Warm & Supportive', warmth: 90, empathy: 95, clinicalDepth: 40, formality: 30 },
    { label: 'Professional & Clear', warmth: 65, empathy: 70, clinicalDepth: 60, formality: 60 },
    { label: 'Clinical Nurse', warmth: 50, empathy: 60, clinicalDepth: 85, formality: 75 },
  ],
  'hcp-support': [
    { label: 'Medical Information Standard', warmth: 40, empathy: 45, clinicalDepth: 90, formality: 85 },
    { label: 'Approachable Expert', warmth: 60, empathy: 55, clinicalDepth: 85, formality: 65 },
    { label: 'Concise & Direct', warmth: 30, empathy: 35, clinicalDepth: 95, formality: 90 },
  ],
  'hcp-outbound': [
    { label: 'Consultative Partner', warmth: 70, empathy: 60, clinicalDepth: 75, formality: 55 },
    { label: 'Data-Driven Presenter', warmth: 45, empathy: 40, clinicalDepth: 90, formality: 70 },
    { label: 'Relationship Builder', warmth: 85, empathy: 75, clinicalDepth: 60, formality: 45 },
  ],
  'medcomms-qa': [
    { label: 'Precise & Referenced', warmth: 35, empathy: 40, clinicalDepth: 95, formality: 90 },
    { label: 'Patient-Friendly', warmth: 75, empathy: 80, clinicalDepth: 55, formality: 45 },
    { label: 'Balanced Generalist', warmth: 55, empathy: 60, clinicalDepth: 75, formality: 65 },
  ],
};

// Language options for agent config
const AGENT_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'zh', label: 'Mandarin' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ko', label: 'Korean' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'ar', label: 'Arabic' },
];

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------
const TAB_ITEMS: Array<{
  id: Tab;
  label: string;
  getBadge: (d: { calls: number; contacts: number; signals: number; mslFollowUps: number }) => string;
}> = [
  { id: 'agent-storyboard', label: 'Agent Storyboard', getBadge: () => '' },
  { id: 'interaction-data', label: 'Interaction Data', getBadge: (d) => `${d.calls}` },
  { id: 'medical-intelligence', label: 'Medical Intelligence', getBadge: (d) => d.mslFollowUps > 0 ? `${d.mslFollowUps}` : '' },
  { id: 'performance', label: 'Performance', getBadge: () => '' },
  { id: 'outcomes-evidence', label: 'Outcomes & Evidence', getBadge: () => `${getCohortOutcomeData().totalEnrolled}` },
  { id: 'implementation', label: 'Implementation & Compliance', getBadge: () => '' },
];

const BASE_STORYBOARD_STEPS = [
  { id: 'data-drop', label: 'Data Drop' },
  { id: 'agent-config', label: 'Agent Config' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'call-log', label: 'Call Log' },
];

const URGENCY_COLORS: Record<UrgencyLevel, { text: string; bg: string; border: string }> = {
  urgent: { text: '#DC2626', bg: '#FF7D7810', border: '#FECACA' },
  soon: { text: '#92400E', bg: '#DE7D0010', border: '#FDE68A' },
  routine: { text: '#059669', bg: '#34A85310', border: '#A7F3D0' },
};

const MSL_REQUEST_TYPE_LABELS: Record<string, string> = {
  'peer-to-peer': 'Peer-to-Peer',
  'clinical-data': 'Clinical Data',
  'off-label-inquiry': 'Off-Label Inquiry',
  'scientific-exchange': 'Scientific Exchange',
};

const MSL_STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  new: { text: PX.error, bg: '#FF7D7810' },
  assigned: { text: PX.warning, bg: '#DE7D0010' },
  scheduled: { text: PX.teal, bg: '#E0F7FA' },
  completed: { text: PX.success, bg: '#34A85310' },
};

// Patient-facing signal categories that should NOT trigger HCP outbound (compliance)
const PATIENT_FACING_ONLY_SIGNALS = new Set(['SEARCH_INTENT', 'ADHERENCE_SIGNAL', 'CLAIMS_SIGNAL']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KPICard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div
      className="border bg-white p-5"
      style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color: color || PX.navy }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: PX.textMuted }}>{sub}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contact Row (queue sidebar)
// ---------------------------------------------------------------------------
function ContactRow({
  contact,
  onInitiate,
  taLabels,
  taColors,
}: {
  contact: ContactRecord;
  onInitiate: (id: string) => void;
  taLabels: Record<string, string>;
  taColors: Record<string, string>;
}) {
  const priority = PRIORITY_COLORS[contact.priorityTier] || PRIORITY_COLORS.LOW;
  const taColor = taColors[contact.therapeuticArea] || PX.teal;
  const topSignal = contact.behavioralSignals[0];

  return (
    <div
      className="flex items-center gap-3 border bg-white px-4 py-3 transition-all duration-150 hover:shadow-sm"
      style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
        style={{ backgroundColor: contact.contactType === 'patient' ? PX.teal : PX.navy }}
      >
        {initials(contact.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: PX.navy }}>{contact.name}</span>
          <span
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{ color: priority.text, backgroundColor: priority.bg, border: `1px solid ${priority.border}` }}
          >
            {contact.priorityTier}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px]" style={{ color: PX.textMuted }}>
            {contact.contactType === 'patient' ? `Age ${contact.age}` : contact.specialty?.split(' -- ')[0] || 'HCP'}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: taColor }}>
            {taLabels[contact.therapeuticArea] ?? contact.therapeuticArea}
          </span>
        </div>
        {topSignal && (
          <div className="mt-1 text-[10px] truncate" style={{ color: PX.textSecondary }}>
            {topSignal.detail}
          </div>
        )}
      </div>
      <button
        onClick={() => onInitiate(contact.contactId)}
        className="shrink-0 text-xs font-semibold transition-all hover:underline"
        style={{ color: PX.teal }}
      >
        Engage
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Call Detail Drawer
// ---------------------------------------------------------------------------
function CallDetailDrawer({
  call,
  onClose,
  taLabels,
  taColors,
}: {
  call: CallRecord;
  onClose: () => void;
  taLabels: Record<string, string>;
  taColors: Record<string, string>;
}) {
  const outcomeColor = OUTCOME_COLORS[call.outcome] || PX.textMuted;
  const agentConfig = AGENT_TYPE_LABELS[call.agentType];
  const taColor = taColors[call.therapeuticArea] || PX.teal;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-2xl overflow-y-auto bg-white shadow-2xl animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b bg-white px-6 py-4" style={{ borderColor: PX.cardBorder }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold" style={{ color: PX.navy }}>{call.contactName}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: agentConfig.color, backgroundColor: `${agentConfig.color}15` }}>
                  {agentConfig.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: taColor, backgroundColor: `${taColor}15` }}>
                  {taLabels[call.therapeuticArea] ?? call.therapeuticArea}
                </span>
                {call.aeDetected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF7D7810] px-2 py-0.5 text-[10px] font-bold text-[#FF7D78] border border-[#FF7D7830]">
                    AE DETECTED
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-2xl leading-none" style={{ color: PX.textMuted }}>&times;</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Outcome & Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Outcome</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: outcomeColor, backgroundColor: `${outcomeColor}15` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: outcomeColor }} />
                {OUTCOME_LABELS[call.outcome] || call.outcome}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Support Pathway</div>
              <div className="mt-1 text-sm font-medium" style={{ color: PATHWAY_COLORS[call.supportPathway] }}>
                {PATHWAY_LABELS[call.supportPathway]}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Duration</div>
              <div className="mt-1 text-sm font-medium" style={{ color: PX.textPrimary }}>{fmtDuration(call.duration)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Sentiment</div>
              <div className="mt-1 text-sm font-medium capitalize" style={{ color: call.sentiment === 'positive' ? PX.success : call.sentiment === 'negative' ? PX.error : PX.textPrimary }}>
                {call.sentiment}
              </div>
            </div>
          </div>

          {/* AE Alert */}
          {call.aeDetected && call.classification.aeNarrative && (
            <div className="border border-[#FF7D7830] bg-[#FF7D7810] p-4">
              <div className="text-xs font-bold text-[#FF7D78] uppercase tracking-wider mb-1">Adverse Event Report</div>
              <div className="text-sm text-[#485D61]">{call.classification.aeNarrative}</div>
            </div>
          )}

          {/* Screening Results */}
          {call.screeningResults && call.screeningResults.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>Screening Results</div>
              {call.screeningResults.map((sr, idx) => (
                <div key={idx} className="border p-4 mb-2" style={{ borderColor: sr.isPositiveScreen ? '#FECACA' : PX.cardBorder, backgroundColor: sr.isPositiveScreen ? '#FF7D7810' : PX.cardBg }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: sr.isPositiveScreen ? PX.error : PX.textPrimary }}>{sr.instrumentName}</div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                      color: sr.status === 'completed' ? PX.success : sr.status === 'declined' ? PX.error : PX.warning,
                      backgroundColor: sr.status === 'completed' ? '#34A85310' : sr.status === 'declined' ? '#FF7D7810' : '#DE7D0010',
                    }}>
                      {sr.status}
                    </span>
                  </div>
                  {sr.status === 'completed' && (
                    <>
                      <div className="mt-1 text-xs" style={{ color: PX.textSecondary }}>Score: {sr.totalScore}/{sr.maxScore}</div>
                      <div className="mt-1 text-xs" style={{ color: PX.textPrimary }}>{sr.clinicalInterpretation}</div>
                      {sr.responses.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {sr.responses.map((r, ri) => (
                            <div key={ri} className="text-[11px]">
                              <span style={{ color: PX.textSecondary }}>Q: {r.questionText}</span>
                              <br />
                              <span className="font-medium" style={{ color: PX.textPrimary }}>A: {r.contactResponse} (score: {r.scoreValue})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Liaison Summary -- 5-Block Format */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Medical Liaison Summary</div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: call.liaisonSummary.engagementScore >= 75 ? PX.success : call.liaisonSummary.engagementScore >= 55 ? PX.warning : PX.error, backgroundColor: call.liaisonSummary.engagementScore >= 75 ? '#34A85310' : call.liaisonSummary.engagementScore >= 55 ? '#DE7D0010' : '#FF7D7810' }}>
                Engagement: {call.liaisonSummary.engagementScore}%
              </span>
            </div>
            <div className="border space-y-0" style={{ borderColor: PX.cardBorder }}>
              {/* Block 1: Context */}
              <div className="border-b px-4 py-3" style={{ borderColor: PX.cardBorder }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: PX.teal }}>Context</div>
                <div className="text-xs" style={{ color: PX.textPrimary }}>{call.liaisonSummary.contextSummary}</div>
              </div>
              {/* Block 2: What Happened */}
              <div className="border-b px-4 py-3" style={{ borderColor: PX.cardBorder }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: PX.navy }}>What Happened</div>
                <div className="text-xs" style={{ color: PX.textPrimary }}>{call.liaisonSummary.whatHappened}</div>
              </div>
              {/* Block 3: What Changed */}
              <div className="border-b px-4 py-3" style={{ borderColor: PX.cardBorder }}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: PX.accent }}>What Changed Since Last Touch</div>
                <div className="text-xs" style={{ color: PX.textPrimary }}>{call.liaisonSummary.whatChangedSinceLastTouch}</div>
              </div>
              {/* Block 4: Clinical Questions */}
              {call.liaisonSummary.clinicalQuestionsRaised.length > 0 && (
                <div className="border-b px-4 py-3" style={{ borderColor: PX.cardBorder }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: PX.blue }}>Clinical Questions Raised</div>
                  <ul className="space-y-1">
                    {call.liaisonSummary.clinicalQuestionsRaised.map((q, qi) => (
                      <li key={qi} className="flex items-start gap-2 text-xs" style={{ color: PX.textPrimary }}>
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: PX.blue }} />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Block 5: Recommended Action */}
              <div className="px-4 py-3" style={{ backgroundColor: `${PX.teal}06` }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PX.teal }}>Recommended Action</div>
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: URGENCY_COLORS[call.urgency]?.text || PX.textMuted, backgroundColor: URGENCY_COLORS[call.urgency]?.bg || '#F5F5F5' }}>
                    {call.urgency}
                  </span>
                </div>
                <div className="text-xs font-semibold" style={{ color: PX.textPrimary }}>{call.liaisonSummary.recommendedAction}</div>
              </div>
            </div>
          </div>

          {/* Competitive Intelligence Notes */}
          {call.classification.competitiveIntelNotes && call.classification.competitiveIntelNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Competitive Intelligence</div>
                <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: PX.navy, backgroundColor: `${PX.navy}12` }}>CI</span>
              </div>
              <div className="border p-4 space-y-2" style={{ borderColor: PX.navy, backgroundColor: `${PX.navy}06` }}>
                {call.classification.competitiveIntelNotes.map((note, ni) => (
                  <div key={ni} className="flex items-start gap-2 text-xs" style={{ color: PX.textPrimary }}>
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: PX.navy }} />
                    {note}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access / Reimbursement (patient calls only) */}
          {call.contactType === 'patient' && (call.payerName || call.priorAuthStatus || call.denialReason || call.timeToTherapyDays) && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>Access &amp; Reimbursement</div>
              <div className="border p-4" style={{ borderColor: PX.cardBorder }}>
                <div className="grid grid-cols-2 gap-3">
                  {call.payerName && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Payer</div>
                      <div className="mt-0.5 text-xs font-medium" style={{ color: PX.textPrimary }}>{call.payerName}</div>
                    </div>
                  )}
                  {call.priorAuthStatus && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Prior Auth Status</div>
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{
                          color: call.priorAuthStatus === 'approved' ? PX.success : call.priorAuthStatus === 'denied' ? PX.error : call.priorAuthStatus === 'pending' ? PX.warning : PX.textPrimary,
                          backgroundColor: call.priorAuthStatus === 'approved' ? '#34A85310' : call.priorAuthStatus === 'denied' ? '#FF7D7810' : call.priorAuthStatus === 'pending' ? '#DE7D0010' : '#F5F5F5',
                        }}>
                          {call.priorAuthStatus}
                        </span>
                      </div>
                    </div>
                  )}
                  {call.denialReason && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Denial Reason</div>
                      <div className="mt-0.5 text-xs" style={{ color: PX.error }}>{call.denialReason}</div>
                    </div>
                  )}
                  {call.timeToTherapyDays !== undefined && call.timeToTherapyDays !== null && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Time to Therapy</div>
                      <div className="mt-0.5 text-xs font-medium" style={{ color: call.timeToTherapyDays > 14 ? PX.error : call.timeToTherapyDays > 7 ? PX.warning : PX.success }}>{call.timeToTherapyDays} days</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>
              Transcript ({call.transcript.length} messages)
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto border p-4" style={{ borderColor: PX.cardBorder }}>
              {call.transcript.map((entry, i) => (
                <div key={i} className={cn('flex gap-3', entry.speaker === 'agent' ? '' : 'flex-row-reverse')}>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: entry.speaker === 'agent' ? PX.teal : PX.navy }}
                  >
                    {entry.speaker === 'agent' ? 'Vi' : initials(call.contactName)}
                  </div>
                  <div className={cn('max-w-[80%] px-4 py-2.5', entry.speaker === 'agent' ? 'bg-[#E0F7FA]' : 'bg-[#F5F5F5]')}>
                    <div className="text-xs leading-relaxed" style={{ color: PX.textPrimary }}>{entry.text}</div>
                    <div className="mt-1 text-[9px]" style={{ color: PX.textMuted }}>{fmtDuration(entry.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Moments */}
          {call.classification.key_moments.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: PX.textSecondary }}>Key Moments</div>
              <div className="space-y-1">
                {call.classification.key_moments.map((km, ki) => (
                  <div key={ki} className="flex items-start gap-2 text-xs" style={{ color: PX.textPrimary }}>
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: km.includes('ADVERSE') ? PX.error : PX.teal }} />
                    {km}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Summary
// ---------------------------------------------------------------------------
function AISummary({
  analytics,
  calls,
  contacts,
}: {
  analytics: AnalyticsResponse;
  calls: CallRecord[];
  contacts: ContactRecord[];
}) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [timeStr, setTimeStr] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeStr(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
  }, []);

  const summaryItems = useMemo(() => {
    const highPriority = contacts.filter((c) => c.priorityTier === 'HIGH').length;
    const aeCount = calls.filter((c) => c.aeDetected).length;
    const hubEnrolled = calls.filter((c) => c.outcome === 'hub-enrolled').length;
    const hcpEngaged = calls.filter((c) => c.contactType === 'hcp' && c.outcome !== 'no-answer' && c.outcome !== 'voicemail').length;
    const engRate = analytics.kpis.engagementRate;

    const items: { text: string; accent: 'high' | 'info' | 'success' | 'warn' }[] = [];

    if (aeCount > 0) {
      items.push({
        text: `${aeCount} adverse event report${aeCount > 1 ? 's' : ''} captured and routed to pharmacovigilance for review.`,
        accent: 'high',
      });
    }
    if (highPriority > 0) {
      items.push({
        text: `${highPriority} HIGH-priority contact${highPriority > 1 ? 's' : ''} in queue requiring immediate engagement.`,
        accent: 'warn',
      });
    }
    items.push({
      text: `Engagement rate at ${engRate.toFixed(1)}% across all agent types.`,
      accent: 'success',
    });
    if (hubEnrolled > 0) {
      items.push({
        text: `${hubEnrolled} new hub enrollment${hubEnrolled > 1 ? 's' : ''} and ${analytics.kpis.copayCardsIssued} copay card${analytics.kpis.copayCardsIssued !== 1 ? 's' : ''} activated.`,
        accent: 'info',
      });
    }
    if (hcpEngaged > 0) {
      items.push({
        text: `${hcpEngaged} HCP engagement${hcpEngaged > 1 ? 's' : ''} completed across neurology network.`,
        accent: 'info',
      });
    }
    items.push({
      text: `Vi agents processed ${calls.length} interactions across ${new Set(calls.map((c) => c.agentType)).size} agent types and ${new Set(calls.map((c) => c.therapeuticArea)).size} therapeutic areas.`,
      accent: 'success',
    });

    return items;
  }, [analytics, calls, contacts]);

  useEffect(() => {
    if (visibleLines < summaryItems.length) {
      timerRef.current = setInterval(() => {
        setVisibleLines((prev) => {
          if (prev >= summaryItems.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [summaryItems.length, visibleLines]);

  const accentColors: Record<string, { dot: string; bg: string }> = {
    high: { dot: PX.error, bg: '#FF7D7810' },
    warn: { dot: PX.warning, bg: '#DE7D0010' },
    success: { dot: PX.success, bg: '#34A85310' },
    info: { dot: PX.teal, bg: '#E0F7FA' },
  };

  return (
    <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center" style={{ backgroundColor: PX.navy }}>
            <span className="text-[10px] font-black text-white">Vi</span>
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: PX.navy }}>Updates Since Last Login</div>
            <div className="text-[11px]" style={{ color: PX.textMuted }}>AI-generated engagement brief</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: PX.success }} />
          <span className="text-[11px] font-medium" style={{ color: PX.textMuted }}>{timeStr}</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {summaryItems.slice(0, visibleLines).map((item, i) => {
          const accent = accentColors[item.accent] || accentColors.info;
          return (
            <div key={i} className="flex items-start gap-3 px-4 py-3 animate-slide-in" style={{ backgroundColor: accent.bg }}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent.dot }} />
              <span className="text-sm leading-relaxed" style={{ color: PX.textPrimary }}>{item.text}</span>
            </div>
          );
        })}
        {visibleLines < summaryItems.length && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: PX.textMuted }} />
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: PX.textMuted, animationDelay: '0.2s' }} />
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: PX.textMuted, animationDelay: '0.4s' }} />
            </div>
            <span className="text-[11px]" style={{ color: PX.textMuted }}>Analyzing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border p-5" style={{ borderColor: PX.skelBase, backgroundColor: PX.skelShimmer }}>
            <div className="h-1 animate-pulse rounded-full" style={{ backgroundColor: PX.skelBase }} />
            <div className="mt-5 h-4 w-24 animate-pulse rounded-full" style={{ backgroundColor: PX.skelBase }} />
            <div className="mt-5 h-10 animate-pulse rounded-full" style={{ backgroundColor: PX.skelBase }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Mini-Chart (SVG)
// ---------------------------------------------------------------------------
function EvidenceMiniChart({ data, height = 120, patientScore }: {
  data: CohortTimepointStats[];
  height?: number;
  patientScore?: number;
}) {
  const width = 320;
  const pad = { top: 16, right: 20, bottom: 24, left: 20 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const baselineMean = data[0]?.mean ?? 0;
  const improvements = data.map(d => d.timepoint === 'baseline' ? 0 : ((baselineMean - d.mean) / baselineMean) * 100);
  const maxImpr = Math.max(...improvements, 10) * 1.15;

  const x = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
  const y = (pct: number) => pad.top + plotH - (pct / maxImpr) * plotH;

  // CI band path
  const ciUpper = data.map((d, i) => {
    const impr = d.timepoint === 'baseline' ? 0 : ((baselineMean - d.ci95Lower) / baselineMean) * 100;
    return `${x(i)},${y(impr)}`;
  });
  const ciLower = data.map((d, i) => {
    const impr = d.timepoint === 'baseline' ? 0 : ((baselineMean - d.ci95Upper) / baselineMean) * 100;
    return `${x(i)},${y(impr)}`;
  }).reverse();
  const ciPath = `M${ciUpper.join(' L')} L${ciLower.join(' L')} Z`;

  const linePoints = improvements.map((pct, i) => `${x(i)},${y(pct)}`).join(' ');

  const patientImpr = patientScore !== undefined && baselineMean > 0
    ? ((baselineMean - patientScore) / baselineMean) * 100 : null;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} style={{ overflow: 'visible' }}>
      <path d={ciPath} fill={PX.teal} opacity={0.08} />
      <polyline points={linePoints} fill="none" stroke={PX.teal} strokeWidth={2} />
      {improvements.map((pct, i) => (
        <circle key={i} cx={x(i)} cy={y(pct)} r={4} fill={PX.teal} stroke="white" strokeWidth={1.5} />
      ))}
      {patientImpr !== null && (
        <circle cx={x(3)} cy={y(patientImpr)} r={5} fill={PX.coral} stroke="white" strokeWidth={2}
          style={{ animation: 'evidenceDotFade 0.5s ease-out' }} />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Evidence Full Chart (SVG) -- larger trajectory chart for Outcomes tab
// ---------------------------------------------------------------------------
function EvidenceFullChart({ data, height = 240 }: {
  data: CohortTimepointStats[];
  height?: number;
}) {
  const width = 500;
  const pad = { top: 20, right: 30, bottom: 48, left: 45 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const baselineMean = data[0]?.mean ?? 0;
  const improvements = data.map(d => d.timepoint === 'baseline' ? 0 : ((baselineMean - d.mean) / baselineMean) * 100);
  const maxImpr = Math.ceil(Math.max(...improvements, 10) / 5) * 5 + 5;
  const tpLabels = ['Baseline', '30d', '60d', '90d'];

  const x = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
  const y = (pct: number) => pad.top + plotH - (pct / maxImpr) * plotH;

  const ciUpper = data.map((d, i) => {
    const impr = d.timepoint === 'baseline' ? 0 : ((baselineMean - d.ci95Lower) / baselineMean) * 100;
    return `${x(i)},${y(Math.max(impr, 0))}`;
  });
  const ciLower = data.map((d, i) => {
    const impr = d.timepoint === 'baseline' ? 0 : ((baselineMean - d.ci95Upper) / baselineMean) * 100;
    return `${x(i)},${y(Math.max(impr, 0))}`;
  }).reverse();
  const ciPath = `M${ciUpper.join(' L')} L${ciLower.join(' L')} Z`;
  const linePoints = improvements.map((pct, i) => `${x(i)},${y(pct)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      {/* Y-axis grid lines */}
      {Array.from({ length: Math.floor(maxImpr / 10) + 1 }, (_, i) => i * 10).map(pct => (
        <g key={pct}>
          <line x1={pad.left} y1={y(pct)} x2={width - pad.right} y2={y(pct)} stroke={PX.cardBorder} strokeWidth={0.5} />
          <text x={pad.left - 8} y={y(pct) + 3} textAnchor="end" fontSize={9} fill={PX.textMuted}>{pct}%</text>
        </g>
      ))}
      <text x={12} y={pad.top + plotH / 2} textAnchor="middle" fontSize={9} fill={PX.textMuted} transform={`rotate(-90, 12, ${pad.top + plotH / 2})`}>% Improvement</text>
      <path d={ciPath} fill={PX.teal} opacity={0.08} />
      <polyline points={linePoints} fill="none" stroke={PX.teal} strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.timepoint}>
          <circle cx={x(i)} cy={y(improvements[i])} r={5} fill={PX.teal} stroke="white" strokeWidth={2} />
          {i > 0 && <text x={x(i)} y={y(improvements[i]) - 12} textAnchor="middle" fontSize={11} fontWeight="bold" fill={PX.navy}>{improvements[i].toFixed(0)}%</text>}
          <text x={x(i)} y={pad.top + plotH + 16} textAnchor="middle" fontSize={10} fill={PX.textSecondary}>{tpLabels[i]}</text>
          <text x={x(i)} y={pad.top + plotH + 30} textAnchor="middle" fontSize={8} fill={PX.textMuted}>n={d.n}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// MAIN DASHBOARD
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { brand } = useBrand();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('agent-storyboard');
  const [complianceChecks, setComplianceChecks] = useState<Record<string, boolean>>({});
  const toggleCompliance = (key: string) => setComplianceChecks(prev => ({ ...prev, [key]: !prev[key] }));
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [signals, setSignals] = useState<ContactSignalFeed[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [outreachToast, setOutreachToast] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<AgentType | 'all'>('all');
  const [taFilter, setTaFilter] = useState<TherapeuticArea | 'all'>('all');
  const [perfCampaign, setPerfCampaign] = useState<TherapeuticArea | 'all'>('all');

  // ---- MSL Follow-Up Requests ----
  const [mslFollowUps, setMslFollowUps] = useState<MSLFollowUpRequest[]>([]);

  // ---- Interaction Data sub-tab ----
  const [interactionSubTab, setInteractionSubTab] = useState<'call-log' | 'queue'>('call-log');

  // ---- Medical Intelligence sub-tab ----
  const [medIntelSubTab, setMedIntelSubTab] = useState<'overview' | 'safety' | 'msl' | 'liaison' | 'competitive-intel'>('overview');

  // ---- Agent Config state ----
  const [personas, setPersonas] = useState<Record<AgentType, AgentPersona> | null>(null);
  const [configAgent, setConfigAgent] = useState<AgentType>('patient-support');
  const [configScenario, setConfigScenario] = useState('');
  const [configPhone, setConfigPhone] = useState('+1');
  const [demoCallStatus, setDemoCallStatus] = useState<string | null>(null);
  const [liveContactName, setLiveContactName] = useState('');
  const [liveCallSid, setLiveCallSid] = useState<string | null>(null);
  const [liveCallStatus, setLiveCallStatus] = useState<string | null>(null);
  const [liveCallResult, setLiveCallResult] = useState<{ outcome?: string; summary?: string; duration?: number } | null>(null);

  // ---- Storyboard state ----
  const [storyStep, setStoryStep] = useState(0);
  const [storyAutoPlay, setStoryAutoPlay] = useState(false);
  const [dataDropPhase, setDataDropPhase] = useState(0);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [callLogHighlight, setCallLogHighlight] = useState(false);
  const [sliderAnimated, setSliderAnimated] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ---- Agent Config interactive state ----
  const [activeGuardrails, setActiveGuardrails] = useState<Record<AgentType, string[]>>({
    'patient-support': [...AGENT_GUARDRAILS['patient-support'].active],
    'hcp-support': [...AGENT_GUARDRAILS['hcp-support'].active],
    'hcp-outbound': [...AGENT_GUARDRAILS['hcp-outbound'].active],
    'medcomms-qa': [...AGENT_GUARDRAILS['medcomms-qa'].active],
  });
  const [activeEscalations, setActiveEscalations] = useState<Record<AgentType, string[]>>({
    'patient-support': [...AGENT_ESCALATIONS['patient-support'].active],
    'hcp-support': [...AGENT_ESCALATIONS['hcp-support'].active],
    'hcp-outbound': [...AGENT_ESCALATIONS['hcp-outbound'].active],
    'medcomms-qa': [...AGENT_ESCALATIONS['medcomms-qa'].active],
  });
  const [selectedPreset, setSelectedPreset] = useState<Record<AgentType, number>>({
    'patient-support': 0,
    'hcp-support': 0,
    'hcp-outbound': 0,
    'medcomms-qa': 0,
  });
  const [presetSliders, setPresetSliders] = useState<Record<AgentType, { warmth: number; empathy: number; clinicalDepth: number; formality: number }>>({
    'patient-support': { ...PERSONALITY_PRESETS['patient-support'][0] },
    'hcp-support': { ...PERSONALITY_PRESETS['hcp-support'][0] },
    'hcp-outbound': { ...PERSONALITY_PRESETS['hcp-outbound'][0] },
    'medcomms-qa': { ...PERSONALITY_PRESETS['medcomms-qa'][0] },
  });
  const [agentLanguage, setAgentLanguage] = useState('en');
  const [autoDetectLang, setAutoDetectLang] = useState(true);
  const [showGuardrailInput, setShowGuardrailInput] = useState(false);
  const [showEscalationInput, setShowEscalationInput] = useState(false);
  const [customGuardrailText, setCustomGuardrailText] = useState('');
  const [customEscalationText, setCustomEscalationText] = useState('');
  const [requestToast, setRequestToast] = useState<string | null>(null);

  // ---- Brand-derived lookups ----
  const TA_LABELS: Record<string, string> = useMemo(
    () => Object.fromEntries(brand.therapeuticAreas.map(ta => {
      const prod = brand.products.find(p => p.therapeuticArea === ta.id);
      return [ta.id, prod ? `${ta.label.replace(/\s*\(.*\)/, '')} / ${prod.brandName}` : ta.label];
    })),
    [brand],
  );

  const drugBrandName = useMemo(
    () => (genericId: string) => {
      const prod = brand.products.find(p => p.id === genericId || p.genericName.toLowerCase() === genericId.toLowerCase());
      return prod?.brandName ?? genericId;
    },
    [brand],
  );

  const TA_COLORS: Record<string, string> = useMemo(
    () => Object.fromEntries(brand.therapeuticAreas.map((ta, i) => [ta.id, TA_COLOR_PALETTE[i % TA_COLOR_PALETTE.length]])),
    [brand],
  );

  // ---- Outcomes-Based Contract Simulator ----
  const [contractThreshold, setContractThreshold] = useState(30);
  const [contractRebate, setContractRebate] = useState(50);

  const contractResults = useMemo(() => {
    const patients = getPatientOutcomes();
    const eligible = patients.filter(p =>
      p.tetrasScores.baseline !== undefined && p.tetrasScores['90d'] !== undefined
    );
    const meeting = eligible.filter(p => {
      const bl = p.tetrasScores.baseline!;
      const d90 = p.tetrasScores['90d']!;
      return bl > 0 && ((bl - d90) / bl) >= contractThreshold / 100;
    });
    const pctMeeting = eligible.length > 0 ? meeting.length / eligible.length : 0;
    const rebateExposure = (1 - pctMeeting) * (contractRebate / 100);
    const confidence: 'HIGH' | 'MODERATE' | 'LOW' = pctMeeting > 0.7 ? 'HIGH' : pctMeeting > 0.5 ? 'MODERATE' : 'LOW';
    return {
      eligible: eligible.length,
      meeting: meeting.length,
      notMeeting: eligible.length - meeting.length,
      pctMeeting,
      rebateExposure,
      confidence,
      dropped: patients.length - eligible.length,
    };
  }, [contractThreshold, contractRebate]);

  // -- Auth check --
  useEffect(() => {
    fetch('/api/auth/check')
      .then((res) => { if (!res.ok) router.push('/'); else setAuthed(true); })
      .catch(() => router.push('/'));
  }, [router]);

  // -- Fetch analytics --
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch('/api/analytics?period=all');
      if (!res.ok) throw new Error();
      const data: AnalyticsResponse = await res.json();
      setAnalytics(data);
    } catch { setAnalytics(null); }
    finally { setLoadingAnalytics(false); }
  }, []);

  // -- Fetch calls --
  const fetchCalls = useCallback(async () => {
    setLoadingCalls(true);
    try {
      const res = await fetch('/api/calls?limit=100');
      if (!res.ok) throw new Error();
      const data: { calls: CallRecord[] } = await res.json();
      setCalls(data.calls);
      // Build signals from calls
      const sigFeed: ContactSignalFeed[] = data.calls
        .flatMap((c: CallRecord, ci: number) =>
          c.behavioralSignals.slice(0, 1).map((sig, si) => ({
            id: `feed-${ci}-${si}`,
            contactIdAnon: `${c.contactType === 'patient' ? 'Patient' : 'HCP'} -- ${c.contactId}`,
            signalType: sig.category,
            detectedBehavior: sig.detail,
            recommendedAction: sig.clinicalImplication,
            urgency: c.urgency,
            supportPathway: c.supportPathway,
            therapeuticArea: c.therapeuticArea,
            timestamp: sig.timestamp,
            status: (ci < 3 ? 'new' : ci < 8 ? 'queued' : ci < 14 ? 'in-progress' : 'completed') as ContactSignalFeed['status'],
          })),
        )
        .slice(0, 15);
      setSignals(sigFeed);
    } catch { setCalls([]); setSignals([]); }
    finally { setLoadingCalls(false); }
  }, []);

  // -- Fetch contacts --
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error();
      const data: { contacts: ContactRecord[] } = await res.json();
      setContacts(data.contacts);
    } catch { setContacts([]); }
    finally { setLoadingContacts(false); }
  }, []);

  // -- Fetch personas --
  const fetchPersonas = useCallback(async () => {
    try {
      const res = await fetch(`/api/persona?brandId=${encodeURIComponent(brand.id)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPersonas(data as Record<AgentType, AgentPersona>);
    } catch { /* ignore */ }
  }, [brand.id]);

  // -- Fetch MSL follow-up requests --
  const fetchMSLFollowUps = useCallback(async () => {
    try {
      const res = await fetch(`/api/msl-followups?brandId=${encodeURIComponent(brand.id)}`);
      if (!res.ok) throw new Error();
      const data: { requests: MSLFollowUpRequest[] } = await res.json();
      setMslFollowUps(data.requests);
    } catch { setMslFollowUps([]); }
  }, [brand.id]);

  const loadDashboard = useCallback(async () => {
    await Promise.all([fetchAnalytics(), fetchCalls(), fetchContacts(), fetchPersonas(), fetchMSLFollowUps()]);
  }, [fetchAnalytics, fetchCalls, fetchContacts, fetchPersonas, fetchMSLFollowUps]);

  useEffect(() => {
    if (authed) void loadDashboard();
  }, [authed, loadDashboard]);

  // Polling
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => {
      void fetchCalls();
      void fetchAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, [authed, fetchCalls, fetchAnalytics]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  function handleInitiateOutreach(contactId: string) {
    setOutreachToast(contactId);
    window.setTimeout(() => setOutreachToast(null), 4000);
  }

  async function handleDemoCall() {
    if (!configPhone || !configScenario) return;
    setDemoCallStatus('Initiating...');
    try {
      const res = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: configPhone, scenarioId: configScenario, agentType: configAgent, brandId: brand.id }),
      });
      const data = await res.json();
      setDemoCallStatus(data.status === 'simulated' ? 'Simulated (backend offline)' : data.status === 'error' ? `Error: ${data.message}` : 'Call initiated!');
    } catch {
      setDemoCallStatus('Error connecting to backend');
    }
    setTimeout(() => setDemoCallStatus(null), 5000);
  }

  function isValidUSPhone(phone: string): boolean {
    return /^\+1[2-9]\d{9}$/.test(phone) && !/^\+1(900|976)/.test(phone);
  }

  async function handleLiveCall() {
    if (!isValidUSPhone(configPhone) || !configScenario || liveCallSid) return;
    setLiveCallResult(null);
    setLiveCallStatus(null);
    setDemoCallStatus('Initiating...');
    try {
      const res = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: configPhone,
          scenarioId: configScenario,
          agentType: configAgent,
          brandId: brand.id,
          ...(liveContactName.trim() ? { contactName: liveContactName.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (data.callSid) {
        setLiveCallSid(data.callSid);
        setDemoCallStatus(null);
      } else if (data.status === 'simulated') {
        setDemoCallStatus('Simulated (backend offline)');
        setTimeout(() => setDemoCallStatus(null), 5000);
      } else if (data.status === 'error') {
        setDemoCallStatus(`Error: ${data.message}`);
        setTimeout(() => setDemoCallStatus(null), 5000);
      } else {
        setDemoCallStatus('Call initiated');
        setTimeout(() => setDemoCallStatus(null), 5000);
      }
    } catch {
      setDemoCallStatus('Error connecting to backend');
      setTimeout(() => setDemoCallStatus(null), 5000);
    }
  }

  // -- Filtered calls --
  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (agentFilter !== 'all' && c.agentType !== agentFilter) return false;
      if (taFilter !== 'all' && c.therapeuticArea !== taFilter) return false;
      return true;
    });
  }, [calls, agentFilter, taFilter]);

  // -- Funnel --
  const funnel = useMemo(() => {
    const total = filteredCalls.length;
    const engaged = filteredCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail' && c.outcome !== 'declined').length;
    const converted = filteredCalls.filter(c => (CONVERSION_OUTCOMES as string[]).includes(c.outcome)).length;
    return { signalsDetected: Math.round(total * 1.3), outreachInitiated: total, engaged, converted };
  }, [filteredCalls]);

  // -- Pathway stats --
  const pathwayStats = useMemo(() => {
    const ids: SupportPathwayId[] = ['hub-enrollment', 'copay-assistance', 'ae-reporting', 'adherence-support', 'sample-request', 'medical-inquiry'];
    return ids.map(id => {
      const pc = filteredCalls.filter(c => c.supportPathway === id);
      return { id, count: pc.length, converted: pc.filter(c => !['no-answer', 'voicemail', 'declined'].includes(c.outcome)).length };
    });
  }, [filteredCalls]);

  // -- Selected call for detail --
  const selectedCall = useMemo(() => selectedCallId ? calls.find(c => c.id === selectedCallId) : null, [selectedCallId, calls]);

  // Badge counts
  const openMslFollowUps = mslFollowUps.filter(r => r.status !== 'completed').length;
  const badgeData = { calls: calls.length, contacts: contacts.length, signals: signals.length, mslFollowUps: openMslFollowUps };
  const loading = loadingAnalytics;

  // Demo scenarios — derived from brand pack
  const demoScenarios = useMemo(
    () => getDemoScenarios(brand) as Record<AgentType, Array<{ id: string; label: string; description: string }>>,
    [brand],
  );

  // -- Storyboard derived data --
  const storyData = useMemo(() => {
    const agentContactMap: Record<AgentType, 'patient' | 'hcp'> = {
      'patient-support': 'patient',
      'hcp-support': 'hcp',
      'hcp-outbound': 'hcp',
      'medcomms-qa': 'patient',
    };
    const targetType = agentContactMap[configAgent];
    const contact = contacts
      .filter(c => c.contactType === targetType)
      .sort((a, b) => b.priorityScore - a.priorityScore)[0] || contacts[0];
    const call = calls.find(c => c.contactId === contact?.contactId)
      || calls.find(c => c.agentType === configAgent)
      || calls[0];
    return { contact: contact || null, call: call || null };
  }, [configAgent, contacts, calls]);

  const storyDataDropItems = useMemo(() => {
    const c = storyData.contact;
    if (!c) return [];
    if (c.contactType === 'patient') {
      return [
        { label: 'Patient Demographics', value: `${c.name}, Age ${c.age}, ${c.gender}` },
        { label: 'Diagnosis & Therapeutic Area', value: `${c.diagnosis || 'N/A'} — ${TA_LABELS[c.therapeuticArea]}` },
        { label: 'Current Medications', value: (c.currentMedications || []).join(', ') || 'None listed' },
        { label: 'Insurance & Coverage', value: c.insurancePlan || 'N/A' },
        { label: 'Behavioral Signals', value: c.behavioralSignals.map(s => s.detail).slice(0, 2).join('; ') },
        { label: 'Recommended Pathway', value: PATHWAY_LABELS[c.recommendedPathway] },
        { label: 'Priority Assessment', value: `${c.priorityTier} (Score: ${c.priorityScore})` },
      ];
    }
    return [
      { label: 'HCP Profile', value: `${c.name}, ${c.specialty?.split(' — ')[0] || 'HCP'}` },
      { label: 'Specialty & Practice', value: `${c.specialty || 'N/A'} — ${c.practiceLocation || 'N/A'}` },
      { label: 'Patients on Therapy', value: `${c.patientsOnTherapy || 0} patients on ${drugBrandName(c.drugProduct)}` },
      { label: 'Prescribing Patterns', value: c.behavioralSignals.find(s => s.category === 'RX_PATTERN')?.detail || 'Standard prescriber' },
      { label: 'Behavioral Signals', value: c.behavioralSignals.map(s => s.detail).slice(0, 2).join('; ') },
      { label: 'Recommended Pathway', value: PATHWAY_LABELS[c.recommendedPathway] },
      { label: 'Priority Assessment', value: `${c.priorityTier} (Score: ${c.priorityScore})` },
    ];
  }, [storyData.contact]);

  const currentCallHasScreening = useMemo(() => {
    return storyData.call?.screeningResults?.some(
      s => s.status === 'completed'
    ) ?? false;
  }, [storyData.call]);

  const storyboardSteps = useMemo(() => {
    const steps = [...BASE_STORYBOARD_STEPS];
    if (currentCallHasScreening) {
      steps.push({ id: 'evidence-capture', label: 'Evidence Capture' });
    }
    return steps;
  }, [currentCallHasScreening]);

  // ---- Evidence Capture staggered animation ----
  const [evidencePhase, setEvidencePhase] = useState(0);
  const [evidenceCounter, setEvidenceCounter] = useState(436);

  useEffect(() => {
    if (storyStep !== storyboardSteps.length - 1 || !currentCallHasScreening) {
      setEvidencePhase(0);
      setEvidenceCounter(436);
      return;
    }
    const timers = [
      setTimeout(() => setEvidencePhase(1), 0),
      setTimeout(() => setEvidencePhase(2), 800),
      setTimeout(() => setEvidencePhase(3), 1500),
      setTimeout(() => { setEvidencePhase(4); setEvidenceCounter(437); }, 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [storyStep, currentCallHasScreening, storyboardSteps.length]);

  // Reset storyboard on agent type change — skip animation, show data instantly
  useEffect(() => {
    setStoryStep(0);
    setConversationIndex(0);
    setCallLogHighlight(false);
    setStoryAutoPlay(false);
    setSliderAnimated(false);
    // Show all data items immediately on agent switch (no re-animation)
    setDataDropPhase(999);
  }, [configAgent]);

  // Data drop animation (step 0) — only animate on explicit reset/auto-play, not agent switch
  const dataDropAnimateRef = useRef(false);
  useEffect(() => {
    if (storyStep !== 0 || storyDataDropItems.length === 0) return;
    // If dataDropPhase is already >= items count, data is loaded — skip animation
    if (dataDropPhase >= storyDataDropItems.length) return;
    // Only animate if explicitly triggered (phase was reset to 0 by Reset button or auto-play)
    if (dataDropPhase !== 0) return;
    let phase = 0;
    const timer = setInterval(() => {
      phase++;
      setDataDropPhase(phase);
      if (phase >= storyDataDropItems.length) clearInterval(timer);
    }, 80);
    return () => clearInterval(timer);
  }, [storyStep, storyDataDropItems.length, dataDropPhase]);

  // Slider animation (step 1)
  useEffect(() => {
    if (storyStep !== 1) { setSliderAnimated(false); return; }
    const timer = setTimeout(() => setSliderAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [storyStep]);

  // Conversation reveal (step 2)
  useEffect(() => {
    if (storyStep !== 2 || !storyData.call) return;
    setConversationIndex(0);
    const total = storyData.call.transcript.length;
    if (total === 0) return;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setConversationIndex(idx);
      if (idx >= total) clearInterval(timer);
    }, 800);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyStep, storyData.call?.id]);

  // Auto-scroll conversation
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversationIndex]);

  // Call log highlight (step 4)
  useEffect(() => {
    if (storyStep !== 4) return;
    setCallLogHighlight(true);
    const timer = setTimeout(() => setCallLogHighlight(false), 2000);
    return () => clearTimeout(timer);
  }, [storyStep]);

  // Auto-play advancement
  useEffect(() => {
    if (!storyAutoPlay) return;
    const durations = [
      storyDataDropItems.length * 120 + 500,
      1500,
      (storyData.call?.transcript.length || 8) * 800 + 1000,
      2000,
      1500,
      ...(currentCallHasScreening ? [4000] : []),
    ];
    const timer = setTimeout(() => {
      if (storyStep < storyboardSteps.length - 1) {
        setStoryStep(s => s + 1);
      } else {
        setStoryAutoPlay(false);
      }
    }, durations[storyStep]);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyAutoPlay, storyStep, storyDataDropItems.length]);

  // -- Live call status polling --
  useEffect(() => {
    if (!liveCallSid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/call-status?callSid=${encodeURIComponent(liveCallSid)}`);
        if (res.ok) {
          const data = await res.json();
          setLiveCallStatus(data.status);
          if (['completed', 'failed', 'no-answer', 'busy', 'canceled'].includes(data.status)) {
            setLiveCallResult({ outcome: data.outcome, summary: data.summary, duration: data.duration });
            setLiveCallSid(null);
          }
        }
      } catch {
        // Silently ignore polling errors — will retry on next interval
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [liveCallSid]);

  // -- Auth loading --
  if (!authed) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: PX.bg }}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="w-full max-w-md border bg-white p-8 text-center" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
            <div className="mx-auto h-14 w-14 animate-pulse" style={{ backgroundColor: PX.skelBase }} />
            <div className="mx-auto mt-6 h-6 w-48 animate-pulse rounded-full" style={{ backgroundColor: PX.skelBase }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PX.bg, color: PX.textPrimary }}>
      <style>{`
        @keyframes evidenceDotFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {/* Toast */}
      {outreachToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border px-5 py-4 shadow-lg animate-fade-in" style={{ borderColor: '#A7F3D0', backgroundColor: '#34A85310' }}>
          <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: PX.success }} />
          <div className="text-sm font-semibold" style={{ color: PX.success }}>Engagement initiated for {outreachToast}</div>
          <button onClick={() => setOutreachToast(null)} className="ml-2 text-xs font-semibold uppercase" style={{ color: PX.success }}>Dismiss</button>
        </div>
      )}

      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6" style={{ backgroundColor: PX.navy }}>
        <div className="flex items-center gap-3">
          <img src={brand.logoAsset} alt={brand.shortName} className="h-7" />
          <span className="mx-1 text-white/30">|</span>
          <span className="text-[13px] font-bold text-white/90">{brand.shortName}</span>
          <span className="text-[12px] text-white/50">{brand.tagline}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: PX.success }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: PX.success }} />
            </span>
            <span className="text-[13px] text-white/90">Vi Agents Online</span>
          </div>
          <span className="text-[13px] text-white/60">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <button onClick={handleLogout} className="px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white">Log Out</button>
        </div>
      </header>

      {/* ========== TAB NAVIGATION ========== */}
      <nav className="sticky top-16 z-20 bg-white" style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
        <div className="flex items-center gap-0 px-6">
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = tab.getBadge(badgeData);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn('relative px-5 py-3 text-[13px] font-medium transition-all duration-150', isActive ? '' : 'hover:text-[#334155]')}
                style={{
                  color: isActive ? PX.navy : PX.textSecondary,
                  borderBottom: isActive ? `2px solid ${PX.teal}` : '2px solid transparent',
                }}
              >
                {tab.label}
                {badge && (
                  <span className="ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{
                    backgroundColor: isActive ? `${PX.navy}10` : `${PX.textMuted}15`,
                    color: isActive ? PX.navy : PX.textMuted,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========== TAB CONTENT ========== */}
      <main className="mx-auto max-w-[1440px] px-6 py-6">

        {/* ---- INTERACTION DATA TAB ---- */}
        {activeTab === 'interaction-data' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tab description + inline filters */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm" style={{ color: PX.textSecondary }}>
                Every agent interaction produces structured data — KPIs, call log, outcomes, AE flags, and the behavioral signals that triggered each engagement.
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value as AgentType | 'all')}
                  className="border px-2 py-1 text-xs" style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
                >
                  <option value="all">All Agents</option>
                  <option value="patient-support">Patient Support</option>
                  <option value="hcp-support">HCP Support</option>
                  <option value="hcp-outbound">HCP Outbound</option>
                  <option value="medcomms-qa">MedComms QA</option>
                </select>
                <select
                  value={taFilter}
                  onChange={(e) => setTaFilter(e.target.value as TherapeuticArea | 'all')}
                  className="border px-2 py-1 text-xs" style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
                >
                  <option value="all">All Areas</option>
                  {brand.therapeuticAreas.map(ta => (
                    <option key={ta.id} value={ta.id}>{TA_LABELS[ta.id] ?? ta.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {loading ? <OverviewSkeleton /> : analytics ? (() => {
              // ---------- Compute pharma-relevant KPIs from filteredCalls ----------
              const connectedCalls = filteredCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail');
              const convertedCalls = connectedCalls.filter(c => (CONVERSION_OUTCOMES as string[]).includes(c.outcome));
              const conversionRate = connectedCalls.length > 0 ? (convertedCalls.length / connectedCalls.length) * 100 : 0;
              const aeCalls = filteredCalls.filter(c => c.aeDetected);
              const aeCaptureRate = filteredCalls.length > 0 ? (aeCalls.length / filteredCalls.length) * 100 : 0;
              const patientCalls = filteredCalls.filter(c => c.contactType === 'patient');
              const hubEnrolledCalls = patientCalls.filter(c => c.outcome === 'hub-enrolled');
              const hubEnrollRate = patientCalls.length > 0 ? (hubEnrolledCalls.length / patientCalls.length) * 100 : 0;
              const avgHandleTimeSec = filteredCalls.length > 0 ? filteredCalls.reduce((sum, c) => sum + c.duration, 0) / filteredCalls.length : 0;
              const avgHandleTimeMin = avgHandleTimeSec / 60;
              const connectRate = filteredCalls.length > 0 ? (connectedCalls.length / filteredCalls.length) * 100 : 0;
              const uniquePatients = new Set(filteredCalls.filter(c => c.contactType === 'patient').map(c => c.contactId)).size;
              const uniqueHCPs = new Set(filteredCalls.filter(c => c.contactType === 'hcp').map(c => c.contactId)).size;
              const smsCalls = connectedCalls.filter(c => c.smsSent);
              const smsFollowUpRate = connectedCalls.length > 0 ? (smsCalls.length / connectedCalls.length) * 100 : 0;

              return (
              <>
                {/* KPI Summary — 2 rows of 4 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Key Performance Indicators</div>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: PX.teal, backgroundColor: `${PX.teal}1A` }}>Vi Operate</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KPICard label="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} color={PX.teal} sub={`${convertedCalls.length} / ${connectedCalls.length} connected`} />
                    <KPICard label="AE Capture Rate" value={`${aeCaptureRate.toFixed(1)}%`} color={PX.coral} sub={`${aeCalls.length} AEs from ${filteredCalls.length} calls`} />
                    <KPICard label="Hub Enrollment Rate" value={`${hubEnrollRate.toFixed(1)}%`} color={PX.teal} sub={`${hubEnrolledCalls.length} / ${patientCalls.length} patient calls`} />
                    <KPICard label="Avg Handle Time" value={`${avgHandleTimeMin.toFixed(1)}m`} color={PX.navy} sub={fmtDuration(Math.round(avgHandleTimeSec))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-3">
                    <KPICard label="Connect Rate" value={`${connectRate.toFixed(1)}%`} color={PX.navy} sub={`${connectedCalls.length} / ${filteredCalls.length} attempts`} />
                    <KPICard label="Patient Reach" value={uniquePatients} color={PX.teal} sub="unique patients contacted" />
                    <KPICard label="HCP Engagement" value={uniqueHCPs} color={PX.blue} sub="unique HCPs engaged" />
                    <KPICard label="SMS Follow-Up Rate" value={`${smsFollowUpRate.toFixed(1)}%`} color={PX.accent} sub={`${smsCalls.length} / ${connectedCalls.length} connected`} />
                  </div>
                </div>

                {/* Sub-tab navigation + 2-column layout */}
                <div className="flex gap-6 flex-col lg:flex-row">
                  {/* Left column — Call Log / Contact Queue (2/3 on desktop) */}
                  <div className="flex-1 lg:w-2/3 min-w-0">
                    {/* Sub-tab pills */}
                    <div className="flex items-center gap-2 mb-4">
                      {([
                        { id: 'call-log' as const, label: 'Call Log', count: filteredCalls.length },
                        { id: 'queue' as const, label: 'Contact Queue', count: contacts.length },
                      ]).map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setInteractionSubTab(sub.id)}
                          className="px-4 py-1.5 text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: interactionSubTab === sub.id ? PX.navy : 'transparent',
                            color: interactionSubTab === sub.id ? '#FFFFFF' : PX.textSecondary,
                            border: `1px solid ${interactionSubTab === sub.id ? PX.navy : PX.cardBorder}`,
                          }}
                        >
                          {sub.label}
                          <span className="ml-1.5 text-[10px] opacity-70">{sub.count}</span>
                        </button>
                      ))}
                    </div>

                    {/* Sub-tab content */}
                    {interactionSubTab === 'call-log' && (
                      <div className="border bg-white" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                        <div className="px-6 py-4 border-b" style={{ borderColor: PX.cardBorder }}>
                          <div className="text-sm font-bold" style={{ color: PX.navy }}>Call Log</div>
                          <div className="text-xs" style={{ color: PX.textMuted }}>{filteredCalls.length} interactions</div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                                {['Contact', 'Agent', 'TA', 'Pathway', 'Outcome', 'AE', 'Duration', 'Time'].map((h) => (
                                  <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {loadingCalls ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                  <tr key={i}>
                                    <td colSpan={8} className="px-4 py-3">
                                      <div className="h-8 animate-pulse" style={{ backgroundColor: PX.skelShimmer }} />
                                    </td>
                                  </tr>
                                ))
                              ) : filteredCalls.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: PX.textMuted }}>No calls found</td>
                                </tr>
                              ) : (
                                filteredCalls.map((call) => {
                                  const agentConf = AGENT_TYPE_LABELS[call.agentType];
                                  const outcomeColor = OUTCOME_COLORS[call.outcome] || PX.textMuted;
                                  return (
                                    <tr
                                      key={call.id}
                                      className="cursor-pointer transition-colors hover:bg-[#F8FAFC]"
                                      style={{ borderBottom: `1px solid ${PX.cardBorder}` }}
                                      onClick={() => setSelectedCallId(call.id)}
                                    >
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: call.contactType === 'patient' ? PX.teal : PX.navy }}>
                                            {initials(call.contactName)}
                                          </div>
                                          <div>
                                            <div className="text-xs font-semibold" style={{ color: PX.navy }}>{call.contactName}</div>
                                            <div className="text-[10px]" style={{ color: PX.textMuted }}>{call.contactType === 'patient' ? 'Patient' : 'HCP'}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: agentConf.color, backgroundColor: `${agentConf.color}12` }}>
                                          {agentConf.label}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-[10px] font-semibold" style={{ color: TA_COLORS[call.therapeuticArea] }}>
                                          {TA_LABELS[call.therapeuticArea]}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: PATHWAY_COLORS[call.supportPathway] }}>
                                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PATHWAY_COLORS[call.supportPathway] }} />
                                          {PATHWAY_LABELS[call.supportPathway]}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: outcomeColor, backgroundColor: `${outcomeColor}12` }}>
                                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: outcomeColor }} />
                                          {OUTCOME_LABELS[call.outcome] || call.outcome}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        {call.aeDetected && (
                                          <span className="inline-flex rounded-full bg-[#FF7D7810] px-2 py-0.5 text-[10px] font-bold text-[#FF7D78] border border-[#FF7D7830]">AE</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-xs" style={{ color: PX.textPrimary }}>{fmtDuration(call.duration)}</td>
                                      <td className="px-4 py-3">
                                        <div className="text-xs" style={{ color: PX.textPrimary }}>{fmtTime(call.timestamp)}</div>
                                        <div className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(call.timestamp)}</div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {interactionSubTab === 'queue' && (
                      <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Contact Engagement Queue</div>
                            <p className="mt-1 text-sm" style={{ color: PX.textPrimary }}>Patients and HCPs ranked by priority score.</p>
                          </div>
                          <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ color: PX.error, backgroundColor: '#FF7D7810' }}>
                            {contacts.filter(c => c.priorityTier === 'HIGH').length} HIGH
                          </span>
                        </div>
                        {loadingContacts ? (
                          <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="h-16 animate-pulse" style={{ backgroundColor: PX.skelShimmer }} />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {contacts.slice(0, 8).map((c) => (
                              <div key={c.contactId} className="relative">
                                <ContactRow contact={c} onInitiate={handleInitiateOutreach} taLabels={TA_LABELS} taColors={TA_COLORS} />
                                {/* Vi Pulse attribution badge */}
                                <span
                                  className="absolute top-1.5 right-16 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5"
                                  style={{ color: PX.accent, backgroundColor: `${PX.accent}1A` }}
                                >
                                  Vi Pulse
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right sidebar — Triggering Signals (1/3 on desktop) */}
                  <div className="lg:w-1/3 shrink-0">
                    <div className="border bg-white" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="px-5 py-4 border-b" style={{ borderColor: PX.cardBorder }}>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold" style={{ color: PX.navy }}>Triggering Signals</div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: PX.success }} />
                            <span className="text-[10px] font-medium" style={{ color: PX.success }}>Live</span>
                          </div>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: PX.textMuted }}>{signals.length} signals detected</div>
                      </div>
                      <div className="overflow-y-auto px-4 py-3 space-y-2.5" style={{ maxHeight: '600px' }}>
                        {signals.map((sig) => {
                          const sigColor = SIGNAL_COLORS[sig.signalType] || PX.textMuted;
                          const statusColors: Record<string, { text: string; bg: string }> = {
                            new: { text: PX.error, bg: '#FF7D7810' },
                            queued: { text: PX.warning, bg: '#DE7D0010' },
                            'in-progress': { text: PX.teal, bg: '#E0F7FA' },
                            completed: { text: PX.success, bg: '#34A85310' },
                          };
                          const sc = statusColors[sig.status] || statusColors.completed;
                          return (
                            <div key={sig.id} className="flex items-start gap-3 border px-4 py-3" style={{ borderColor: PX.cardBorder }}>
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sigColor }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="text-[9px] font-bold uppercase" style={{ color: sigColor }}>{SIGNAL_LABELS[sig.signalType] || sig.signalType}</span>
                                  <span className="text-[9px] font-semibold" style={{ color: TA_COLORS[sig.therapeuticArea] }}>{TA_LABELS[sig.therapeuticArea]}</span>
                                  <span className="inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: sc.text, backgroundColor: sc.bg }}>{sig.status}</span>
                                  {/* Vi DataWeb attribution badge */}
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: PX.navy, backgroundColor: `${PX.navy}1A` }}>Vi DataWeb</span>
                                </div>
                                <div className="text-[11px] leading-snug" style={{ color: PX.textPrimary }}>{sig.detectedBehavior}</div>
                                <div className="mt-0.5 text-[10px]" style={{ color: PX.textSecondary }}>{sig.recommendedAction}</div>
                                <div className="mt-0.5 flex items-center justify-between">
                                  <span className="text-[9px]" style={{ color: PX.textMuted }}>{sig.contactIdAnon}</span>
                                  <span className="text-[9px]" style={{ color: PX.textMuted }}>{fmtDate(sig.timestamp)}</span>
                                </div>
                                {PATIENT_FACING_ONLY_SIGNALS.has(sig.signalType) && (
                                  <span className="mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: PX.warning, backgroundColor: '#DE7D0010', border: '1px solid #FDE68A' }}>
                                    Patient-facing only
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
              );
            })() : (
              <div className="border bg-white px-6 py-16 text-center" style={{ borderColor: PX.cardBorder }}>
                <div className="text-xl font-semibold" style={{ color: PX.textPrimary }}>Dashboard data could not load</div>
                <button onClick={() => void loadDashboard()} className="mt-6 px-5 py-3 text-xs font-semibold text-white" style={{ backgroundColor: PX.btnDark }}>Retry</button>
              </div>
            )}
          </div>
        )}

        {/* ---- MEDICAL INTELLIGENCE TAB ---- */}
        {activeTab === 'medical-intelligence' && (
          <div className="space-y-6 animate-fade-in">
            {/* Tab description */}
            <div>
              <p className="text-sm" style={{ color: PX.textSecondary }}>
                Post-call intelligence for medical affairs, pharmacovigilance, and field teams. Includes AE reports requiring safety review, MSL follow-up requests, structured liaison summaries, and competitive intelligence extracted from HCP interactions.
              </p>
            </div>

            {/* Sub-tab pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { id: 'overview' as const, label: 'Overview' },
                { id: 'safety' as const, label: 'Safety / AE' },
                { id: 'msl' as const, label: 'MSL Requests' },
                { id: 'liaison' as const, label: 'Liaison Summaries' },
                { id: 'competitive-intel' as const, label: 'Competitive Intel' },
              ]).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setMedIntelSubTab(sub.id)}
                  className="px-4 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: medIntelSubTab === sub.id ? PX.navy : 'transparent',
                    color: medIntelSubTab === sub.id ? '#FFFFFF' : PX.textSecondary,
                    border: `1px solid ${medIntelSubTab === sub.id ? PX.navy : PX.cardBorder}`,
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* ===== OVERVIEW sub-tab ===== */}
            {medIntelSubTab === 'overview' && (() => {
              const aeCount = filteredCalls.filter(c => c.aeDetected).length;
              const ciCount = filteredCalls.filter(c => c.classification.competitiveIntelNotes && c.classification.competitiveIntelNotes.length > 0).length;
              const liaisonCount = filteredCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail').length;
              const positiveSentiment = filteredCalls.length > 0
                ? Math.round((filteredCalls.filter(c => c.sentiment === 'positive').length / filteredCalls.length) * 100)
                : 0;
              const recentAe = filteredCalls.filter(c => c.aeDetected).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
              const urgentMsl = mslFollowUps.filter(r => r.status !== 'completed').sort((a, b) => {
                const urg: Record<string, number> = { urgent: 0, high: 1, routine: 2, low: 3 };
                return (urg[a.urgency] ?? 9) - (urg[b.urgency] ?? 9);
              })[0];
              const recentCi = filteredCalls.filter(c => c.classification.competitiveIntelNotes && c.classification.competitiveIntelNotes.length > 0).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

              return (
                <div className="space-y-6">
                  {/* Metric cards row */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* Open AE Reports */}
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.coral }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: PX.coral, backgroundColor: `${PX.coral}18` }}>Vi Operate</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: PX.coral }}>{aeCount}</div>
                      <div className="text-[10px] font-medium mt-0.5" style={{ color: PX.textSecondary }}>Open AE Reports</div>
                    </div>
                    {/* MSL Follow-Ups Pending */}
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.teal }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: PX.teal, backgroundColor: `${PX.teal}18` }}>Vi Operate</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: PX.teal }}>{openMslFollowUps}</div>
                      <div className="text-[10px] font-medium mt-0.5" style={{ color: PX.textSecondary }}>MSL Follow-Ups Pending</div>
                    </div>
                    {/* Positive Sentiment */}
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.navy }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: PX.blue, backgroundColor: `${PX.blue}18` }}>Vi Pulse</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: PX.navy }}>{positiveSentiment}%</div>
                      <div className="text-[10px] font-medium mt-0.5" style={{ color: PX.textSecondary }}>Positive Sentiment</div>
                    </div>
                    {/* CI Signals Captured */}
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.accent }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ color: PX.accent, backgroundColor: `${PX.accent}18` }}>Vi DataWeb</span>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: PX.accent }}>{ciCount}</div>
                      <div className="text-[10px] font-medium mt-0.5" style={{ color: PX.textSecondary }}>CI Signals Captured</div>
                    </div>
                    {/* Liaison Summaries */}
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.navy }} />
                      </div>
                      <div className="text-2xl font-bold" style={{ color: PX.navy }}>{liaisonCount}</div>
                      <div className="text-[10px] font-medium mt-0.5" style={{ color: PX.textSecondary }}>Liaison Summaries</div>
                    </div>
                  </div>

                  {/* Recent Highlights */}
                  <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Recent Highlights</div>
                    <div className="space-y-3">
                      {recentAe && (
                        <div className="flex items-start gap-3 cursor-pointer hover:bg-[#F8FAFC] p-2 -mx-2 transition-colors" onClick={() => setSelectedCallId(recentAe.id)}>
                          <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: PX.coral }}>AE</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold" style={{ color: PX.coral }}>AE Report</span>
                              <span className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(recentAe.timestamp)}</span>
                            </div>
                            <div className="text-xs truncate" style={{ color: PX.textPrimary }}>
                              {recentAe.contactName} &mdash; {recentAe.classification.aeNarrative || 'Adverse event detected during interaction'}
                            </div>
                          </div>
                        </div>
                      )}
                      {urgentMsl && (
                        <div className="flex items-start gap-3 p-2 -mx-2">
                          <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: PX.teal }}>MS</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold" style={{ color: PX.teal }}>MSL Request</span>
                              <span className="inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: URGENCY_COLORS[urgentMsl.urgency]?.text || PX.textMuted, backgroundColor: URGENCY_COLORS[urgentMsl.urgency]?.bg || '#F5F5F5' }}>
                                {urgentMsl.urgency}
                              </span>
                            </div>
                            <div className="text-xs truncate" style={{ color: PX.textPrimary }}>
                              {urgentMsl.contactName} &mdash; {urgentMsl.topic}
                            </div>
                          </div>
                        </div>
                      )}
                      {recentCi && (
                        <div className="flex items-start gap-3 cursor-pointer hover:bg-[#F8FAFC] p-2 -mx-2 transition-colors" onClick={() => setSelectedCallId(recentCi.id)}>
                          <div className="h-5 w-5 shrink-0 flex items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: PX.accent }}>CI</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold" style={{ color: PX.accent }}>Competitive Intel</span>
                              <span className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(recentCi.timestamp)}</span>
                            </div>
                            <div className="text-xs truncate" style={{ color: PX.textPrimary }}>
                              {recentCi.contactName} &mdash; {recentCi.classification.competitiveIntelNotes[0]}
                            </div>
                          </div>
                        </div>
                      )}
                      {!recentAe && !urgentMsl && !recentCi && (
                        <div className="text-sm py-2" style={{ color: PX.textMuted }}>No highlights in current filter</div>
                      )}
                    </div>
                  </div>

                  {/* Compliance Monitoring */}
                  <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold mb-4" style={{ color: PX.warning }}>Compliance Monitoring</div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="border p-4" style={{ borderColor: PX.cardBorder }}>
                        <div className="text-2xl font-bold" style={{ color: PX.error }}>{aeCount}</div>
                        <div className="text-xs font-medium" style={{ color: PX.textSecondary }}>AE Reports Pending Review</div>
                      </div>
                      <div className="border p-4" style={{ borderColor: PX.cardBorder }}>
                        <div className="text-2xl font-bold" style={{ color: PX.warning }}>0</div>
                        <div className="text-xs font-medium" style={{ color: PX.textSecondary }}>Off-Label Flags</div>
                      </div>
                      <div className="border p-4" style={{ borderColor: PX.cardBorder }}>
                        <div className="text-2xl font-bold" style={{ color: PX.success }}>{liaisonCount}</div>
                        <div className="text-xs font-medium" style={{ color: PX.textSecondary }}>Compliant Interactions</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ===== SAFETY / AE sub-tab ===== */}
            {medIntelSubTab === 'safety' && (
              <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PX.error }} />
                  <div className="text-sm font-bold" style={{ color: PX.error }}>AE Reports Requiring Review</div>
                </div>
                {filteredCalls.filter(c => c.aeDetected).length === 0 ? (
                  <div className="text-sm py-4" style={{ color: PX.textMuted }}>No AE reports in current filter</div>
                ) : (
                  <div className="space-y-3">
                    {filteredCalls.filter(c => c.aeDetected).map((call) => (
                      <div key={call.id} className="border border-red-200 bg-red-50 p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setSelectedCallId(call.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-red-800">{call.contactName}</span>
                            <span className="text-[10px] font-bold" style={{ color: TA_COLORS[call.therapeuticArea] }}>{TA_LABELS[call.therapeuticArea]}</span>
                          </div>
                          <span className="text-xs text-red-600">{fmtDate(call.timestamp)} {fmtTime(call.timestamp)}</span>
                        </div>
                        {call.classification.aeNarrative && (
                          <div className="mt-2 text-xs text-red-700">{call.classification.aeNarrative}</div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-red-600">Agent: {AGENT_TYPE_LABELS[call.agentType].label}</span>
                          <span className="text-[10px] text-red-500">Pathway: {PATHWAY_LABELS[call.supportPathway]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== MSL REQUESTS sub-tab ===== */}
            {medIntelSubTab === 'msl' && (
              <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PX.teal }} />
                    <div className="text-sm font-bold" style={{ color: PX.navy }}>MSL Follow-Up Requests</div>
                    {openMslFollowUps > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: PX.error, backgroundColor: '#FF7D7810' }}>
                        {openMslFollowUps} open
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: PX.textMuted }}>{mslFollowUps.length} total requests</div>
                </div>
                {mslFollowUps.length === 0 ? (
                  <div className="text-sm py-4" style={{ color: PX.textMuted }}>No MSL follow-up requests</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                          {['Contact', 'Topic', 'Type', 'Urgency', 'Status', 'Assigned MSL', 'Requested'].map((h) => (
                            <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mslFollowUps.map((req) => {
                          const urgColor = URGENCY_COLORS[req.urgency] || URGENCY_COLORS.routine;
                          const statColor = MSL_STATUS_COLORS[req.status] || MSL_STATUS_COLORS.new;
                          return (
                            <tr key={req.id} style={{ borderBottom: `1px solid ${PX.cardBorder}` }} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: req.contactType === 'hcp' ? PX.navy : PX.teal }}>
                                    {initials(req.contactName)}
                                  </div>
                                  <span className="text-xs font-semibold" style={{ color: PX.navy }}>{req.contactName}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="text-xs max-w-[260px] truncate" style={{ color: PX.textPrimary }}>{req.topic}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-[10px] font-medium" style={{ color: PX.textSecondary }}>{MSL_REQUEST_TYPE_LABELS[req.requestType] || req.requestType}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: urgColor.text, backgroundColor: urgColor.bg, border: `1px solid ${urgColor.border}` }}>
                                  {req.urgency}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: statColor.text, backgroundColor: statColor.bg }}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: req.assignedMSL ? PX.textPrimary : PX.textMuted }}>
                                {req.assignedMSL || 'Unassigned'}
                              </td>
                              <td className="px-3 py-2.5 text-[10px]" style={{ color: PX.textMuted }}>
                                {fmtDate(req.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===== LIAISON SUMMARIES sub-tab ===== */}
            {medIntelSubTab === 'liaison' && (
              <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Liaison Call Summaries</div>
                <div className="space-y-4">
                  {filteredCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail').length === 0 ? (
                    <div className="text-sm py-2" style={{ color: PX.textMuted }}>No liaison summaries in current filter</div>
                  ) : (
                    filteredCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail').slice(0, 10).map((call) => (
                      <div key={call.id} className="border cursor-pointer hover:shadow-sm transition-all" style={{ borderColor: PX.cardBorder }} onClick={() => setSelectedCallId(call.id)}>
                        {/* Call Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: PX.cardBorder, backgroundColor: '#FAFAFA' }}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: call.contactType === 'patient' ? PX.teal : PX.navy }}>
                              {initials(call.contactName)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold" style={{ color: PX.navy }}>{call.contactName}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: PX.textMuted }}>{call.contactType === 'patient' ? 'Patient' : 'HCP'}</span>
                                <span className="text-[10px] font-semibold" style={{ color: TA_COLORS[call.therapeuticArea] }}>{TA_LABELS[call.therapeuticArea]}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {call.aeDetected && (
                              <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">AE</span>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: call.liaisonSummary.engagementScore >= 75 ? PX.success : call.liaisonSummary.engagementScore >= 55 ? PX.warning : PX.error, backgroundColor: call.liaisonSummary.engagementScore >= 75 ? '#34A85310' : call.liaisonSummary.engagementScore >= 55 ? '#DE7D0010' : '#FF7D7810' }}>
                              {call.liaisonSummary.engagementScore}%
                            </span>
                            <span className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(call.timestamp)} {fmtTime(call.timestamp)}</span>
                          </div>
                        </div>
                        {/* 5-Block Summary */}
                        <div className="space-y-0">
                          {/* Context */}
                          <div className="border-b px-4 py-2.5" style={{ borderColor: PX.cardBorder }}>
                            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.teal }}>Context</div>
                            <div className="text-xs mt-0.5" style={{ color: PX.textPrimary }}>{call.liaisonSummary.contextSummary}</div>
                          </div>
                          {/* What Happened */}
                          <div className="border-b px-4 py-2.5" style={{ borderColor: PX.cardBorder }}>
                            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.navy }}>What Happened</div>
                            <div className="text-xs mt-0.5" style={{ color: PX.textPrimary }}>{call.liaisonSummary.whatHappened}</div>
                          </div>
                          {/* What Changed */}
                          <div className="border-b px-4 py-2.5" style={{ borderColor: PX.cardBorder }}>
                            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.accent }}>What Changed</div>
                            <div className="text-xs mt-0.5" style={{ color: PX.textPrimary }}>{call.liaisonSummary.whatChangedSinceLastTouch}</div>
                          </div>
                          {/* Clinical Questions */}
                          {call.liaisonSummary.clinicalQuestionsRaised.length > 0 && (
                            <div className="border-b px-4 py-2.5" style={{ borderColor: PX.cardBorder }}>
                              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.blue }}>Clinical Questions</div>
                              <ul className="mt-0.5 space-y-0.5">
                                {call.liaisonSummary.clinicalQuestionsRaised.map((q, qi) => (
                                  <li key={qi} className="flex items-start gap-1.5 text-xs" style={{ color: PX.textPrimary }}>
                                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: PX.blue }} />
                                    {q}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Recommended Action */}
                          <div className="px-4 py-2.5" style={{ backgroundColor: `${PX.teal}06` }}>
                            <div className="flex items-center gap-2">
                              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.teal }}>Recommended Action</div>
                              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: URGENCY_COLORS[call.urgency]?.text || PX.textMuted, backgroundColor: URGENCY_COLORS[call.urgency]?.bg || '#F5F5F5' }}>
                                {call.urgency}
                              </span>
                            </div>
                            <div className="text-xs font-semibold mt-0.5" style={{ color: PX.textPrimary }}>{call.liaisonSummary.recommendedAction}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ===== COMPETITIVE INTEL sub-tab ===== */}
            {medIntelSubTab === 'competitive-intel' && (
              <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-sm font-bold" style={{ color: PX.navy }}>Competitive Intelligence</div>
                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: PX.navy, backgroundColor: `${PX.navy}12` }}>CI</span>
                </div>
                <div className="space-y-3">
                  {filteredCalls.filter(c => c.classification.competitiveIntelNotes && c.classification.competitiveIntelNotes.length > 0).length === 0 &&
                   filteredCalls.filter(c => c.behavioralSignals.some(s => s.category === 'COMPETITIVE_INTEL')).length === 0 ? (
                    <div className="text-sm py-2" style={{ color: PX.textMuted }}>No competitive intelligence in current filter</div>
                  ) : (
                    <>
                      {/* Calls with extracted CI notes */}
                      {filteredCalls.filter(c => c.classification.competitiveIntelNotes && c.classification.competitiveIntelNotes.length > 0).map((call) => (
                        <div key={`ci-${call.id}`} className="border p-4 cursor-pointer hover:bg-[#F5F5F5] transition-colors" style={{ borderColor: PX.navy, backgroundColor: `${PX.navy}04` }} onClick={() => setSelectedCallId(call.id)}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: PX.navy, backgroundColor: `${PX.navy}12` }}>CI</span>
                            <span className="text-sm font-semibold" style={{ color: PX.navy }}>{call.contactName}</span>
                            <span className="text-[10px] font-bold" style={{ color: TA_COLORS[call.therapeuticArea] }}>{TA_LABELS[call.therapeuticArea]}</span>
                            <span className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(call.timestamp)}</span>
                          </div>
                          {call.classification.competitiveIntelNotes.map((note, ni) => (
                            <div key={ni} className="flex items-start gap-2 text-xs mb-1" style={{ color: PX.textPrimary }}>
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: PX.navy }} />
                              {note}
                            </div>
                          ))}
                        </div>
                      ))}
                      {/* Calls with behavioral CI signals (no extracted notes) */}
                      {filteredCalls.filter(c => (!c.classification.competitiveIntelNotes || c.classification.competitiveIntelNotes.length === 0) && c.behavioralSignals.some(s => s.category === 'COMPETITIVE_INTEL')).map((call) => (
                        <div key={`bci-${call.id}`} className="border p-4 cursor-pointer hover:bg-[#F5F5F5] transition-colors" style={{ borderColor: PX.cardBorder }} onClick={() => setSelectedCallId(call.id)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold" style={{ color: PX.navy }}>{call.contactName}</span>
                            <span className="text-[10px] font-bold" style={{ color: TA_COLORS[call.therapeuticArea] }}>{TA_LABELS[call.therapeuticArea]}</span>
                          </div>
                          {call.behavioralSignals.filter(s => s.category === 'COMPETITIVE_INTEL').map((sig, si) => (
                            <div key={si} className="text-xs" style={{ color: PX.textPrimary }}>{sig.detail}</div>
                          ))}
                          <div className="mt-1 text-xs" style={{ color: PX.textSecondary }}>{call.liaisonSummary.enrichmentData.competitiveIntelligence}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- SYSTEM PERFORMANCE TAB ---- */}
        {activeTab === 'performance' && analytics && (() => {
          /* ---- Campaign-filtered calls ---- */
          const perfCalls = perfCampaign === 'all' ? calls : calls.filter(c => c.therapeuticArea === perfCampaign);
          const perfTotal = perfCalls.length;

          /* ---- Executive Summary metrics ---- */
          const perfConnected = perfCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail').length;
          const perfEngaged = perfCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail' && c.outcome !== 'declined').length;
          const perfConverted = perfCalls.filter(c => (CONVERSION_OUTCOMES as string[]).includes(c.outcome)).length;
          const perfAE = perfCalls.filter(c => c.aeDetected).length;
          const perfAvgHandle = perfTotal > 0 ? perfCalls.reduce((s, c) => s + c.duration, 0) / perfTotal : 0;
          const perfEngRate = perfTotal > 0 ? (perfConnected / perfTotal) * 100 : 0;
          const perfConvRate = perfTotal > 0 ? (perfConverted / perfTotal) * 100 : 0;
          const perfAERate = perfTotal > 0 ? (perfAE / perfTotal) * 100 : 0;

          /* ---- Funnel stages ---- */
          const funnelSignals = Math.round(perfTotal * 1.3);
          const funnelOutreach = perfTotal;
          const funnelConnected = perfConnected;
          const funnelEngaged = perfEngaged;
          const funnelConverted = perfConverted;
          const funnelStages = [
            { label: 'Signals Detected', value: funnelSignals },
            { label: 'Outreach Initiated', value: funnelOutreach },
            { label: 'Connected', value: funnelConnected },
            { label: 'Engaged', value: funnelEngaged },
            { label: 'Converted', value: funnelConverted },
          ];

          /* ---- Outcome distribution (sorted desc) ---- */
          const perfOutcomes: Record<string, number> = {};
          for (const c of perfCalls) perfOutcomes[c.outcome] = (perfOutcomes[c.outcome] || 0) + 1;
          const sortedOutcomes = Object.entries(perfOutcomes).sort(([, a], [, b]) => b - a);
          const perfConversionCount = sortedOutcomes.filter(([o]) => (CONVERSION_OUTCOMES as string[]).includes(o)).reduce((s, [, v]) => s + v, 0);
          const perfNonConvCount = perfTotal - perfConversionCount;

          /* ---- Agent comparison ---- */
          const agentTypes: AgentType[] = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'];
          const agentStats = agentTypes.map(at => {
            const ac = perfCalls.filter(c => c.agentType === at);
            const acTotal = ac.length;
            const acConverted = ac.filter(c => (CONVERSION_OUTCOMES as string[]).includes(c.outcome)).length;
            const acAE = ac.filter(c => c.aeDetected).length;
            const acAvgHandle = acTotal > 0 ? ac.reduce((s, c) => s + c.duration, 0) / acTotal : 0;
            const sentimentScore = acTotal > 0
              ? ac.reduce((s, c) => s + (c.sentiment === 'positive' ? 1 : c.sentiment === 'negative' ? -1 : 0), 0) / acTotal
              : 0;
            return {
              agentType: at,
              total: acTotal,
              convRate: acTotal > 0 ? (acConverted / acTotal) * 100 : 0,
              avgHandle: acAvgHandle,
              aeRate: acTotal > 0 ? (acAE / acTotal) * 100 : 0,
              sentiment: sentimentScore,
            };
          });

          /* ---- Pathway effectiveness ---- */
          const pathwayIds: SupportPathwayId[] = ['hub-enrollment', 'copay-assistance', 'ae-reporting', 'adherence-support', 'sample-request', 'medical-inquiry'];
          const perfPathways = pathwayIds.map(id => {
            const pc = perfCalls.filter(c => c.supportPathway === id);
            const pcTotal = pc.length;
            const pcConverted = pc.filter(c => (CONVERSION_OUTCOMES as string[]).includes(c.outcome)).length;
            const outcomeCounts: Record<string, number> = {};
            for (const c of pc) outcomeCounts[c.outcome] = (outcomeCounts[c.outcome] || 0) + 1;
            const topOutcome = Object.entries(outcomeCounts).sort(([, a], [, b]) => b - a)[0];
            return {
              id,
              total: pcTotal,
              convRate: pcTotal > 0 ? (pcConverted / pcTotal) * 100 : 0,
              topOutcome: topOutcome ? topOutcome[0] : '-',
            };
          }).filter(p => p.total > 0);

          /* ---- Daily trend (campaign-filtered) ---- */
          const perfDailyTrend = analytics.dailyTrend.map(day => {
            const dayCalls = perfCalls.filter(c => c.timestamp.startsWith(day.date));
            const dayEngaged = dayCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail' && c.outcome !== 'declined').length;
            const dayConverted = dayCalls.filter(c => (CONVERSION_OUTCOMES as string[]).includes(c.outcome)).length;
            const dayConvRate = dayCalls.length > 0 ? (dayConverted / dayCalls.length) * 100 : 0;
            return { date: day.date, interactions: dayCalls.length, engagements: dayEngaged, conversions: dayConverted, convRate: dayConvRate };
          });

          /* ---- Top concerns (campaign-filtered) ---- */
          const perfConcernCounts = new Map<string, number>();
          for (const c of perfCalls) {
            for (const concern of c.classification.contact_concerns) {
              perfConcernCounts.set(concern, (perfConcernCounts.get(concern) || 0) + 1);
            }
          }
          const perfTotalConcerns = Array.from(perfConcernCounts.values()).reduce((a, b) => a + b, 0);
          const perfTopConcerns = Array.from(perfConcernCounts.entries())
            .map(([concern, count]) => ({ concern, count, percentage: perfTotalConcerns > 0 ? +((count / perfTotalConcerns) * 100).toFixed(1) : 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

          /* ---- Vi Badge helper ---- */
          const ViBadge = ({ label }: { label: string }) => (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border"
              style={{ color: PX.teal, backgroundColor: PX.tealBg, borderColor: `${PX.teal}30` }}
            >
              <span style={{ fontSize: '8px' }}>&#9679;</span> {label}
            </span>
          );

          return (
          <div className="space-y-6 animate-fade-in">
            {/* Tab description */}
            <div>
              <p className="text-sm" style={{ color: PX.textSecondary }}>
                Operational metrics across all agent interactions. Outcome distributions, conversion rates by pathway and agent type, and engagement trends over time.
              </p>
            </div>

            {/* ===== Campaign Selector ===== */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Campaign</span>
              {brand.therapeuticAreas.map(ta => {
                const isActive = perfCampaign === ta.id;
                return (
                  <button
                    key={ta.id}
                    onClick={() => setPerfCampaign(isActive ? 'all' : ta.id)}
                    className="px-4 py-1.5 text-xs font-semibold border transition-all"
                    style={{
                      backgroundColor: isActive ? (TA_COLORS[ta.id] || PX.teal) : 'white',
                      color: isActive ? 'white' : (TA_COLORS[ta.id] || PX.teal),
                      borderColor: isActive ? (TA_COLORS[ta.id] || PX.teal) : PX.cardBorder,
                    }}
                  >
                    {TA_LABELS[ta.id] ?? ta.label}
                  </button>
                );
              })}
              <button
                onClick={() => setPerfCampaign('all')}
                className="px-4 py-1.5 text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: perfCampaign === 'all' ? PX.navy : 'white',
                  color: perfCampaign === 'all' ? 'white' : PX.navy,
                  borderColor: perfCampaign === 'all' ? PX.navy : PX.cardBorder,
                }}
              >
                All Campaigns
              </button>
            </div>

            {/* ===== Section 1: Executive Summary ===== */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm font-bold" style={{ color: PX.navy }}>Executive Summary</div>
                <ViBadge label="Vi Operate" />
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Total Interactions</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: PX.navy }}>{perfTotal}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Conversion Rate</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: PX.teal }}>{perfConvRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>AE Capture Rate</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: PX.coral }}>{perfAERate.toFixed(1)}%</div>
                  <div className="text-[10px]" style={{ color: PX.textMuted }}>{perfAE} reports</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Avg Handle Time</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: PX.navy }}>{(perfAvgHandle / 60).toFixed(1)}m</div>
                  <div className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDuration(Math.round(perfAvgHandle))}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Engagement Rate</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: PX.success }}>{perfEngRate.toFixed(1)}%</div>
                  <div className="text-[10px]" style={{ color: PX.textMuted }}>{perfConnected} connected</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Cost per Interaction</div>
                  <div className="mt-1 text-2xl font-bold" style={{ color: PX.navy }}>$0.10</div>
                  <div className="text-[10px]" style={{ color: PX.textMuted }}>~${(perfTotal * 0.10).toFixed(2)} total</div>
                </div>
              </div>
            </div>

            {/* ===== Section 2: Conversion Funnel ===== */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm font-bold" style={{ color: PX.navy }}>Conversion Funnel</div>
                <ViBadge label="Vi Engage" />
              </div>
              <div className="flex items-center gap-0 overflow-x-auto">
                {funnelStages.map((stage, i) => {
                  const maxW = funnelStages[0].value || 1;
                  const widthPct = Math.max((stage.value / maxW) * 100, 20);
                  const opacity = 1 - (i * 0.15);
                  const prevValue = i > 0 ? funnelStages[i - 1].value : 0;
                  const stepRate = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(0) : '';
                  return (
                    <div key={stage.label} className="flex items-center flex-1 min-w-0">
                      {i > 0 && (
                        <div className="flex flex-col items-center mx-1 shrink-0">
                          <span className="text-[10px] font-bold" style={{ color: PX.teal }}>{stepRate}%</span>
                          <span style={{ color: PX.teal, fontSize: '14px' }}>&#8594;</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div
                          className="flex items-center justify-center py-3 px-2 text-center border"
                          style={{
                            backgroundColor: `rgba(0, 185, 206, ${opacity * 0.15})`,
                            borderColor: `rgba(0, 185, 206, ${opacity * 0.4})`,
                            width: `${widthPct}%`,
                            minWidth: '80px',
                            margin: '0 auto',
                          }}
                        >
                          <div>
                            <div className="text-lg font-bold" style={{ color: PX.navy }}>{stage.value}</div>
                            <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>{stage.label}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {perfTotal > 0 && (
                <div className="mt-3 text-center">
                  <span className="text-xs" style={{ color: PX.textSecondary }}>
                    Overall: <span className="font-bold" style={{ color: PX.teal }}>{funnelSignals > 0 ? ((funnelConverted / funnelSignals) * 100).toFixed(1) : '0'}%</span> signal-to-conversion
                  </span>
                </div>
              )}
            </div>

            {/* ===== Section 3: Outcome Distribution (enhanced) ===== */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Outcome Distribution</div>
              {/* Conversion vs Non-Conversion summary */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-4 overflow-hidden flex" style={{ backgroundColor: PX.cardBorder }}>
                  <div style={{ width: `${perfTotal > 0 ? (perfConversionCount / perfTotal) * 100 : 0}%`, backgroundColor: PX.teal }} />
                  <div style={{ width: `${perfTotal > 0 ? (perfNonConvCount / perfTotal) * 100 : 0}%`, backgroundColor: PX.textMuted }} />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: PX.teal }} />
                    <span className="text-[10px] font-semibold" style={{ color: PX.textPrimary }}>Converted {perfConversionCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: PX.textMuted }} />
                    <span className="text-[10px] font-semibold" style={{ color: PX.textPrimary }}>Non-converted {perfNonConvCount}</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortedOutcomes.map(([outcome, count]) => {
                  const color = OUTCOME_COLORS[outcome] || PX.textMuted;
                  const pct = perfTotal > 0 ? ((count / perfTotal) * 100).toFixed(0) : '0';
                  const barW = perfTotal > 0 ? (count / perfTotal) * 100 : 0;
                  return (
                    <div key={outcome} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: PX.textPrimary }}>{OUTCOME_LABELS[outcome] || outcome}</span>
                      <div className="w-16 h-1.5 overflow-hidden" style={{ backgroundColor: PX.cardBorder }}>
                        <div className="h-full" style={{ width: `${Math.max(barW, 3)}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs font-bold w-6 text-right" style={{ color }}>{count}</span>
                      <span className="text-[10px] w-8 text-right" style={{ color: PX.textMuted }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== Section 4: Agent Performance Comparison ===== */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm font-bold" style={{ color: PX.navy }}>Agent Performance Comparison</div>
                <ViBadge label="Vi Operate" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${PX.cardBorder}` }}>
                      <th className="text-left py-2 pr-4 font-semibold uppercase tracking-wider text-[10px]" style={{ color: PX.textSecondary }}>Metric</th>
                      {agentStats.map(a => (
                        <th key={a.agentType} className="text-center py-2 px-3 font-semibold text-[10px]" style={{ color: AGENT_TYPE_LABELS[a.agentType].color }}>
                          {AGENT_TYPE_LABELS[a.agentType].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: PX.textPrimary }}>Total Calls</td>
                      {agentStats.map(a => (
                        <td key={a.agentType} className="text-center py-2.5 px-3 font-bold" style={{ color: PX.navy }}>{a.total}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: PX.textPrimary }}>Conversion Rate</td>
                      {agentStats.map(a => (
                        <td key={a.agentType} className="text-center py-2.5 px-3 font-bold" style={{ color: PX.teal }}>{a.convRate.toFixed(1)}%</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: PX.textPrimary }}>Avg Handle Time</td>
                      {agentStats.map(a => (
                        <td key={a.agentType} className="text-center py-2.5 px-3 font-bold" style={{ color: PX.navy }}>{(a.avgHandle / 60).toFixed(1)}m</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: PX.textPrimary }}>AE Detection Rate</td>
                      {agentStats.map(a => (
                        <td key={a.agentType} className="text-center py-2.5 px-3 font-bold" style={{ color: PX.coral }}>{a.aeRate.toFixed(1)}%</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: PX.textPrimary }}>Avg Sentiment</td>
                      {agentStats.map(a => {
                        const sLabel = a.sentiment > 0.3 ? 'Positive' : a.sentiment < -0.3 ? 'Negative' : 'Neutral';
                        const sColor = a.sentiment > 0.3 ? PX.success : a.sentiment < -0.3 ? PX.error : PX.textPrimary;
                        return (
                          <td key={a.agentType} className="text-center py-2.5 px-3 font-bold" style={{ color: sColor }}>
                            {a.sentiment > 0 ? '+' : ''}{a.sentiment.toFixed(2)} <span className="font-normal text-[10px]" style={{ color: PX.textMuted }}>{sLabel}</span>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== Section 5: Pathway Effectiveness ===== */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Pathway Effectiveness</div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {perfPathways.map(pw => {
                  const pwColor = PATHWAY_COLORS[pw.id] || PX.teal;
                  return (
                    <div key={pw.id} className="border p-4" style={{ borderColor: PX.cardBorder }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold" style={{ color: pwColor }}>{PATHWAY_LABELS[pw.id]}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 border" style={{ color: PX.teal, borderColor: `${PX.teal}30`, backgroundColor: PX.tealBg }}>
                          {pw.convRate.toFixed(0)}% conv
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold" style={{ color: PX.navy }}>{pw.total}</div>
                          <div className="text-[10px]" style={{ color: PX.textMuted }}>calls</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Top Outcome</div>
                          <div className="text-[11px] font-medium" style={{ color: PX.textPrimary }}>{OUTCOME_LABELS[pw.topOutcome] || pw.topOutcome}</div>
                        </div>
                      </div>
                      {/* Mini bar */}
                      <div className="mt-2 h-1.5 overflow-hidden" style={{ backgroundColor: PX.cardBorder }}>
                        <div className="h-full" style={{ width: `${pw.convRate}%`, backgroundColor: pwColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ===== Section 6: Daily Trend (enhanced with conversion rate line) ===== */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Daily Activity Trend (7 days)</div>
              <div className="relative">
                <div className="flex items-end gap-2 h-40">
                  {perfDailyTrend.map((day) => {
                    const maxVal = Math.max(...perfDailyTrend.map(d => d.interactions), 1);
                    const h = (day.interactions / maxVal) * 100;
                    const engH = (day.engagements / maxVal) * 100;
                    const convH = (day.conversions / maxVal) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-[9px] font-bold" style={{ color: PX.teal }}>{day.convRate > 0 ? `${day.convRate.toFixed(0)}%` : ''}</div>
                        <div className="w-full flex flex-col items-center" style={{ height: '110px' }}>
                          <div className="flex-1" />
                          <div className="w-full flex gap-0.5 justify-center">
                            <div className="w-2.5" style={{ height: `${Math.max(h, 4)}%`, backgroundColor: PX.navy }} />
                            <div className="w-2.5" style={{ height: `${Math.max(engH, 4)}%`, backgroundColor: PX.teal }} />
                            <div className="w-2.5" style={{ height: `${Math.max(convH, 4)}%`, backgroundColor: PX.success }} />
                          </div>
                        </div>
                        <div className="text-[9px] font-medium" style={{ color: PX.textMuted }}>{day.date.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2" style={{ backgroundColor: PX.navy }} /><span className="text-[10px]" style={{ color: PX.textMuted }}>Interactions</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2" style={{ backgroundColor: PX.teal }} /><span className="text-[10px]" style={{ color: PX.textMuted }}>Engagements</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2" style={{ backgroundColor: PX.success }} /><span className="text-[10px]" style={{ color: PX.textMuted }}>Conversions</span></div>
                <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold" style={{ color: PX.teal }}>%</span><span className="text-[10px]" style={{ color: PX.textMuted }}>Conv. Rate</span></div>
              </div>
            </div>

            {/* ===== Section 7: Top Contact Concerns ===== */}
            {perfTopConcerns.length > 0 && (
              <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Top Contact Concerns</div>
                <div className="space-y-2">
                  {perfTopConcerns.map((tc, i) => {
                    const barW = perfTopConcerns[0].count > 0 ? (tc.count / perfTopConcerns[0].count) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold w-4 text-right" style={{ color: PX.textMuted }}>{i + 1}</span>
                        <span className="text-xs font-medium flex-1 truncate" style={{ color: PX.textPrimary }}>{tc.concern}</span>
                        <div className="w-24 h-1.5 overflow-hidden" style={{ backgroundColor: PX.cardBorder }}>
                          <div className="h-full" style={{ width: `${barW}%`, backgroundColor: PX.navy }} />
                        </div>
                        <span className="text-xs font-bold w-6 text-right" style={{ color: PX.navy }}>{tc.count}</span>
                        <span className="text-[10px] w-10 text-right" style={{ color: PX.textMuted }}>{tc.percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* ---- AGENT STORYBOARD TAB ---- */}
        {activeTab === 'agent-storyboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top bar: Agent selector + controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {(['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'] as AgentType[]).map((at) => {
                  const conf = AGENT_TYPE_LABELS[at];
                  const isActive = configAgent === at;
                  return (
                    <button
                      key={at}
                      onClick={() => setConfigAgent(at)}
                      className={cn('px-4 py-2 text-xs font-semibold transition-all border', isActive ? 'text-white' : '')}
                      style={{
                        backgroundColor: isActive ? conf.color : 'white',
                        color: isActive ? 'white' : conf.color,
                        borderColor: isActive ? conf.color : PX.cardBorder,
                      }}
                    >
                      {conf.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStoryAutoPlay(!storyAutoPlay)}
                  className="border px-4 py-2 text-xs font-semibold transition-all"
                  style={{ borderColor: storyAutoPlay ? PX.teal : PX.cardBorder, color: storyAutoPlay ? PX.teal : PX.textSecondary, backgroundColor: storyAutoPlay ? PX.tealBg : 'white' }}
                >
                  {storyAutoPlay ? 'Pause' : 'Auto-Play'}
                </button>
                <button
                  onClick={() => { setStoryStep(0); setDataDropPhase(0); setConversationIndex(0); setStoryAutoPlay(false); }}
                  className="border px-4 py-2 text-xs font-semibold transition-all"
                  style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center">
              {storyboardSteps.map((step, i) => (
                <div key={step.id} className={cn('flex items-center', i < storyboardSteps.length - 1 ? 'flex-1' : '')}>
                  <button
                    onClick={() => { setStoryStep(i); setStoryAutoPlay(false); }}
                    className="flex flex-col items-center gap-1.5 shrink-0 min-w-[64px]"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                      style={{
                        backgroundColor: i === storyStep ? PX.teal : i < storyStep ? PX.navy : 'white',
                        color: i <= storyStep ? 'white' : PX.textMuted,
                        border: i > storyStep ? `2px solid ${PX.cardBorder}` : '2px solid transparent',
                      }}
                    >
                      {i < storyStep ? '\u2713' : i + 1}
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: i === storyStep ? PX.teal : i < storyStep ? PX.navy : PX.textMuted }}>
                      {step.label}
                    </span>
                  </button>
                  {i < storyboardSteps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 rounded-full transition-all duration-300" style={{ backgroundColor: i < storyStep ? PX.navy : PX.cardBorder }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[480px]">

              {/* ===== STEP 0: Data Drop ===== */}
              {storyStep === 0 && storyData.contact && (
                <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <div className="text-sm font-bold" style={{ color: PX.navy }}>Incoming Data Feed</div>
                      <div className="text-xs" style={{ color: PX.textSecondary }}>
                        Simulating document ingestion for {storyData.contact.contactType === 'patient' ? 'patient' : 'healthcare provider'} record
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', dataDropPhase < storyDataDropItems.length ? 'animate-pulse' : '')}
                        style={{ backgroundColor: dataDropPhase < storyDataDropItems.length ? PX.warning : PX.success }} />
                      <span className="text-[11px] font-medium" style={{ color: dataDropPhase < storyDataDropItems.length ? PX.warning : PX.success }}>
                        {dataDropPhase < storyDataDropItems.length ? 'Processing...' : 'Complete'}
                      </span>
                    </div>
                  </div>

                  {/* Contact header */}
                  <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: storyData.contact.contactType === 'patient' ? PX.teal : PX.navy }}>
                      {initials(storyData.contact.name)}
                    </div>
                    <div>
                      <div className="text-base font-bold" style={{ color: PX.navy }}>{storyData.contact.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: PX.textSecondary }}>
                          {storyData.contact.contactType === 'patient' ? 'Patient' : 'HCP'} &mdash; {storyData.contact.contactId}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: TA_COLORS[storyData.contact.therapeuticArea] }}>
                          {TA_LABELS[storyData.contact.therapeuticArea]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Data records loading */}
                  <div className="space-y-3">
                    {storyDataDropItems.map((item, i) => {
                      const loaded = i < dataDropPhase;
                      return (
                        <div
                          key={item.label}
                          className={cn('flex items-center gap-4 border px-4 py-3 transition-all duration-300', loaded ? 'animate-data-load' : '')}
                          style={{
                            borderColor: loaded ? '#A7F3D0' : PX.cardBorder,
                            backgroundColor: loaded ? '#34A85310' : i <= dataDropPhase ? 'white' : PX.skelShimmer,
                            opacity: i <= dataDropPhase ? 1 : 0.4,
                          }}
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: loaded ? '#A7F3D0' : PX.cardBorder, color: loaded ? PX.success : PX.textMuted }}>
                            {loaded ? '\u2713' : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: loaded ? PX.success : PX.textSecondary }}>
                              {item.label}
                            </div>
                            {loaded ? (
                              <div className="text-xs mt-0.5 truncate" style={{ color: PX.textPrimary }}>{item.value}</div>
                            ) : (
                              <div className="h-3 mt-1 rounded-full skeleton" style={{ width: '70%' }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: PX.textSecondary }}>Ingestion Progress</span>
                      <span className="text-[10px] font-bold" style={{ color: PX.teal }}>
                        {storyDataDropItems.length > 0 ? Math.min(Math.round((dataDropPhase / storyDataDropItems.length) * 100), 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E2E7EA] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${storyDataDropItems.length > 0 ? (dataDropPhase / storyDataDropItems.length) * 100 : 0}%`, backgroundColor: PX.teal }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 1: Agent Config ===== */}
              {storyStep === 1 && personas && personas[configAgent] && storyData.contact && (
                <div className="grid gap-6 xl:grid-cols-2">
                  {/* Context: Why this agent */}
                  <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Engagement Context</div>
                    <div className="p-4 mb-4" style={{ backgroundColor: PX.tealBg }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: storyData.contact.contactType === 'patient' ? PX.teal : PX.navy }}>
                          {initials(storyData.contact.name)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: PX.navy }}>{storyData.contact.name}</div>
                          <div className="text-[11px]" style={{ color: PX.textSecondary }}>
                            {storyData.contact.contactType === 'patient' ? `Patient, Age ${storyData.contact.age}` : storyData.contact.specialty?.split(' — ')[0] || 'HCP'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: PX.textPrimary }}>
                        <span className="font-semibold">Pathway:</span> {PATHWAY_LABELS[storyData.contact.recommendedPathway]}
                      </div>
                      <div className="text-xs mt-1" style={{ color: PX.textPrimary }}>
                        <span className="font-semibold">Priority:</span>{' '}
                        <span style={{ color: PRIORITY_COLORS[storyData.contact.priorityTier]?.text }}>{storyData.contact.priorityTier}</span>
                        {' '}(Score: {storyData.contact.priorityScore})
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: PX.textSecondary }}>Triggering Signals</div>
                    <div className="space-y-2 mb-4">
                      {storyData.contact.behavioralSignals.map((sig, si) => (
                        <div key={si} className="flex items-start gap-2 border p-3" style={{ borderColor: PX.cardBorder }}>
                          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SIGNAL_COLORS[sig.category] || PX.textMuted }} />
                          <div>
                            <div className="text-[10px] font-bold uppercase" style={{ color: SIGNAL_COLORS[sig.category] || PX.textMuted }}>
                              {SIGNAL_LABELS[sig.category] || sig.category}
                            </div>
                            <div className="text-xs" style={{ color: PX.textPrimary }}>{sig.detail}</div>
                            <div className="text-[10px] mt-0.5" style={{ color: PX.textSecondary }}>{sig.clinicalImplication}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border p-3" style={{ borderColor: PX.teal, backgroundColor: `${PX.teal}08` }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: PX.teal }}>Agent Selection Rationale</div>
                      <div className="text-xs" style={{ color: PX.textPrimary }}>
                        {storyData.contact.contactType === 'patient' ? 'Patient' : 'HCP'} contact with{' '}
                        {PATHWAY_LABELS[storyData.contact.recommendedPathway].toLowerCase()} pathway &rarr; routed to{' '}
                        <span className="font-semibold" style={{ color: AGENT_TYPE_LABELS[configAgent].color }}>{AGENT_TYPE_LABELS[configAgent].label}</span> agent ({personas[configAgent].name}).
                      </div>
                    </div>
                  </div>

                  {/* Persona Config — Interactive */}
                  <div className="border bg-white p-6 overflow-y-auto" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow, maxHeight: '80vh' }}>
                    <div className="text-sm font-bold mb-5" style={{ color: PX.navy }}>
                      Agent Persona: {personas[configAgent].name}
                    </div>

                    {/* --- Personality Presets --- */}
                    <div className="mb-5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: PX.textSecondary }}>Personality Profile</label>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {PERSONALITY_PRESETS[configAgent].map((preset, pi) => {
                          const isSelected = selectedPreset[configAgent] === pi;
                          return (
                            <button
                              key={pi}
                              onClick={() => {
                                setSelectedPreset(prev => ({ ...prev, [configAgent]: pi }));
                                setPresetSliders(prev => ({
                                  ...prev,
                                  [configAgent]: { warmth: preset.warmth, empathy: preset.empathy, clinicalDepth: preset.clinicalDepth, formality: preset.formality },
                                }));
                              }}
                              className="border p-2.5 text-left transition-all duration-200"
                              style={{
                                borderColor: isSelected ? PX.teal : PX.cardBorder,
                                backgroundColor: isSelected ? PX.tealBg : 'white',
                                boxShadow: isSelected ? `0 0 0 1px ${PX.teal}` : 'none',
                              }}
                            >
                              <div className="text-[10px] font-bold mb-1" style={{ color: isSelected ? PX.teal : PX.navy }}>{preset.label}</div>
                              <div className="text-[9px] leading-tight" style={{ color: PX.textSecondary }}>
                                W{preset.warmth} E{preset.empathy} C{preset.clinicalDepth} F{preset.formality}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Sliders */}
                      <div className="space-y-3">
                        {([
                          { label: 'Warmth', key: 'warmth' as const, color: '#F59E0B' },
                          { label: 'Empathy', key: 'empathy' as const, color: '#EC4899' },
                          { label: 'Clinical Depth', key: 'clinicalDepth' as const, color: PX.teal },
                          { label: 'Formality', key: 'formality' as const, color: PX.navy },
                        ]).map((slider) => (
                          <div key={slider.key}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>{slider.label}</label>
                              <span className="text-xs font-bold" style={{ color: slider.color }}>{presetSliders[configAgent]?.[slider.key] ?? personas[configAgent][slider.key]}</span>
                            </div>
                            <div className="h-2 rounded-full bg-[#E2E7EA] overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                                width: sliderAnimated ? `${presetSliders[configAgent]?.[slider.key] ?? personas[configAgent][slider.key]}%` : '0%',
                                backgroundColor: slider.color,
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* --- Greeting --- */}
                    <div className="mb-5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: PX.textSecondary }}>Greeting</label>
                      <div className="border px-3 py-2 text-xs" style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}>
                        {personas[configAgent].greeting
                          .replace('{contactName}', storyData.contact.name)
                          .replace('{drugProduct}', drugBrandName(storyData.contact.drugProduct))}
                      </div>
                    </div>

                    {/* --- Language Selector --- */}
                    <div className="mb-5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: PX.textSecondary }}>Language</label>
                      <div className="flex items-center gap-3 mb-2">
                        <select
                          value={agentLanguage}
                          onChange={(e) => setAgentLanguage(e.target.value)}
                          disabled={autoDetectLang}
                          className="border px-2 py-1.5 text-xs flex-1"
                          style={{
                            borderColor: PX.cardBorder,
                            color: autoDetectLang ? PX.textMuted : PX.textPrimary,
                            backgroundColor: autoDetectLang ? '#F5F5F5' : 'white',
                          }}
                        >
                          {AGENT_LANGUAGES.map((lang) => (
                            <option key={lang.value} value={lang.value}>{lang.label}</option>
                          ))}
                        </select>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <button
                          onClick={() => setAutoDetectLang(!autoDetectLang)}
                          className="relative flex-shrink-0"
                          style={{ width: 32, height: 18 }}
                        >
                          <div className="absolute inset-0 rounded-full transition-colors duration-200" style={{ backgroundColor: autoDetectLang ? PX.teal : '#E2E7EA' }} />
                          <div className="absolute top-0.5 rounded-full bg-white transition-all duration-200 shadow-sm" style={{ width: 14, height: 14, left: autoDetectLang ? 16 : 2 }} />
                        </button>
                        <span className="text-[10px] font-medium" style={{ color: PX.textSecondary }}>Auto-detect language</span>
                      </label>
                      {autoDetectLang && (
                        <div className="mt-1.5 text-[10px] px-2 py-1.5 border" style={{ color: PX.teal, borderColor: `${PX.teal}30`, backgroundColor: `${PX.teal}08` }}>
                          Agent will automatically detect the caller&apos;s language and switch mid-conversation
                        </div>
                      )}
                    </div>

                    {/* --- Interactive Guardrails --- */}
                    <div className="mb-5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: PX.textSecondary }}>Guardrails</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {/* Active guardrails */}
                        {activeGuardrails[configAgent].map((g, gi) => (
                          <button
                            key={`active-${gi}`}
                            onClick={() => {
                              setActiveGuardrails(prev => ({
                                ...prev,
                                [configAgent]: prev[configAgent].filter((_, i) => i !== gi),
                              }));
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 hover:opacity-80"
                            style={{ color: 'white', backgroundColor: PX.teal }}
                          >
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {g}
                          </button>
                        ))}
                        {/* Available guardrails (not yet active) */}
                        {AGENT_GUARDRAILS[configAgent].available
                          .filter(g => !activeGuardrails[configAgent].includes(g))
                          .map((g, gi) => (
                            <button
                              key={`avail-${gi}`}
                              onClick={() => {
                                setActiveGuardrails(prev => ({
                                  ...prev,
                                  [configAgent]: [...prev[configAgent], g],
                                }));
                              }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border border-dashed transition-all duration-200 hover:border-solid"
                              style={{ color: PX.textSecondary, borderColor: PX.textMuted, backgroundColor: 'transparent' }}
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              {g}
                            </button>
                          ))}
                        {/* Also show any previously-available items that were toggled off (from active defaults) */}
                        {AGENT_GUARDRAILS[configAgent].active
                          .filter(g => !activeGuardrails[configAgent].includes(g))
                          .map((g, gi) => (
                            <button
                              key={`re-${gi}`}
                              onClick={() => {
                                setActiveGuardrails(prev => ({
                                  ...prev,
                                  [configAgent]: [...prev[configAgent], g],
                                }));
                              }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border border-dashed transition-all duration-200 hover:border-solid"
                              style={{ color: PX.textSecondary, borderColor: PX.textMuted, backgroundColor: 'transparent' }}
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              {g}
                            </button>
                          ))}
                      </div>
                      {/* Request Additional Guardrail */}
                      {!showGuardrailInput ? (
                        <button
                          onClick={() => setShowGuardrailInput(true)}
                          className="inline-flex items-center gap-1 border px-2.5 py-1 text-[10px] font-semibold transition-colors hover:bg-gray-50"
                          style={{ color: PX.navy, borderColor: PX.navy }}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          Request Additional Guardrail
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customGuardrailText}
                            onChange={(e) => setCustomGuardrailText(e.target.value)}
                            placeholder="Describe guardrail..."
                            className="flex-1 border px-2 py-1 text-[10px]"
                            style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
                          />
                          <button
                            onClick={() => {
                              setShowGuardrailInput(false);
                              setCustomGuardrailText('');
                              setRequestToast('Guardrail request submitted');
                              window.setTimeout(() => setRequestToast(null), 3000);
                            }}
                            className="border px-2.5 py-1 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: PX.navy, borderColor: PX.navy }}
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => { setShowGuardrailInput(false); setCustomGuardrailText(''); }}
                            className="text-[10px] font-medium px-1"
                            style={{ color: PX.textMuted }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* --- Interactive Escalation Triggers --- */}
                    <div className="mb-4">
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: PX.textSecondary }}>Escalation Triggers</label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {/* Active escalations */}
                        {activeEscalations[configAgent].map((t, ti) => (
                          <button
                            key={`active-${ti}`}
                            onClick={() => {
                              setActiveEscalations(prev => ({
                                ...prev,
                                [configAgent]: prev[configAgent].filter((_, i) => i !== ti),
                              }));
                            }}
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all duration-200 hover:opacity-80"
                            style={{ color: 'white', backgroundColor: PX.coral }}
                          >
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {t}
                          </button>
                        ))}
                        {/* Available escalations */}
                        {AGENT_ESCALATIONS[configAgent].available
                          .filter(t => !activeEscalations[configAgent].includes(t))
                          .map((t, ti) => (
                            <button
                              key={`avail-${ti}`}
                              onClick={() => {
                                setActiveEscalations(prev => ({
                                  ...prev,
                                  [configAgent]: [...prev[configAgent], t],
                                }));
                              }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border border-dashed transition-all duration-200 hover:border-solid"
                              style={{ color: PX.textSecondary, borderColor: PX.textMuted, backgroundColor: 'transparent' }}
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              {t}
                            </button>
                          ))}
                        {/* Previously-active items toggled off */}
                        {AGENT_ESCALATIONS[configAgent].active
                          .filter(t => !activeEscalations[configAgent].includes(t))
                          .map((t, ti) => (
                            <button
                              key={`re-${ti}`}
                              onClick={() => {
                                setActiveEscalations(prev => ({
                                  ...prev,
                                  [configAgent]: [...prev[configAgent], t],
                                }));
                              }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border border-dashed transition-all duration-200 hover:border-solid"
                              style={{ color: PX.textSecondary, borderColor: PX.textMuted, backgroundColor: 'transparent' }}
                            >
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              {t}
                            </button>
                          ))}
                      </div>
                      {/* Request Additional Escalation */}
                      {!showEscalationInput ? (
                        <button
                          onClick={() => setShowEscalationInput(true)}
                          className="inline-flex items-center gap-1 border px-2.5 py-1 text-[10px] font-semibold transition-colors hover:bg-gray-50"
                          style={{ color: PX.navy, borderColor: PX.navy }}
                        >
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          Request Additional Escalation
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customEscalationText}
                            onChange={(e) => setCustomEscalationText(e.target.value)}
                            placeholder="Describe escalation trigger..."
                            className="flex-1 border px-2 py-1 text-[10px]"
                            style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
                          />
                          <button
                            onClick={() => {
                              setShowEscalationInput(false);
                              setCustomEscalationText('');
                              setRequestToast('Escalation request submitted');
                              window.setTimeout(() => setRequestToast(null), 3000);
                            }}
                            className="border px-2.5 py-1 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: PX.navy, borderColor: PX.navy }}
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => { setShowEscalationInput(false); setCustomEscalationText(''); }}
                            className="text-[10px] font-medium px-1"
                            style={{ color: PX.textMuted }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Request toast */}
                    {requestToast && (
                      <div className="border px-3 py-2 mt-2 flex items-center gap-2" style={{ borderColor: PX.success, backgroundColor: `${PX.success}10` }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6.5 11.5L2.5 7.5" stroke={PX.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="text-[10px] font-semibold" style={{ color: PX.success }}>{requestToast}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Conversation ===== */}
              {storyStep === 2 && storyData.call && storyData.contact && (
                <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center" style={{ backgroundColor: AGENT_TYPE_LABELS[configAgent].color }}>
                        <span className="text-[9px] font-black text-white">Vi</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: PX.navy }}>
                          Live Conversation &mdash; {personas?.[configAgent]?.name || AGENT_TYPE_LABELS[configAgent].label}
                        </div>
                        <div className="text-xs" style={{ color: PX.textSecondary }}>
                          {AGENT_TYPE_LABELS[configAgent].label} &rarr; {storyData.contact.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversationIndex < storyData.call.transcript.length ? (
                        <>
                          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: PX.success }} />
                          <span className="text-[11px] font-medium" style={{ color: PX.success }}>In Progress</span>
                        </>
                      ) : (
                        <>
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.navy }} />
                          <span className="text-[11px] font-medium" style={{ color: PX.navy }}>Complete</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div ref={chatScrollRef} className="space-y-3 max-h-[400px] overflow-y-auto border p-4" style={{ borderColor: PX.cardBorder }}>
                    {storyData.call.transcript.slice(0, conversationIndex).map((entry, i) => (
                      <div key={i} className={cn('flex gap-3 animate-chat-in', entry.speaker === 'agent' ? '' : 'flex-row-reverse')}>
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: entry.speaker === 'agent' ? PX.teal : PX.navy }}
                        >
                          {entry.speaker === 'agent' ? 'Vi' : initials(storyData.contact!.name)}
                        </div>
                        <div className={cn('max-w-[80%] px-4 py-2.5', entry.speaker === 'agent' ? 'bg-[#E0F7FA]' : 'bg-[#F5F5F5]')}>
                          <div className="text-xs leading-relaxed" style={{ color: PX.textPrimary }}>{entry.text}</div>
                          <div className="mt-1 text-[9px]" style={{ color: PX.textMuted }}>{fmtDuration(entry.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                    {/* Typing indicator */}
                    {conversationIndex < storyData.call.transcript.length && storyData.call.transcript[conversationIndex] && (
                      <div className={cn('flex gap-3', storyData.call.transcript[conversationIndex].speaker === 'agent' ? '' : 'flex-row-reverse')}>
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: storyData.call.transcript[conversationIndex].speaker === 'agent' ? PX.teal : PX.navy }}
                        >
                          {storyData.call.transcript[conversationIndex].speaker === 'agent' ? 'Vi' : initials(storyData.contact!.name)}
                        </div>
                        <div className="px-4 py-3 bg-[#F5F5F5]">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ backgroundColor: PX.textMuted }} />
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ backgroundColor: PX.textMuted, animationDelay: '0.2s' }} />
                            <span className="h-1.5 w-1.5 rounded-full animate-pulse-dot" style={{ backgroundColor: PX.textMuted, animationDelay: '0.4s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Conversation progress */}
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-[10px] font-semibold" style={{ color: PX.textSecondary }}>
                      {conversationIndex}/{storyData.call.transcript.length} messages
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-[#E2E7EA] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${storyData.call.transcript.length > 0 ? (conversationIndex / storyData.call.transcript.length) * 100 : 0}%`, backgroundColor: PX.teal }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 3: Transcript ===== */}
              {storyStep === 3 && storyData.call && storyData.contact && (
                <div className="grid gap-6 xl:grid-cols-5">
                  {/* Left: Full transcript */}
                  <div className="xl:col-span-3 border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>
                      Transcript &mdash; {storyData.call.transcript.length} messages
                    </div>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto">
                      {storyData.call.transcript.map((entry, i) => (
                        <div key={i} className={cn('flex gap-3', entry.speaker === 'agent' ? '' : 'flex-row-reverse')}>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ backgroundColor: entry.speaker === 'agent' ? PX.teal : PX.navy }}>
                            {entry.speaker === 'agent' ? 'Vi' : initials(storyData.contact!.name)}
                          </div>
                          <div className={cn('max-w-[80%] px-4 py-2.5', entry.speaker === 'agent' ? 'bg-[#E0F7FA]' : 'bg-[#F5F5F5]')}>
                            <div className="text-xs leading-relaxed" style={{ color: PX.textPrimary }}>{entry.text}</div>
                            <div className="mt-1 text-[9px]" style={{ color: PX.textMuted }}>{fmtDuration(entry.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Analysis */}
                  <div className="xl:col-span-2 space-y-4">
                    {/* Classification */}
                    <div className="border bg-white p-5 animate-fade-in" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>Classification</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase" style={{ color: PX.textSecondary }}>Outcome</div>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold mt-1"
                            style={{ color: OUTCOME_COLORS[storyData.call.outcome] || PX.textMuted, backgroundColor: `${OUTCOME_COLORS[storyData.call.outcome] || PX.textMuted}15` }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: OUTCOME_COLORS[storyData.call.outcome] }} />
                            {OUTCOME_LABELS[storyData.call.outcome] || storyData.call.outcome}
                          </span>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase" style={{ color: PX.textSecondary }}>Sentiment</div>
                          <div className="text-sm font-medium capitalize mt-1" style={{ color: storyData.call.sentiment === 'positive' ? PX.success : storyData.call.sentiment === 'negative' ? PX.error : PX.textPrimary }}>
                            {storyData.call.sentiment}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase" style={{ color: PX.textSecondary }}>Pathway</div>
                          <div className="text-xs font-medium mt-1" style={{ color: PATHWAY_COLORS[storyData.call.supportPathway] }}>
                            {PATHWAY_LABELS[storyData.call.supportPathway]}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase" style={{ color: PX.textSecondary }}>Urgency</div>
                          <div className="text-xs font-medium capitalize mt-1" style={{ color: storyData.call.urgency === 'urgent' ? PX.error : storyData.call.urgency === 'soon' ? PX.warning : PX.textPrimary }}>
                            {storyData.call.urgency}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold uppercase" style={{ color: PX.textSecondary }}>Confidence</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 rounded-full bg-[#E2E7EA] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${storyData.call.classification.confidence * 100}%`, backgroundColor: PX.success }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: PX.success }}>{Math.round(storyData.call.classification.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* AE Alert */}
                    {storyData.call.aeDetected && storyData.call.classification.aeNarrative && (
                      <div className="border border-[#FF7D7830] bg-[#FF7D7810] p-5 animate-fade-in">
                        <div className="text-xs font-bold text-[#FF7D78] uppercase tracking-wider mb-1">Adverse Event Detected</div>
                        <div className="text-xs text-[#485D61]">{storyData.call.classification.aeNarrative}</div>
                      </div>
                    )}

                    {/* Key Moments */}
                    {storyData.call.classification.key_moments.length > 0 && (
                      <div className="border bg-white p-5 animate-fade-in" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: PX.textSecondary }}>Key Moments</div>
                        <div className="space-y-1.5">
                          {storyData.call.classification.key_moments.map((km, ki) => (
                            <div key={ki} className="flex items-start gap-2 text-xs" style={{ color: PX.textPrimary }}>
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: km.includes('ADVERSE') || km.includes('AE') ? PX.error : PX.teal }} />
                              {km}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Liaison Summary -- 5-Block Format */}
                    <div className="border bg-white animate-fade-in overflow-hidden" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: PX.cardBorder }}>
                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Liaison Summary</div>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: storyData.call.liaisonSummary.engagementScore >= 75 ? PX.success : storyData.call.liaisonSummary.engagementScore >= 55 ? PX.warning : PX.error, backgroundColor: storyData.call.liaisonSummary.engagementScore >= 75 ? '#34A85310' : storyData.call.liaisonSummary.engagementScore >= 55 ? '#DE7D0010' : '#FF7D7810' }}>
                          {storyData.call.liaisonSummary.engagementScore}%
                        </span>
                      </div>
                      <div className="border-b px-5 py-2.5" style={{ borderColor: PX.cardBorder }}>
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.teal }}>Context</div>
                        <div className="text-xs mt-0.5" style={{ color: PX.textPrimary }}>{storyData.call.liaisonSummary.contextSummary}</div>
                      </div>
                      <div className="border-b px-5 py-2.5" style={{ borderColor: PX.cardBorder }}>
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.navy }}>What Happened</div>
                        <div className="text-xs mt-0.5" style={{ color: PX.textPrimary }}>{storyData.call.liaisonSummary.whatHappened}</div>
                      </div>
                      {storyData.call.liaisonSummary.clinicalQuestionsRaised.length > 0 && (
                        <div className="border-b px-5 py-2.5" style={{ borderColor: PX.cardBorder }}>
                          <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.blue }}>Clinical Questions</div>
                          <ul className="mt-0.5 space-y-0.5">
                            {storyData.call.liaisonSummary.clinicalQuestionsRaised.map((q, qi) => (
                              <li key={qi} className="flex items-start gap-1.5 text-xs" style={{ color: PX.textPrimary }}>
                                <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: PX.blue }} />
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="px-5 py-2.5" style={{ backgroundColor: `${PX.teal}06` }}>
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: PX.teal }}>Recommended Action</div>
                        <div className="text-xs font-semibold mt-0.5" style={{ color: PX.textPrimary }}>{storyData.call.liaisonSummary.recommendedAction}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 4: Call Log ===== */}
              {storyStep === 4 && storyData.call && (
                <div className="space-y-6">
                  <div className="border bg-white" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="px-6 py-4 border-b" style={{ borderColor: PX.cardBorder }}>
                      <div className="text-sm font-bold" style={{ color: PX.navy }}>Call Log &mdash; Interaction Recorded</div>
                      <div className="text-xs" style={{ color: PX.textMuted }}>Latest interaction highlighted</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                            {['Contact', 'Agent', 'TA', 'Pathway', 'Outcome', 'AE', 'Duration', 'Time'].map((h) => (
                              <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Highlighted storyboard call */}
                          {(() => {
                            const sc = storyData.call!;
                            const agentConf = AGENT_TYPE_LABELS[sc.agentType];
                            const oColor = OUTCOME_COLORS[sc.outcome] || PX.textMuted;
                            return (
                              <tr className={cn(callLogHighlight ? 'animate-highlight-pulse' : '')}
                                style={{ borderBottom: `1px solid ${PX.cardBorder}`, backgroundColor: PX.tealBg }}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: sc.contactType === 'patient' ? PX.teal : PX.navy }}>
                                      {initials(sc.contactName)}
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold" style={{ color: PX.navy }}>{sc.contactName}</div>
                                      <div className="text-[10px]" style={{ color: PX.textMuted }}>{sc.contactType === 'patient' ? 'Patient' : 'HCP'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: agentConf.color, backgroundColor: `${agentConf.color}12` }}>{agentConf.label}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-semibold" style={{ color: TA_COLORS[sc.therapeuticArea] }}>{TA_LABELS[sc.therapeuticArea]}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: PATHWAY_COLORS[sc.supportPathway] }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PATHWAY_COLORS[sc.supportPathway] }} />
                                    {PATHWAY_LABELS[sc.supportPathway]}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: oColor, backgroundColor: `${oColor}12` }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: oColor }} />
                                    {OUTCOME_LABELS[sc.outcome] || sc.outcome}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {sc.aeDetected && <span className="inline-flex rounded-full bg-[#FF7D7810] px-2 py-0.5 text-[10px] font-bold text-[#FF7D78] border border-[#FF7D7830]">AE</span>}
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: PX.textPrimary }}>{fmtDuration(sc.duration)}</td>
                                <td className="px-4 py-3">
                                  <div className="text-xs" style={{ color: PX.textPrimary }}>{fmtTime(sc.timestamp)}</div>
                                  <div className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(sc.timestamp)}</div>
                                </td>
                              </tr>
                            );
                          })()}
                          {/* Additional context rows */}
                          {calls.filter(c => c.id !== storyData.call!.id).slice(0, 4).map((call) => {
                            const agentConf = AGENT_TYPE_LABELS[call.agentType];
                            const oColor = OUTCOME_COLORS[call.outcome] || PX.textMuted;
                            return (
                              <tr key={call.id} style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: call.contactType === 'patient' ? PX.teal : PX.navy }}>
                                      {initials(call.contactName)}
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold" style={{ color: PX.navy }}>{call.contactName}</div>
                                      <div className="text-[10px]" style={{ color: PX.textMuted }}>{call.contactType === 'patient' ? 'Patient' : 'HCP'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: agentConf.color, backgroundColor: `${agentConf.color}12` }}>{agentConf.label}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-semibold" style={{ color: TA_COLORS[call.therapeuticArea] }}>{TA_LABELS[call.therapeuticArea]}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: PATHWAY_COLORS[call.supportPathway] }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PATHWAY_COLORS[call.supportPathway] }} />
                                    {PATHWAY_LABELS[call.supportPathway]}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: oColor, backgroundColor: `${oColor}12` }}>
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: oColor }} />
                                    {OUTCOME_LABELS[call.outcome] || call.outcome}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {call.aeDetected && <span className="inline-flex rounded-full bg-[#FF7D7810] px-2 py-0.5 text-[10px] font-bold text-[#FF7D78] border border-[#FF7D7830]">AE</span>}
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: PX.textPrimary }}>{fmtDuration(call.duration)}</td>
                                <td className="px-4 py-3">
                                  <div className="text-xs" style={{ color: PX.textPrimary }}>{fmtTime(call.timestamp)}</div>
                                  <div className="text-[10px]" style={{ color: PX.textMuted }}>{fmtDate(call.timestamp)}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* KPI Impact */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Outcome</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: OUTCOME_COLORS[storyData.call.outcome] || PX.navy }}>
                        {OUTCOME_LABELS[storyData.call.outcome] || storyData.call.outcome}
                      </div>
                    </div>
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Duration</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: PX.navy }}>{fmtDuration(storyData.call.duration)}</div>
                    </div>
                    <div className="border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Engagement Score</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: PX.success }}>{storyData.call.liaisonSummary.engagementScore}%</div>
                    </div>
                    <div className="border bg-white p-4" style={{
                      borderColor: storyData.call.aeDetected ? '#FECACA' : PX.cardBorder,
                      boxShadow: PX.cardShadow,
                      backgroundColor: storyData.call.aeDetected ? '#FF7D7810' : 'white',
                    }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>AE Status</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: storyData.call.aeDetected ? PX.error : PX.success }}>
                        {storyData.call.aeDetected ? 'Detected' : 'None'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setStoryStep(0); setStoryAutoPlay(false); }}
                      className="px-5 py-2.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: PX.teal }}
                    >
                      Restart Storyboard
                    </button>
                    <button
                      onClick={() => setActiveTab('interaction-data')}
                      className="border px-5 py-2.5 text-xs font-semibold"
                      style={{ borderColor: PX.cardBorder, color: PX.navy }}
                    >
                      Open Full Call Log
                    </button>
                  </div>
                </div>
              )}

              {/* ===== STEP 5: Evidence Capture ===== */}
              {storyStep === storyboardSteps.length - 1 && currentCallHasScreening && storyData.call && (() => {
                const screeningResult = storyData.call.screeningResults?.find(
                  s => s.status === 'completed'
                );
                const cohortData = getCohortOutcomeData();
                const payerCard = getPayerEvidenceCard();
                const trajectory = cohortData.trajectory;

                return (
                  <div className="border bg-white p-6 space-y-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold" style={{ color: PX.navy }}>Evidence Capture &mdash; Real-World Data Generation</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '24px' }}>
                      {/* Left Column: This Call's Contribution */}
                      <div style={{ opacity: evidencePhase >= 1 ? 1 : 0, transition: 'opacity 0.4s ease-out' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>
                          This Call&apos;s Contribution
                        </div>
                        <div className="border p-4 space-y-3" style={{ borderColor: PX.cardBorder }}>
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color: PX.teal, backgroundColor: `${PX.teal}15` }}>
                            {screeningResult?.instrumentName || 'Screening Instrument'}
                          </span>
                          <div className="text-3xl font-bold" style={{ color: PX.navy }}>
                            {screeningResult?.totalScore ?? '—'}/{screeningResult?.maxScore ?? '—'}
                          </div>
                          <div className="text-xs" style={{ color: PX.textSecondary }}>
                            {screeningResult?.clinicalInterpretation || 'Score recorded'}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Population Evidence */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary, opacity: evidencePhase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease-out' }}>
                          Population Evidence
                        </div>
                        <div style={{ opacity: evidencePhase >= 2 ? 1 : 0, transition: 'opacity 0.4s ease-out' }}>
                          <div className="border p-4" style={{ borderColor: PX.cardBorder }}>
                            <div className="text-[10px] font-semibold mb-2" style={{ color: PX.textSecondary }}>
                              Cohort Improvement Trajectory (% from baseline)
                            </div>
                            <EvidenceMiniChart
                              data={trajectory}
                              patientScore={screeningResult?.totalScore}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3" style={{ opacity: evidencePhase >= 4 ? 1 : 0, transition: 'opacity 0.4s ease-out' }}>
                          <div className="border p-3" style={{ borderColor: PX.cardBorder }}>
                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Enrolled</div>
                            <div className="text-xl font-bold mt-1" style={{ color: PX.teal }}>{evidenceCounter}</div>
                            <div className="text-[10px]" style={{ color: PX.textMuted }}>patients in RWE dataset</div>
                          </div>
                          <div className="border p-3" style={{ borderColor: PX.cardBorder }}>
                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Headline</div>
                            <div className="text-sm font-bold mt-1" style={{ color: PX.navy }}>{payerCard.headline}</div>
                            <div className="text-[10px]" style={{ color: PX.textMuted }}>{payerCard.meanImprovementPct}% mean improvement at 90d</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="text-xs text-center mt-4" style={{ color: PX.textMuted, opacity: evidencePhase >= 4 ? 1 : 0, transition: 'opacity 0.4s ease-out' }}>
                      Every screening administered generates clinical evidence. This patient&apos;s score joins {evidenceCounter} others in a continuously updated real-world evidence dataset.
                    </div>
                  </div>
                );
              })()}

              {/* Empty state */}
              {(!storyData.contact || !storyData.call) && (
                <div className="border bg-white px-6 py-16 text-center" style={{ borderColor: PX.cardBorder }}>
                  <div className="text-base font-semibold" style={{ color: PX.textSecondary }}>Loading storyboard data...</div>
                  <div className="text-xs mt-2" style={{ color: PX.textMuted }}>Waiting for contact and call data to load.</div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStoryStep(s => Math.max(0, s - 1)); setStoryAutoPlay(false); }}
                disabled={storyStep === 0}
                className="border px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: PX.cardBorder, color: PX.navy }}
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {storyboardSteps.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: i === storyStep ? '24px' : '6px', backgroundColor: i === storyStep ? PX.teal : i < storyStep ? PX.navy : PX.cardBorder }} />
                ))}
              </div>
              <button
                onClick={() => { setStoryStep(s => Math.min(storyboardSteps.length - 1, s + 1)); setStoryAutoPlay(false); }}
                disabled={storyStep === storyboardSteps.length - 1}
                className="px-5 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: PX.teal }}
              >
                Next
              </button>
            </div>

            {/* ---- TRY IT LIVE ---- */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: PX.navyDeep }}>Try It Live</h3>
                <p className="mt-1 text-xs" style={{ color: PX.textSecondary }}>Place a real outbound call using the selected agent configuration.</p>
              </div>

              {/* Agent type buttons */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: PX.textSecondary }}>Agent Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'] as AgentType[]).map((at) => {
                    const conf = AGENT_TYPE_LABELS[at];
                    const isActive = configAgent === at;
                    return (
                      <button
                        key={`live-${at}`}
                        onClick={() => { setConfigAgent(at); setConfigScenario(''); }}
                        className={cn('px-3 py-1.5 text-xs font-semibold transition-all border', isActive ? 'text-white' : '')}
                        style={{
                          backgroundColor: isActive ? conf.color : 'white',
                          color: isActive ? 'white' : conf.color,
                          borderColor: isActive ? conf.color : PX.cardBorder,
                        }}
                      >
                        {conf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scenario dropdown */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: PX.textSecondary }}>Scenario</label>
                <select
                  value={configScenario}
                  onChange={(e) => setConfigScenario(e.target.value)}
                  className="w-full border px-3 py-2 text-sm outline-none transition-colors focus:border-current"
                  style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
                >
                  <option value="">Select a scenario...</option>
                  {(demoScenarios[configAgent] || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.label} — {s.description}</option>
                  ))}
                </select>
              </div>

              {/* Phone number + Contact name row */}
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: PX.textSecondary }}>Phone Number</label>
                  <div className="flex border" style={{ borderColor: configPhone.length > 2 && !isValidUSPhone(configPhone) ? PX.coral : PX.cardBorder }}>
                    <span className="flex items-center px-3 text-xs font-semibold" style={{ backgroundColor: PX.bg, color: PX.textSecondary, borderRight: `1px solid ${PX.cardBorder}` }}>+1</span>
                    <input
                      type="tel"
                      value={configPhone.startsWith('+1') ? configPhone.slice(2) : configPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setConfigPhone(`+1${digits}`);
                      }}
                      placeholder="2125551234"
                      className="flex-1 px-3 py-2 text-sm outline-none"
                      style={{ color: PX.textPrimary }}
                    />
                  </div>
                  {configPhone.length > 2 && !isValidUSPhone(configPhone) && (
                    <p className="mt-1 text-xs" style={{ color: PX.coral }}>Enter a valid 10-digit US number</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold" style={{ color: PX.textSecondary }}>Contact Name <span style={{ color: PX.textMuted }}>(optional)</span></label>
                  <input
                    type="text"
                    value={liveContactName}
                    onChange={(e) => setLiveContactName(e.target.value)}
                    placeholder="e.g. Dr. Smith"
                    className="w-full border px-3 py-2 text-sm outline-none transition-colors focus:border-current"
                    style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
                  />
                </div>
              </div>

              {/* Place Call button + cost note */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleLiveCall}
                  disabled={!isValidUSPhone(configPhone) || !configScenario || !!liveCallSid}
                  className="px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: PX.teal }}
                >
                  {liveCallSid ? 'Call In Progress...' : 'Place Call'}
                </button>
                <span className="text-xs" style={{ color: PX.textMuted }}>~$0.10 per call</span>
              </div>

              {/* Call status indicator */}
              {(demoCallStatus || liveCallSid || liveCallStatus || liveCallResult) && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: PX.cardBorder }}>
                  {/* Initiating state */}
                  {demoCallStatus === 'Initiating...' && !liveCallSid && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin border-2 border-t-transparent" style={{ borderColor: PX.teal, borderTopColor: 'transparent', borderRadius: '50%' }} />
                      <span className="text-sm font-semibold" style={{ color: PX.navy }}>Initiating...</span>
                    </div>
                  )}

                  {/* Simulated / error from demoCallStatus */}
                  {demoCallStatus && demoCallStatus !== 'Initiating...' && !liveCallSid && !liveCallResult && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: demoCallStatus.startsWith('Error') ? PX.coral : PX.textSecondary }}>{demoCallStatus}</span>
                    </div>
                  )}

                  {/* Polling states: call in progress */}
                  {liveCallSid && (!liveCallStatus || liveCallStatus === 'queued') && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin border-2 border-t-transparent" style={{ borderColor: PX.teal, borderTopColor: 'transparent', borderRadius: '50%' }} />
                      <span className="text-sm font-semibold" style={{ color: PX.navy }}>Initiating call...</span>
                    </div>
                  )}

                  {liveCallSid && (liveCallStatus === 'initiated' || liveCallStatus === 'ringing') && (
                    <div className="flex items-center gap-2">
                      <div className="relative h-3 w-3">
                        <div className="absolute inset-0 animate-ping opacity-75" style={{ backgroundColor: PX.gold, borderRadius: '50%' }} />
                        <div className="relative h-3 w-3" style={{ backgroundColor: PX.gold, borderRadius: '50%' }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: PX.navy }}>Ringing...</span>
                    </div>
                  )}

                  {liveCallSid && liveCallStatus === 'in-progress' && (
                    <div className="flex items-center gap-2">
                      <div className="relative h-3 w-3">
                        <div className="absolute inset-0 animate-ping opacity-75" style={{ backgroundColor: PX.success, borderRadius: '50%' }} />
                        <div className="relative h-3 w-3" style={{ backgroundColor: PX.success, borderRadius: '50%' }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: PX.success }}>Connected</span>
                    </div>
                  )}

                  {/* Terminal states */}
                  {liveCallResult && (
                    <div className="space-y-2">
                      {liveCallResult.outcome === 'no-answer' || liveCallStatus === 'no-answer' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: PX.coral }}>No Answer</span>
                          {liveCallResult.duration != null && (
                            <span className="text-xs" style={{ color: PX.textMuted }}>{liveCallResult.duration}s</span>
                          )}
                        </div>
                      ) : liveCallStatus === 'failed' || liveCallStatus === 'busy' || liveCallStatus === 'canceled' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: PX.coral }}>
                            {liveCallStatus === 'failed' ? 'Call Failed' : liveCallStatus === 'busy' ? 'Line Busy' : 'Call Canceled'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold" style={{ color: PX.success }}>Call Complete</span>
                            {liveCallResult.outcome && (
                              <span className="border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: PX.teal, color: PX.teal, backgroundColor: PX.tealBg }}>
                                {OUTCOME_LABELS[liveCallResult.outcome] || liveCallResult.outcome}
                              </span>
                            )}
                            {liveCallResult.duration != null && (
                              <span className="text-xs" style={{ color: PX.textMuted }}>{Math.floor(liveCallResult.duration / 60)}m {liveCallResult.duration % 60}s</span>
                            )}
                          </div>
                          {liveCallResult.summary && (
                            <p className="text-xs leading-relaxed" style={{ color: PX.textSecondary }}>{liveCallResult.summary}</p>
                          )}
                          <button
                            onClick={() => { setActiveTab('interaction-data'); setLiveCallResult(null); setLiveCallStatus(null); }}
                            className="border px-4 py-1.5 text-xs font-semibold transition-all"
                            style={{ borderColor: PX.teal, color: PX.teal }}
                          >
                            View in Call Log
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- OUTCOMES & EVIDENCE TAB ---- */}
        {activeTab === 'outcomes-evidence' && (() => {
          const cohort = getCohortOutcomeData();
          const payer = getPayerEvidenceCard();
          const trajectory = cohort.trajectory;
          const baselineMean = trajectory[0]?.mean ?? 0;

          const persistenceData = [
            { label: 'Enrolled', pct: 100, n: cohort.totalEnrolled },
            { label: '30-day', pct: Math.round(cohort.persistenceRate['30d'] * 100), n: Math.round(cohort.totalEnrolled * cohort.persistenceRate['30d']) },
            { label: '60-day', pct: Math.round(cohort.persistenceRate['60d'] * 100), n: Math.round(cohort.totalEnrolled * cohort.persistenceRate['60d']) },
            { label: '90-day', pct: Math.round(cohort.persistenceRate['90d'] * 100), n: Math.round(cohort.totalEnrolled * cohort.persistenceRate['90d']) },
          ];

          const disconReasons = [
            { label: 'Cost', pct: 34 },
            { label: 'Side effects', pct: 28 },
            { label: 'Insufficient efficacy', pct: 22 },
            { label: 'Other', pct: 16 },
          ];

          const confidenceColors: Record<string, { text: string; bg: string; border: string }> = {
            HIGH: { text: PX.success, bg: `${PX.success}10`, border: `${PX.success}30` },
            MODERATE: { text: PX.warning, bg: `${PX.warning}10`, border: `${PX.warning}30` },
            LOW: { text: PX.coral, bg: `${PX.coral}10`, border: `${PX.coral}30` },
          };

          return (
            <div className="space-y-6 animate-fade-in">
              <div>
                <p className="text-sm" style={{ color: PX.textSecondary }}>
                  Real-world evidence generated from hub interactions. Outcome trajectories, therapy persistence, and payer-ready evidence summaries — powered by screening data collected during routine patient support calls.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ===== Panel 1: Cohort Trajectory ===== */}
                <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <h2 className="text-base font-bold mb-1" style={{ color: PX.navy }}>Score Trajectory — {brand.products[0]?.brandName ?? 'Primary'} Cohort</h2>
                  <p className="text-xs mb-4" style={{ color: PX.textMuted }}>Mean % improvement from baseline (95% CI shaded)</p>
                  <EvidenceFullChart data={trajectory} />
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <span className="text-xs px-3 py-1.5 font-semibold" style={{ backgroundColor: `${PX.navy}08`, color: PX.navy, border: `1px solid ${PX.navy}20` }}>
                      Baseline: {baselineMean.toFixed(1)}
                    </span>
                    {trajectory.slice(1).map(tp => {
                      const impr = ((baselineMean - tp.mean) / baselineMean) * 100;
                      return (
                        <span key={tp.timepoint} className="text-xs px-3 py-1.5 font-semibold" style={{ backgroundColor: `${PX.teal}10`, color: PX.teal, border: `1px solid ${PX.teal}30` }}>
                          {tp.timepoint}: {impr.toFixed(0)}% improved
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* ===== Panel 2: Therapy Persistence ===== */}
                <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <h2 className="text-base font-bold mb-1" style={{ color: PX.navy }}>Therapy Persistence — {brand.products[0]?.brandName ?? 'Primary'} Cohort</h2>
                  <p className="text-xs mb-5" style={{ color: PX.textMuted }}>Patients remaining on therapy at each timepoint</p>
                  <div className="space-y-3">
                    {persistenceData.map((d, i) => (
                      <div key={d.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color: PX.navy }}>{d.label}</span>
                          <span className="text-xs font-bold" style={{ color: PX.teal }}>{d.pct}% <span style={{ color: PX.textMuted, fontWeight: 400 }}>(n={d.n})</span></span>
                        </div>
                        <div className="h-6 w-full rounded-sm" style={{ backgroundColor: `${PX.teal}08` }}>
                          <div
                            className="h-full rounded-sm transition-all duration-700"
                            style={{
                              width: `${d.pct}%`,
                              backgroundColor: PX.teal,
                              opacity: 1 - (i * 0.15),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${PX.cardBorder}` }}>
                    <h3 className="text-xs font-bold mb-3" style={{ color: PX.navy }}>Discontinuation Reasons</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {disconReasons.map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs px-3 py-2" style={{ backgroundColor: `${PX.coral}06`, border: `1px solid ${PX.coral}15` }}>
                          <span style={{ color: PX.textSecondary }}>{r.label}</span>
                          <span className="font-bold" style={{ color: PX.coral }}>{r.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ===== Panel 3: Payer Evidence Card ===== */}
                <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow, borderLeft: `4px solid ${PX.teal}` }}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h2 className="text-base font-bold" style={{ color: PX.navy }}>Real-World Evidence Summary</h2>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: PX.teal }}>{brand.products[0]?.brandName ?? 'Primary'} ({brand.products[0]?.genericName ?? ''}) — {brand.products[0]?.therapeuticAreaLabel ?? ''}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-medium px-2 py-0.5" style={{ backgroundColor: PX.tealBg, color: PX.teal }}>{brand.companyName.toUpperCase()}</div>
                    </div>
                  </div>
                  <p className="text-[10px] mb-5" style={{ color: PX.textMuted }}>Generated {new Date(payer.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                  <div className="text-xs font-semibold px-3 py-2 mb-5" style={{ backgroundColor: `${PX.teal}08`, color: PX.navy, borderLeft: `3px solid ${PX.teal}` }}>
                    {payer.headline}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Cohort Size', value: `n=${payer.cohortSize}`, sub: `${brand.products[0]?.brandName ?? 'Drug'}-treated patients` },
                      { label: 'Mean Improvement', value: `${payer.meanImprovementPct.toFixed(1)}%`, sub: `95% CI: [${payer.ci95[0].toFixed(1)}%, ${payer.ci95[1].toFixed(1)}%]` },
                      { label: '90-Day Persistence', value: `${(payer.persistenceRate90d * 100).toFixed(0)}%`, sub: 'On therapy at 90 days' },
                      { label: 'Adherence Rate', value: `${(payer.adherenceRate90d * 100).toFixed(0)}%`, sub: 'MMAS-4 adherent at 90d' },
                      { label: 'AE Incidence', value: `${(payer.aeRate * 100).toFixed(1)}%`, sub: 'Any adverse event' },
                      { label: 'Serious AE', value: `${(payer.seriousAeRate * 100).toFixed(1)}%`, sub: 'SAE requiring intervention' },
                    ].map(m => (
                      <div key={m.label} className="text-center p-3" style={{ backgroundColor: `${PX.navy}04`, border: `1px solid ${PX.cardBorder}` }}>
                        <div className="text-[10px] font-medium mb-1" style={{ color: PX.textMuted }}>{m.label}</div>
                        <div className="text-lg font-bold" style={{ color: PX.navy }}>{m.value}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: PX.textMuted }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-3 text-[9px]" style={{ borderTop: `1px solid ${PX.cardBorder}`, color: PX.textMuted }}>
                    Data source: Vi Operate patient engagement platform. Observational cohort, not a controlled trial. Validated screening instrument administered via AI voice agent. All scores subject to confirmation by treating physician.
                  </div>
                </div>

                {/* ===== Panel 4: Contract Simulator ===== */}
                <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <h2 className="text-base font-bold mb-1" style={{ color: PX.navy }}>Outcomes-Based Contract Simulator</h2>
                  <p className="text-xs mb-5" style={{ color: PX.textMuted }}>Adjust thresholds to model rebate exposure in real time</p>

                  <div className="space-y-5">
                    {/* Threshold slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: PX.navy }}>Required Score Improvement</label>
                        <span className="text-sm font-bold tabular-nums" style={{ color: PX.teal }}>{contractThreshold}%</span>
                      </div>
                      <input
                        type="range" min={20} max={50} step={1}
                        value={contractThreshold}
                        onChange={e => setContractThreshold(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${PX.teal} ${((contractThreshold - 20) / 30) * 100}%, ${PX.cardBorder} ${((contractThreshold - 20) / 30) * 100}%)`,
                          accentColor: PX.teal,
                        }}
                      />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: PX.textMuted }}>
                        <span>20%</span><span>50%</span>
                      </div>
                    </div>

                    {/* Rebate slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold" style={{ color: PX.navy }}>Rebate if Threshold Not Met</label>
                        <span className="text-sm font-bold tabular-nums" style={{ color: PX.teal }}>{contractRebate}%</span>
                      </div>
                      <input
                        type="range" min={25} max={75} step={5}
                        value={contractRebate}
                        onChange={e => setContractRebate(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${PX.teal} ${((contractRebate - 25) / 50) * 100}%, ${PX.cardBorder} ${((contractRebate - 25) / 50) * 100}%)`,
                          accentColor: PX.teal,
                        }}
                      />
                      <div className="flex justify-between text-[10px] mt-1" style={{ color: PX.textMuted }}>
                        <span>25%</span><span>75%</span>
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="mt-5 pt-5 space-y-3" style={{ borderTop: `1px solid ${PX.cardBorder}` }}>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3" style={{ backgroundColor: `${PX.success}08`, border: `1px solid ${PX.success}20` }}>
                        <div className="text-lg font-bold" style={{ color: PX.success }}>{contractResults.meeting}</div>
                        <div className="text-[10px]" style={{ color: PX.textMuted }}>Meeting threshold</div>
                      </div>
                      <div className="text-center p-3" style={{ backgroundColor: `${PX.coral}08`, border: `1px solid ${PX.coral}20` }}>
                        <div className="text-lg font-bold" style={{ color: PX.coral }}>{contractResults.notMeeting}</div>
                        <div className="text-[10px]" style={{ color: PX.textMuted }}>Not meeting</div>
                      </div>
                      <div className="text-center p-3" style={{ backgroundColor: `${PX.teal}08`, border: `1px solid ${PX.teal}20` }}>
                        <div className="text-lg font-bold" style={{ color: PX.teal }}>{(contractResults.pctMeeting * 100).toFixed(0)}%</div>
                        <div className="text-[10px]" style={{ color: PX.textMuted }}>Success rate</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3" style={{ backgroundColor: `${PX.navy}04`, border: `1px solid ${PX.cardBorder}` }}>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: PX.navy }}>Rebate Exposure</div>
                        <div className="text-[10px]" style={{ color: PX.textMuted }}>% of WAC at risk</div>
                      </div>
                      <div className="text-xl font-bold tabular-nums" style={{ color: PX.navy }}>{(contractResults.rebateExposure * 100).toFixed(1)}%</div>
                    </div>

                    <div className="flex items-center justify-between p-3" style={{ backgroundColor: confidenceColors[contractResults.confidence].bg, border: `1px solid ${confidenceColors[contractResults.confidence].border}` }}>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: PX.navy }}>Contract Confidence</div>
                        <div className="text-[10px]" style={{ color: PX.textMuted }}>Based on {contractResults.eligible} evaluable patients</div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1" style={{ color: confidenceColors[contractResults.confidence].text, backgroundColor: confidenceColors[contractResults.confidence].bg, border: `1px solid ${confidenceColors[contractResults.confidence].border}` }}>
                        {contractResults.confidence}
                      </span>
                    </div>

                    <p className="text-[10px]" style={{ color: PX.textMuted }}>
                      {contractResults.dropped} patients excluded (no 90-day score — dropouts or pending assessment).
                    </p>
                  </div>
                </div>
              </div>

              {/* Secondary product placeholder */}
              {brand.products.length > 1 && (
                <div className="border bg-white p-5 text-center" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <p className="text-xs" style={{ color: PX.textMuted }}>
                    {TA_LABELS[brand.products[1].therapeuticArea] ?? brand.products[1].therapeuticAreaLabel} outcomes tracking will appear here once data populates the evidence engine. Currently pre-launch.
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ---- IMPLEMENTATION & COMPLIANCE TAB ---- */}
        {activeTab === 'implementation' && (
          <div className="space-y-8 animate-fade-in">

            {/* Regulatory & Compliance Readiness — compact grid */}
            <div className="border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              {(() => {
                const categories = [
                  { title: 'FDA / Pharmacovigilance', items: [
                    { key: 'fda-ae', text: 'AE detection across all 4 agent types' },
                    { key: 'fda-icsr', text: 'ICSR minimum elements (21 CFR 314.80)' },
                    { key: 'fda-15day', text: '15-day expedited reporting for serious AEs' },
                    { key: 'fda-preg', text: 'Pregnancy exposure detection + registry' },
                    { key: 'fda-ai', text: 'Post-call AI classification safety net' },
                    { key: 'fda-cssrs', text: 'C-SSRS suicidality screening' },
                    { key: 'fda-ret', text: '10-year transcript retention (Part 11)' },
                    { key: 'fda-hitl', text: 'Human-in-the-loop safety escalation' },
                  ]},
                  { title: 'HIPAA / PHI', items: [
                    { key: 'h-token', text: 'PHI tokenization at rest + in transit' },
                    { key: 'h-baa', text: `BAA with ${brand.shortName}` },
                    { key: 'h-sub', text: 'BAA with sub-processors' },
                    { key: 'h-min', text: 'Minimum necessary PHI access' },
                    { key: 'h-audit', text: 'Audit trail with access controls' },
                  ]},
                  { title: 'State Privacy', items: [
                    { key: 's-ccpa', text: 'CCPA/CPRA for CA patients' },
                    { key: 's-bipa', text: 'BIPA for voice recordings' },
                    { key: 's-consent', text: 'Two-party consent disclosure' },
                  ]},
                  { title: 'Telecommunications', items: [
                    { key: 't-10dlc', text: 'A2P 10DLC SMS registration' },
                    { key: 't-tcpa', text: 'TCPA consent tracking' },
                    { key: 't-dnc', text: 'Do-Not-Call list scrubbing' },
                    { key: 't-opt', text: 'Opt-out handling (STOP/HELP)' },
                  ]},
                  { title: 'Data Governance', items: [
                    { key: 'd-uc', text: 'Unity Catalog access controls' },
                    { key: 'd-ev', text: 'Structured events + audit lineage' },
                    { key: 'd-ret', text: 'FDA-aligned retention policies' },
                    { key: 'd-port', text: `Data portability (${brand.shortName}-owned)` },
                  ]},
                  { title: 'AI Governance', items: [
                    { key: 'a-inj', text: 'Prompt injection protection' },
                    { key: 'a-adv', text: 'No AI medical advice' },
                    { key: 'a-guard', text: 'Configurable guardrails per agent' },
                    { key: 'a-off', text: 'Off-label detection + MSL routing' },
                    { key: 'a-bal', text: 'Fair balance enforcement' },
                    { key: 'a-doc', text: 'AI model risk documentation' },
                  ]},
                ];
                const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
                const checkedCount = categories.reduce((s, c) => s + c.items.filter(it => complianceChecks[it.key]).length, 0);
                return (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-lg font-bold" style={{ color: PX.navy }}>Regulatory &amp; Compliance Readiness</h2>
                        <p className="mt-1 text-sm" style={{ color: PX.textSecondary }}>Pre-launch checklist. {checkedCount} of {totalItems} items confirmed.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 flex items-center justify-center" style={{ backgroundColor: PX.teal }}><span className="text-[7px] font-bold text-white">&#10003;</span></div>
                          <span className="text-[10px]" style={{ color: PX.textMuted }}>Confirmed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-3 w-3 border" style={{ borderColor: PX.cardBorder }} />
                          <span className="text-[10px]" style={{ color: PX.textMuted }}>Pending</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {categories.map((cat) => {
                        const catDone = cat.items.filter(it => complianceChecks[it.key]).length;
                        const catTotal = cat.items.length;
                        const pct = catTotal > 0 ? catDone / catTotal : 0;
                        return (
                          <div key={cat.title} className="border p-4" style={{ borderColor: PX.cardBorder }}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PX.navy }}>{cat.title}</span>
                              <span className="text-[10px] font-semibold" style={{ color: pct === 1 ? PX.success : pct >= 0.5 ? PX.accent : PX.coral }}>{catDone}/{catTotal}</span>
                            </div>
                            <div className="h-1 w-full mb-3" style={{ backgroundColor: PX.cardBorder }}>
                              <div className="h-full transition-all duration-300" style={{ width: `${pct * 100}%`, backgroundColor: pct === 1 ? PX.success : pct >= 0.5 ? PX.teal : PX.coral }} />
                            </div>
                            <div className="space-y-1">
                              {cat.items.map((item) => {
                                const on = !!complianceChecks[item.key];
                                return (
                                  <button key={item.key} onClick={() => toggleCompliance(item.key)} className="flex items-center gap-2 w-full text-left group">
                                    <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-all duration-150 cursor-pointer group-hover:border-[#00B9CE]" style={{ backgroundColor: on ? PX.teal : 'transparent', border: on ? 'none' : `1px solid ${PX.cardBorder}` }}>
                                      {on && <span className="text-[8px] font-bold text-white">&#10003;</span>}
                                    </div>
                                    <span className="text-[10px] leading-tight" style={{ color: on ? PX.textPrimary : PX.textMuted }}>{item.text}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Header */}
            <div>
              <h2 className="text-lg font-bold" style={{ color: PX.navy }}>System Integration Architecture</h2>
              <p className="mt-1 text-sm" style={{ color: PX.textSecondary }}>
                How Vi Operate connects to {brand.shortName} systems of record. Every agent interaction produces structured data that flows downstream.
              </p>
            </div>

            {/* Architecture Diagram */}
            <div className="rounded-none border p-6" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
              <p className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: PX.textMuted }}>Data Flow Architecture</p>
              <div className="flex flex-col items-center gap-0">

                {/* Row 1: Interaction Layer */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {[
                    { icon: '📞', label: 'Voice Call', sub: 'Twilio + Deepgram' },
                    { icon: '💬', label: 'SMS', sub: 'Twilio Messaging' },
                    { icon: '🌐', label: 'Web Chat', sub: 'WebSocket' },
                    { icon: '📧', label: 'Email', sub: 'Triggered outbound' },
                  ].map((ch) => (
                    <div key={ch.label} className="flex flex-col items-center rounded-none border px-4 py-3 text-center" style={{ borderColor: PX.cardBorder, minWidth: '120px' }}>
                      <span className="text-xl">{ch.icon}</span>
                      <span className="mt-1 text-xs font-semibold" style={{ color: PX.navy }}>{ch.label}</span>
                      <span className="text-[10px]" style={{ color: PX.textMuted }}>{ch.sub}</span>
                    </div>
                  ))}
                </div>

                {/* Arrow down */}
                <div className="flex flex-col items-center py-2">
                  <div className="h-6 w-px" style={{ backgroundColor: PX.teal }} />
                  <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent" style={{ borderTopColor: PX.teal }} />
                </div>

                {/* Row 2: Vi Operate Core */}
                <div className="w-full max-w-3xl rounded-none border-2 p-5" style={{ borderColor: PX.teal, backgroundColor: `${PX.teal}08` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: PX.teal }}>Vi</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: PX.textMuted }}>Operate</span>
                    </div>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${PX.teal}15`, color: PX.teal }}>Interaction Layer</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: 'Patient Support', color: PX.teal, desc: 'Inbound support for patients and caregivers — refills, copay assistance, AE capture, nurse educator scheduling' },
                      { label: 'HCP Support', color: PX.navy, desc: 'Medical information line for HCPs — dosing, drug interactions, clinical data, safety reporting' },
                      { label: 'HCP Outbound', color: PX.blue, desc: 'Signal-driven outreach to physicians — clinical data sharing, sample requests, MSL connections' },
                      { label: 'MedComms QA', color: PX.accent, desc: 'Omnichannel medical information — handles inquiries from HCPs, patients, and caregivers via any channel' },
                    ].map((a) => (
                      <div key={a.label} className="rounded-none border px-3 py-3 text-center" style={{ borderColor: a.color, backgroundColor: `${a.color}10` }}>
                        <span className="text-[11px] font-bold" style={{ color: a.color }}>{a.label}</span>
                        <p className="mt-1 text-[9px] leading-snug" style={{ color: PX.textSecondary }}>{a.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Vi Pulse', sub: 'Real-time Transcription', color: PX.teal },
                      { label: 'Vi Operate', sub: 'AI Classification + AE Detection', color: PX.navy },
                      { label: 'Vi Engage', sub: 'Next Best Action Engine', color: PX.accent },
                    ].map((f) => (
                      <div key={f.label} className="rounded-none border px-2 py-1.5" style={{ borderColor: PX.cardBorder }}>
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: f.color }}>{f.label}</span>
                        <div className="text-[9px]" style={{ color: PX.textMuted }}>{f.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow down */}
                <div className="flex flex-col items-center py-2">
                  <div className="h-6 w-px" style={{ backgroundColor: PX.teal }} />
                  <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent" style={{ borderTopColor: PX.teal }} />
                </div>

                {/* Row 3: Structured Event Output */}
                <div className="w-full max-w-3xl rounded-none border px-5 py-4" style={{ borderColor: PX.navy, backgroundColor: `${PX.navy}08` }}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: PX.navy }}>Structured Event Payload (per interaction)</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
                    {[
                      'Call transcript',
                      'Outcome classification',
                      'Liaison summary',
                      'AE flag + narrative',
                      'Screening results',
                      'Sentiment score',
                      'Next best action',
                      'Competitive intel notes',
                      'Behavioral signals used',
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-1.5 text-[11px]" style={{ color: PX.textSecondary }}>
                        <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: PX.teal }} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow down - branching */}
                <div className="flex flex-col items-center py-2">
                  <div className="h-6 w-px" style={{ backgroundColor: PX.navy }} />
                  <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent" style={{ borderTopColor: PX.navy }} />
                </div>

                {/* Row 4: Middleware */}
                <div className="w-full max-w-xl rounded-none border-2 border-dashed px-5 py-4 text-center" style={{ borderColor: PX.accent }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: PX.accent }}>Databricks</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${PX.accent}15`, color: PX.accent }}>Ambit Data Foundations</span>
                  </div>
                  <p className="text-[10px]" style={{ color: PX.textMuted }}>Delta Lake storage &middot; Unity Catalog governance &middot; Transformation &amp; routing</p>
                </div>

                {/* Arrow down - branching to 3 */}
                <div className="flex items-end justify-center gap-0 w-full max-w-3xl">
                  <div className="flex flex-col items-center flex-1">
                    <div className="h-8 w-px" style={{ backgroundColor: PX.textMuted }} />
                    <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent" style={{ borderTopColor: PX.textMuted }} />
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <div className="h-8 w-px" style={{ backgroundColor: PX.textMuted }} />
                    <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent" style={{ borderTopColor: PX.textMuted }} />
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <div className="h-8 w-px" style={{ backgroundColor: PX.textMuted }} />
                    <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent" style={{ borderTopColor: PX.textMuted }} />
                  </div>
                </div>

                {/* Row 5: Downstream Systems */}
                <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-none border p-4" style={{ borderColor: PX.cardBorder }}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-none px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${PX.blue}12`, color: PX.blue }}>HCP</span>
                      <span className="text-xs font-semibold" style={{ color: PX.navy }}>Veeva CRM</span>
                    </div>
                    <ul className="space-y-1">
                      {['Call Report write-back', 'Activity logging', 'HCP account enrichment', 'Next best action triggers'].map((i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: PX.textSecondary }}>
                          <span className="mt-1 h-1 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: PX.blue }} />
                          {i}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PX.warning }} />
                      <span className="text-[10px] font-medium" style={{ color: PX.warning }}>Pending contract review</span>
                    </div>
                  </div>

                  <div className="rounded-none border p-4" style={{ borderColor: PX.cardBorder }}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-none px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${PX.teal}12`, color: PX.teal }}>Patient</span>
                      <span className="text-xs font-semibold" style={{ color: PX.navy }}>Salesforce Health Cloud</span>
                    </div>
                    <ul className="space-y-1">
                      {['Case creation per call', 'Care Plan updates', 'Hub enrollment records', 'Copay card activation'].map((i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: PX.textSecondary }}>
                          <span className="mt-1 h-1 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: PX.teal }} />
                          {i}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PX.teal }} />
                      <span className="text-[10px] font-medium" style={{ color: PX.teal }}>Recommended</span>
                    </div>
                  </div>

                  <div className="rounded-none border p-4" style={{ borderColor: PX.cardBorder }}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-none px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${PX.coral}12`, color: PX.coral }}>Safety</span>
                      <span className="text-xs font-semibold" style={{ color: PX.navy }}>PV System</span>
                    </div>
                    <ul className="space-y-1">
                      {['AE case auto-creation', 'Minimum reportable case data', '15-day expedited routing', 'Pregnancy exposure alerts'].map((i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: PX.textSecondary }}>
                          <span className="mt-1 h-1 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: PX.coral }} />
                          {i}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PX.error }} />
                      <span className="text-[10px] font-medium" style={{ color: PX.error }}>Regulatory requirement</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration Details Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

              {/* Salesforce Health Cloud */}
              <div className="rounded-none border p-5" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: PX.navy }}>Salesforce Health Cloud</h3>
                    <p className="text-[11px]" style={{ color: PX.textMuted }}>Patient Services Case Management</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: '#34A85310', color: PX.success }}>RECOMMENDED</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Write</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Case (per call)', 'Task (next action)', 'Activity (transcript)', 'CaregiverCarePlan', 'AE Alert'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Read (pre-call enrichment)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Patient demographics', 'Open cases', 'Enrollment status', 'Rx history', 'Prior auth status'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>Integration Method</p>
                    <p className="text-[11px]" style={{ color: PX.textSecondary }}>REST API (OAuth 2.0) &middot; Platform Events for inbound triggers &middot; Bulk API for batch sync</p>
                  </div>
                  <div className="rounded-none border px-3 py-2" style={{ borderColor: `${PX.success}40`, backgroundColor: `${PX.success}06` }}>
                    <p className="text-[11px]" style={{ color: PX.success }}>Mature API, excellent documentation, native pharma/life sciences data model. Standard OAuth. No known integration blockers.</p>
                  </div>
                </div>
              </div>

              {/* Veeva CRM */}
              <div className="rounded-none border p-5" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: PX.navy }}>Veeva CRM</h3>
                    <p className="text-[11px]" style={{ color: PX.textMuted }}>HCP Engagement &amp; Commercial</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: '#DE7D0010', color: '#92400E' }}>REVIEW CONTRACT</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Write</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Call Report', 'Medical Inquiry', 'Activity', 'Competitive Intel note'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Read (pre-call enrichment)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['HCP account profile', 'NPI / specialty', 'Prescribing volume', 'Sample history', 'Speaker program status'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>Integration Method</p>
                    <p className="text-[11px]" style={{ color: PX.textSecondary }}>Veeva Vault API / CRM API &middot; Veeva Network for HCP master data &middot; Via Databricks recommended</p>
                  </div>
                  <div className="rounded-none border px-3 py-2" style={{ borderColor: `${PX.warning}40`, backgroundColor: `${PX.warning}06` }}>
                    <p className="text-[11px]" style={{ color: '#92400E' }}>Functional API but historically restrictive on third-party write access. Contract language must explicitly permit agent-driven write-back. Routing via Databricks mitigates lock-in risk.</p>
                  </div>
                </div>
              </div>

              {/* Databricks */}
              <div className="rounded-none border p-5" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: PX.navy }}>Databricks</h3>
                    <p className="text-[11px]" style={{ color: PX.textMuted }}>Data Foundation &amp; Integration Bus</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: `${PX.blue}12`, color: PX.blue }}>MIDDLEWARE</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>Role in Architecture</p>
                    <p className="text-[11px]" style={{ color: PX.textSecondary }}>
                      Ambit&apos;s data foundations team manages the Databricks layer. Vi Operate pushes structured events here. Databricks transforms and routes to downstream systems (Veeva, Salesforce, PV).
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Push</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Call events (Delta Lake)', 'Classification JSON', 'Transcript archives', 'Signal effectiveness data'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Receive (triggers)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Outbound call triggers', 'Signal enrichment updates', 'Contact list refreshes'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>Integration Method</p>
                    <p className="text-[11px]" style={{ color: PX.textSecondary }}>REST API &middot; Delta Lake write via Databricks SQL &middot; Jobs API for workflow triggers &middot; Unity Catalog governance</p>
                  </div>
                  <div className="rounded-none border px-3 py-2" style={{ borderColor: `${PX.success}40`, backgroundColor: `${PX.success}06` }}>
                    <p className="text-[11px]" style={{ color: PX.success }}>Excellent API, open ecosystem. Preferred routing layer to avoid direct CRM dependencies. Ambit team already building here.</p>
                  </div>
                </div>
              </div>

              {/* PV System */}
              <div className="rounded-none border p-5" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: PX.navy }}>Pharmacovigilance System</h3>
                    <p className="text-[11px]" style={{ color: PX.textMuted }}>Veeva Vault Safety / Oracle Argus</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: '#FF7D7810', color: PX.error }}>REGULATORY</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>What We Push</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['AE initial case', 'Reporter + patient ID', 'Suspect drug + dose', 'Event narrative', 'C-SSRS screen results', 'Pregnancy exposure'].map((t) => (
                        <span key={t} className="rounded-none border px-2 py-1 text-[10px]" style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: PX.textMuted }}>Regulatory Requirements</p>
                    <div className="space-y-1">
                      {[
                        { label: '15-day expedited reporting for serious AEs (21 CFR 314.80)', urgent: true },
                        { label: 'Minimum 4 elements: reporter, patient, drug, event', urgent: true },
                        { label: 'Pregnancy exposure registry reporting for anti-epileptic drugs', urgent: true },
                        { label: 'Post-call classification as AE detection safety net', urgent: false },
                      ].map((r) => (
                        <div key={r.label} className="flex items-start gap-1.5 text-[11px]" style={{ color: r.urgent ? PX.error : PX.textSecondary }}>
                          <span className="mt-0.5 text-[10px]">{r.urgent ? '!!' : '\u2022'}</span>
                          {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-none border px-3 py-2" style={{ borderColor: `${PX.error}40`, backgroundColor: `${PX.error}06` }}>
                    <p className="text-[11px]" style={{ color: PX.error }}>Non-negotiable. Every agent interaction is screened for AEs. Detected events are routed to Drug Safety within the call and via post-call classification as a secondary safety net.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Payload Schema */}
            <div className="rounded-none border p-5" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: PX.navy }}>Webhook Event Schema</h3>
                  <p className="text-[11px]" style={{ color: PX.textMuted }}>Every completed interaction emits a structured JSON event to configured endpoints</p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: `${PX.navy}10`, color: PX.navy }}>POST /webhook</span>
              </div>
              <pre className="overflow-x-auto rounded-none border p-4 text-[11px] leading-relaxed" style={{ backgroundColor: '#FAFAFA', borderColor: PX.cardBorder, color: PX.textSecondary, fontFamily: "'Roboto Mono', monospace" }}>
{`{
  "event": "call.completed",
  "timestamp": "2026-03-24T14:32:00Z",
  "callId": "uuid",
  "contactId": "uuid",

  // Classification (AI-generated)
  "outcome": "hub-enrolled",
  "confidence": 0.94,
  "supportPathway": "medication-access",
  "urgency": "routine",
  "sentiment": 78,

  // Liaison Summary
  "liaisonSummary": "Patient Margaret (62, ET) called regarding...",
  "nextAction": "Schedule nurse educator follow-up within 7 days",
  "keyMoments": ["Expressed concern about tremor progression", ...],
  "contactConcerns": ["Cost of medication", "Side effect worries"],

  // Safety
  "aeDetected": false,
  "aeDetails": null,
  "screeningResults": [...],

  // Competitive Intelligence
  "competitiveIntelNotes": [],

  // Full Data
  "transcript": [{ "speaker": "agent", "text": "...", "timestamp": 0 }, ...],
  "contact": { /* full ContactRecord */ },
  "behavioralSignalsReferenced": ["ADHERENCE_GAP"]
}`}
              </pre>
            </div>

            {/* Key Decisions / Action Items */}
            <div className="rounded-none border p-5" style={{ backgroundColor: PX.cardBg, borderColor: PX.cardBorder }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Integration Decision Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]" style={{ color: PX.textSecondary }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                      <th className="pb-2 pr-4 font-bold uppercase tracking-wider text-[10px]" style={{ color: PX.textMuted }}>Decision</th>
                      <th className="pb-2 pr-4 font-bold uppercase tracking-wider text-[10px]" style={{ color: PX.textMuted }}>Status</th>
                      <th className="pb-2 pr-4 font-bold uppercase tracking-wider text-[10px]" style={{ color: PX.textMuted }}>Owner</th>
                      <th className="pb-2 font-bold uppercase tracking-wider text-[10px]" style={{ color: PX.textMuted }}>Vi Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { decision: 'Patient CM system selection', status: 'In progress', statusColor: PX.warning, owner: 'Suzanne / Allison', rec: 'Salesforce Health Cloud — mature API, pharma data model, no lock-in risk' },
                      { decision: 'Veeva contract — agent write access', status: 'Pending', statusColor: PX.error, owner: 'Megan (Ironclad)', rec: 'Add clause: third-party agent systems can write Activities + Call Reports via API' },
                      { decision: 'Veeva contract — email engagement data', status: 'Pending', statusColor: PX.error, owner: 'Megan (Ironclad)', rec: 'Require: open/delivered events + raw reply text exported via API or Databricks' },
                      { decision: 'Databricks routing layer', status: 'Active', statusColor: PX.success, owner: 'Osuke / Ambit', rec: 'Route all Vi events through Databricks. Avoid direct CRM writes where possible.' },
                      { decision: 'PV system selection', status: 'TBD', statusColor: PX.textMuted, owner: 'Drug Safety', rec: 'Veeva Vault Safety or Oracle Argus — both have case intake APIs' },
                      { decision: 'Veeva long-term strategy', status: 'Strategic', statusColor: PX.blue, owner: 'Megan / Allison', rec: 'Short-term contract. Agents write THROUGH Veeva, not IN Veeva. Keep data portable.' },
                    ].map((row) => (
                      <tr key={row.decision} style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
                        <td className="py-2.5 pr-4 font-medium" style={{ color: PX.navy }}>{row.decision}</td>
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: row.statusColor }} />
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">{row.owner}</td>
                        <td className="py-2.5">{row.rec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Principle callout */}
            <div className="rounded-none border-l-2 py-4 pl-5 pr-4" style={{ borderColor: PX.teal, backgroundColor: `${PX.teal}06` }}>
              <p className="text-xs font-bold" style={{ color: PX.navy }}>Architecture Principle</p>
              <p className="mt-1 text-[12px] leading-relaxed" style={{ color: PX.textSecondary }}>
                Vi Operate is the <strong>interaction layer</strong>, not the system of record. It produces rich, structured data from every conversation and pushes it wherever {brand.shortName} needs it. CRMs become single sources of truth that agents write <em>back to</em> — not systems agents operate <em>within</em>.
              </p>
            </div>

          </div>
        )}
      </main>

      {/* ========== CALL DETAIL DRAWER ========== */}
      {selectedCall && (
        <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCallId(null)} taLabels={TA_LABELS} taColors={TA_COLORS} />
      )}
    </div>
  );
}
