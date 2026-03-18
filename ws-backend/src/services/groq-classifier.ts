// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Groq Post-Call Classifier
// Uses Groq + Llama to classify call outcomes and generate liaison summaries.
// ---------------------------------------------------------------------------

import Groq from 'groq-sdk';
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

let _groqClient: Groq | null = null;

function getGroqClient(): Groq | null {
  if (_groqClient) return _groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  _groqClient = new Groq({ apiKey });
  return _groqClient;
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
  const groq = getGroqClient();
  if (!groq) {
    console.error('[GroqClassifier] GROQ_API_KEY environment variable is not set');
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
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: classificationPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }, { timeout: 30000 });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      console.error('[GroqClassifier] Empty response from Groq API');
      return createDefaultResult();
    }

    const parsed = JSON.parse(responseContent) as Record<string, unknown>;

    // Validate outcome
    const rawOutcome = parsed.outcome as string;
    const outcome: OutcomeType = VALID_OUTCOMES.includes(rawOutcome as OutcomeType)
      ? (rawOutcome as OutcomeType)
      : 'information-provided';

    // Validate pathway
    const rawPathway = parsed.support_pathway as string | null;
    const supportPathway: SupportPathway | null =
      rawPathway && VALID_PATHWAYS.includes(rawPathway as SupportPathway)
        ? (rawPathway as SupportPathway)
        : null;

    // Validate urgency
    const rawUrgency = parsed.urgency as string;
    const urgency: Urgency = VALID_URGENCIES.includes(rawUrgency as Urgency)
      ? (rawUrgency as Urgency)
      : 'routine';

    // Parse appointment details if present
    let appointmentDetails: AppointmentDetails | null = null;
    if (parsed.appointment_details) {
      if (typeof parsed.appointment_details === 'object') {
        const appt = parsed.appointment_details as Record<string, unknown>;
        appointmentDetails = {
          provider: typeof appt.provider === 'string' ? appt.provider : '',
          specialty: typeof appt.specialty === 'string' ? appt.specialty : '',
          date: typeof appt.date === 'string' ? appt.date : '',
          location: typeof appt.location === 'string' ? appt.location : '',
        };
      } else {
        console.warn(
          '[GroqClassifier] appointment_details present but not an object, dropping:',
          typeof parsed.appointment_details,
        );
      }
    }

    const rawConfidence = Number(parsed.confidence) || 0;
    if (rawConfidence < 0 || rawConfidence > 1) {
      console.warn(
        `[GroqClassifier] Confidence value ${rawConfidence} outside [0,1], clamping`,
      );
    }

    const rawSentiment = Math.round(Number(parsed.sentiment) || 50);
    if (rawSentiment < 0 || rawSentiment > 100) {
      console.warn(
        `[GroqClassifier] Sentiment value ${rawSentiment} outside [0,100], clamping`,
      );
    }

    // Detect AE mentions
    const aeDetected = parsed.ae_detected === true ||
      outcome === 'ae-reported' ||
      outcome === 'ae-escalated';

    // Parse competitive intelligence notes
    const competitiveIntelNotes = Array.isArray(parsed.competitive_intel_notes)
      ? (parsed.competitive_intel_notes as string[])
      : [];

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
      competitiveIntelNotes,
    };

    return result;
  } catch (error) {
    console.error(
      '[GroqClassifier] Classification failed:',
      error instanceof Error ? error.message : error,
    );
    return createDefaultResult();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
