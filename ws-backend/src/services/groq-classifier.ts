// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — OpenAI Post-Call Classifier
// Uses OpenAI Structured Outputs (gpt-4.1-nano) to classify call outcomes
// and generate liaison summaries.
// ---------------------------------------------------------------------------

import OpenAI from 'openai';
import type {
  ClassificationResult,
  ContactRecord,
  OutcomeType,
  SupportPathway,
  Urgency,
  AppointmentDetails,
  TranscriptEntry,
  ScreeningResult,
} from '../types/index.js';
import { buildClassificationPrompt } from '../prompts/classification-prompt.js';

// ---------------------------------------------------------------------------
// Valid enum values — kept as lightweight fallback validation. With Structured
// Outputs the model is guaranteed to return valid enum values, but these
// arrays serve as a safety net if the response is manually parsed (e.g.,
// from cached/stored completions).
// ---------------------------------------------------------------------------

const VALID_OUTCOMES: OutcomeType[] = [
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

const VALID_PATHWAYS: SupportPathway[] = [
  'medication-access',
  'safety-reporting',
  'clinical-education',
  'patient-education',
  'adherence-support',
  'crisis-support',
];

const VALID_URGENCIES: Urgency[] = ['routine', 'soon', 'urgent'];

// ---------------------------------------------------------------------------
// JSON Schema for Structured Outputs — guarantees the model returns valid
// enum values, correct types, and all required fields. This eliminates the
// need for heavy-handed type coercion in post-processing.
// ---------------------------------------------------------------------------

const CLASSIFICATION_JSON_SCHEMA = {
  name: 'call_classification',
  strict: true,
  schema: {
    type: 'object' as const,
    required: [
      'outcome',
      'confidence',
      'support_pathway',
      'urgency',
      'sentiment',
      'key_moments',
      'contact_concerns',
      'behavioral_signals_referenced',
      'next_action',
      'liaison_summary',
      'context_summary',
      'what_happened',
      'what_changed_since_last_touch',
      'clinical_questions_raised',
      'recommended_action',
      'appointment_details',
      'ae_detected',
      'competitive_intel_notes',
      'msl_followup_requested',
      'msl_followup_topic',
      'payer_name',
      'prior_auth_status',
      'denial_reason',
    ],
    additionalProperties: false,
    properties: {
      outcome: {
        type: 'string' as const,
        enum: [
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
        ],
      },
      confidence: { type: 'number' as const },
      support_pathway: {
        anyOf: [
          {
            type: 'string' as const,
            enum: [
              'medication-access',
              'safety-reporting',
              'clinical-education',
              'patient-education',
              'adherence-support',
              'crisis-support',
            ],
          },
          { type: 'null' as const },
        ],
      },
      urgency: {
        type: 'string' as const,
        enum: ['routine', 'soon', 'urgent'],
      },
      sentiment: { type: 'number' as const },
      key_moments: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      contact_concerns: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      behavioral_signals_referenced: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      next_action: { type: 'string' as const },
      liaison_summary: { type: 'string' as const },
      context_summary: { type: 'string' as const },
      what_happened: { type: 'string' as const },
      what_changed_since_last_touch: { type: 'string' as const },
      clinical_questions_raised: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      recommended_action: { type: 'string' as const },
      appointment_details: {
        anyOf: [
          {
            type: 'object' as const,
            required: ['provider', 'specialty', 'date', 'location'],
            additionalProperties: false,
            properties: {
              provider: { type: 'string' as const },
              specialty: { type: 'string' as const },
              date: { type: 'string' as const },
              location: { type: 'string' as const },
            },
          },
          { type: 'null' as const },
        ],
      },
      ae_detected: { type: 'boolean' as const },
      competitive_intel_notes: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      msl_followup_requested: { type: 'boolean' as const },
      msl_followup_topic: {
        anyOf: [
          { type: 'string' as const },
          { type: 'null' as const },
        ],
      },
      payer_name: {
        anyOf: [
          { type: 'string' as const },
          { type: 'null' as const },
        ],
      },
      prior_auth_status: {
        anyOf: [
          {
            type: 'string' as const,
            enum: ['not-needed', 'pending', 'approved', 'denied', 'appealing'],
          },
          { type: 'null' as const },
        ],
      },
      denial_reason: {
        anyOf: [
          { type: 'string' as const },
          { type: 'null' as const },
        ],
      },
    },
  },
};

let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (_openaiClient) return _openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  _openaiClient = new OpenAI({ apiKey });
  return _openaiClient;
}

function formatTranscript(entries: TranscriptEntry[]): string {
  return entries
    .map((entry) => {
      const speaker = entry.speaker === 'agent' ? 'Agent' : 'Contact';
      return `${speaker}: ${entry.text}`;
    })
    .join('\n');
}

function createDefaultResult(): ClassificationResult {
  return {
    outcome: 'no-answer' as OutcomeType,
    confidence: 0,
    supportPathway: null,
    urgency: 'routine',
    sentiment: 50,
    keyMoments: [],
    contactConcerns: [],
    behavioralSignalsReferenced: [],
    nextAction: 'Manual review required',
    liaisonSummary: 'Call could not be classified due to a processing error.',
    appointmentDetails: null,
    screeningResults: null,
    aeDetected: false,
    competitiveIntelNotes: [],
  };
}

export async function classifyCall(
  transcript: TranscriptEntry[],
  contact: ContactRecord,
  screeningResults?: ScreeningResult[],
): Promise<ClassificationResult> {
  const openai = getOpenAIClient();
  if (!openai) {
    console.error('[OpenAIClassifier] OPENAI_API_KEY environment variable is not set');
    return createDefaultResult();
  }

  const transcriptText = formatTranscript(transcript);

  if (!transcriptText.trim()) {
    return {
      ...createDefaultResult(),
      liaisonSummary: 'No transcript content available for classification.',
      outcome: 'no-answer',
    };
  }

  const classificationPrompt = buildClassificationPrompt(transcriptText, {
    contact,
    screeningResults: screeningResults ?? [],
  });

  try {
    // Model: gpt-4.1-nano — purpose-built for high-volume structured tasks.
    // ~25x cheaper than gpt-4o ($0.10/$0.40 vs $2.50/$10.00 per MTok).
    // Fallback options if classification accuracy is insufficient:
    //   - gpt-4.1-mini ($0.40/$1.60) — better instruction following
    //   - gpt-4o ($2.50/$10.00) — strongest general-purpose model
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: classificationPrompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: CLASSIFICATION_JSON_SCHEMA,
      },
      temperature: 0.1,
      seed: 42,
      max_completion_tokens: 2000,
    }, { timeout: 30000, maxRetries: 3 });

    // Log token usage for cost monitoring and anomaly detection
    console.log('[OpenAIClassifier] Usage:', completion.usage);

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      console.error('[OpenAIClassifier] Empty response from OpenAI API');
      return createDefaultResult();
    }

    const parsed = JSON.parse(responseContent) as Record<string, unknown>;

    // -----------------------------------------------------------------------
    // Lightweight validation — Structured Outputs guarantees enum values and
    // types, so these are safety-net fallbacks only (e.g., for cached or
    // replayed responses that may not have gone through schema enforcement).
    // -----------------------------------------------------------------------

    // Validate outcome (schema-enforced enum, fallback for safety)
    const rawOutcome = parsed.outcome as string;
    const outcome: OutcomeType = VALID_OUTCOMES.includes(rawOutcome as OutcomeType)
      ? (rawOutcome as OutcomeType)
      : 'information-provided';

    // Validate pathway (schema-enforced nullable enum, fallback for safety)
    const rawPathway = parsed.support_pathway as string | null;
    const supportPathway: SupportPathway | null =
      rawPathway && VALID_PATHWAYS.includes(rawPathway as SupportPathway)
        ? (rawPathway as SupportPathway)
        : null;

    // Validate urgency (schema-enforced enum, fallback for safety)
    const rawUrgency = parsed.urgency as string;
    const urgency: Urgency = VALID_URGENCIES.includes(rawUrgency as Urgency)
      ? (rawUrgency as Urgency)
      : 'routine';

    // Clamp numeric ranges — Structured Outputs enforces type: number but
    // cannot enforce min/max ranges. Prompt instructs 0-1 and 0-100 but
    // clamping provides a hard guarantee.
    const rawConfidence = Number(parsed.confidence) || 0;
    if (rawConfidence < 0 || rawConfidence > 1) {
      console.warn(
        `[OpenAIClassifier] Confidence value ${rawConfidence} outside [0,1], clamping`,
      );
    }

    const rawSentiment = Math.round(Number(parsed.sentiment) || 50);
    if (rawSentiment < 0 || rawSentiment > 100) {
      console.warn(
        `[OpenAIClassifier] Sentiment value ${rawSentiment} outside [0,100], clamping`,
      );
    }

    // Safety invariant: if the outcome IS an AE type, aeDetected must be true
    // regardless of what the model returned for ae_detected
    const aeDetected = parsed.ae_detected === true ||
      outcome === 'ae-reported' ||
      outcome === 'ae-escalated';

    // Parse appointment details — schema guarantees correct shape or null
    const appointmentDetails: AppointmentDetails | null =
      parsed.appointment_details && typeof parsed.appointment_details === 'object'
        ? (parsed.appointment_details as AppointmentDetails)
        : null;

    const result: ClassificationResult = {
      outcome,
      confidence: clamp(rawConfidence, 0, 1),
      supportPathway,
      urgency,
      sentiment: clamp(rawSentiment, 0, 100),
      keyMoments: Array.isArray(parsed.key_moments) ? (parsed.key_moments as string[]) : [],
      contactConcerns: Array.isArray(parsed.contact_concerns)
        ? (parsed.contact_concerns as string[])
        : [],
      behavioralSignalsReferenced: Array.isArray(parsed.behavioral_signals_referenced)
        ? (parsed.behavioral_signals_referenced as string[])
        : [],
      nextAction: typeof parsed.next_action === 'string' ? parsed.next_action : '',
      liaisonSummary: typeof parsed.liaison_summary === 'string' ? parsed.liaison_summary : '',
      appointmentDetails,
      screeningResults: screeningResults && screeningResults.length > 0 ? screeningResults : null,
      aeDetected,
      competitiveIntelNotes: Array.isArray(parsed.competitive_intel_notes)
        ? (parsed.competitive_intel_notes as string[])
        : [],
    };

    return result;
  } catch (error) {
    console.error(
      '[OpenAIClassifier] Classification failed:',
      error instanceof Error ? error.message : error,
    );
    return createDefaultResult();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
