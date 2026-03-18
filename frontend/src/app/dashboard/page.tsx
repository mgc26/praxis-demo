'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AgentType,
  AnalyticsResponse,
  CallRecord,
  ContactRecord,
  ContactSignalFeed,
  SupportPathwayId,
  TherapeuticArea,
  AgentPersona,
  InteractionOutcome,
} from '@/app/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = 'overview' | 'calls' | 'signals' | 'liaison' | 'performance' | 'agent-config';

// ---------------------------------------------------------------------------
// Praxis Design Tokens
// ---------------------------------------------------------------------------
const PX = {
  bg: '#F5F5F5',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E7EA',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
  teal: '#00B9CE',
  tealLight: '#25C8D9',
  tealBg: '#E0F7FA',
  navy: '#485D61',
  navyDeep: '#333F42',
  textPrimary: '#000000',
  textSecondary: '#485D61',
  textMuted: '#ACB0B3',
  btnDark: '#485D61',
  btnDarkHover: '#333F42',
  success: '#34A853',
  error: '#FF7D78',
  warning: '#DE7D00',
  purple: '#2C59AB',
  priorityHigh: '#FF7D78',
  priorityMedium: '#DE7D00',
  priorityLow: '#34A853',
  skelBase: '#E2E7EA',
  skelShimmer: '#F0F2F3',
  accent: '#DE7D00',
  gold: '#EFBC66',
  coral: '#FF7D78',
  blue: '#2C59AB',
} as const;

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
  'hub-enrolled': '#059669',
  'copay-card-issued': '#7C3AED',
  'ae-report-filed': '#DC2626',
  'adherence-counseling': '#0891B2',
  'sample-shipped': '#D97706',
  'medical-info-provided': '#485D61',
  'hcp-detail-completed': '#00B9CE',
  'prior-auth-initiated': '#F59E0B',
  'callback-requested': '#FB923C',
  'follow-up-scheduled': '#34D399',
  'declined': '#EF4444',
  'no-answer': '#94A3B8',
  'voicemail': '#A1A1AA',
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  HIGH: { text: PX.priorityHigh, bg: '#FEF2F2', border: '#FECACA' },
  MEDIUM: { text: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  LOW: { text: PX.priorityLow, bg: '#ECFDF5', border: '#A7F3D0' },
};

const TA_LABELS: Record<TherapeuticArea, string> = {
  'essential-tremor': 'ET / ELEX',
  'dee': 'DEE / Relutrigine',
};

const TA_COLORS: Record<TherapeuticArea, string> = {
  'essential-tremor': PX.teal,
  'dee': PX.purple,
};

const SIGNAL_LABELS: Record<string, string> = {
  SEARCH_INTENT: 'Search Intent',
  RX_PATTERN: 'Rx Pattern',
  CLAIMS_SIGNAL: 'Claims Signal',
  HCP_ACTIVITY: 'HCP Activity',
  ADHERENCE_SIGNAL: 'Adherence',
  COMPETITIVE_INTEL: 'Competitive Intel',
};

const SIGNAL_COLORS: Record<string, string> = {
  SEARCH_INTENT: '#0891B2',
  RX_PATTERN: PX.purple,
  CLAIMS_SIGNAL: PX.warning,
  HCP_ACTIVITY: PX.teal,
  ADHERENCE_SIGNAL: PX.error,
  COMPETITIVE_INTEL: PX.navy,
};

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------
const TAB_ITEMS: Array<{
  id: Tab;
  label: string;
  getBadge: (d: { calls: number; contacts: number; signals: number }) => string;
}> = [
  { id: 'overview', label: 'Overview', getBadge: () => '' },
  { id: 'calls', label: 'Call Log', getBadge: (d) => `${d.calls}` },
  { id: 'signals', label: 'Contact Signals', getBadge: (d) => `${d.signals}` },
  { id: 'liaison', label: 'Medical Liaison', getBadge: () => '' },
  { id: 'performance', label: 'System Performance', getBadge: () => '' },
  { id: 'agent-config', label: 'Agent Storyboard', getBadge: () => '' },
];

const STORYBOARD_STEPS = [
  { id: 'data-drop', label: 'Data Drop' },
  { id: 'agent-config', label: 'Agent Config' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'call-log', label: 'Call Log' },
] as const;

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
      className="rounded-xl border bg-white p-5"
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
}: {
  contact: ContactRecord;
  onInitiate: (id: string) => void;
}) {
  const priority = PRIORITY_COLORS[contact.priorityTier] || PRIORITY_COLORS.LOW;
  const taColor = TA_COLORS[contact.therapeuticArea] || PX.teal;
  const topSignal = contact.behavioralSignals[0];

  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-all duration-150 hover:shadow-sm"
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
            {TA_LABELS[contact.therapeuticArea]}
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
}: {
  call: CallRecord;
  onClose: () => void;
}) {
  const outcomeColor = OUTCOME_COLORS[call.outcome] || PX.textMuted;
  const agentConfig = AGENT_TYPE_LABELS[call.agentType];
  const taColor = TA_COLORS[call.therapeuticArea];

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
                  {TA_LABELS[call.therapeuticArea]}
                </span>
                {call.aeDetected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Adverse Event Report</div>
              <div className="text-sm text-red-800">{call.classification.aeNarrative}</div>
            </div>
          )}

          {/* Screening Results */}
          {call.screeningResults && call.screeningResults.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>Screening Results</div>
              {call.screeningResults.map((sr, idx) => (
                <div key={idx} className="rounded-lg border p-4 mb-2" style={{ borderColor: sr.isPositiveScreen ? '#FECACA' : PX.cardBorder, backgroundColor: sr.isPositiveScreen ? '#FEF2F2' : PX.cardBg }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: sr.isPositiveScreen ? PX.error : PX.textPrimary }}>{sr.instrumentName}</div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                      color: sr.status === 'completed' ? PX.success : sr.status === 'declined' ? PX.error : PX.warning,
                      backgroundColor: sr.status === 'completed' ? '#ECFDF5' : sr.status === 'declined' ? '#FEF2F2' : '#FFFBEB',
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

          {/* Liaison Summary */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>Medical Liaison Summary</div>
            <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: PX.cardBorder }}>
              <div className="flex items-center gap-3">
                <div className="text-xs font-semibold" style={{ color: PX.textSecondary }}>Engagement Score</div>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${call.liaisonSummary.engagementScore}%`, backgroundColor: call.liaisonSummary.engagementScore >= 75 ? PX.success : call.liaisonSummary.engagementScore >= 55 ? PX.warning : PX.error }} />
                </div>
                <span className="text-xs font-bold" style={{ color: PX.textPrimary }}>{call.liaisonSummary.engagementScore}%</span>
              </div>
              <div className="text-xs" style={{ color: PX.textPrimary }}>{call.liaisonSummary.callSummaryForLiaison}</div>
              {call.liaisonSummary.behavioralContextIndicators.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: PX.textSecondary }}>Context Indicators</div>
                  <div className="flex flex-wrap gap-1">
                    {call.liaisonSummary.behavioralContextIndicators.map((ind, ii) => (
                      <span key={ii} className="inline-block rounded-full px-2 py-0.5 text-[10px]" style={{ color: ind.includes('ADVERSE') || ind.includes('HIGH') ? PX.error : PX.textPrimary, backgroundColor: ind.includes('ADVERSE') || ind.includes('HIGH') ? '#FEF2F2' : '#F1F5F9' }}>
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {call.liaisonSummary.recommendedActions.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: PX.textSecondary }}>Recommended Actions</div>
                  <ul className="space-y-1">
                    {call.liaisonSummary.recommendedActions.map((a, ai) => (
                      <li key={ai} className="flex items-start gap-2 text-xs" style={{ color: PX.textPrimary }}>
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: PX.teal }} />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Transcript */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PX.textSecondary }}>
              Transcript ({call.transcript.length} messages)
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto rounded-lg border p-4" style={{ borderColor: PX.cardBorder }}>
              {call.transcript.map((entry, i) => (
                <div key={i} className={cn('flex gap-3', entry.speaker === 'agent' ? '' : 'flex-row-reverse')}>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: entry.speaker === 'agent' ? PX.teal : PX.navy }}
                  >
                    {entry.speaker === 'agent' ? 'Vi' : initials(call.contactName)}
                  </div>
                  <div className={cn('max-w-[80%] rounded-xl px-4 py-2.5', entry.speaker === 'agent' ? 'bg-[#E0F7FA]' : 'bg-[#F1F5F9]')}>
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
    high: { dot: PX.error, bg: '#FEF2F2' },
    warn: { dot: PX.warning, bg: '#FFFBEB' },
    success: { dot: PX.success, bg: '#ECFDF5' },
    info: { dot: PX.teal, bg: '#E0F7FA' },
  };

  return (
    <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: PX.navy }}>
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
            <div key={i} className="flex items-start gap-3 rounded-lg px-4 py-3 animate-slide-in" style={{ backgroundColor: accent.bg }}>
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
          <div key={i} className="rounded-xl border p-5" style={{ borderColor: PX.skelBase, backgroundColor: PX.skelShimmer }}>
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
// MAIN DASHBOARD
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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

  // ---- Agent Config state ----
  const [personas, setPersonas] = useState<Record<AgentType, AgentPersona> | null>(null);
  const [configAgent, setConfigAgent] = useState<AgentType>('patient-support');
  const [configScenario, setConfigScenario] = useState('');
  const [configPhone, setConfigPhone] = useState('+1');
  const [demoCallStatus, setDemoCallStatus] = useState<string | null>(null);

  // ---- Storyboard state ----
  const [storyStep, setStoryStep] = useState(0);
  const [storyAutoPlay, setStoryAutoPlay] = useState(false);
  const [dataDropPhase, setDataDropPhase] = useState(0);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [callLogHighlight, setCallLogHighlight] = useState(false);
  const [sliderAnimated, setSliderAnimated] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch('/api/persona');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPersonas(data as Record<AgentType, AgentPersona>);
    } catch { /* ignore */ }
  }, []);

  const loadDashboard = useCallback(async () => {
    await Promise.all([fetchAnalytics(), fetchCalls(), fetchContacts(), fetchPersonas()]);
  }, [fetchAnalytics, fetchCalls, fetchContacts, fetchPersonas]);

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
        body: JSON.stringify({ phoneNumber: configPhone, scenarioId: configScenario, agentType: configAgent }),
      });
      const data = await res.json();
      setDemoCallStatus(data.status === 'simulated' ? 'Simulated (backend offline)' : data.status === 'error' ? `Error: ${data.message}` : 'Call initiated!');
    } catch {
      setDemoCallStatus('Error connecting to backend');
    }
    setTimeout(() => setDemoCallStatus(null), 5000);
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
    const converted = filteredCalls.filter(c => ['hub-enrolled', 'copay-card-issued', 'ae-report-filed', 'adherence-counseling', 'sample-shipped', 'medical-info-provided', 'hcp-detail-completed', 'prior-auth-initiated', 'follow-up-scheduled'].includes(c.outcome)).length;
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
  const badgeData = { calls: calls.length, contacts: contacts.length, signals: signals.length };
  const loading = loadingAnalytics;

  // Demo scenarios
  const demoScenarios: Record<AgentType, Array<{ id: string; label: string; description: string }>> = {
    'patient-support': [
      { id: 'ps-hub-enroll', label: 'Hub Enrollment', description: 'New patient enrolling in Praxis Support Hub for ELEX' },
      { id: 'ps-copay', label: 'Copay Card Activation', description: 'Patient activating copay assistance for Relutrigine' },
      { id: 'ps-ae', label: 'AE Report', description: 'Patient reports adverse event during adherence check-in' },
      { id: 'ps-adherence', label: 'Adherence Check-in', description: 'Proactive adherence support call for ELEX patient' },
    ],
    'hcp-support': [
      { id: 'hcp-medinfo', label: 'Medical Inquiry', description: 'Neurologist requesting ELEX clinical trial data' },
      { id: 'hcp-sample', label: 'Sample Request', description: 'Movement disorder specialist requesting ELEX samples' },
      { id: 'hcp-formulary', label: 'Formulary Support', description: 'HCP needs prior auth support for Relutrigine' },
    ],
    'hcp-outbound': [
      { id: 'hco-detail', label: 'Product Detail', description: 'Proactive ELEX detail call to neurologist' },
      { id: 'hco-switch', label: 'Switch Opportunity', description: 'Competitive switch discussion for ET patients' },
      { id: 'hco-launch', label: 'Launch Update', description: 'Relutrigine launch update to epileptologist' },
    ],
    'medcomms-qa': [
      { id: 'mqa-review', label: 'Transcript Review', description: 'QA review of patient support interaction' },
      { id: 'mqa-offlabel', label: 'Off-Label Check', description: 'Off-label mention detection in HCP call' },
      { id: 'mqa-ae-audit', label: 'AE Audit', description: 'Audit AE capture completeness across interactions' },
    ],
  };

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
      { label: 'Patients on Therapy', value: `${c.patientsOnTherapy || 0} patients on ${c.drugProduct === 'euloxacaltenamide' ? 'ELEX' : 'Relutrigine'}` },
      { label: 'Prescribing Patterns', value: c.behavioralSignals.find(s => s.category === 'RX_PATTERN')?.detail || 'Standard prescriber' },
      { label: 'Behavioral Signals', value: c.behavioralSignals.map(s => s.detail).slice(0, 2).join('; ') },
      { label: 'Recommended Pathway', value: PATHWAY_LABELS[c.recommendedPathway] },
      { label: 'Priority Assessment', value: `${c.priorityTier} (Score: ${c.priorityScore})` },
    ];
  }, [storyData.contact]);

  // Reset storyboard on agent type change
  useEffect(() => {
    setStoryStep(0);
    setDataDropPhase(0);
    setConversationIndex(0);
    setCallLogHighlight(false);
    setStoryAutoPlay(false);
    setSliderAnimated(false);
  }, [configAgent]);

  // Data drop animation (step 0)
  useEffect(() => {
    if (storyStep !== 0 || storyDataDropItems.length === 0) return;
    setDataDropPhase(0);
    let phase = 0;
    const timer = setInterval(() => {
      phase++;
      setDataDropPhase(phase);
      if (phase >= storyDataDropItems.length) clearInterval(timer);
    }, 500);
    return () => clearInterval(timer);
  }, [storyStep, storyDataDropItems.length]);

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
    }, 2500);
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
      storyDataDropItems.length * 500 + 1500,
      4500,
      (storyData.call?.transcript.length || 8) * 2500 + 2000,
      4000,
      3000,
    ];
    const timer = setTimeout(() => {
      if (storyStep < 4) {
        setStoryStep(s => s + 1);
      } else {
        setStoryAutoPlay(false);
      }
    }, durations[storyStep]);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyAutoPlay, storyStep, storyDataDropItems.length]);

  // -- Auth loading --
  if (!authed) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: PX.bg }}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
            <div className="mx-auto h-14 w-14 animate-pulse rounded-xl" style={{ backgroundColor: PX.skelBase }} />
            <div className="mx-auto mt-6 h-6 w-48 animate-pulse rounded-full" style={{ backgroundColor: PX.skelBase }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PX.bg, color: PX.textPrimary }}>
      {/* Toast */}
      {outreachToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-4 shadow-lg animate-fade-in" style={{ borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }}>
          <div className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: PX.success }} />
          <div className="text-sm font-semibold" style={{ color: PX.success }}>Engagement initiated for {outreachToast}</div>
          <button onClick={() => setOutreachToast(null)} className="ml-2 text-xs font-semibold uppercase" style={{ color: PX.success }}>Dismiss</button>
        </div>
      )}

      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-6" style={{ backgroundColor: PX.navy }}>
        <div className="flex items-center gap-3">
          <img src="/brand-assets/praxis/logo-nav.png" alt="Praxis" className="h-7" />
          <span className="mx-1 text-white/30">|</span>
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: PX.teal }}>
              <span className="text-[9px] font-black text-white">P</span>
            </div>
            <span className="text-[13px] font-bold text-white/90">Praxis</span>
          </div>
          <span className="text-[12px] text-white/50">BioSciences</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: PX.success }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: PX.success }} />
            </span>
            <span className="text-[13px] text-white/90">Vi Agents Online</span>
          </div>
          <span className="text-[13px] text-white/60">Mar 17, 2026</span>
          <button onClick={handleLogout} className="rounded-md px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:bg-white/10 hover:text-white">Log Out</button>
        </div>
      </header>

      {/* ========== FILTERS BAR ========== */}
      <div className="sticky top-16 z-20 flex items-center gap-4 bg-white px-6 py-2" style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Agent:</span>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value as AgentType | 'all')}
            className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
          >
            <option value="all">All Agents</option>
            <option value="patient-support">Patient Support</option>
            <option value="hcp-support">HCP Support</option>
            <option value="hcp-outbound">HCP Outbound</option>
            <option value="medcomms-qa">MedComms QA</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Therapeutic Area:</span>
          <select
            value={taFilter}
            onChange={(e) => setTaFilter(e.target.value as TherapeuticArea | 'all')}
            className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}
          >
            <option value="all">All Areas</option>
            <option value="essential-tremor">ET / ELEX</option>
            <option value="dee">DEE / Relutrigine</option>
          </select>
        </div>
      </div>

      {/* ========== TAB NAVIGATION ========== */}
      <nav className="sticky top-[104px] z-20 bg-white" style={{ borderBottom: `1px solid ${PX.cardBorder}` }}>
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

        {/* ---- OVERVIEW TAB ---- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {loading ? <OverviewSkeleton /> : analytics ? (
              <>
                <AISummary analytics={analytics} calls={calls} contacts={contacts} />

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                  <KPICard label="Total Interactions" value={analytics.kpis.totalInteractions} color={PX.navy} />
                  <KPICard label="AE Reports Captured" value={analytics.kpis.aeReportsCaptured} color={PX.error} sub="Pharmacovigilance" />
                  <KPICard label="Hub Enrollments" value={analytics.kpis.hubEnrollments} color={PX.teal} />
                  <KPICard label="Copay Cards Issued" value={analytics.kpis.copayCardsIssued} color={PX.purple} />
                  <KPICard label="HCP Engagements" value={analytics.kpis.hcpEngagements} color={PX.navy} />
                  <KPICard label="Engagement Rate" value={`${analytics.kpis.engagementRate}%`} color={PX.success} />
                  <KPICard label="Sample Requests" value={analytics.kpis.sampleRequests} color={PX.warning} />
                  <KPICard label="Avg Handle Time" value={fmtDuration(analytics.kpis.avgHandleTime)} color={PX.textPrimary} />
                  <KPICard label="Adherence Rate" value={`${analytics.kpis.adherenceRate}%`} color={PX.teal} />
                  <KPICard label="Medical Inquiries" value={analytics.kpis.medicalInquiries} color={PX.navy} />
                </div>

                {/* Two-column: Contact queue + Funnel */}
                <div className="grid gap-6 xl:grid-cols-5">
                  {/* Left: Contact Queue */}
                  <div className="xl:col-span-3">
                    <div className="h-full rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Contact Engagement Queue</div>
                          <p className="mt-1 text-sm" style={{ color: PX.textPrimary }}>Patients and HCPs ranked by priority score.</p>
                        </div>
                        <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ color: PX.error, backgroundColor: '#FEF2F2' }}>
                          {contacts.filter(c => c.priorityTier === 'HIGH').length} HIGH
                        </span>
                      </div>
                      {loadingContacts ? (
                        <div className="space-y-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-xl" style={{ backgroundColor: PX.skelShimmer }} />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {contacts.slice(0, 8).map((c) => (
                            <ContactRow key={c.contactId} contact={c} onInitiate={handleInitiateOutreach} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Engagement Funnel + Pathway Breakdown */}
                  <div className="xl:col-span-2 space-y-6">
                    {/* Funnel */}
                    <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: PX.textSecondary }}>Engagement Funnel</div>
                      {[
                        { label: 'Signals Detected', value: funnel.signalsDetected, color: PX.textMuted },
                        { label: 'Outreach Initiated', value: funnel.outreachInitiated, color: PX.navy },
                        { label: 'Contact Engaged', value: funnel.engaged, color: PX.teal },
                        { label: 'Action Completed', value: funnel.converted, color: PX.success },
                      ].map((step, si) => {
                        const pct = funnel.signalsDetected > 0 ? (step.value / funnel.signalsDetected) * 100 : 0;
                        return (
                          <div key={si} className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium" style={{ color: PX.textPrimary }}>{step.label}</span>
                              <span className="text-xs font-bold" style={{ color: step.color }}>{step.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: step.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pathway Breakdown */}
                    <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: PX.textSecondary }}>Support Pathway Breakdown</div>
                      <div className="space-y-3">
                        {pathwayStats.map((ps) => (
                          <div key={ps.id} className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PATHWAY_COLORS[ps.id] }} />
                            <span className="text-xs font-medium flex-1 truncate" style={{ color: PX.textPrimary }}>{PATHWAY_LABELS[ps.id]}</span>
                            <span className="text-xs font-bold" style={{ color: PX.textPrimary }}>{ps.count}</span>
                            <span className="text-[10px]" style={{ color: PX.success }}>{ps.converted} converted</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border bg-white px-6 py-16 text-center" style={{ borderColor: PX.cardBorder }}>
                <div className="text-xl font-semibold" style={{ color: PX.textPrimary }}>Dashboard data could not load</div>
                <button onClick={() => void loadDashboard()} className="mt-6 rounded-lg px-5 py-3 text-xs font-semibold text-white" style={{ backgroundColor: PX.btnDark }}>Retry</button>
              </div>
            )}
          </div>
        )}

        {/* ---- CALL LOG TAB ---- */}
        {activeTab === 'calls' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl border bg-white" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
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
                            <div className="h-8 animate-pulse rounded-lg" style={{ backgroundColor: PX.skelShimmer }} />
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
                                <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">AE</span>
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
          </div>
        )}

        {/* ---- CONTACT SIGNALS TAB ---- */}
        {activeTab === 'signals' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-sm font-bold" style={{ color: PX.navy }}>Contact Signal Feed</div>
                  <div className="text-xs" style={{ color: PX.textMuted }}>Live behavioral signals from patients and HCPs</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: PX.success }} />
                  <span className="text-[11px] font-medium" style={{ color: PX.success }}>Live</span>
                </div>
              </div>
              <div className="space-y-3">
                {signals.map((sig) => {
                  const sigColor = SIGNAL_COLORS[sig.signalType] || PX.textMuted;
                  const statusColors: Record<string, { text: string; bg: string }> = {
                    new: { text: PX.error, bg: '#FEF2F2' },
                    queued: { text: PX.warning, bg: '#FFFBEB' },
                    'in-progress': { text: PX.teal, bg: '#E0F7FA' },
                    completed: { text: PX.success, bg: '#ECFDF5' },
                  };
                  const sc = statusColors[sig.status] || statusColors.completed;
                  return (
                    <div key={sig.id} className="flex items-start gap-4 rounded-xl border px-5 py-4 animate-slide-in" style={{ borderColor: PX.cardBorder }}>
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: sigColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase" style={{ color: sigColor }}>{SIGNAL_LABELS[sig.signalType] || sig.signalType}</span>
                          <span className="text-[10px] font-semibold" style={{ color: TA_COLORS[sig.therapeuticArea] }}>{TA_LABELS[sig.therapeuticArea]}</span>
                          <span className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ color: sc.text, backgroundColor: sc.bg }}>{sig.status}</span>
                        </div>
                        <div className="text-xs" style={{ color: PX.textPrimary }}>{sig.detectedBehavior}</div>
                        <div className="mt-1 text-[11px]" style={{ color: PX.textSecondary }}>{sig.recommendedAction}</div>
                        <div className="mt-1 text-[10px]" style={{ color: PX.textMuted }}>{sig.contactIdAnon}</div>
                      </div>
                      <div className="text-[10px] shrink-0" style={{ color: PX.textMuted }}>{fmtDate(sig.timestamp)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---- MEDICAL LIAISON TAB ---- */}
        {activeTab === 'liaison' && (
          <div className="space-y-6 animate-fade-in">
            {/* AE Reports needing review */}
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PX.error }} />
                <div className="text-sm font-bold" style={{ color: PX.error }}>AE Reports Requiring Review</div>
              </div>
              {filteredCalls.filter(c => c.aeDetected).length === 0 ? (
                <div className="text-sm py-4" style={{ color: PX.textMuted }}>No AE reports in current filter</div>
              ) : (
                <div className="space-y-3">
                  {filteredCalls.filter(c => c.aeDetected).map((call) => (
                    <div key={call.id} className="rounded-lg border border-red-200 bg-red-50 p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setSelectedCallId(call.id)}>
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

            {/* Competitive Intelligence */}
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Competitive Intelligence Signals</div>
              <div className="space-y-3">
                {filteredCalls.filter(c => c.behavioralSignals.some(s => s.category === 'COMPETITIVE_INTEL')).length === 0 ? (
                  <div className="text-sm py-2" style={{ color: PX.textMuted }}>No competitive signals in current filter</div>
                ) : (
                  filteredCalls.filter(c => c.behavioralSignals.some(s => s.category === 'COMPETITIVE_INTEL')).map((call) => (
                    <div key={call.id} className="rounded-lg border p-4 cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: PX.cardBorder }} onClick={() => setSelectedCallId(call.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: PX.navy }}>{call.contactName}</span>
                        <span className="text-[10px] font-bold" style={{ color: TA_COLORS[call.therapeuticArea] }}>{TA_LABELS[call.therapeuticArea]}</span>
                      </div>
                      {call.behavioralSignals.filter(s => s.category === 'COMPETITIVE_INTEL').map((sig, si) => (
                        <div key={si} className="text-xs" style={{ color: PX.textPrimary }}>{sig.detail}</div>
                      ))}
                      <div className="mt-1 text-xs" style={{ color: PX.textSecondary }}>{call.liaisonSummary.enrichmentData.competitiveIntelligence}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Off-label / Compliance flags */}
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.warning }}>Compliance Monitoring</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4" style={{ borderColor: PX.cardBorder }}>
                  <div className="text-2xl font-bold" style={{ color: PX.error }}>{filteredCalls.filter(c => c.aeDetected).length}</div>
                  <div className="text-xs font-medium" style={{ color: PX.textSecondary }}>AE Reports Pending Review</div>
                </div>
                <div className="rounded-lg border p-4" style={{ borderColor: PX.cardBorder }}>
                  <div className="text-2xl font-bold" style={{ color: PX.warning }}>0</div>
                  <div className="text-xs font-medium" style={{ color: PX.textSecondary }}>Off-Label Flags</div>
                </div>
                <div className="rounded-lg border p-4" style={{ borderColor: PX.cardBorder }}>
                  <div className="text-2xl font-bold" style={{ color: PX.success }}>{filteredCalls.filter(c => c.outcome !== 'no-answer' && c.outcome !== 'voicemail').length}</div>
                  <div className="text-xs font-medium" style={{ color: PX.textSecondary }}>Compliant Interactions</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- SYSTEM PERFORMANCE TAB ---- */}
        {activeTab === 'performance' && analytics && (
          <div className="space-y-6 animate-fade-in">
            {/* Outcome Distribution */}
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Outcome Distribution</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(analytics.outcomeDistribution).sort(([, a], [, b]) => b - a).map(([outcome, count]) => {
                  const color = OUTCOME_COLORS[outcome] || PX.textMuted;
                  const pct = analytics.kpis.totalInteractions > 0 ? ((count / analytics.kpis.totalInteractions) * 100).toFixed(0) : '0';
                  return (
                    <div key={outcome} className="flex items-center gap-3">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs flex-1 truncate" style={{ color: PX.textPrimary }}>{OUTCOME_LABELS[outcome] || outcome}</span>
                      <span className="text-xs font-bold" style={{ color }}>{count}</span>
                      <span className="text-[10px]" style={{ color: PX.textMuted }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent Type Distribution */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>By Agent Type</div>
                <div className="space-y-3">
                  {(Object.entries(analytics.agentTypeDistribution) as [AgentType, number][]).map(([at, count]) => {
                    const conf = AGENT_TYPE_LABELS[at];
                    const pct = analytics.kpis.totalInteractions > 0 ? (count / analytics.kpis.totalInteractions) * 100 : 0;
                    return (
                      <div key={at}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: PX.textPrimary }}>{conf.label}</span>
                          <span className="text-xs font-bold" style={{ color: conf.color }}>{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: conf.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>By Therapeutic Area</div>
                <div className="space-y-3">
                  {(Object.entries(analytics.therapeuticAreaDistribution) as [TherapeuticArea, number][]).map(([ta, count]) => {
                    const pct = analytics.kpis.totalInteractions > 0 ? (count / analytics.kpis.totalInteractions) * 100 : 0;
                    return (
                      <div key={ta}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: PX.textPrimary }}>{TA_LABELS[ta]}</span>
                          <span className="text-xs font-bold" style={{ color: TA_COLORS[ta] }}>{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: TA_COLORS[ta] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Daily Trend */}
            <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
              <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Daily Activity Trend (7 days)</div>
              <div className="flex items-end gap-2 h-40">
                {analytics.dailyTrend.map((day) => {
                  const maxVal = Math.max(...analytics.dailyTrend.map(d => d.interactions), 1);
                  const h = (day.interactions / maxVal) * 100;
                  const engH = (day.engagements / maxVal) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center" style={{ height: '120px' }}>
                        <div className="flex-1" />
                        <div className="w-full flex gap-0.5 justify-center">
                          <div className="w-3 rounded-t" style={{ height: `${Math.max(h, 4)}%`, backgroundColor: PX.navy }} />
                          <div className="w-3 rounded-t" style={{ height: `${Math.max(engH, 4)}%`, backgroundColor: PX.teal }} />
                        </div>
                      </div>
                      <div className="text-[9px] font-medium" style={{ color: PX.textMuted }}>{day.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.navy }} /><span className="text-[10px]" style={{ color: PX.textMuted }}>Interactions</span></div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PX.teal }} /><span className="text-[10px]" style={{ color: PX.textMuted }}>Engagements</span></div>
              </div>
            </div>

            {/* Top Concerns */}
            {analytics.topConcerns.length > 0 && (
              <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Top Contact Concerns</div>
                <div className="space-y-2">
                  {analytics.topConcerns.map((tc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-medium flex-1" style={{ color: PX.textPrimary }}>{tc.concern}</span>
                      <span className="text-xs font-bold" style={{ color: PX.navy }}>{tc.count}</span>
                      <span className="text-[10px]" style={{ color: PX.textMuted }}>{tc.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- AGENT STORYBOARD TAB ---- */}
        {activeTab === 'agent-config' && (
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
                      className={cn('rounded-lg px-4 py-2 text-xs font-semibold transition-all border', isActive ? 'text-white' : '')}
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
                  className="rounded-lg border px-4 py-2 text-xs font-semibold transition-all"
                  style={{ borderColor: storyAutoPlay ? PX.teal : PX.cardBorder, color: storyAutoPlay ? PX.teal : PX.textSecondary, backgroundColor: storyAutoPlay ? PX.tealBg : 'white' }}
                >
                  {storyAutoPlay ? 'Pause' : 'Auto-Play'}
                </button>
                <button
                  onClick={() => { setStoryStep(0); setDataDropPhase(0); setConversationIndex(0); setStoryAutoPlay(false); }}
                  className="rounded-lg border px-4 py-2 text-xs font-semibold transition-all"
                  style={{ borderColor: PX.cardBorder, color: PX.textSecondary }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center">
              {STORYBOARD_STEPS.map((step, i) => (
                <div key={step.id} className={cn('flex items-center', i < STORYBOARD_STEPS.length - 1 ? 'flex-1' : '')}>
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
                  {i < STORYBOARD_STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 rounded-full transition-all duration-300" style={{ backgroundColor: i < storyStep ? PX.navy : PX.cardBorder }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="min-h-[480px]">

              {/* ===== STEP 0: Data Drop ===== */}
              {storyStep === 0 && storyData.contact && (
                <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
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
                          className={cn('flex items-center gap-4 rounded-lg border px-4 py-3 transition-all duration-300', loaded ? 'animate-data-load' : '')}
                          style={{
                            borderColor: loaded ? '#A7F3D0' : PX.cardBorder,
                            backgroundColor: loaded ? '#ECFDF5' : i <= dataDropPhase ? 'white' : PX.skelShimmer,
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
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
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
                  <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>Engagement Context</div>
                    <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: PX.tealBg }}>
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
                        <div key={si} className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: PX.cardBorder }}>
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
                    <div className="rounded-lg border p-3" style={{ borderColor: PX.teal, backgroundColor: `${PX.teal}08` }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: PX.teal }}>Agent Selection Rationale</div>
                      <div className="text-xs" style={{ color: PX.textPrimary }}>
                        {storyData.contact.contactType === 'patient' ? 'Patient' : 'HCP'} contact with{' '}
                        {PATHWAY_LABELS[storyData.contact.recommendedPathway].toLowerCase()} pathway &rarr; routed to{' '}
                        <span className="font-semibold" style={{ color: AGENT_TYPE_LABELS[configAgent].color }}>{AGENT_TYPE_LABELS[configAgent].label}</span> agent ({personas[configAgent].name}).
                      </div>
                    </div>
                  </div>

                  {/* Persona Config */}
                  <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                    <div className="text-sm font-bold mb-4" style={{ color: PX.navy }}>
                      Agent Persona: {personas[configAgent].name}
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Warmth', key: 'warmth' as const, color: '#F59E0B' },
                        { label: 'Empathy', key: 'empathy' as const, color: '#EC4899' },
                        { label: 'Clinical Depth', key: 'clinicalDepth' as const, color: PX.teal },
                        { label: 'Formality', key: 'formality' as const, color: PX.navy },
                      ].map((slider) => (
                        <div key={slider.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>{slider.label}</label>
                            <span className="text-xs font-bold" style={{ color: slider.color }}>{personas[configAgent][slider.key]}</span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: sliderAnimated ? `${personas[configAgent][slider.key]}%` : '0%', backgroundColor: slider.color }} />
                          </div>
                        </div>
                      ))}
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: PX.textSecondary }}>Greeting</label>
                        <div className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: PX.cardBorder, color: PX.textPrimary }}>
                          {personas[configAgent].greeting
                            .replace('{contactName}', storyData.contact.name)
                            .replace('{drugProduct}', storyData.contact.drugProduct === 'euloxacaltenamide' ? 'ELEX' : 'Relutrigine')}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: PX.textSecondary }}>Guardrails</label>
                        <div className="flex flex-wrap gap-1">
                          {(personas[configAgent].guardrails || []).map((g, gi) => (
                            <span key={gi} className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: PX.error, backgroundColor: '#FEF2F2' }}>{g}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: PX.textSecondary }}>Escalation Triggers</label>
                        <div className="flex flex-wrap gap-1">
                          {(personas[configAgent].escalationTriggers || []).map((t, ti) => (
                            <span key={ti} className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ color: PX.warning, backgroundColor: '#FFFBEB' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Conversation ===== */}
              {storyStep === 2 && storyData.call && storyData.contact && (
                <div className="rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: AGENT_TYPE_LABELS[configAgent].color }}>
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
                  <div ref={chatScrollRef} className="space-y-3 max-h-[400px] overflow-y-auto rounded-lg border p-4" style={{ borderColor: PX.cardBorder }}>
                    {storyData.call.transcript.slice(0, conversationIndex).map((entry, i) => (
                      <div key={i} className={cn('flex gap-3 animate-chat-in', entry.speaker === 'agent' ? '' : 'flex-row-reverse')}>
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: entry.speaker === 'agent' ? PX.teal : PX.navy }}
                        >
                          {entry.speaker === 'agent' ? 'Vi' : initials(storyData.contact!.name)}
                        </div>
                        <div className={cn('max-w-[80%] rounded-xl px-4 py-2.5', entry.speaker === 'agent' ? 'bg-[#E0F7FA]' : 'bg-[#F1F5F9]')}>
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
                        <div className="rounded-xl px-4 py-3 bg-[#F1F5F9]">
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
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
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
                  <div className="xl:col-span-3 rounded-xl border bg-white p-6" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
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
                          <div className={cn('max-w-[80%] rounded-xl px-4 py-2.5', entry.speaker === 'agent' ? 'bg-[#E0F7FA]' : 'bg-[#F1F5F9]')}>
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
                    <div className="rounded-xl border bg-white p-5 animate-fade-in" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
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
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${storyData.call.classification.confidence * 100}%`, backgroundColor: PX.success }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: PX.success }}>{Math.round(storyData.call.classification.confidence * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* AE Alert */}
                    {storyData.call.aeDetected && storyData.call.classification.aeNarrative && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-5 animate-fade-in">
                        <div className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1">Adverse Event Detected</div>
                        <div className="text-xs text-red-800">{storyData.call.classification.aeNarrative}</div>
                      </div>
                    )}

                    {/* Key Moments */}
                    {storyData.call.classification.key_moments.length > 0 && (
                      <div className="rounded-xl border bg-white p-5 animate-fade-in" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
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

                    {/* Liaison Summary */}
                    <div className="rounded-xl border bg-white p-5 animate-fade-in" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: PX.textSecondary }}>Liaison Summary</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs" style={{ color: PX.textSecondary }}>Engagement</span>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${storyData.call.liaisonSummary.engagementScore}%`, backgroundColor: storyData.call.liaisonSummary.engagementScore >= 75 ? PX.success : PX.warning }} />
                        </div>
                        <span className="text-xs font-bold">{storyData.call.liaisonSummary.engagementScore}%</span>
                      </div>
                      <div className="text-xs" style={{ color: PX.textPrimary }}>{storyData.call.liaisonSummary.callSummaryForLiaison}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== STEP 4: Call Log ===== */}
              {storyStep === 4 && storyData.call && (
                <div className="space-y-6">
                  <div className="rounded-xl border bg-white" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
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
                                  {sc.aeDetected && <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">AE</span>}
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
                                  {call.aeDetected && <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200">AE</span>}
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
                    <div className="rounded-xl border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Outcome</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: OUTCOME_COLORS[storyData.call.outcome] || PX.navy }}>
                        {OUTCOME_LABELS[storyData.call.outcome] || storyData.call.outcome}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Duration</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: PX.navy }}>{fmtDuration(storyData.call.duration)}</div>
                    </div>
                    <div className="rounded-xl border bg-white p-4" style={{ borderColor: PX.cardBorder, boxShadow: PX.cardShadow }}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: PX.textSecondary }}>Engagement Score</div>
                      <div className="mt-1 text-lg font-bold" style={{ color: PX.success }}>{storyData.call.liaisonSummary.engagementScore}%</div>
                    </div>
                    <div className="rounded-xl border bg-white p-4" style={{
                      borderColor: storyData.call.aeDetected ? '#FECACA' : PX.cardBorder,
                      boxShadow: PX.cardShadow,
                      backgroundColor: storyData.call.aeDetected ? '#FEF2F2' : 'white',
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
                      className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: PX.teal }}
                    >
                      Restart Storyboard
                    </button>
                    <button
                      onClick={() => setActiveTab('calls')}
                      className="rounded-lg border px-5 py-2.5 text-xs font-semibold"
                      style={{ borderColor: PX.cardBorder, color: PX.navy }}
                    >
                      Open Full Call Log
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!storyData.contact || !storyData.call) && (
                <div className="rounded-xl border bg-white px-6 py-16 text-center" style={{ borderColor: PX.cardBorder }}>
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
                className="rounded-lg border px-5 py-2.5 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: PX.cardBorder, color: PX.navy }}
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {STORYBOARD_STEPS.map((_, i) => (
                  <div key={i} className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: i === storyStep ? '24px' : '6px', backgroundColor: i === storyStep ? PX.teal : i < storyStep ? PX.navy : PX.cardBorder }} />
                ))}
              </div>
              <button
                onClick={() => { setStoryStep(s => Math.min(4, s + 1)); setStoryAutoPlay(false); }}
                disabled={storyStep === 4}
                className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: PX.teal }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ========== CALL DETAIL DRAWER ========== */}
      {selectedCall && (
        <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCallId(null)} />
      )}
    </div>
  );
}
