// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Clinical Screening Instrument Definitions
// ---------------------------------------------------------------------------
// Pharma-adapted screening instruments for conversational administration.
// AE-TRIAGE, C-SSRS-LITE, TETRAS-LITE, and MMAS-4 — designed for
// telephonic administration in a pharma patient support context.
// ---------------------------------------------------------------------------

import type { ScreeningInstrumentId, RecommendedScreening } from '../types/index.js';

export interface ScreeningQuestion {
  index: number;
  text: string;
  responseOptions: Array<{ label: string; value: number }>;
}

export interface ScreeningInstrumentDefinition {
  id: ScreeningInstrumentId;
  name: string;
  shortName: string;
  description: string;
  questions: ScreeningQuestion[];
  maxScore: number;
  positiveThreshold: number;
  positiveInterpretation: string;
  negativeInterpretation: string;
  followUpAction: string | null;
  regulatoryReportable: boolean;
  requiresEscalation: boolean;
  conversationalPreamble: string;
  conversationalClosingPositive: string;
  conversationalClosingNegative: string;
}

// ---------------------------------------------------------------------------
// AE-TRIAGE — Adverse Event Detection Screen (3 questions)
// ---------------------------------------------------------------------------
const AE_TRIAGE: ScreeningInstrumentDefinition = {
  id: 'AE-TRIAGE',
  name: 'Adverse Event Triage Screen',
  shortName: 'AE-TRIAGE',
  description: 'Three-question adverse event detection screen to identify new or worsening symptoms that may constitute a reportable adverse event.',
  questions: [
    {
      index: 0,
      text: 'Since starting or changing your medication, have you experienced any new or unusual symptoms?',
      responseOptions: [
        { label: 'No new symptoms', value: 0 },
        { label: 'Mild new symptoms', value: 1 },
        { label: 'Moderate new symptoms', value: 2 },
        { label: 'Severe new symptoms', value: 3 },
      ],
    },
    {
      index: 1,
      text: 'How would you describe the impact of any symptoms on your daily activities?',
      responseOptions: [
        { label: 'No impact', value: 0 },
        { label: 'Slightly bothersome but manageable', value: 1 },
        { label: 'Interfering with some daily activities', value: 2 },
        { label: 'Preventing normal daily activities', value: 3 },
      ],
    },
    {
      index: 2,
      text: 'When did these symptoms first appear?',
      responseOptions: [
        { label: 'Not applicable — no symptoms', value: 0 },
        { label: 'More than 4 weeks ago and stable', value: 1 },
        { label: 'Within the past 1–4 weeks', value: 2 },
        { label: 'Within the past week or getting worse', value: 3 },
      ],
    },
  ],
  maxScore: 9,
  positiveThreshold: 3,
  positiveInterpretation: 'Potential adverse event detected — requires documentation and pharmacovigilance review. Escalate to Drug Safety team for formal AE intake.',
  negativeInterpretation: 'No significant adverse event indicators at this time. Continue routine monitoring.',
  followUpAction: 'Route to Praxis Drug Safety / Pharmacovigilance for formal AE documentation and assessment.',
  regulatoryReportable: true,
  requiresEscalation: true,
  conversationalPreamble: "I'd like to ask you a few quick questions about how you've been feeling since starting your medication. This helps us make sure you're getting the best care possible.",
  conversationalClosingPositive: "Thank you for sharing that with me. Because you mentioned some new symptoms, I want to make sure our medical team reviews this. I'm going to document this carefully and have someone follow up with you. Is that okay?",
  conversationalClosingNegative: "That's great to hear that things are going well. We always want to check in and make sure your medication is working well for you.",
};

// ---------------------------------------------------------------------------
// C-SSRS-LITE — Columbia Suicide Severity Rating Scale Lite (2 questions)
// ---------------------------------------------------------------------------
const C_SSRS_LITE: ScreeningInstrumentDefinition = {
  id: 'C-SSRS-LITE',
  name: 'Columbia Suicide Severity Rating Scale — Lite',
  shortName: 'C-SSRS Lite',
  description: 'Two-question suicidal ideation screen adapted from the Columbia Protocol. Required for patients on anti-epileptic drugs per FDA black box warning for suicidal ideation risk.',
  questions: [
    {
      index: 0,
      text: 'In the past month, have you wished you were dead or wished you could go to sleep and not wake up?',
      responseOptions: [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ],
    },
    {
      index: 1,
      text: 'In the past month, have you actually had any thoughts of killing yourself?',
      responseOptions: [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ],
    },
  ],
  maxScore: 2,
  positiveThreshold: 1,
  positiveInterpretation: 'POSITIVE screen for suicidal ideation — IMMEDIATE escalation required. Connect to 988 Suicide & Crisis Lifeline and notify prescribing physician. Document per pharmacovigilance protocol.',
  negativeInterpretation: 'Negative suicidal ideation screen — no immediate escalation required. Document completion per FDA monitoring requirements.',
  followUpAction: 'Immediate crisis escalation: 988 Suicide & Crisis Lifeline, notify prescribing HCP, and file pharmacovigilance report.',
  regulatoryReportable: true,
  requiresEscalation: true,
  conversationalPreamble: "Because your medication is in a class that the FDA monitors closely, I need to ask you two important questions. These are questions we ask everyone on this type of medication, and I want you to know that your honest answers help us keep you safe.",
  conversationalClosingPositive: "Thank you for being honest with me — that takes courage. I want to make sure you get the right support. I'm going to connect you with someone who can help right now. The 988 Suicide and Crisis Lifeline is also available anytime — you can call or text 988.",
  conversationalClosingNegative: "Thank you for answering those questions. We ask everyone on this type of medication, and I'm glad to hear you're doing okay. If anything ever changes, please don't hesitate to reach out.",
};

// ---------------------------------------------------------------------------
// TETRAS-LITE — Tremor Severity Assessment (2 questions)
// ---------------------------------------------------------------------------
const TETRAS_LITE: ScreeningInstrumentDefinition = {
  id: 'TETRAS-LITE',
  name: 'TETRAS Performance — Lite Assessment',
  shortName: 'TETRAS Lite',
  description: 'Two-question tremor severity and functional impact assessment adapted from The Essential Tremor Rating Assessment Scale (TETRAS). For Essential Tremor patients to track treatment response.',
  questions: [
    {
      index: 0,
      text: 'Over the past week, how would you rate the severity of your tremor?',
      responseOptions: [
        { label: 'No tremor', value: 0 },
        { label: 'Slight tremor — barely noticeable', value: 1 },
        { label: 'Moderate tremor — noticeable but manageable', value: 2 },
        { label: 'Significant tremor — difficult to manage', value: 3 },
        { label: 'Severe tremor — unable to perform tasks', value: 4 },
      ],
    },
    {
      index: 1,
      text: 'How much does your tremor interfere with daily activities like eating, writing, or dressing?',
      responseOptions: [
        { label: 'No interference', value: 0 },
        { label: 'Slight interference — can still do everything', value: 1 },
        { label: 'Moderate interference — some tasks are difficult', value: 2 },
        { label: 'Significant interference — need help with some tasks', value: 3 },
        { label: 'Severe interference — cannot perform tasks independently', value: 4 },
      ],
    },
  ],
  maxScore: 8,
  positiveThreshold: 4,
  positiveInterpretation: 'Tremor severity indicates suboptimal control — recommend discussion with prescribing physician about dose optimization or treatment adjustment.',
  negativeInterpretation: 'Tremor appears well-controlled with current therapy. Continue monitoring.',
  followUpAction: 'Notify prescribing HCP of suboptimal tremor control. Consider dose titration discussion.',
  regulatoryReportable: false,
  requiresEscalation: false,
  conversationalPreamble: "I'd like to ask you a couple of quick questions about your tremor to see how your treatment is working. This helps us make sure you're getting the best results.",
  conversationalClosingPositive: "Thank you for sharing that. It sounds like your tremor may still be affecting you more than we'd like. Would it be helpful if we let your doctor know so they can review your treatment plan?",
  conversationalClosingNegative: "That's wonderful to hear that your tremor is well-managed. It sounds like your treatment is working well for you.",
};

// ---------------------------------------------------------------------------
// MMAS-4 — Morisky Medication Adherence Scale (4 yes/no questions)
// ---------------------------------------------------------------------------
const MMAS_4: ScreeningInstrumentDefinition = {
  id: 'MMAS-4',
  name: 'Morisky Medication Adherence Scale — 4 Item',
  shortName: 'MMAS-4',
  description: 'Four yes/no question medication adherence assessment. Validated for identifying non-adherence patterns in chronic therapy.',
  questions: [
    {
      index: 0,
      text: 'Do you sometimes forget to take your medication?',
      responseOptions: [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ],
    },
    {
      index: 1,
      text: 'Over the past two weeks, were there any days when you did not take your medication?',
      responseOptions: [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ],
    },
    {
      index: 2,
      text: 'Have you ever cut back or stopped taking your medication without telling your doctor, because you felt worse when you took it?',
      responseOptions: [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ],
    },
    {
      index: 3,
      text: 'When you travel or leave home, do you sometimes forget to bring along your medication?',
      responseOptions: [
        { label: 'No', value: 0 },
        { label: 'Yes', value: 1 },
      ],
    },
  ],
  maxScore: 4,
  positiveThreshold: 1,
  positiveInterpretation: 'Non-adherence pattern detected — explore barriers (cost, side effects, complexity, forgetfulness) and connect with adherence support resources.',
  negativeInterpretation: 'High medication adherence reported — reinforce positive behavior and continue routine support.',
  followUpAction: 'Engage nurse educator or hub services for adherence counseling. Identify and address specific barriers.',
  regulatoryReportable: false,
  requiresEscalation: false,
  conversationalPreamble: "I'd like to ask you a few quick questions about how you're doing with taking your medication. There are no wrong answers — this just helps us figure out how we can best support you.",
  conversationalClosingPositive: "Thank you for being honest about that. A lot of people have challenges with their medication routine — you're definitely not alone. Would it be helpful to talk about some strategies that might make it easier?",
  conversationalClosingNegative: "That's excellent — keeping up with your medication schedule is so important, and it sounds like you're doing a great job.",
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SCREENING_INSTRUMENTS: Record<ScreeningInstrumentId, ScreeningInstrumentDefinition> = {
  'AE-TRIAGE': AE_TRIAGE,
  'C-SSRS-LITE': C_SSRS_LITE,
  'TETRAS-LITE': TETRAS_LITE,
  'MMAS-4': MMAS_4,
};

export function getScreeningInstrument(id: string): ScreeningInstrumentDefinition {
  const instrument = SCREENING_INSTRUMENTS[id as ScreeningInstrumentId];
  if (!instrument) {
    throw new Error(`Unknown screening instrument: ${id}`);
  }
  return instrument;
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

export function isPositiveScreen(
  id: ScreeningInstrumentId,
  score: number,
): boolean {
  const instrument = SCREENING_INSTRUMENTS[id];
  return score >= instrument.positiveThreshold;
}

export function getInterpretation(
  id: ScreeningInstrumentId,
  score: number,
): string {
  const instrument = SCREENING_INSTRUMENTS[id];
  return isPositiveScreen(id, score)
    ? instrument.positiveInterpretation
    : instrument.negativeInterpretation;
}

// ---------------------------------------------------------------------------
// Build the screening instruction block for the voice agent system prompt
// ---------------------------------------------------------------------------

export function buildScreeningPromptBlock(
  screenings: RecommendedScreening[],
): string {
  if (screenings.length === 0) return '';

  const blocks = screenings.slice(0, 2).map((rec, i) => {
    const instrument = SCREENING_INSTRUMENTS[rec.instrumentId];
    const questionsBlock = instrument.questions
      .map((q) => {
        const options = q.responseOptions
          .map((o) => `${o.label} (${o.value})`)
          .join(', ');
        return `  Q${q.index + 1}: "${q.text}"\n    Response scale: ${options}`;
      })
      .join('\n');

    return `
SCREENING ${i + 1}: ${instrument.shortName} — ${instrument.name}
Reason: ${rec.reason}
Preamble: "${instrument.conversationalPreamble}"
${questionsBlock}
Positive threshold: score >= ${instrument.positiveThreshold} out of ${instrument.maxScore}
If POSITIVE: "${instrument.conversationalClosingPositive}"
If NEGATIVE: "${instrument.conversationalClosingNegative}"${instrument.regulatoryReportable ? `\nREGULATORY NOTE: This screening result is reportable — ensure documentation per pharmacovigilance protocol.` : ''}`;
  });

  return blocks.join('\n');
}
