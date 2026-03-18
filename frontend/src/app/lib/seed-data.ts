// ---------------------------------------------------------------------------
// Vi Operate -- Praxis BioSciences Pharma Engagement Platform
// Seed data: 12 contacts, 20 call records, signal feed entries
// Deterministic PRNG (mulberry32) -- stable across reloads
// ---------------------------------------------------------------------------
import type {
  AgentType,
  AnalyticsResponse,
  BehavioralSignal,
  CallRecord,
  Classification,
  ContactRecord,
  ContactSignalFeed,
  DrugProduct,
  InteractionOutcome,
  KPIData,
  LiaisonSummary,
  PriorityTier,
  ScreeningResult,
  ScreeningQuestionResponse,
  SignalCategory,
  SupportPathwayId,
  TherapeuticArea,
  TranscriptEntry,
  UrgencyLevel,
} from './types';
import { CONVERSION_OUTCOMES, NON_CONNECT_OUTCOMES } from './constants';

// ---------------------------------------------------------------------------
// PRNG -- mulberry32
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(3917);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pseudoUUID(): string {
  const hex = () => Math.floor(rng() * 16).toString(16);
  const seg = (n: number) => Array.from({ length: n }, hex).join('');
  return `${seg(8)}-${seg(4)}-4${seg(3)}-${['8', '9', 'a', 'b'][Math.floor(rng() * 4)]}${seg(3)}-${seg(12)}`;
}

// ---------------------------------------------------------------------------
// 12 Contacts (6 patients, 6 HCPs)
// ---------------------------------------------------------------------------
const CONTACTS: ContactRecord[] = [
  // === 3 ET patients on ELEX ===
  {
    contactId: 'PAT-001',
    name: 'Margaret Sullivan',
    phone: '+16175551001',
    age: 68,
    gender: 'Female',
    contactType: 'patient',
    therapeuticArea: 'essential-tremor',
    drugProduct: 'euloxacaltenamide',
    diagnosis: 'Essential Tremor, moderate severity',
    currentMedications: ['Euloxacaltenamide (ELEX) 200mg BID', 'Lisinopril 10mg'],
    insurancePlan: 'Aetna PPO',
    behavioralSignals: [
      { category: 'ADHERENCE_SIGNAL', detail: 'ELEX refill 8 days overdue -- specialty pharmacy flag', recency: '2 days ago', severity: 'high', clinicalImplication: 'Adherence gap on newly launched therapy -- risk of tremor relapse', timestamp: new Date('2026-03-15').toISOString() },
      { category: 'SEARCH_INTENT', detail: 'Searched "ELEX side effects tremor medication" 3x this week', recency: '3 days ago', severity: 'medium', clinicalImplication: 'Patient researching side effects -- possible AE concern', timestamp: new Date('2026-03-14').toISOString() },
    ],
    recommendedPathway: 'adherence-support',
    openActions: ['ELEX refill overdue', 'Hub follow-up call due', '30-day adherence check-in'],
    priorityTier: 'HIGH',
    priorityScore: 87,
    preferredChannel: 'voice',
  },
  {
    contactId: 'PAT-002',
    name: 'Robert Chen',
    phone: '+14155551002',
    age: 72,
    gender: 'Male',
    contactType: 'patient',
    therapeuticArea: 'essential-tremor',
    drugProduct: 'euloxacaltenamide',
    diagnosis: 'Essential Tremor, mild-moderate',
    currentMedications: ['Euloxacaltenamide (ELEX) 100mg BID', 'Atorvastatin 20mg', 'Metformin 500mg'],
    insurancePlan: 'UnitedHealthcare Medicare Advantage',
    behavioralSignals: [
      { category: 'SEARCH_INTENT', detail: 'Searched "copay help for specialty medications" and "ELEX patient assistance"', recency: 'Yesterday', severity: 'high', clinicalImplication: 'Cost barrier -- copay card activation urgent to prevent therapy abandonment', timestamp: new Date('2026-03-16').toISOString() },
    ],
    recommendedPathway: 'copay-assistance',
    openActions: ['Copay card not yet activated', 'Benefits investigation pending'],
    priorityTier: 'HIGH',
    priorityScore: 82,
    preferredChannel: 'voice',
  },
  {
    contactId: 'PAT-003',
    name: 'Diana Morales',
    phone: '+12135551003',
    age: 55,
    gender: 'Female',
    contactType: 'patient',
    therapeuticArea: 'essential-tremor',
    drugProduct: 'euloxacaltenamide',
    diagnosis: 'Essential Tremor, newly diagnosed',
    currentMedications: ['Euloxacaltenamide (ELEX) 100mg BID'],
    insurancePlan: 'Cigna Choice Fund',
    behavioralSignals: [
      { category: 'RX_PATTERN', detail: 'First ELEX fill picked up 3 days ago -- new start', recency: '3 days ago', severity: 'medium', clinicalImplication: 'New start patient -- onboarding and hub enrollment window', timestamp: new Date('2026-03-14').toISOString() },
    ],
    recommendedPathway: 'hub-enrollment',
    openActions: ['Hub enrollment not completed', 'Welcome call pending', 'Copay card activation'],
    priorityTier: 'MEDIUM',
    priorityScore: 65,
    preferredChannel: 'sms',
  },
  // === 3 DEE patients on Relutrigine ===
  {
    contactId: 'PAT-004',
    name: 'Jennifer Okafor',
    phone: '+17735551004',
    age: 34,
    gender: 'Female',
    contactType: 'patient',
    therapeuticArea: 'dee',
    drugProduct: 'relutrigine',
    diagnosis: 'Dravet Syndrome (caregiver for son, age 8)',
    currentMedications: ['Relutrigine 50mg BID (for son)', 'Clobazam 10mg', 'Stiripentol 500mg'],
    insurancePlan: 'BCBS Illinois',
    behavioralSignals: [
      { category: 'ADHERENCE_SIGNAL', detail: 'Relutrigine specialty pharmacy refill submitted but prior auth pending 12 days', recency: '1 day ago', severity: 'high', clinicalImplication: 'Prior auth delay -- seizure breakthrough risk for pediatric patient', timestamp: new Date('2026-03-16').toISOString() },
      { category: 'SEARCH_INTENT', detail: 'Searched "Dravet syndrome seizure emergency plan" and "Relutrigine dosing pediatric"', recency: '4 days ago', severity: 'medium', clinicalImplication: 'Caregiver anxiety about seizure management -- support needed', timestamp: new Date('2026-03-13').toISOString() },
    ],
    recommendedPathway: 'adherence-support',
    openActions: ['Prior auth follow-up', 'Caregiver support check-in', 'Emergency seizure plan review'],
    priorityTier: 'HIGH',
    priorityScore: 91,
    preferredChannel: 'voice',
  },
  {
    contactId: 'PAT-005',
    name: 'Michael Huang',
    phone: '+12065551005',
    age: 42,
    gender: 'Male',
    contactType: 'patient',
    therapeuticArea: 'dee',
    drugProduct: 'relutrigine',
    diagnosis: 'Dravet Syndrome (caregiver for daughter, age 6)',
    currentMedications: ['Relutrigine 25mg BID (for daughter)', 'Valproic acid 250mg'],
    insurancePlan: 'Premera Blue Cross',
    behavioralSignals: [
      { category: 'RX_PATTERN', detail: 'Relutrigine first fill -- new start patient (daughter)', recency: '5 days ago', severity: 'medium', clinicalImplication: 'New start -- hub enrollment and titration support critical', timestamp: new Date('2026-03-12').toISOString() },
    ],
    recommendedPathway: 'hub-enrollment',
    openActions: ['Hub enrollment', 'Titration schedule education', 'Copay card setup'],
    priorityTier: 'MEDIUM',
    priorityScore: 68,
    preferredChannel: 'voice',
  },
  {
    contactId: 'PAT-006',
    name: 'Sarah Williams',
    phone: '+19175551006',
    age: 29,
    gender: 'Female',
    contactType: 'patient',
    therapeuticArea: 'dee',
    drugProduct: 'relutrigine',
    diagnosis: 'Dravet Syndrome (adult onset variant)',
    currentMedications: ['Relutrigine 75mg BID', 'Levetiracetam 500mg'],
    insurancePlan: 'Oscar Health',
    behavioralSignals: [
      { category: 'CLAIMS_SIGNAL', detail: 'ER visit 6 days ago -- seizure-related', recency: '6 days ago', severity: 'high', clinicalImplication: 'Breakthrough seizure -- therapy assessment and AE screening needed', timestamp: new Date('2026-03-11').toISOString() },
    ],
    recommendedPathway: 'ae-reporting',
    openActions: ['Post-ER follow-up', 'AE assessment', 'Neurologist coordination'],
    priorityTier: 'HIGH',
    priorityScore: 88,
    preferredChannel: 'voice',
  },
  // === 6 HCPs ===
  {
    contactId: 'HCP-001',
    name: 'Dr. James Thornton',
    phone: '+16175552001',
    age: 52,
    gender: 'Male',
    contactType: 'hcp',
    therapeuticArea: 'essential-tremor',
    drugProduct: 'euloxacaltenamide',
    specialty: 'Neurology -- Movement Disorders',
    npiNumber: '1234567890',
    practiceLocation: 'Massachusetts General Hospital',
    patientsOnTherapy: 12,
    behavioralSignals: [
      { category: 'HCP_ACTIVITY', detail: 'Attended Praxis-sponsored ET symposium, requested ELEX trial reprints', recency: '1 week ago', severity: 'medium', clinicalImplication: 'High interest -- ready for detailed clinical discussion', timestamp: new Date('2026-03-10').toISOString() },
    ],
    recommendedPathway: 'sample-request',
    openActions: ['Sample fulfillment pending', 'Clinical reprint delivery', 'Follow-up detail call'],
    priorityTier: 'HIGH',
    priorityScore: 85,
    preferredChannel: 'voice',
  },
  {
    contactId: 'HCP-002',
    name: 'Dr. Priya Mehta',
    phone: '+14155552002',
    age: 44,
    gender: 'Female',
    contactType: 'hcp',
    therapeuticArea: 'essential-tremor',
    drugProduct: 'euloxacaltenamide',
    specialty: 'Neurology',
    npiNumber: '2345678901',
    practiceLocation: 'UCSF Neurology',
    patientsOnTherapy: 5,
    behavioralSignals: [
      { category: 'COMPETITIVE_INTEL', detail: 'Prescribing pattern shifted -- 3 patients moved from propranolol to ELEX', recency: '2 weeks ago', severity: 'low', clinicalImplication: 'Positive adoption trend -- reinforce with outcomes data', timestamp: new Date('2026-03-03').toISOString() },
    ],
    recommendedPathway: 'medical-inquiry',
    openActions: ['Phase 3 data request pending', 'Formulary support needed'],
    priorityTier: 'MEDIUM',
    priorityScore: 62,
    preferredChannel: 'voice',
  },
  {
    contactId: 'HCP-003',
    name: 'Dr. Alan Park',
    phone: '+12125552003',
    age: 48,
    gender: 'Male',
    contactType: 'hcp',
    therapeuticArea: 'essential-tremor',
    drugProduct: 'euloxacaltenamide',
    specialty: 'Movement Disorder Specialist',
    npiNumber: '3456789012',
    practiceLocation: 'Mount Sinai Neurology',
    patientsOnTherapy: 0,
    behavioralSignals: [
      { category: 'HCP_ACTIVITY', detail: 'Downloaded ELEX PI from praxisbio.com, viewed MOA video twice', recency: '4 days ago', severity: 'medium', clinicalImplication: 'Evaluating ELEX -- high-value target for outbound detail', timestamp: new Date('2026-03-13').toISOString() },
    ],
    recommendedPathway: 'sample-request',
    openActions: ['Introductory detail call', 'Sample shipment', 'Speaker program invitation'],
    priorityTier: 'HIGH',
    priorityScore: 78,
    preferredChannel: 'voice',
  },
  {
    contactId: 'HCP-004',
    name: 'Dr. Lisa Rodriguez',
    phone: '+13125552004',
    age: 39,
    gender: 'Female',
    contactType: 'hcp',
    therapeuticArea: 'dee',
    drugProduct: 'relutrigine',
    specialty: 'Pediatric Neurology -- Epilepsy',
    npiNumber: '4567890123',
    practiceLocation: "Ann & Robert H. Lurie Children's Hospital",
    patientsOnTherapy: 8,
    behavioralSignals: [
      { category: 'HCP_ACTIVITY', detail: 'Submitted 3 Relutrigine prior auth requests in 2 weeks', recency: '3 days ago', severity: 'high', clinicalImplication: 'Active prescriber with access challenges -- formulary support needed', timestamp: new Date('2026-03-14').toISOString() },
    ],
    recommendedPathway: 'medical-inquiry',
    openActions: ['Prior auth support', 'Formulary challenge data', 'Peer-to-peer scheduling'],
    priorityTier: 'HIGH',
    priorityScore: 90,
    preferredChannel: 'voice',
  },
  {
    contactId: 'HCP-005',
    name: 'Dr. David Kim',
    phone: '+12065552005',
    age: 56,
    gender: 'Male',
    contactType: 'hcp',
    therapeuticArea: 'dee',
    drugProduct: 'relutrigine',
    specialty: 'Epileptologist',
    npiNumber: '5678901234',
    practiceLocation: 'Seattle Epilepsy Center',
    patientsOnTherapy: 15,
    behavioralSignals: [
      { category: 'COMPETITIVE_INTEL', detail: 'Published review article comparing Relutrigine to fenfluramine', recency: '1 week ago', severity: 'medium', clinicalImplication: 'KOL influence -- engage for speaker program and advisory board', timestamp: new Date('2026-03-10').toISOString() },
    ],
    recommendedPathway: 'medical-inquiry',
    openActions: ['Advisory board invitation', 'Speaker program recruitment', 'Real-world evidence discussion'],
    priorityTier: 'MEDIUM',
    priorityScore: 72,
    preferredChannel: 'voice',
  },
  {
    contactId: 'HCP-006',
    name: 'Dr. Rachel Foster',
    phone: '+12155552006',
    age: 41,
    gender: 'Female',
    contactType: 'hcp',
    therapeuticArea: 'dee',
    drugProduct: 'relutrigine',
    specialty: 'Pediatric Neurologist',
    npiNumber: '6789012345',
    practiceLocation: "Children's Hospital of Philadelphia",
    patientsOnTherapy: 3,
    behavioralSignals: [
      { category: 'SEARCH_INTENT', detail: 'Searched "Relutrigine Dravet trial results" and "sodium channel blocker DEE" on medical portals', recency: '2 days ago', severity: 'medium', clinicalImplication: 'Researching Relutrigine -- receptive to clinical data presentation', timestamp: new Date('2026-03-15').toISOString() },
    ],
    recommendedPathway: 'sample-request',
    openActions: ['Clinical data presentation', 'Sample request follow-up', 'Peer-to-peer connection'],
    priorityTier: 'MEDIUM',
    priorityScore: 58,
    preferredChannel: 'sms',
  },
];

// ---------------------------------------------------------------------------
// Agent type assignment logic
// ---------------------------------------------------------------------------
function assignAgentType(contactType: 'patient' | 'hcp', pathway: SupportPathwayId): AgentType {
  if (contactType === 'patient') return 'patient-support';
  if (pathway === 'sample-request' || pathway === 'medical-inquiry') return 'hcp-support';
  return 'hcp-outbound';
}

// ---------------------------------------------------------------------------
// Outcome distribution -- 20 total calls
// ---------------------------------------------------------------------------
const OUTCOME_DISTRIBUTION: { outcome: InteractionOutcome; count: number }[] = [
  { outcome: 'hub-enrolled', count: 3 },
  { outcome: 'copay-card-issued', count: 2 },
  { outcome: 'ae-report-filed', count: 2 },
  { outcome: 'adherence-counseling', count: 3 },
  { outcome: 'sample-shipped', count: 2 },
  { outcome: 'medical-info-provided', count: 2 },
  { outcome: 'hcp-detail-completed', count: 2 },
  { outcome: 'follow-up-scheduled', count: 1 },
  { outcome: 'no-answer', count: 2 },
  { outcome: 'voicemail', count: 1 },
];

// Pathway distribution -- 20 total calls
const PATHWAY_DISTRIBUTION: { pathway: SupportPathwayId; count: number }[] = [
  { pathway: 'hub-enrollment', count: 4 },
  { pathway: 'copay-assistance', count: 3 },
  { pathway: 'ae-reporting', count: 3 },
  { pathway: 'adherence-support', count: 4 },
  { pathway: 'sample-request', count: 3 },
  { pathway: 'medical-inquiry', count: 3 },
];

// ---------------------------------------------------------------------------
// Build flat shuffled arrays
// ---------------------------------------------------------------------------
function flatShuffle<T>(spec: { item: T; count: number }[]): T[] {
  const list: T[] = [];
  for (const { item, count } of spec) {
    for (let i = 0; i < count; i++) list.push(item);
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const OUTCOMES_LIST = flatShuffle(
  OUTCOME_DISTRIBUTION.map(({ outcome, count }) => ({ item: outcome, count })),
);
const PATHWAYS_LIST = flatShuffle(
  PATHWAY_DISTRIBUTION.map(({ pathway, count }) => ({ item: pathway, count })),
);

// ---------------------------------------------------------------------------
// Transcript generator
// ---------------------------------------------------------------------------
function generateTranscript(
  outcome: InteractionOutcome,
  pathway: SupportPathwayId,
  contactName: string,
  contactType: 'patient' | 'hcp',
  drug: DrugProduct,
  agentType: AgentType,
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  let ts = 0;

  const add = (speaker: 'agent' | 'contact', text: string) => {
    ts += randInt(3, 8);
    entries.push({ speaker, text, timestamp: ts });
  };

  const firstName = contactName.split(' ').pop() || contactName.split(' ')[0];
  const drugName = drug === 'euloxacaltenamide' ? 'ELEX' : 'Relutrigine';

  if (outcome === 'no-answer') {
    add('agent', `Outbound call attempt to ${contactName}...`);
    ts += 25;
    add('agent', 'No answer after 6 rings. Call ended. Retry scheduled per protocol.');
    return entries;
  }

  if (outcome === 'voicemail') {
    add('agent', `Outbound call to ${contactName}...`);
    ts += 15;
    if (contactType === 'patient') {
      add('agent', `Hi, this is Aria from Praxis BioSciences patient support. I'm calling regarding your ${drugName} therapy. Please call us back at 1-800-PRAXIS-1. Thank you!`);
    } else {
      add('agent', `Good day, this is a follow-up from Praxis BioSciences medical affairs regarding ${drugName}. Please call us at your convenience at 1-800-PRAXIS-2. Thank you, Doctor.`);
    }
    return entries;
  }

  // Connected call
  if (contactType === 'patient') {
    add('agent', `Hi, may I please speak with ${contactName}?`);
    add('contact', pick(['Speaking.', "Yes, that's me.", `Yes, this is ${firstName}.`] as const));
    add('agent', `Hi ${firstName}, my name is Aria and I'm calling from Praxis BioSciences patient support regarding your ${drugName} therapy. How are you doing today?`);
    add('contact', pick([
      "I'm doing okay. I had some questions actually.",
      "Not bad. My doctor mentioned you might call.",
      "Fine, thanks. What's this about?",
      "Pretty good. I've been meaning to call you all.",
    ] as const));
  } else {
    add('agent', `Good day, may I speak with Dr. ${firstName}?`);
    add('contact', pick(['Speaking.', 'Yes, this is they.', `This is Dr. ${firstName}.`] as const));
    add('agent', `Dr. ${firstName}, this is ${agentType === 'hcp-outbound' ? 'Rachel' : 'Marcus'} from Praxis BioSciences. ${agentType === 'hcp-outbound' ? `I'm reaching out to share some updates on ${drugName}.` : `How can I assist you today regarding ${drugName}?`}`);
    add('contact', pick([
      `Yes, I've been wanting to discuss ${drugName} for some of my patients.`,
      "Go ahead, I have a few minutes.",
      `Actually, I have some questions about the clinical data.`,
    ] as const));
  }

  // Pathway-specific body
  if (pathway === 'hub-enrollment') {
    add('agent', `I'd like to help get you enrolled in our Praxis Support Hub. This gives you access to dedicated support, copay assistance, and personalized adherence resources for ${drugName} -- all at no cost to you.`);
    add('contact', pick(["That sounds helpful. What do I need to do?", "My doctor mentioned something about a support program.", "How does the copay help work?"] as const));
    add('agent', `I can get you enrolled right now over the phone. I'll need to verify some basic information and then we'll get your benefits investigation started. The hub also provides a dedicated care coordinator who can help with any questions about your therapy.`);
    add('contact', "Okay, let's do it. I've been worried about the costs.");
  } else if (pathway === 'copay-assistance') {
    add('agent', `I'm calling to help you activate your ${drugName} copay card. Many patients qualify to pay as little as $0 out of pocket for their prescriptions.`);
    add('contact', pick(["That would be amazing. The specialty pharmacy quoted me a really high copay.", "Yes, I definitely need help with the cost.", "How do I qualify for that?"] as const));
    add('agent', `Based on your insurance information, you are eligible for our copay assistance program. I can activate your card right now and it will be applied to your next fill at the specialty pharmacy.`);
    add('contact', "Yes, please. That's such a relief.");
  } else if (pathway === 'ae-reporting') {
    add('agent', `I'm following up on your ${drugName} therapy. Part of my call today is to check in on how you're tolerating the medication. Have you experienced any new or unusual symptoms since starting ${drugName}?`);
    add('contact', pick([
      `Actually yes, I've been having some dizziness and nausea for the past week.`,
      `I've noticed some headaches that seem to have started since I began the medication.`,
      `My ${drug === 'relutrigine' ? 'child has been more drowsy than usual' : 'hands have been tingling more'}.`,
    ] as const));
    add('agent', `Thank you for sharing that with me -- this is exactly the kind of information we need to capture. I'm going to document this as an adverse event report so our medical team can review it. Can you tell me when these symptoms first started and how severe they've been?`);
    add('contact', "It started about a week ago. It's been moderate -- not severe but definitely noticeable.");
    add('agent', `I've documented everything. Our pharmacovigilance team will review this within 24 hours. In the meantime, please contact your prescribing physician if symptoms worsen. I'll also send you our 24/7 medical support line number.`);
  } else if (pathway === 'adherence-support') {
    add('agent', `I'm calling for your scheduled ${drugName} adherence check-in. We want to make sure everything is going well with your therapy. Have you been able to take your medication consistently?`);
    add('contact', pick([
      "Mostly, but I've missed a few doses this week.",
      "Yes, I've been pretty good about it.",
      "I ran out a few days ago and haven't been able to get my refill.",
    ] as const));
    add('agent', `I appreciate your honesty. Consistent dosing is really important for ${drugName} to work effectively. Let me help coordinate your refill and we can talk through some strategies to help with adherence.`);
    add('contact', "That would be helpful. Sometimes I just forget the evening dose.");
  } else if (pathway === 'sample-request') {
    add('agent', `Dr. ${firstName}, I understand you're interested in ${drugName} samples for your practice. We can arrange a shipment to your office within 3-5 business days.`);
    add('contact', `Yes, I have several ${drug === 'euloxacaltenamide' ? 'essential tremor' : 'Dravet syndrome'} patients who might benefit. I'd like to try them on ${drugName} before committing to a full prescription.`);
    add('agent', `That's a great approach. I can ship a starter kit that includes ${drug === 'euloxacaltenamide' ? 'a 2-week titration pack' : 'a 4-week supply at the starting dose'}, along with patient education materials and our quick-start guide.`);
    add('contact', "Perfect. Can you also send the Phase 3 efficacy data? I'd like to review it with my patients.");
  } else if (pathway === 'medical-inquiry') {
    add('agent', `Dr. ${firstName}, how can I help you today with your ${drugName} inquiry?`);
    add('contact', pick([
      `I'm looking for the Phase 3 trial data, specifically the primary endpoint results.`,
      `I have a patient with a complex case and need to understand the drug interaction profile.`,
      `What's the recommended titration schedule for patients switching from ${drug === 'euloxacaltenamide' ? 'propranolol' : 'fenfluramine'}?`,
    ] as const));
    add('agent', `Great question. I can provide you with the full clinical data package. ${drug === 'euloxacaltenamide' ? 'The TREMOR-1 trial showed a 62% reduction in TETRAS tremor scores vs placebo at 12 weeks.' : 'The NAVIGATE trial demonstrated a 52% median reduction in convulsive seizure frequency vs placebo over 14 weeks.'} I'll email the complete publication and prescribing information to your office.`);
    add('contact', "That's very helpful. Can you also arrange a peer-to-peer with one of your KOLs?");
  }

  // Outcome-specific closing
  switch (outcome) {
    case 'hub-enrolled':
      add('agent', `Excellent, ${contactType === 'patient' ? firstName : `Dr. ${firstName}`}. You're now enrolled in the Praxis Support Hub. You'll receive a welcome packet via email and a dedicated coordinator will reach out within 48 hours.`);
      add('contact', "Thank you so much. This is very helpful.");
      break;
    case 'copay-card-issued':
      add('agent', `Your copay card is now active. The ID number is PRAX-${randInt(10000, 99999)}. Your next fill should show the reduced copay. I'll send all the details via text.`);
      add('contact', "That's wonderful. Thank you for making this so easy.");
      break;
    case 'ae-report-filed':
      add('agent', `I've filed the adverse event report -- case number AE-${randInt(100000, 999999)}. Our pharmacovigilance team will follow up within 24 hours. Please don't hesitate to call our 24/7 line if anything changes.`);
      add('contact', "Okay, thank you. I'll keep monitoring it.");
      break;
    case 'adherence-counseling':
      add('agent', `I've set up a refill reminder and your next adherence check-in for ${pick(['next Tuesday', 'next Thursday', 'next Monday'] as const)}. Remember, consistent dosing is key to seeing the best results with ${drugName}.`);
      add('contact', "I'll do my best. Thanks for the support.");
      break;
    case 'sample-shipped':
      add('agent', `The sample shipment has been initiated, Dr. ${firstName}. You should receive it within 3-5 business days at your ${pick(['office', 'clinic', 'practice location'] as const)}. I'll also include our patient starter kit materials.`);
      add('contact', "Great, I'll look for it. Thanks for the quick turnaround.");
      break;
    case 'medical-info-provided':
      add('agent', `I'll email the complete clinical data package to your office today, Dr. ${firstName}. I'm also arranging a peer-to-peer discussion for next week. Is there anything else I can help with?`);
      add('contact', "No, that covers it. Thank you for the thorough response.");
      break;
    case 'hcp-detail-completed':
      add('agent', `Thank you for your time today, Dr. ${firstName}. To summarize -- ${drugName} offers ${drug === 'euloxacaltenamide' ? 'significant tremor reduction with a favorable safety profile' : 'meaningful seizure frequency reduction with a novel mechanism of action'}. I'll send the detail materials and PI to your office.`);
      add('contact', "I appreciate the update. I'll consider it for appropriate patients.");
      break;
    case 'prior-auth-initiated':
      add('agent', `I've initiated the prior authorization process. Our team will work directly with the payer. You should have a determination within 5-7 business days. I'll keep you updated.`);
      add('contact', "Thank you. My patients really need this medication.");
      break;
    case 'follow-up-scheduled':
      add('agent', `I've scheduled a follow-up for ${pick(['next Tuesday at 2 PM', 'Thursday at 10 AM', 'next Monday at 3 PM'] as const)}. I'll have all the information ready for you.`);
      add('contact', "Sounds good. Talk to you then.");
      break;
    case 'callback-requested':
      add('contact', "Can you call me back? I'm in between patients right now.");
      add('agent', `Of course. I'll call you back at ${pick(['3 PM', '4:30 PM', 'tomorrow morning'] as const)}. Thank you, Dr. ${firstName}.`);
      break;
    case 'declined':
      add('contact', "I appreciate the call but I'm not interested at this time.");
      add('agent', `I completely understand. I'll note your preference. If anything changes, we're always here to help. Thank you for your time.`);
      break;
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Liaison Summary generator
// ---------------------------------------------------------------------------
function generateLiaisonSummary(
  pathway: SupportPathwayId,
  outcome: InteractionOutcome,
  signals: BehavioralSignal[],
  priorityTier: PriorityTier,
  contactName: string,
  contactType: 'patient' | 'hcp',
  drug: DrugProduct,
  agentType: AgentType,
): LiaisonSummary {
  const isConversion = CONVERSION_OUTCOMES.includes(outcome);
  const engagementScore = outcome === 'hub-enrolled' ? randInt(80, 95)
    : outcome === 'copay-card-issued' ? randInt(78, 92)
    : outcome === 'ae-report-filed' ? randInt(70, 88)
    : outcome === 'hcp-detail-completed' ? randInt(72, 90)
    : outcome === 'sample-shipped' ? randInt(75, 88)
    : outcome === 'medical-info-provided' ? randInt(68, 85)
    : outcome === 'declined' ? randInt(20, 40)
    : randInt(40, 65);

  const highSigs = signals.filter(s => s.severity === 'high');
  const aeDetected = outcome === 'ae-report-filed' || (pathway === 'ae-reporting' && rng() > 0.3);
  const drugName = drug === 'euloxacaltenamide' ? 'ELEX' : 'Relutrigine';

  const indicators: string[] = [];
  if (highSigs.length > 0) indicators.push(`${highSigs.length} high-priority signal(s) detected`);
  if (aeDetected) indicators.push('ADVERSE EVENT DETECTED -- pharmacovigilance review required');
  if (contactType === 'hcp' && signals.some(s => s.category === 'COMPETITIVE_INTEL')) indicators.push('Competitive intelligence opportunity identified');
  if (priorityTier === 'HIGH') indicators.push('HIGH priority tier -- escalated engagement protocol');
  if (signals.some(s => s.category === 'ADHERENCE_SIGNAL')) indicators.push('Adherence gap confirmed -- therapy continuity at risk');

  const narrativeMap: Record<SupportPathwayId, string> = {
    'hub-enrollment': `${agentType === 'patient-support' ? 'Aria' : 'Agent'} completed hub enrollment for ${contactName} on ${drugName}. ${isConversion ? 'Patient successfully enrolled in Praxis Support Hub. Benefits investigation initiated. Dedicated coordinator to contact within 48 hours.' : 'Patient expressed interest but did not complete enrollment. Follow-up recommended within 5 business days.'}`,
    'copay-assistance': `Copay assistance interaction for ${contactName}. ${isConversion ? `Copay card activated -- patient eligible for $0 copay on ${drugName}. Specialty pharmacy notified.` : 'Copay assistance discussed. Patient needs follow-up on eligibility determination.'}`,
    'ae-reporting': `PHARMACOVIGILANCE ALERT -- AE screening for ${contactName} on ${drugName}. ${aeDetected ? 'Adverse event captured and documented. Case submitted to pharmacovigilance team for 24-hour review. Follow-up with prescribing physician required.' : 'No reportable adverse events identified during screening. Routine monitoring continues.'}`,
    'adherence-support': `Adherence support call for ${contactName} on ${drugName}. ${signals.some(s => s.category === 'ADHERENCE_SIGNAL') ? 'Adherence gap confirmed. Refill coordination initiated and reminder system established.' : 'Patient reports adequate adherence. Next scheduled check-in logged.'}`,
    'sample-request': `Sample request processed for ${contactName}. ${isConversion ? `${drugName} sample shipment initiated -- delivery in 3-5 business days. Clinical materials included in package.` : 'Sample request noted. Awaiting DEA/state license verification.'}`,
    'medical-inquiry': `Medical inquiry from ${contactName} regarding ${drugName}. ${isConversion ? 'Clinical data package sent. Peer-to-peer discussion arranged.' : 'Inquiry documented. Medical affairs team to provide detailed response within 48 hours.'} ${signals.some(s => s.category === 'COMPETITIVE_INTEL') ? 'COMPETITIVE INTELLIGENCE: Prescriber evaluating alternatives -- priority follow-up recommended.' : ''}`,
  };

  return {
    engagementScore,
    engagementAssessment: engagementScore >= 75
      ? 'High -- contact is actively engaged and receptive to support'
      : engagementScore >= 55
      ? 'Moderate -- contact is interested but has identified barriers'
      : 'Low -- consider alternate engagement approach or timing',
    engagementWindow: priorityTier === 'HIGH' ? 'Next 48 hours -- escalated priority'
      : priorityTier === 'MEDIUM' ? 'Next 7 days'
      : 'Next 14 days -- standard follow-up',
    behavioralContextIndicators: indicators,
    clinicalRiskPattern: `${priorityTier} priority -- ${signals.length} behavioral signal(s) active. ${aeDetected ? 'AE FLAG ACTIVE.' : ''}`,
    supportNeeds: pick([
      'Financial assistance primary barrier -- copay/access support critical',
      'Adherence support needed -- refill coordination and reminder system',
      'Clinical information gap -- HCP requires detailed efficacy/safety data',
      'Caregiver support needs -- emotional support and practical guidance',
      'Formulary access challenge -- prior authorization support needed',
    ] as const),
    recommendedActions: [
      isConversion
        ? 'Send confirmation summary within 30 minutes'
        : `Schedule follow-up within ${priorityTier === 'HIGH' ? '48 hours' : '7 days'}`,
      aeDetected
        ? 'PRIORITY: Route to pharmacovigilance team -- 24-hour review deadline'
        : 'Continue standard engagement workflow',
      contactType === 'hcp'
        ? 'Update CRM with prescriber engagement data and competitive intelligence'
        : 'Update patient hub profile with interaction notes',
      `Log interaction in ${drugName} brand analytics dashboard`,
    ],
    enrichmentData: {
      prescribingPattern: contactType === 'hcp'
        ? pick([
            'Growing prescriber -- 3 new starts in past 30 days',
            'Stable prescriber -- maintaining current patient base',
            'Evaluating prescriber -- downloading clinical materials, no Rx yet',
            'Competitive switch opportunity -- patients on older therapies',
          ] as const)
        : 'N/A -- patient contact',
      adherenceProfile: contactType === 'patient'
        ? pick([
            'Good adherence -- refills on schedule, PDC >80%',
            'Adherence gap detected -- refill overdue, intervention needed',
            'New start -- insufficient data for adherence assessment',
            'Moderate adherence -- occasional missed doses reported',
          ] as const)
        : 'N/A -- HCP contact',
      digitalEngagement: pick([
        'High digital engagement -- active on patient portal and mobile app',
        'Moderate engagement -- occasional website visits',
        'Low digital engagement -- prefers phone contact',
        'Active health content consumer -- researching condition and treatment options',
      ] as const),
      competitiveIntelligence: pick([
        `Market: ${drug === 'euloxacaltenamide' ? 'Propranolol and primidone remain primary alternatives' : 'Fenfluramine and cannabidiol are primary competitors'}`,
        'No competitive switching signals detected',
        'Prescriber evaluating multiple options -- differentiation opportunity',
        'Formulary preference for competitor -- access strategy needed',
      ] as const),
    },
    channelEffectiveness: {
      sms: randInt(30, 65),
      voiceAgent: randInt(55, 88),
      fieldLiaison: randInt(65, 95),
    },
    callSummaryForLiaison: narrativeMap[pathway],
    aeDetected,
    aeDetails: aeDetected
      ? pick([
          `Patient reported dizziness and mild nausea beginning 1 week after ${drugName} initiation. Severity: moderate. Duration: ongoing.`,
          `Patient/caregiver reported increased drowsiness following dose increase. Severity: mild. No dose modification made.`,
          `Patient experienced headache and tremor worsening. Onset: 5 days post-initiation. Severity: moderate. Prescriber notified.`,
        ] as const)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Classification generator
// ---------------------------------------------------------------------------
function generateClassification(
  outcome: InteractionOutcome,
  pathway: SupportPathwayId,
  signals: BehavioralSignal[],
  liaisonSummary: LiaisonSummary,
): Classification {
  const isConversion = CONVERSION_OUTCOMES.includes(outcome);
  const isNoConnect = NON_CONNECT_OUTCOMES.includes(outcome);

  const urgency: UrgencyLevel = pathway === 'ae-reporting' ? 'urgent'
    : liaisonSummary.aeDetected ? 'urgent'
    : signals.some(s => s.severity === 'high') ? 'soon'
    : 'routine';

  const sentiment: Classification['sentiment'] = isConversion
    ? pick(['positive', 'positive', 'neutral'] as const)
    : outcome === 'declined' ? 'neutral'
    : isNoConnect ? 'neutral'
    : pick(['neutral', 'positive'] as const);

  const keyMoments: string[] = [];
  if (!isNoConnect) {
    keyMoments.push('Contact identity confirmed and rapport established');
    if (liaisonSummary.aeDetected) {
      keyMoments.push('ADVERSE EVENT DETECTED and documented per pharmacovigilance protocol');
    }
    if (isConversion) {
      keyMoments.push(`${outcome.replace(/-/g, ' ')} confirmed`);
    }
  }

  return {
    outcome,
    confidence: isNoConnect ? +(0.92 + rng() * 0.06).toFixed(2) : +(0.80 + rng() * 0.18).toFixed(2),
    support_pathway: pathway,
    urgency,
    sentiment,
    key_moments: keyMoments,
    contact_concerns: isNoConnect ? [] : pick([
      ['Medication cost burden', 'Insurance coverage questions'],
      ['Side effect concerns'],
      ['Adherence difficulty', 'Dosing confusion'],
      ['Formulary access challenges'],
      ['Need for clinical evidence'],
      ['Caregiver support needs'],
    ] as const),
    behavioral_signals_referenced: signals
      .filter(s => s.severity !== 'low')
      .map(s => s.detail.slice(0, 60) + '...'),
    next_action: isConversion
      ? 'Send confirmation and schedule follow-up per protocol'
      : outcome === 'declined'
      ? 'Note preference. Retry in 30 days or upon new clinical signal.'
      : 'Retry within 3-5 business days via alternate channel',
    liaison_summary: liaisonSummary.callSummaryForLiaison,
    aeDetected: liaisonSummary.aeDetected,
    aeNarrative: liaisonSummary.aeDetails,
  };
}

// ---------------------------------------------------------------------------
// Screening generator
// ---------------------------------------------------------------------------
function generateScreeningResults(
  pathway: SupportPathwayId,
  isConnected: boolean,
  callTimestamp: string,
): ScreeningResult[] | null {
  if (!isConnected) return null;
  if (pathway !== 'ae-reporting' && pathway !== 'adherence-support') {
    if (rng() > 0.3) return null;
  }

  const results: ScreeningResult[] = [];
  const baseTime = new Date(callTimestamp).getTime() / 1000 + 60;

  if (pathway === 'ae-reporting' || rng() < 0.5) {
    const declined = rng() < 0.1;
    const isPositive = rng() < 0.4;
    results.push({
      instrumentId: 'AE-SCREEN',
      instrumentName: 'Adverse Event Screening',
      status: declined ? 'declined' : 'completed',
      responses: declined ? [] : [
        { questionIndex: 0, questionText: 'Have you experienced any new symptoms since starting your medication?', contactResponse: isPositive ? 'Yes, some dizziness and nausea' : 'No, nothing new', scoreValue: isPositive ? 2 : 0, timestamp: baseTime },
        { questionIndex: 1, questionText: 'Have any existing symptoms gotten worse?', contactResponse: isPositive ? 'My headaches have been more frequent' : 'No, about the same', scoreValue: isPositive ? 1 : 0, timestamp: baseTime + 20 },
        { questionIndex: 2, questionText: 'Have you visited the ER or urgent care since starting the medication?', contactResponse: isPositive ? 'Once, last week' : 'No', scoreValue: isPositive ? 3 : 0, timestamp: baseTime + 40 },
      ],
      totalScore: isPositive ? 6 : 0,
      maxScore: 9,
      isPositiveScreen: isPositive,
      clinicalInterpretation: isPositive
        ? 'POSITIVE AE screen -- adverse event documentation required. Route to pharmacovigilance.'
        : 'Negative AE screen -- no reportable events. Continue routine monitoring.',
      reportRequired: isPositive,
      reportType: isPositive ? 'Individual Case Safety Report (ICSR)' : null,
      startedAt: new Date(baseTime * 1000).toISOString(),
      completedAt: declined ? null : new Date((baseTime + 60) * 1000).toISOString(),
    });
  }

  if (pathway === 'adherence-support' || rng() < 0.3) {
    results.push({
      instrumentId: 'ADHERENCE-CHECK',
      instrumentName: 'Medication Adherence Assessment',
      status: 'completed',
      responses: [
        { questionIndex: 0, questionText: 'How many doses have you missed in the past week?', contactResponse: pick(['None', 'One or two', 'Several'] as const), scoreValue: randInt(0, 2), timestamp: baseTime + 70 },
        { questionIndex: 1, questionText: 'Have you had difficulty getting your refill?', contactResponse: pick(['No issues', 'Some delays', 'Yes, it has been difficult'] as const), scoreValue: randInt(0, 2), timestamp: baseTime + 90 },
      ],
      totalScore: randInt(0, 4),
      maxScore: 4,
      isPositiveScreen: false,
      clinicalInterpretation: 'Adherence assessment completed. Results documented in patient profile.',
      reportRequired: false,
      reportType: null,
      startedAt: new Date((baseTime + 70) * 1000).toISOString(),
      completedAt: new Date((baseTime + 110) * 1000).toISOString(),
    });
  }

  return results.length > 0 ? results : null;
}

// ---------------------------------------------------------------------------
// Priority tier assignment
// ---------------------------------------------------------------------------
function assignPriorityTier(pathway: SupportPathwayId, signals: BehavioralSignal[]): PriorityTier {
  const highCount = signals.filter(s => s.severity === 'high').length;
  if (pathway === 'ae-reporting') return 'HIGH';
  if (highCount >= 2) return 'HIGH';
  if (highCount === 1 || pathway === 'adherence-support') return 'MEDIUM';
  return pick(['MEDIUM', 'LOW', 'LOW'] as const);
}

// ---------------------------------------------------------------------------
// Build 20 call records
// ---------------------------------------------------------------------------
function buildAllCalls(): CallRecord[] {
  const referenceDate = new Date('2026-03-17T00:00:00Z');
  const calls: CallRecord[] = [];

  for (let i = 0; i < 20; i++) {
    const outcome = OUTCOMES_LIST[i];
    const pathway = PATHWAYS_LIST[i];
    const contact = CONTACTS[i % CONTACTS.length];
    const agentType = assignAgentType(contact.contactType, pathway);

    // Pick signals from the contact's signals
    const signals: BehavioralSignal[] = contact.behavioralSignals.map(s => ({
      ...s,
      timestamp: new Date(referenceDate.getTime() - randInt(1, 10) * 86400000).toISOString(),
    }));

    const priorityTier = assignPriorityTier(pathway, signals);
    const isNoConnect = NON_CONNECT_OUTCOMES.includes(outcome);

    // Duration
    const duration = outcome === 'no-answer' ? randInt(15, 40)
      : outcome === 'voicemail' ? randInt(30, 60)
      : outcome === 'declined' ? randInt(60, 150)
      : outcome === 'ae-report-filed' ? randInt(300, 480)
      : outcome === 'hub-enrolled' ? randInt(240, 420)
      : outcome === 'hcp-detail-completed' ? randInt(300, 540)
      : outcome === 'medical-info-provided' ? randInt(240, 480)
      : randInt(150, 360);

    // Timestamp
    const daysAgo = Math.floor((i / 20) * 5);
    const hoursOffset = randInt(8, 18);
    const minutesOffset = randInt(0, 59);
    const callDate = new Date(referenceDate);
    callDate.setDate(callDate.getDate() - daysAgo);
    callDate.setHours(hoursOffset, minutesOffset, randInt(0, 59), 0);

    const transcript = generateTranscript(outcome, pathway, contact.name, contact.contactType, contact.drugProduct, agentType);
    const liaisonSummary = generateLiaisonSummary(pathway, outcome, signals, priorityTier, contact.name, contact.contactType, contact.drugProduct, agentType);
    const classification = generateClassification(outcome, pathway, signals, liaisonSummary);
    const screeningResults = generateScreeningResults(pathway, !isNoConnect, callDate.toISOString());

    calls.push({
      id: pseudoUUID(),
      contactId: contact.contactId,
      contactName: contact.name,
      contactAge: contact.age,
      contactType: contact.contactType,
      agentType,
      therapeuticArea: contact.therapeuticArea,
      drugProduct: contact.drugProduct,
      supportPathway: pathway,
      behavioralSignals: signals,
      priorityTier,
      outcome,
      urgency: classification.urgency,
      sentiment: classification.sentiment,
      duration,
      timestamp: callDate.toISOString(),
      transcript,
      classification,
      liaisonSummary,
      smsSent: !isNoConnect && rng() > 0.3,
      channel: 'voice',
      screeningResults,
      aeDetected: liaisonSummary.aeDetected,
    });
  }

  calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return calls;
}

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------
const ALL_CALLS = buildAllCalls();
const CALL_MAP = new Map<string, CallRecord>(ALL_CALLS.map((c) => [c.id, c]));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getAllCalls(): CallRecord[] {
  return ALL_CALLS;
}

export function getCallById(id: string): CallRecord | undefined {
  return CALL_MAP.get(id);
}

export function getFilteredCalls(filters: {
  supportPathway?: string;
  outcome?: string;
  priorityTier?: string;
  agentType?: string;
  therapeuticArea?: string;
  search?: string;
  page?: number;
  limit?: number;
}): { calls: CallRecord[]; total: number; page: number; totalPages: number } {
  const { supportPathway, outcome, priorityTier, agentType, therapeuticArea, search, page = 1, limit = 20 } = filters;

  const filtered = ALL_CALLS.filter((call) => {
    if (supportPathway && call.supportPathway !== supportPathway) return false;
    if (outcome && call.outcome !== outcome) return false;
    if (priorityTier && call.priorityTier !== priorityTier) return false;
    if (agentType && call.agentType !== agentType) return false;
    if (therapeuticArea && call.therapeuticArea !== therapeuticArea) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!call.contactName.toLowerCase().includes(q) && !call.contactId.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  return { calls: filtered.slice(start, start + limit), total, page, totalPages };
}

export function getContactQueue(): ContactRecord[] {
  return CONTACTS;
}

export function getAnalytics(period: 'today' | 'week' | 'all' = 'all'): AnalyticsResponse {
  const now = new Date('2026-03-17T00:00:00Z');
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  function filterByPeriod(p: 'today' | 'week' | 'all'): CallRecord[] {
    if (p === 'all') return ALL_CALLS;
    const cutoff = p === 'today' ? todayStart : weekStart;
    return ALL_CALLS.filter((c) => new Date(c.timestamp) >= cutoff);
  }

  const periodCalls = filterByPeriod(period);
  const total = periodCalls.length;

  const connected = periodCalls.filter((c) => !NON_CONNECT_OUTCOMES.includes(c.outcome));
  const engaged = connected.filter((c) => c.outcome !== 'declined' && c.outcome !== 'callback-requested');
  const aeReports = periodCalls.filter((c) => c.aeDetected);
  const hubEnrolled = periodCalls.filter((c) => c.outcome === 'hub-enrolled');
  const copayCards = periodCalls.filter((c) => c.outcome === 'copay-card-issued');
  const hcpEngagements = periodCalls.filter((c) => c.contactType === 'hcp' && CONVERSION_OUTCOMES.includes(c.outcome));
  const samples = periodCalls.filter((c) => c.outcome === 'sample-shipped');
  const medInquiries = periodCalls.filter((c) => c.outcome === 'medical-info-provided');

  const avgDuration = total > 0
    ? Math.round(periodCalls.reduce((s, c) => s + c.duration, 0) / total)
    : 0;

  const kpis: KPIData = {
    totalInteractions: total,
    aeReportsCaptured: aeReports.length,
    hubEnrollments: hubEnrolled.length,
    copayCardsIssued: copayCards.length,
    hcpEngagements: hcpEngagements.length,
    adherenceRate: 78.5,
    sampleRequests: samples.length,
    avgHandleTime: avgDuration,
    engagementRate: total > 0 ? +((engaged.length / total) * 100).toFixed(1) : 0,
    medicalInquiries: medInquiries.length,
  };

  const outcomeDistribution: Record<string, number> = {};
  for (const c of periodCalls) {
    outcomeDistribution[c.outcome] = (outcomeDistribution[c.outcome] || 0) + 1;
  }

  const pathwayDistribution: Record<string, number> = {};
  for (const c of periodCalls) {
    pathwayDistribution[c.supportPathway] = (pathwayDistribution[c.supportPathway] || 0) + 1;
  }

  const priorityTierDistribution: Record<PriorityTier, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const c of periodCalls) {
    priorityTierDistribution[c.priorityTier]++;
  }

  const agentTypeDistribution: Record<AgentType, number> = {
    'patient-support': 0,
    'hcp-support': 0,
    'hcp-outbound': 0,
    'medcomms-qa': 0,
  };
  for (const c of periodCalls) {
    agentTypeDistribution[c.agentType]++;
  }

  const therapeuticAreaDistribution: Record<TherapeuticArea, number> = {
    'essential-tremor': 0,
    'dee': 0,
  };
  for (const c of periodCalls) {
    therapeuticAreaDistribution[c.therapeuticArea]++;
  }

  const dailyTrend: AnalyticsResponse['dailyTrend'] = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(day.getDate() - d);
    const dateStr = day.toISOString().split('T')[0];
    const dayCalls = periodCalls.filter((c) => c.timestamp.startsWith(dateStr));
    const dayEngaged = dayCalls.filter((c) => !NON_CONNECT_OUTCOMES.includes(c.outcome) && c.outcome !== 'declined');
    const dayConverted = dayCalls.filter((c) => CONVERSION_OUTCOMES.includes(c.outcome));
    dailyTrend.push({ date: dateStr, interactions: dayCalls.length, engagements: dayEngaged.length, conversions: dayConverted.length });
  }

  const concernCounts = new Map<string, number>();
  for (const c of periodCalls) {
    for (const concern of c.classification.contact_concerns) {
      concernCounts.set(concern, (concernCounts.get(concern) || 0) + 1);
    }
  }
  const totalConcernCount = Array.from(concernCounts.values()).reduce((a, b) => a + b, 0);
  const topConcerns = Array.from(concernCounts.entries())
    .map(([concern, count]) => ({
      concern,
      count,
      percentage: totalConcernCount > 0 ? +((count / totalConcernCount) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    kpis,
    outcomeDistribution,
    pathwayDistribution,
    priorityTierDistribution,
    agentTypeDistribution,
    therapeuticAreaDistribution,
    dailyTrend,
    topConcerns,
    recentCalls: periodCalls.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Signal Feed builder
// ---------------------------------------------------------------------------
export function buildSignalFeed(calls: CallRecord[]): ContactSignalFeed[] {
  return calls
    .flatMap((c, ci) =>
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
}
