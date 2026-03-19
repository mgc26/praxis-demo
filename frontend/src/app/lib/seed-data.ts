// ---------------------------------------------------------------------------
// Vi Operate -- Pharma Engagement Platform
// Seed data: 12 contacts, 20 call records, signal feed entries
// Deterministic PRNG (mulberry32) -- stable across reloads
// Brand-aware: all product/TA/pathway references derived from BrandPack
// ---------------------------------------------------------------------------
import type {
  AgentType,
  AnalyticsResponse,
  BehavioralSignal,
  CallRecord,
  Classification,
  CohortOutcomeData,
  CohortTimepointStats,
  ContactRecord,
  ContactSignalFeed,
  DrugProduct,
  InteractionOutcome,
  KPIData,
  LiaisonSummary,
  MSLFollowUpRequest,
  OutcomeTimepoint,
  PatientOutcomeRecord,
  PayerEvidenceCard,
  PriorityTier,
  ScreeningResult,
  ScreeningQuestionResponse,
  SignalCategory,
  SupportPathwayId,
  TherapeuticArea,
  TranscriptEntry,
  UrgencyLevel,
} from './types';
import type { BrandPack } from './brands';
import { praxisBrand } from './brands/praxis';
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
// Brand helpers -- extract product/TA/pathway data from the active brand
// ---------------------------------------------------------------------------
function brandDrug0(brand: BrandPack): { id: string; brandName: string; ta: string } {
  const p = brand.products[0];
  return { id: p.id, brandName: p.brandName, ta: p.therapeuticArea };
}
function brandDrug1(brand: BrandPack): { id: string; brandName: string; ta: string } {
  const p = brand.products[1] ?? brand.products[0];
  return { id: p.id, brandName: p.brandName, ta: p.therapeuticArea };
}
function brandTA0(brand: BrandPack): string { return brand.therapeuticAreas[0].id; }
function brandTA1(brand: BrandPack): string { return (brand.therapeuticAreas[1] ?? brand.therapeuticAreas[0]).id; }
function brandTA0Label(brand: BrandPack): string { return brand.therapeuticAreas[0].label; }
function brandTA1Label(brand: BrandPack): string { return (brand.therapeuticAreas[1] ?? brand.therapeuticAreas[0]).label; }
function brandPathwayIds(brand: BrandPack): string[] { return brand.supportPathways.map(sp => sp.id); }

// ---------------------------------------------------------------------------
// 12 Contacts (6 patients, 6 HCPs) -- brand-aware
// ---------------------------------------------------------------------------
function buildContacts(brand: BrandPack): ContactRecord[] {
  const d0 = brandDrug0(brand);
  const d1 = brandDrug1(brand);
  const ta0 = brandTA0(brand);
  const ta1 = brandTA1(brand);

  return [
  // === 3 patients on product 0 ===
  {
    contactId: 'PAT-001',
    name: 'Margaret Sullivan',
    phone: '+16175551001',
    age: 68,
    gender: 'Female',
    contactType: 'patient',
    therapeuticArea: ta0,
    drugProduct: d0.id,
    diagnosis: `${brandTA0Label(brand)}, moderate severity`,
    currentMedications: [`${d0.brandName} 200mg BID`, 'Lisinopril 10mg'],
    insurancePlan: 'Aetna PPO',
    behavioralSignals: [
      { category: 'ADHERENCE_SIGNAL', detail: `${d0.brandName} refill 8 days overdue -- specialty pharmacy flag`, recency: '2 days ago', severity: 'high', clinicalImplication: 'Adherence gap on newly launched therapy -- risk of relapse', timestamp: new Date('2026-03-15').toISOString() },
      { category: 'SEARCH_INTENT', detail: `Searched "${d0.brandName} side effects" 3x this week`, recency: '3 days ago', severity: 'medium', clinicalImplication: 'Patient researching side effects -- possible AE concern', timestamp: new Date('2026-03-14').toISOString() },
    ],
    recommendedPathway: 'adherence-support',
    openActions: [`${d0.brandName} refill overdue`, 'Hub follow-up call due', '30-day adherence check-in'],
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
    therapeuticArea: ta0,
    drugProduct: d0.id,
    diagnosis: `${brandTA0Label(brand)}, mild-moderate`,
    currentMedications: [`${d0.brandName} 100mg BID`, 'Atorvastatin 20mg', 'Metformin 500mg'],
    insurancePlan: 'UnitedHealthcare Medicare Advantage',
    behavioralSignals: [
      { category: 'SEARCH_INTENT', detail: `Searched "copay help for specialty medications" and "${d0.brandName} patient assistance"`, recency: 'Yesterday', severity: 'high', clinicalImplication: 'Cost barrier -- copay card activation urgent to prevent therapy abandonment', timestamp: new Date('2026-03-16').toISOString() },
    ],
    recommendedPathway: 'medication-access',
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
    therapeuticArea: ta0,
    drugProduct: d0.id,
    diagnosis: `${brandTA0Label(brand)}, newly diagnosed`,
    currentMedications: [`${d0.brandName} 100mg BID`],
    insurancePlan: 'Cigna Choice Fund',
    behavioralSignals: [
      { category: 'RX_PATTERN', detail: `First ${d0.brandName} fill picked up 3 days ago -- new start`, recency: '3 days ago', severity: 'medium', clinicalImplication: 'New start patient -- onboarding and hub enrollment window', timestamp: new Date('2026-03-14').toISOString() },
    ],
    recommendedPathway: 'medication-access',
    openActions: ['Hub enrollment not completed', 'Welcome call pending', 'Copay card activation'],
    priorityTier: 'MEDIUM',
    priorityScore: 65,
    preferredChannel: 'sms',
  },
  // === 3 patients on product 1 ===
  {
    contactId: 'PAT-004',
    name: 'Jennifer Okafor',
    phone: '+17735551004',
    age: 34,
    gender: 'Female',
    contactType: 'patient',
    therapeuticArea: ta1,
    drugProduct: d1.id,
    diagnosis: `${brandTA1Label(brand)} (caregiver for son, age 8)`,
    currentMedications: [`${d1.brandName} 50mg BID (for son)`, 'Clobazam 10mg', 'Stiripentol 500mg'],
    insurancePlan: 'BCBS Illinois',
    behavioralSignals: [
      { category: 'ADHERENCE_SIGNAL', detail: `${d1.brandName} specialty pharmacy refill submitted but prior auth pending 12 days`, recency: '1 day ago', severity: 'high', clinicalImplication: 'Prior auth delay -- breakthrough risk for pediatric patient', timestamp: new Date('2026-03-16').toISOString() },
      { category: 'SEARCH_INTENT', detail: `Searched "${brandTA1Label(brand)} emergency plan" and "${d1.brandName} dosing pediatric"`, recency: '4 days ago', severity: 'medium', clinicalImplication: 'Caregiver anxiety about disease management -- support needed', timestamp: new Date('2026-03-13').toISOString() },
    ],
    recommendedPathway: 'adherence-support',
    openActions: ['Prior auth follow-up', 'Caregiver support check-in', 'Emergency plan review'],
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
    therapeuticArea: ta1,
    drugProduct: d1.id,
    diagnosis: `${brandTA1Label(brand)} (caregiver for daughter, age 6)`,
    currentMedications: [`${d1.brandName} 25mg BID (for daughter)`, 'Valproic acid 250mg'],
    insurancePlan: 'Premera Blue Cross',
    behavioralSignals: [
      { category: 'RX_PATTERN', detail: `${d1.brandName} first fill -- new start patient (daughter)`, recency: '5 days ago', severity: 'medium', clinicalImplication: 'New start -- hub enrollment and titration support critical', timestamp: new Date('2026-03-12').toISOString() },
    ],
    recommendedPathway: 'medication-access',
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
    therapeuticArea: ta1,
    drugProduct: d1.id,
    diagnosis: `${brandTA1Label(brand)} (adult onset variant)`,
    currentMedications: [`${d1.brandName} 75mg BID`, 'Levetiracetam 500mg'],
    insurancePlan: 'Oscar Health',
    behavioralSignals: [
      { category: 'CLAIMS_SIGNAL', detail: 'ER visit 6 days ago -- disease-related', recency: '6 days ago', severity: 'high', clinicalImplication: 'Breakthrough event -- therapy assessment and AE screening needed', timestamp: new Date('2026-03-11').toISOString() },
    ],
    recommendedPathway: 'safety-reporting',
    openActions: ['Post-ER follow-up', 'AE assessment', 'Specialist coordination'],
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
    therapeuticArea: ta0,
    drugProduct: d0.id,
    specialty: 'Neurology -- Movement Disorders',
    npiNumber: '1234567890',
    practiceLocation: 'Massachusetts General Hospital',
    patientsOnTherapy: 12,
    behavioralSignals: [
      { category: 'HCP_ACTIVITY', detail: `Attended ${brand.companyName}-sponsored symposium, requested ${d0.brandName} trial reprints`, recency: '1 week ago', severity: 'medium', clinicalImplication: 'High interest -- ready for detailed clinical discussion', timestamp: new Date('2026-03-10').toISOString() },
    ],
    recommendedPathway: 'clinical-education',
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
    therapeuticArea: ta0,
    drugProduct: d0.id,
    specialty: 'Neurology',
    npiNumber: '2345678901',
    practiceLocation: 'UCSF Neurology',
    patientsOnTherapy: 5,
    behavioralSignals: [
      { category: 'COMPETITIVE_INTEL', detail: `Prescribing pattern shifted -- 3 patients moved to ${d0.brandName}`, recency: '2 weeks ago', severity: 'low', clinicalImplication: 'Positive adoption trend -- reinforce with outcomes data', timestamp: new Date('2026-03-03').toISOString() },
    ],
    recommendedPathway: 'clinical-education',
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
    therapeuticArea: ta0,
    drugProduct: d0.id,
    specialty: 'Movement Disorder Specialist',
    npiNumber: '3456789012',
    practiceLocation: 'Mount Sinai Neurology',
    patientsOnTherapy: 0,
    behavioralSignals: [
      { category: 'HCP_ACTIVITY', detail: `Downloaded ${d0.brandName} PI from ${brand.website}, viewed MOA video twice`, recency: '4 days ago', severity: 'medium', clinicalImplication: `Evaluating ${d0.brandName} -- high-value target for outbound detail`, timestamp: new Date('2026-03-13').toISOString() },
    ],
    recommendedPathway: 'clinical-education',
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
    therapeuticArea: ta1,
    drugProduct: d1.id,
    specialty: 'Pediatric Neurology -- Epilepsy',
    npiNumber: '4567890123',
    practiceLocation: "Ann & Robert H. Lurie Children's Hospital",
    patientsOnTherapy: 8,
    behavioralSignals: [
      { category: 'HCP_ACTIVITY', detail: `Submitted 3 ${d1.brandName} prior auth requests in 2 weeks`, recency: '3 days ago', severity: 'high', clinicalImplication: 'Active prescriber with access challenges -- formulary support needed', timestamp: new Date('2026-03-14').toISOString() },
    ],
    recommendedPathway: 'clinical-education',
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
    therapeuticArea: ta1,
    drugProduct: d1.id,
    specialty: 'Epileptologist',
    npiNumber: '5678901234',
    practiceLocation: 'Seattle Epilepsy Center',
    patientsOnTherapy: 15,
    behavioralSignals: [
      { category: 'COMPETITIVE_INTEL', detail: `Published review article comparing ${d1.brandName} to competitor therapies`, recency: '1 week ago', severity: 'medium', clinicalImplication: 'KOL influence -- engage for speaker program and advisory board', timestamp: new Date('2026-03-10').toISOString() },
    ],
    recommendedPathway: 'clinical-education',
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
    therapeuticArea: ta1,
    drugProduct: d1.id,
    specialty: 'Pediatric Neurologist',
    npiNumber: '6789012345',
    practiceLocation: "Children's Hospital of Philadelphia",
    patientsOnTherapy: 3,
    behavioralSignals: [
      { category: 'SEARCH_INTENT', detail: `Searched "${d1.brandName} trial results" and "${brandTA1Label(brand)}" on medical portals`, recency: '2 days ago', severity: 'medium', clinicalImplication: `Researching ${d1.brandName} -- receptive to clinical data presentation`, timestamp: new Date('2026-03-15').toISOString() },
    ],
    recommendedPathway: 'clinical-education',
    openActions: ['Clinical data presentation', 'Sample request follow-up', 'Peer-to-peer connection'],
    priorityTier: 'MEDIUM',
    priorityScore: 58,
    preferredChannel: 'sms',
  },
];
}

// ---------------------------------------------------------------------------
// Agent type assignment logic
// ---------------------------------------------------------------------------
function assignAgentType(contactType: 'patient' | 'hcp', pathway: SupportPathwayId): AgentType {
  if (contactType === 'patient') return 'patient-support';
  if (pathway === 'clinical-education' || pathway === 'safety-reporting') return 'hcp-support';
  return 'hcp-outbound';
}

// ---------------------------------------------------------------------------
// Outcome distribution -- 20 total calls
// ---------------------------------------------------------------------------
const OUTCOME_DISTRIBUTION: { outcome: InteractionOutcome; count: number }[] = [
  { outcome: 'hub-enrollment', count: 3 },
  { outcome: 'copay-card-issued', count: 2 },
  { outcome: 'ae-reported', count: 2 },
  { outcome: 'nurse-educator-referral', count: 3 },
  { outcome: 'sample-request', count: 2 },
  { outcome: 'medical-info-provided', count: 2 },
  { outcome: 'information-provided', count: 2 },
  { outcome: 'appointment-scheduled', count: 1 },
  { outcome: 'no-answer', count: 2 },
  { outcome: 'voicemail', count: 1 },
];

// Pathway distribution -- 20 total calls
const PATHWAY_DISTRIBUTION: { pathway: SupportPathwayId; count: number }[] = [
  { pathway: 'medication-access', count: 4 },
  { pathway: 'safety-reporting', count: 3 },
  { pathway: 'clinical-education', count: 3 },
  { pathway: 'patient-education', count: 4 },
  { pathway: 'adherence-support', count: 3 },
  { pathway: 'crisis-support', count: 3 },
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
  brand: BrandPack,
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  let ts = 0;

  const add = (speaker: 'agent' | 'contact', text: string) => {
    ts += randInt(3, 8);
    entries.push({ speaker, text, timestamp: ts });
  };

  const firstName = contactName.split(' ')[0];
  const lastName = contactName.split(' ').pop() || firstName;
  const d0 = brandDrug0(brand);
  const d1 = brandDrug1(brand);
  const drugName = drug === d0.id ? d0.brandName : d1.brandName;
  const taLabel = drug === d0.id ? brandTA0Label(brand) : brandTA1Label(brand);

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
      add('agent', `Hi, this is a call from ${brand.companyName} patient support. I'm calling regarding your ${drugName} therapy. Please call us back at your earliest convenience. Thank you!`);
    } else {
      add('agent', `Good day, this is a call from ${brand.companyName} medical affairs following up regarding ${drugName}. Please call us at your convenience. Thank you, Doctor.`);
    }
    return entries;
  }

  // Connected call
  if (contactType === 'patient') {
    add('agent', `Hello, this is a call from ${brand.companyName} patient support. Am I speaking with ${contactName}?`);
    add('contact', pick(['Speaking.', "Yes, that's me.", `Yes, this is ${firstName}.`] as const));
    add('agent', `Wonderful, hi ${firstName}! Thank you for taking my call. I'm your dedicated support specialist for your ${drugName} therapy. How are you doing today?`);
    add('contact', pick([
      "I'm doing okay. I had some questions actually.",
      "Not bad. My doctor mentioned you might call.",
      "Fine, thanks. What's this about?",
      "Pretty good. I've been meaning to call you all.",
    ] as const));
  } else {
    add('agent', `Good day, may I speak with Dr. ${lastName}?`);
    add('contact', pick(['Speaking.', 'Yes, go ahead.', `This is Dr. ${lastName}.`] as const));
    add('agent', `Dr. ${lastName}, this is a call from ${brand.companyName}. ${agentType === 'hcp-outbound' ? `I'm reaching out to share some updates on ${drugName}.` : `How can I assist you today regarding ${drugName}?`}`);
    add('contact', pick([
      `I have a few patients I'm considering for ${drugName}. Go ahead.`,
      "You have two minutes. What do you have?",
      `I need the latest efficacy data. Be brief.`,
    ] as const));
  }

  // Pathway-specific body
  if (pathway === 'medication-access') {
    add('agent', `I'd like to help get you enrolled in our ${brand.hubName} program. This gives you access to dedicated support, copay assistance, and personalized adherence resources for ${drugName} -- all at no cost to you.`);
    add('contact', pick(["That sounds helpful. What do I need to do?", "My doctor mentioned something about a support program.", "How does the copay help work?"] as const));
    add('agent', `I can get you enrolled right now over the phone. I'll need to verify some basic information and then we'll get your benefits investigation started. The hub also provides a dedicated care coordinator who can help with any questions about your therapy.`);
    add('contact', "Okay, let's do it. I've been worried about the costs.");
  } else if (pathway === 'patient-education') {
    add('agent', `I'm calling to help you with information about your ${drugName} therapy. Our program can provide educational resources and support to help you get the most from your treatment.`);
    add('contact', pick(["That would be amazing. I have a lot of questions about what to expect.", "Yes, I definitely want to learn more.", "How can you help me with my treatment?"] as const));
    add('agent', `I can walk you through what to expect with ${drugName} and answer any questions you have. We also have patient education materials I can send to you.`);
    add('contact', "Yes, please. That would be really helpful.");
  } else if (pathway === 'safety-reporting') {
    add('agent', `I'm following up on your ${drugName} therapy. Part of my call today is to check in on how you're tolerating the medication. Have you experienced any new or unusual symptoms since starting ${drugName}?`);
    add('contact', pick([
      `Actually yes, I've been having some dizziness and nausea for the past week.`,
      `I've noticed some headaches that seem to have started since I began the medication.`,
      `My ${drug === d1.id ? 'child has been more drowsy than usual' : 'hands have been tingling more'}.`,
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
  } else if (pathway === 'clinical-education') {
    if (contactType === 'patient') {
      add('agent', `${firstName}, I'd be happy to help answer your questions about ${drugName}. What would you like to know?`);
      add('contact', pick([
        `I've been reading about the clinical trials and want to understand the results better.`,
        `My doctor started me on this and I want to know more about how it works.`,
        `I'm curious about the side effect profile compared to my previous medication.`,
      ] as const));
      add('agent', `Those are great questions, ${firstName}. I can share our patient-friendly summary of the clinical results with you. For specific medical questions about your treatment, I'd also recommend discussing with your prescriber. Would you like me to send you our patient information packet?`);
      add('contact', "Yes, please send that over. That would be really helpful.");
    } else {
      add('agent', `Dr. ${lastName}, how can I help you today with your ${drugName} inquiry?`);
      add('contact', pick([
        `I need the Phase 3 primary endpoint results.`,
        `Complex case -- need the drug interaction profile.`,
        `What's the titration schedule for patients switching from a competitor therapy?`,
      ] as const));
      add('agent', `I can provide the full clinical data package for ${drugName}. I'll email the complete publication and prescribing information to your office.`);
      add('contact', "Fine. Arrange a peer-to-peer with one of your KOLs as well.");
    }
  } else if (pathway === 'crisis-support') {
    add('agent', `I want to check in with you about how you're doing overall, ${firstName}. Sometimes managing a condition and its treatment can feel overwhelming. How are you feeling?`);
    add('contact', pick([
      "Honestly, it's been really tough. I feel overwhelmed.",
      "I've been struggling a bit. It's a lot to manage.",
      "I'm okay, but some days are harder than others.",
    ] as const));
    add('agent', `I hear you, and I want you to know that support is available. If you ever feel in crisis or have thoughts of harming yourself, please call 988 -- that's the Suicide & Crisis Lifeline, available 24/7. I can also connect you with our dedicated support resources right now.`);
    add('contact', "Thank you. I appreciate you asking.");
  }

  // Outcome-specific closing
  switch (outcome) {
    case 'hub-enrollment':
      add('agent', `Excellent, ${contactType === 'patient' ? firstName : `Dr. ${lastName}`}. You're now enrolled in ${brand.hubName}. You'll receive a welcome packet via email and a dedicated coordinator will reach out within 48 hours.`);
      add('contact', contactType === 'patient' ? "Thank you so much. This is very helpful." : "Good. Have the coordinator reach out to my office.");
      break;
    case 'copay-card-issued':
      add('agent', `Your copay card is now active, ${firstName}. The ID number is ${brand.shortName.toUpperCase()}-${randInt(10000, 99999)}. Your next fill should show the reduced copay. I'll send all the details via text.`);
      add('contact', "That's wonderful. Thank you for making this so easy.");
      break;
    case 'ae-reported':
      add('agent', `I've filed the adverse event report -- case number AE-${randInt(100000, 999999)}. Our pharmacovigilance team will follow up within 24 hours. ${contactType === 'patient' ? "Please don't hesitate to call our 24/7 line if anything changes." : "We'll send the case documentation to your office for review."}`);
      add('contact', contactType === 'patient' ? "Okay, thank you. I'll keep monitoring it." : "Understood. Route the case summary to my office.");
      break;
    case 'nurse-educator-referral':
      add('agent', `I've set up a refill reminder and your next adherence check-in for ${pick(['next Tuesday', 'next Thursday', 'next Monday'] as const)}, ${firstName}. Remember, consistent dosing is key to seeing the best results with ${drugName}.`);
      add('contact', "I'll do my best. Thanks for the support.");
      break;
    case 'sample-request':
      add('agent', contactType === 'hcp'
        ? `The sample shipment has been initiated, Dr. ${lastName}. You should receive it within 3-5 business days at your ${pick(['office', 'clinic', 'practice location'] as const)}. I'll also include our patient starter kit materials.`
        : `I've coordinated with your prescriber's office, ${firstName}. The starter materials will be sent along with your prescription. You should have everything within 3-5 business days.`);
      add('contact', contactType === 'hcp' ? "Good. I'll look for it." : "Great, thank you so much!");
      break;
    case 'medical-info-provided':
      add('agent', contactType === 'hcp'
        ? `I'll email the complete clinical data package to your office today, Dr. ${lastName}. I'm also arranging a peer-to-peer discussion for next week. Is there anything else I can help with?`
        : `I'll send the patient information packet to you right away, ${firstName}. And remember, your prescriber is the best resource for any specific medical questions about your treatment.`);
      add('contact', contactType === 'hcp' ? "That covers it. Thank you." : "That sounds great. Thank you for explaining everything.");
      break;
    case 'information-provided':
      add('agent', contactType === 'hcp'
        ? `Thank you for your time, Dr. ${lastName}. To summarize -- ${drugName} offers a favorable efficacy and safety profile for ${taLabel} patients. I'll send the detail materials and PI to your office.`
        : `Thank you for your time today, ${firstName}. I'll make sure all the information we discussed is sent to you and your care team.`);
      add('contact', contactType === 'hcp' ? "I'll review it. Thank you." : "I appreciate all the help.");
      break;
    case 'prior-auth-assist':
      add('agent', `I've initiated the prior authorization process. Our team will work directly with the payer. ${contactType === 'patient' ? `You should have a determination within 5-7 business days, ${firstName}. I'll keep you updated.` : `Determination expected within 5-7 business days, Dr. ${lastName}. We'll keep your office informed.`}`);
      add('contact', contactType === 'patient' ? "Thank you. I really need this medication." : "Good. Keep my office in the loop.");
      break;
    case 'appointment-scheduled':
      add('agent', `I've scheduled a follow-up for ${pick(['next Tuesday at 2 PM', 'Thursday at 10 AM', 'next Monday at 3 PM'] as const)}, ${contactType === 'patient' ? firstName : `Dr. ${lastName}`}. I'll have all the information ready for you.`);
      add('contact', contactType === 'patient' ? "Sounds good. Talk to you then." : "Fine. Make sure you have the data ready.");
      break;
    case 'callback-requested':
      add('contact', contactType === 'hcp' ? "Call me back. I'm between patients." : "Can you call me back? Now isn't a great time.");
      add('agent', `Of course. I'll call you back at ${pick(['3 PM', '4:30 PM', 'tomorrow morning'] as const)}. Thank you, ${contactType === 'patient' ? firstName : `Dr. ${lastName}`}.`);
      break;
    case 'declined':
      add('contact', contactType === 'hcp' ? "Not interested at this time." : "I appreciate the call but I'm not interested at this time.");
      add('agent', `I completely understand. I'll note your preference. If anything changes, we're always here to help. Thank you for your time${contactType === 'hcp' ? `, Dr. ${lastName}` : `, ${firstName}`}.`);
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
  brand: BrandPack,
): LiaisonSummary {
  const isConversion = CONVERSION_OUTCOMES.includes(outcome);
  const engagementScore = outcome === 'hub-enrollment' ? randInt(80, 95)
    : outcome === 'copay-card-issued' ? randInt(78, 92)
    : outcome === 'ae-reported' ? randInt(70, 88)
    : outcome === 'information-provided' ? randInt(72, 90)
    : outcome === 'sample-request' ? randInt(75, 88)
    : outcome === 'medical-info-provided' ? randInt(68, 85)
    : outcome === 'declined' ? randInt(20, 40)
    : randInt(40, 65);

  const highSigs = signals.filter(s => s.severity === 'high');
  const aeDetected = outcome === 'ae-reported' || (pathway === 'safety-reporting' && rng() > 0.3);
  const d0 = brandDrug0(brand);
  const d1 = brandDrug1(brand);
  const drugName = drug === d0.id ? d0.brandName : d1.brandName;
  const taLabel = drug === d0.id ? brandTA0Label(brand) : brandTA1Label(brand);

  const indicators: string[] = [];
  if (highSigs.length > 0) indicators.push(`${highSigs.length} high-priority signal(s) detected`);
  if (aeDetected) indicators.push('ADVERSE EVENT DETECTED -- pharmacovigilance review required');
  if (contactType === 'hcp' && signals.some(s => s.category === 'COMPETITIVE_INTEL')) indicators.push('Competitive intelligence opportunity identified');
  if (priorityTier === 'HIGH') indicators.push('HIGH priority tier -- escalated engagement protocol');
  if (signals.some(s => s.category === 'ADHERENCE_SIGNAL')) indicators.push('Adherence gap confirmed -- therapy continuity at risk');

  const narrativeMap: Record<SupportPathwayId, string> = {
    'medication-access': `Completed medication access support for ${contactName} on ${drugName}. ${isConversion ? `Patient successfully enrolled in ${brand.hubName}. Benefits investigation initiated. Dedicated coordinator to contact within 48 hours.` : 'Patient expressed interest but did not complete enrollment. Follow-up recommended within 5 business days.'}`,
    'safety-reporting': `PHARMACOVIGILANCE ALERT -- AE screening for ${contactName} on ${drugName}. ${aeDetected ? 'Adverse event captured and documented. Case submitted to pharmacovigilance team for 24-hour review. Follow-up with prescribing physician required.' : 'No reportable adverse events identified during screening. Routine monitoring continues.'}`,
    'clinical-education': `Clinical education inquiry from ${contactName} regarding ${drugName}. ${isConversion ? 'Clinical data package sent. Peer-to-peer discussion arranged.' : 'Inquiry documented. Medical affairs team to provide detailed response within 48 hours.'} ${signals.some(s => s.category === 'COMPETITIVE_INTEL') ? 'COMPETITIVE INTELLIGENCE: Prescriber evaluating alternatives -- priority follow-up recommended.' : ''}`,
    'patient-education': `Patient education interaction for ${contactName}. ${isConversion ? `Copay card activated -- patient eligible for reduced out-of-pocket costs on ${drugName}. Specialty pharmacy notified.` : 'Educational materials provided. Patient needs follow-up on treatment questions.'}`,
    'adherence-support': `Adherence support call for ${contactName} on ${drugName}. ${signals.some(s => s.category === 'ADHERENCE_SIGNAL') ? 'Adherence gap confirmed. Refill coordination initiated and reminder system established.' : 'Patient reports adequate adherence. Next scheduled check-in logged.'}`,
    'crisis-support': `CRISIS SUPPORT -- ${contactName} on ${drugName}. ${aeDetected ? 'Acute distress identified. Immediate escalation to crisis resources and prescribing physician notification completed.' : 'Caller assessed for crisis indicators. No immediate escalation required. Monitoring continues.'}`,
  };

  // Block 1: Context summary
  const contextSummary = contactType === 'hcp'
    ? `${contactName}, HCP, ${taLabel}, ${drugName}, ${priorityTier} risk tier`
    : `${contactName}, patient, ${taLabel}, ${drugName}, ${priorityTier} risk tier`;

  // Block 2: What happened
  const whatHappenedMap: Record<SupportPathwayId, string> = {
    'medication-access': `${isConversion ? 'Successful medication access support completed' : 'Medication access discussed but not completed'}. ${aeDetected ? 'AE identified during interaction.' : 'No safety signals.'} ${contactType === 'hcp' ? 'HCP engaged with clinical questions.' : 'Patient receptive to support services.'}`,
    'safety-reporting': `AE screening call completed. ${aeDetected ? 'Adverse event captured and documented -- routed to pharmacovigilance.' : 'No reportable AEs identified.'} Patient was ${isConversion ? 'cooperative and thorough' : 'briefly engaged'}.`,
    'clinical-education': `${isConversion ? 'Clinical data package sent and peer-to-peer arranged' : 'Medical inquiry documented for follow-up'}. ${contactType === 'hcp' ? 'HCP asked substantive clinical questions.' : 'Patient/caregiver seeking detailed information.'}`,
    'patient-education': `${isConversion ? 'Patient education completed successfully' : 'Patient education discussed'}. Patient expressed ${isConversion ? 'understanding of treatment plan' : 'questions about treatment expectations'}.`,
    'adherence-support': `Adherence check-in completed. ${signals.some(s => s.category === 'ADHERENCE_SIGNAL') ? 'Confirmed adherence gap -- refill coordination initiated.' : 'Adherence appears adequate.'} ${isConversion ? 'Intervention plan established.' : 'Monitoring continues.'}`,
    'crisis-support': `Crisis support call completed. ${aeDetected ? 'Acute distress identified and escalated to crisis resources.' : 'Caller assessed -- no immediate crisis.'} ${isConversion ? 'Escalation protocol completed.' : 'Monitoring continues.'}`,
  };

  // Block 3: What changed since last touch
  const whatChangedSinceLastTouch = signals.length > 0
    ? signals.map(s => {
        if (s.severity === 'high') return `HIGH signal: ${s.detail.slice(0, 80)}`;
        return `${s.category}: ${s.detail.slice(0, 60)}`;
      }).join('; ')
    : 'No new signals since last interaction';

  // Block 4: Clinical questions raised
  const clinicalQuestionsPool: Record<SupportPathwayId, string[][]> = {
    'medication-access': [
      ['What is the expected titration timeline for new patients?'],
      ['Are there dietary restrictions while on therapy?'],
      [],
    ],
    'safety-reporting': [
      ['Is dizziness dose-related and will it resolve with continued use?', 'Should the dose be reduced or held?'],
      ['What is the expected timeline for side effect resolution?'],
      ['Are there drug interactions with current concomitant medications?'],
    ],
    'clinical-education': [
      [`What are the Phase 3 primary endpoint results for ${drugName}?`, 'Is there real-world evidence data available?'],
      [`How does the safety profile compare to ${drug === d0.id ? 'propranolol and primidone' : 'fenfluramine and cannabidiol'}?`],
      ['Are there ongoing trials for additional indications?', 'What is the mechanism of action differentiation?'],
    ],
    'patient-education': [
      ['Will the copay card work with Medicare Part D?'],
      ['What should I expect during the first weeks of treatment?'],
      [],
    ],
    'adherence-support': [
      ['Can the dosing schedule be simplified to once daily?'],
      ['What happens if doses are missed -- is re-titration needed?'],
      [],
    ],
    'crisis-support': [
      ['What crisis resources are available 24/7?'],
      ['Should the prescribing physician be notified immediately?'],
      [],
    ],
  };
  const clinicalQuestionsRaised = pick(clinicalQuestionsPool[pathway]);

  // Block 5: Recommended action
  const recommendedActionBlock = aeDetected
    ? 'Pharmacovigilance team to complete AE review within 24 hours. Prescribing physician to be notified.'
    : isConversion && contactType === 'hcp'
    ? `MSL to follow up with ${contactName} within 5 business days to address outstanding clinical questions`
    : isConversion
    ? `Care coordinator to contact ${contactName} within 48 hours to confirm enrollment and next steps`
    : outcome === 'declined'
    ? `Re-engage in 30 days or upon new clinical signal. Do not contact before then.`
    : `Schedule follow-up via ${priorityTier === 'HIGH' ? 'voice within 48 hours' : 'preferred channel within 7 days'}`;

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
        `Market: ${drug === d0.id ? 'Propranolol and primidone remain primary alternatives' : 'Fenfluramine and cannabidiol are primary competitors'}`,
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
    // Structured 5-block liaison summary
    contextSummary,
    whatHappened: whatHappenedMap[pathway],
    whatChangedSinceLastTouch,
    clinicalQuestionsRaised,
    recommendedAction: recommendedActionBlock,
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
  contactType: 'patient' | 'hcp',
  drug: DrugProduct,
  brand: BrandPack,
): Classification {
  const d0 = brandDrug0(brand);
  const d1 = brandDrug1(brand);
  const drugName = drug === d0.id ? d0.brandName : d1.brandName;
  const isConversion = CONVERSION_OUTCOMES.includes(outcome);
  const isNoConnect = NON_CONNECT_OUTCOMES.includes(outcome);

  const urgency: UrgencyLevel = pathway === 'safety-reporting' ? 'urgent'
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

  // Competitive intel notes -- ~30% of HCP calls get realistic CI notes
  const competitiveIntelNotes: string[] = [];
  if (contactType === 'hcp' && !isNoConnect && rng() < 0.3) {
    if (drug === d0.id) {
      competitiveIntelNotes.push(...pick([
        ['Dr. mentioned considering topiramate for patients who cannot tolerate propranolol'],
        ['Practice currently using primidone as first-line for ET -- interested in alternatives with better side effect profile'],
        ['Asked about head-to-head data vs propranolol -- wants to see tremor reduction comparison'],
        ['Mentioned several patients switching from propranolol due to fatigue and bradycardia side effects'],
        ['Expressed concern about gabapentin being used off-label for ET at competing practice'],
      ] as const));
    } else {
      competitiveIntelNotes.push(...pick([
        [`Compared ${d1.brandName} seizure reduction data to fenfluramine -- wants to see long-term safety data`],
        ['Currently prescribing cannabidiol for most Dravet patients -- open to alternatives if seizure control is superior'],
        ['Mentioned that fenfluramine has formulary preference at two major local payers'],
        [`Asked about ${d1.brandName} mechanism differentiation vs other sodium channel blockers`],
        [`Practice seeing good results with stiripentol combination -- wants evidence for ${d1.brandName} add-on therapy`],
      ]));
    }
  }

  // MSL follow-up detection -- HCP calls with medical inquiry or sample request
  const mslFollowupRequested = contactType === 'hcp' && !isNoConnect
    && (pathway === 'clinical-education' || pathway === 'patient-education')
    && rng() < 0.5;
  const mslFollowupTopic = mslFollowupRequested
    ? pick([
        `Peer-to-peer discussion on ${drugName} Phase 3 subgroup analysis`,
        `Clinical data request: ${drugName} trial quality-of-life endpoints`,
        `Scientific exchange on ${drugName} mechanism of action and receptor selectivity`,
        `Off-label inquiry: ${drugName} use in related indications`,
      ] as const)
    : undefined;

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
    competitiveIntelNotes,
    mslFollowupRequested: mslFollowupRequested || undefined,
    mslFollowupTopic,
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
  if (pathway !== 'safety-reporting' && pathway !== 'adherence-support') {
    if (rng() > 0.3) return null;
  }

  const results: ScreeningResult[] = [];
  const baseTime = new Date(callTimestamp).getTime() / 1000 + 60;

  if (pathway === 'safety-reporting' || rng() < 0.5) {
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
// TETRAS-LITE screening result factory
// ---------------------------------------------------------------------------
function makeTetrasScreening(score: number, callTimestamp: string): ScreeningResult {
  const baseTime = new Date(callTimestamp).getTime() / 1000 + 120;
  const q1Score = Math.min(Math.round(score / 2), 4);
  const q2Score = Math.min(score - q1Score, 4);
  const isPositive = score >= 4;

  const q1Options = ['No tremor', 'Slight tremor', 'Moderate tremor', 'Significant tremor', 'Severe tremor'];
  const q2Options = ['No interference', 'Slight interference', 'Moderate interference', 'Significant interference', 'Severe interference'];

  return {
    instrumentId: 'TETRAS-LITE',
    instrumentName: 'TETRAS-LITE Tremor Assessment',
    status: 'completed',
    responses: [
      {
        questionIndex: 0,
        questionText: 'Over the past week, how would you rate the severity of your tremor?',
        contactResponse: q1Options[q1Score],
        scoreValue: q1Score,
        timestamp: baseTime,
      },
      {
        questionIndex: 1,
        questionText: 'How much does your tremor interfere with daily activities like eating, writing, or dressing?',
        contactResponse: q2Options[q2Score],
        scoreValue: q2Score,
        timestamp: baseTime + 30,
      },
    ],
    totalScore: score,
    maxScore: 8,
    isPositiveScreen: isPositive,
    clinicalInterpretation: isPositive
      ? 'Tremor severity indicates suboptimal control — recommend discussion with prescribing physician about dose optimization.'
      : 'Tremor appears well-controlled with current therapy.',
    reportRequired: false,
    reportType: null,
    startedAt: new Date(baseTime * 1000).toISOString(),
    completedAt: new Date((baseTime + 60) * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Priority tier assignment
// ---------------------------------------------------------------------------
function assignPriorityTier(pathway: SupportPathwayId, signals: BehavioralSignal[]): PriorityTier {
  const highCount = signals.filter(s => s.severity === 'high').length;
  if (pathway === 'safety-reporting') return 'HIGH';
  if (highCount >= 2) return 'HIGH';
  if (highCount === 1 || pathway === 'adherence-support') return 'MEDIUM';
  return pick(['MEDIUM', 'LOW', 'LOW'] as const);
}

// ---------------------------------------------------------------------------
// Build 20 call records
// ---------------------------------------------------------------------------
function buildAllCalls(brand: BrandPack, contacts: ContactRecord[]): CallRecord[] {
  const referenceDate = new Date('2026-03-17T00:00:00Z');
  const calls: CallRecord[] = [];

  for (let i = 0; i < 20; i++) {
    const outcome = OUTCOMES_LIST[i];
    const pathway = PATHWAYS_LIST[i];
    const contact = contacts[i % contacts.length];
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
      : outcome === 'ae-reported' ? randInt(300, 480)
      : outcome === 'hub-enrollment' ? randInt(240, 420)
      : outcome === 'information-provided' ? randInt(300, 540)
      : outcome === 'medical-info-provided' ? randInt(240, 480)
      : randInt(150, 360);

    // Timestamp
    const daysAgo = Math.floor((i / 20) * 5);
    const hoursOffset = randInt(8, 18);
    const minutesOffset = randInt(0, 59);
    const callDate = new Date(referenceDate);
    callDate.setDate(callDate.getDate() - daysAgo);
    callDate.setHours(hoursOffset, minutesOffset, randInt(0, 59), 0);

    const transcript = generateTranscript(outcome, pathway, contact.name, contact.contactType, contact.drugProduct, agentType, brand);
    const liaisonSummary = generateLiaisonSummary(pathway, outcome, signals, priorityTier, contact.name, contact.contactType, contact.drugProduct, agentType, brand);
    const classification = generateClassification(outcome, pathway, signals, liaisonSummary, contact.contactType, contact.drugProduct, brand);
    const screeningResults = generateScreeningResults(pathway, !isNoConnect, callDate.toISOString());

    // FRM-relevant fields for patient calls
    const isPatient = contact.contactType === 'patient';
    const payerName = isPatient ? contact.insurancePlan : undefined;
    let priorAuthStatus: CallRecord['priorAuthStatus'] = undefined;
    let denialReason: string | undefined = undefined;
    let timeToTherapyDays: number | undefined = undefined;

    if (isPatient && !isNoConnect) {
      // Assign prior auth status based on pathway and randomness
      if (pathway === 'adherence-support' || pathway === 'medication-access') {
        priorAuthStatus = pick(['approved', 'approved', 'not-needed', 'pending'] as const);
      } else if (outcome === 'prior-auth-assist' || signals.some(s => s.detail.toLowerCase().includes('prior auth'))) {
        priorAuthStatus = pick(['pending', 'pending', 'denied', 'appealing'] as const);
      } else if (rng() < 0.3) {
        priorAuthStatus = pick(['approved', 'not-needed'] as const);
      }

      if (priorAuthStatus === 'denied') {
        denialReason = pick([
          'Step therapy requirement not met -- propranolol trial required first',
          'Medical necessity documentation insufficient',
          'Non-formulary -- preferred alternative available',
          'Prior authorization expired -- resubmission required',
          'Quantity limit exceeded -- dosing justification needed',
        ] as const);
      }

      // Time to therapy -- shorter for approved, longer for denied/pending
      if (priorAuthStatus === 'approved' || priorAuthStatus === 'not-needed') {
        timeToTherapyDays = randInt(3, 14);
      } else if (priorAuthStatus === 'pending') {
        timeToTherapyDays = randInt(12, 30);
      } else if (priorAuthStatus === 'denied' || priorAuthStatus === 'appealing') {
        timeToTherapyDays = randInt(25, 60);
      }
    }

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
      payerName,
      priorAuthStatus,
      denialReason,
      timeToTherapyDays,
    });
  }

  calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Post-process: append TETRAS-LITE screening results to product-0 patient-support calls
  // PAT-001 (Margaret Sullivan): score 4 — moderate, positive screen (most interesting for demo)
  // PAT-002 (Robert Chen): score 3 — negative screen
  // PAT-003 (Diana Morales): score 5 — positive screen
  const tetrasScores: Record<string, number> = {
    'PAT-001': 4,
    'PAT-002': 3,
    'PAT-003': 5,
  };
  const ta0 = brandTA0(brand);
  for (const call of calls) {
    if (
      call.therapeuticArea === ta0 &&
      call.agentType === 'patient-support' &&
      call.contactId in tetrasScores
    ) {
      const screening = makeTetrasScreening(tetrasScores[call.contactId], call.timestamp);
      if (call.screeningResults == null) {
        call.screeningResults = [screening];
      } else {
        call.screeningResults.push(screening);
      }
    }
  }

  return calls;
}

// ---------------------------------------------------------------------------
// Brand-keyed singleton cache
// ---------------------------------------------------------------------------
interface BrandSeedCache {
  contacts: ContactRecord[];
  calls: CallRecord[];
  callMap: Map<string, CallRecord>;
  mslFollowUpRequests: MSLFollowUpRequest[];
}

const brandCacheMap = new Map<string, BrandSeedCache>();

function getBrandCache(brand: BrandPack): BrandSeedCache {
  const existing = brandCacheMap.get(brand.id);
  if (existing) return existing;

  const contacts = buildContacts(brand);
  const calls = buildAllCalls(brand, contacts);
  const callMap = new Map<string, CallRecord>(calls.map(c => [c.id, c]));
  const mslFollowUpRequests = buildMSLFollowUpRequests(brand, calls);

  const cache: BrandSeedCache = { contacts, calls, callMap, mslFollowUpRequests };
  brandCacheMap.set(brand.id, cache);
  return cache;
}

// Eagerly build the default (Praxis) cache at module load for backward compat
getBrandCache(praxisBrand);

// ---------------------------------------------------------------------------
// Public API -- all functions accept an optional brand (default: praxisBrand)
// ---------------------------------------------------------------------------
export function getAllCalls(brand: BrandPack = praxisBrand): CallRecord[] {
  return getBrandCache(brand).calls;
}

export function getCallById(id: string, brand: BrandPack = praxisBrand): CallRecord | undefined {
  return getBrandCache(brand).callMap.get(id);
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
}, brand: BrandPack = praxisBrand): { calls: CallRecord[]; total: number; page: number; totalPages: number } {
  const { supportPathway, outcome, priorityTier, agentType, therapeuticArea, search, page = 1, limit = 20 } = filters;
  const allCalls = getBrandCache(brand).calls;

  const filtered = allCalls.filter((call) => {
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

export function getContactQueue(brand: BrandPack = praxisBrand): ContactRecord[] {
  return getBrandCache(brand).contacts;
}

export function getAnalytics(period: 'today' | 'week' | 'all' = 'all', brand: BrandPack = praxisBrand): AnalyticsResponse {
  const allCalls = getBrandCache(brand).calls;
  const now = new Date('2026-03-17T00:00:00Z');
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  function filterByPeriod(p: 'today' | 'week' | 'all'): CallRecord[] {
    if (p === 'all') return allCalls;
    const cutoff = p === 'today' ? todayStart : weekStart;
    return allCalls.filter((c) => new Date(c.timestamp) >= cutoff);
  }

  const periodCalls = filterByPeriod(period);
  const total = periodCalls.length;

  const connected = periodCalls.filter((c) => !NON_CONNECT_OUTCOMES.includes(c.outcome));
  const engaged = connected.filter((c) => c.outcome !== 'declined' && c.outcome !== 'callback-requested');
  const aeReports = periodCalls.filter((c) => c.aeDetected);
  const hubEnrolled = periodCalls.filter((c) => c.outcome === 'hub-enrollment');
  const copayCards = periodCalls.filter((c) => c.outcome === 'copay-card-issued');
  const hcpEngagements = periodCalls.filter((c) => c.contactType === 'hcp' && CONVERSION_OUTCOMES.includes(c.outcome));
  const samples = periodCalls.filter((c) => c.outcome === 'sample-request');
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

  // Build therapeutic area distribution from brand's therapeutic areas
  const therapeuticAreaDistribution: Record<string, number> = {};
  for (const ta of brand.therapeuticAreas) {
    therapeuticAreaDistribution[ta.id] = 0;
  }
  for (const c of periodCalls) {
    therapeuticAreaDistribution[c.therapeuticArea] = (therapeuticAreaDistribution[c.therapeuticArea] || 0) + 1;
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
// MSL Follow-Up Requests -- seed entries derived from calls with follow-up flags
// ---------------------------------------------------------------------------
function buildMSLFollowUpRequests(brand: BrandPack, allCalls: CallRecord[]): MSLFollowUpRequest[] {
  const d0 = brandDrug0(brand);
  const d1 = brandDrug1(brand);
  const requests: MSLFollowUpRequest[] = [];
  const hcpCalls = allCalls.filter(
    c => c.contactType === 'hcp'
      && c.classification.mslFollowupRequested
      && c.classification.mslFollowupTopic,
  );

  // Generate from flagged calls first
  for (const call of hcpCalls.slice(0, 3)) {
    requests.push({
      id: `msl-req-${pseudoUUID().slice(0, 8)}`,
      callId: call.id,
      contactId: call.contactId,
      contactName: call.contactName,
      contactType: 'hcp',
      requestType: call.classification.mslFollowupTopic!.toLowerCase().includes('peer-to-peer')
        ? 'peer-to-peer'
        : call.classification.mslFollowupTopic!.toLowerCase().includes('off-label')
        ? 'off-label-inquiry'
        : 'clinical-data',
      topic: call.classification.mslFollowupTopic!,
      urgency: call.urgency,
      assignedMSL: pick([undefined, 'Dr. Sarah Mitchell', 'Dr. Kevin Zhao'] as const),
      status: pick(['new', 'new', 'assigned', 'scheduled'] as const),
      createdAt: call.timestamp,
    });
  }

  // Add static entries to guarantee we always have at least 4 for demo
  if (requests.length < 4) {
    requests.push({
      id: 'msl-req-static-001',
      callId: allCalls.find(c => c.contactId === 'HCP-004')?.id ?? allCalls[0].id,
      contactId: 'HCP-004',
      contactName: 'Dr. Lisa Rodriguez',
      contactType: 'hcp',
      requestType: 'peer-to-peer',
      topic: `Peer-to-peer discussion on ${d1.brandName} efficacy in ${brandTA1Label(brand)} patients -- wants to discuss subgroup data with KOL`,
      urgency: 'soon',
      assignedMSL: 'Dr. Sarah Mitchell',
      status: 'assigned',
      createdAt: new Date('2026-03-15T14:30:00Z').toISOString(),
    });
  }
  if (requests.length < 5) {
    requests.push({
      id: 'msl-req-static-002',
      callId: allCalls.find(c => c.contactId === 'HCP-001')?.id ?? allCalls[0].id,
      contactId: 'HCP-001',
      contactName: 'Dr. James Thornton',
      contactType: 'hcp',
      requestType: 'clinical-data',
      topic: `${d0.brandName} Phase 3 trial subgroup analysis for target patient population`,
      urgency: 'routine',
      assignedMSL: undefined,
      status: 'new',
      createdAt: new Date('2026-03-16T09:15:00Z').toISOString(),
    });
  }
  if (requests.length < 5) {
    requests.push({
      id: 'msl-req-static-003',
      callId: allCalls.find(c => c.contactId === 'HCP-005')?.id ?? allCalls[0].id,
      contactId: 'HCP-005',
      contactName: 'Dr. David Kim',
      contactType: 'hcp',
      requestType: 'scientific-exchange',
      topic: `Scientific exchange on ${d1.brandName} mechanism of action and receptor selectivity -- preparing for advisory board presentation`,
      urgency: 'soon',
      assignedMSL: 'Dr. Kevin Zhao',
      status: 'scheduled',
      createdAt: new Date('2026-03-14T11:00:00Z').toISOString(),
    });
  }

  return requests;
}

export function getMSLFollowUpRequests(brand: BrandPack = praxisBrand): MSLFollowUpRequest[] {
  return getBrandCache(brand).mslFollowUpRequests;
}

export function getMSLFollowUpRequestsByStatus(status?: MSLFollowUpRequest['status'], brand: BrandPack = praxisBrand): MSLFollowUpRequest[] {
  const reqs = getBrandCache(brand).mslFollowUpRequests;
  if (!status) return reqs;
  return reqs.filter(r => r.status === status);
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

// ---------------------------------------------------------------------------
// Evidence Cohort -- 437 patients with TETRAS-LITE trajectories (product 0)
// ---------------------------------------------------------------------------

/** Box-Muller normal distribution using the module-level PRNG. */
function normalRng(mean: number, sd: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sd;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Generate the 437-patient cohort. */
function buildPatientCohort(brand: BrandPack): PatientOutcomeRecord[] {
  const COHORT_SIZE = 437;
  const timepoints: OutcomeTimepoint[] = ['baseline', '30d', '60d', '90d'];
  // Improvement factors per timepoint (multiplied against baseline score)
  const improvementFactors: Record<Exclude<OutcomeTimepoint, 'baseline'>, number> = {
    '30d': 0.78,
    '60d': 0.69,
    '90d': 0.65,
  };
  // Dropout probability at each follow-up timepoint
  const dropoutProbs: Record<Exclude<OutcomeTimepoint, 'baseline'>, number> = {
    '30d': 0.07,
    '60d': 0.08,
    '90d': 0.09,
  };

  const patients: PatientOutcomeRecord[] = [];

  for (let i = 0; i < COHORT_SIZE; i++) {
    const patientId = `cohort-${String(i + 1).padStart(4, '0')}`;
    const enrolledAt = new Date(Date.UTC(2024, 6, 1) + i * 12 * 60 * 60 * 1000).toISOString();

    // Baseline score: clamped normal (mean 5.5, SD 1.2, range 1-8), rounded to integer
    const baselineRaw = normalRng(5.5, 1.2);
    const baselineScore = Math.round(clamp(baselineRaw, 1, 8));

    const tetrasScores: Partial<Record<OutcomeTimepoint, number>> = {
      baseline: baselineScore,
    };
    const mmasScores: Partial<Record<OutcomeTimepoint, number>> = {
      baseline: Math.round(clamp(normalRng(2.5, 0.8), 0, 4)),
    };

    let droppedOut = false;

    for (const tp of ['30d', '60d', '90d'] as const) {
      if (droppedOut) break;
      // Dropout probability is slightly higher for patients with less improvement
      const factor = improvementFactors[tp];
      const baseDropout = dropoutProbs[tp];
      // Patients with higher baseline (worse disease) persist slightly more
      const adjustedDropout = baseDropout + (baselineScore < 4 ? 0.02 : -0.01);
      if (rng() < adjustedDropout) {
        droppedOut = true;
        break;
      }
      // Score at this timepoint: improvement factor × baseline, with noise, clamped 0-8
      const rawScore = baselineScore * factor + normalRng(0, 0.3);
      tetrasScores[tp] = Math.round(clamp(rawScore, 0, 8));
      mmasScores[tp] = Math.round(clamp(normalRng(3.0, 0.6), 0, 4));
    }

    const persistedAt90d = !droppedOut;

    // ~12% AE rate, ~2.3% serious AE rate (subset of AE)
    const aeReported = rng() < 0.12;
    const seriousAeReported = aeReported && rng() < 0.19; // ~2.3% of total = 19% of 12%

    patients.push({
      patientId,
      therapeuticArea: brandTA0(brand),
      drugProduct: brandDrug0(brand).id,
      enrolledAt,
      tetrasScores,
      mmasScores,
      persistedAt90d,
      aeReported,
      seriousAeReported,
    });
  }

  return patients;
}

function computeCohortStats(
  patients: PatientOutcomeRecord[],
  timepoint: OutcomeTimepoint,
): CohortTimepointStats {
  const scores = patients
    .map(p => p.tetrasScores[timepoint])
    .filter((s): s is number => s !== undefined);

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;

  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const variance = scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const sem = stdDev / Math.sqrt(n);
  const ci95Lower = mean - 1.96 * sem;
  const ci95Upper = mean + 1.96 * sem;

  // Percent improved vs baseline (score decreased)
  let improvedCount = 0;
  if (timepoint !== 'baseline') {
    for (const p of patients) {
      const baselineScore = p.tetrasScores.baseline;
      const tpScore = p.tetrasScores[timepoint];
      if (baselineScore !== undefined && tpScore !== undefined && tpScore < baselineScore) {
        improvedCount++;
      }
    }
  }
  const percentImprovedFromBaseline =
    timepoint === 'baseline' ? 0 : improvedCount / patients.length;

  return {
    timepoint,
    n,
    mean,
    median,
    stdDev,
    ci95Lower,
    ci95Upper,
    percentImprovedFromBaseline,
  };
}

function computePayerCard(
  patients: PatientOutcomeRecord[],
  cohort: CohortOutcomeData,
  brand: BrandPack,
): PayerEvidenceCard {
  // Point estimate AND CI computed from same eligible patient set (both baseline and 90d scores)
  const eligible = patients.filter(
    p => p.tetrasScores.baseline !== undefined && p.tetrasScores['90d'] !== undefined,
  );

  const improvements = eligible.map(p => {
    const baseline = p.tetrasScores.baseline!;
    const score90d = p.tetrasScores['90d']!;
    return baseline > 0 ? (baseline - score90d) / baseline : 0;
  });

  const n = improvements.length;
  const meanFraction = improvements.reduce((a, b) => a + b, 0) / n;
  const meanImprovementPct = Math.round(meanFraction * 1000) / 10; // e.g., 34.2

  const variance = improvements.reduce((acc, v) => acc + (v - meanFraction) ** 2, 0) / n;
  const sem = Math.sqrt(variance) / Math.sqrt(n);
  const ci95: [number, number] = [
    Math.round((meanFraction - 1.96 * sem) * 1000) / 10,
    Math.round((meanFraction + 1.96 * sem) * 1000) / 10,
  ];

  const baselineStats = cohort.trajectory.find(t => t.timepoint === 'baseline')!;
  const stats90d = cohort.trajectory.find(t => t.timepoint === '90d')!;

  const aeRate = patients.filter(p => p.aeReported).length / patients.length;
  const seriousAeRate = patients.filter(p => p.seriousAeReported).length / patients.length;

  // MMAS-4 adherence at 90d (score >= 3 = high adherence in generated data)
  const withMmas90d = patients.filter(p => p.mmasScores['90d'] !== undefined);
  const adherentAt90d = withMmas90d.filter(p => p.mmasScores['90d']! >= 3);
  const adherenceRate90d = withMmas90d.length > 0 ? adherentAt90d.length / withMmas90d.length : 0;

  const headline = `${meanImprovementPct}% mean TETRAS-LITE improvement at 90 days in ${patients.length} patients on ${brand.products[0].brandName}`;

  return {
    generatedAt: '2026-03-18',
    cohortSize: patients.length,
    meanBaselineScore: baselineStats.mean,
    mean90dScore: stats90d.mean,
    meanImprovementPct,
    ci95,
    persistenceRate90d: cohort.persistenceRate['90d'],
    adherenceRate90d,
    aeRate,
    seriousAeRate,
    headline,
  };
}

// ---------------------------------------------------------------------------
// Evidence cohort -- brand-keyed singleton cache
// ---------------------------------------------------------------------------
interface EvidenceCache {
  patients: PatientOutcomeRecord[];
  cohort: CohortOutcomeData;
  payerCard: PayerEvidenceCard;
}

const evidenceCacheMap = new Map<string, EvidenceCache>();

function getEvidenceCache(brand: BrandPack): EvidenceCache {
  const existing = evidenceCacheMap.get(brand.id);
  if (existing) return existing;

  const patients = buildPatientCohort(brand);
  const timepoints: OutcomeTimepoint[] = ['baseline', '30d', '60d', '90d'];
  const trajectory = timepoints.map(tp => computeCohortStats(patients, tp));
  const total = patients.length;
  const persistenceRate: Record<Exclude<OutcomeTimepoint, 'baseline'>, number> = {
    '30d': trajectory.find(t => t.timepoint === '30d')!.n / total,
    '60d': trajectory.find(t => t.timepoint === '60d')!.n / total,
    '90d': trajectory.find(t => t.timepoint === '90d')!.n / total,
  };
  const aeIncidenceRate = patients.filter(p => p.aeReported).length / total;
  const cohort: CohortOutcomeData = {
    therapeuticArea: brandTA0(brand),
    drugProduct: brandDrug0(brand).id,
    instrumentId: 'TETRAS-LITE',
    instrumentLabel: 'TETRAS-LITE Tremor Score',
    totalEnrolled: total,
    trajectory,
    persistenceRate,
    aeIncidenceRate,
  };
  const payerCard = computePayerCard(patients, cohort, brand);

  const cache: EvidenceCache = { patients, cohort, payerCard };
  evidenceCacheMap.set(brand.id, cache);
  return cache;
}

// Eagerly build the default (Praxis) evidence cache at module load
getEvidenceCache(praxisBrand);

export function getPatientOutcomes(brand: BrandPack = praxisBrand): PatientOutcomeRecord[] {
  return getEvidenceCache(brand).patients;
}

export function getCohortOutcomeData(brand: BrandPack = praxisBrand): CohortOutcomeData {
  return getEvidenceCache(brand).cohort;
}

export function getPayerEvidenceCard(brand: BrandPack = praxisBrand): PayerEvidenceCard {
  return getEvidenceCache(brand).payerCard;
}
