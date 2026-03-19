// ---------------------------------------------------------------------------
// Praxis BioSciences — Brand Backend Configuration
// ---------------------------------------------------------------------------
// Extracted from existing config, prompt, and service files so that every
// Praxis-specific value lives in one place and can be swapped at runtime.
// ---------------------------------------------------------------------------

import type { BrandBackendConfig } from './index.js';

const praxis: BrandBackendConfig = {
  id: 'praxis',
  companyName: 'Praxis BioSciences',
  shortName: 'Praxis',
  hubName: 'PraxisConnect',

  // -------------------------------------------------------------------------
  // Agent personas — name + greeting per agent type
  // -------------------------------------------------------------------------
  agentPersonas: {
    'patient-support': {
      name: 'Emma',
      greeting: 'Hi, this is Emma calling from Praxis Patient Support.',
    },
    'hcp-support': {
      name: 'Aria',
      greeting: 'Hello, this is the Praxis Medical Information line. Thank you for calling.',
    },
    'hcp-outbound': {
      name: 'Marcus',
      greeting: 'Hello, this is Marcus from Praxis BioSciences.',
    },
    'medcomms-qa': {
      name: 'Rachel',
      greeting: 'Thank you for contacting Praxis BioSciences Medical Information.',
    },
  },

  // -------------------------------------------------------------------------
  // Phone numbers (fictional demo values)
  // -------------------------------------------------------------------------
  phoneNumbers: {
    patientSupport: '1-800-PRAXIS-PS',
    medicalInfo: '1-800-PRAXIS-MI',
    safety: '1-800-PRAXIS-AE',
  },

  // -------------------------------------------------------------------------
  // URLs
  // -------------------------------------------------------------------------
  urls: {
    patientPortal: 'PraxisPatientSupport.com',
    hcpPortal: 'PraxisHCP.com',
  },

  // -------------------------------------------------------------------------
  // Drug profiles
  // -------------------------------------------------------------------------
  drugProfiles: [
    {
      id: 'euloxacaltenamide',
      brandName: 'ELEX',
      genericName: 'Euloxacaltenamide',
      therapeuticArea: 'essential-tremor',
      indication: 'Treatment of essential tremor (ET) in adults',
      moa:
        'Novel selective T-type calcium channel modulator (Cav3.1/Cav3.3) — first-in-class for essential tremor. ' +
        'Reduces oscillatory thalamocortical activity implicated in tremor generation without broad CNS depression.',
      dosing: '25 mg orally once daily, titrate by 25 mg weekly to 75-150 mg/day (max 200 mg/day)',
      commonAEs: ['Dizziness (12%)', 'Fatigue (8%)', 'Nausea (6%)', 'Headache (5%)', 'Somnolence (4%)'],
      seriousAEs: [
        'Rare QTc prolongation (<1%) — ECG monitoring recommended at baseline and after dose adjustments',
        'Syncope in patients with pre-existing cardiac conduction abnormalities',
      ],
      boxWarning: undefined,
      trialData:
        'STEADY (Phase 3, N=412): -4.2 pts vs -1.8 placebo on TETRAS-P (p<0.001); ' +
        '62% achieved >=50% improvement vs 27% placebo; NNT=3',
    },
    {
      id: 'relutrigine',
      brandName: 'Relutrigine',
      genericName: 'Relutrigine',
      therapeuticArea: 'dee-dravet',
      indication:
        'Treatment of seizures associated with Dravet syndrome and other DEEs in patients 2 years and older',
      moa:
        'Selective sodium channel modulator with preferential Nav1.6 inhibition — avoids Nav1.1 blockade. ' +
        'Targets Nav1.6 on excitatory neurons to reduce seizure propagation while preserving inhibitory interneuron function.',
      dosing:
        '0.5 mg/kg/day divided BID, titrate by 0.5 mg/kg/day every 2 weeks to 2-4 mg/kg/day (max 6 mg/kg/day or 300 mg/day)',
      commonAEs: [
        'Somnolence (15%)',
        'Decreased appetite (9%)',
        'Diarrhea (7%)',
        'Pyrexia (5%)',
        'Upper respiratory infection (4%)',
      ],
      seriousAEs: [
        'DRESS reported in <0.5% — requires immediate discontinuation',
        'Slow titration required to minimize serious dermatologic reactions',
        'Suicidal ideation monitoring per FDA AED class labeling',
        'Status epilepticus during rapid dose changes',
      ],
      boxWarning:
        'Suicidality Risk: Anti-epileptic drugs, including relutrigine, increase the risk of suicidal thoughts or behavior.',
      trialData:
        'PROTECT (Phase 3, N=188): -48% median convulsive seizure frequency vs -15% placebo (p<0.001); ' +
        '28% seizure-free at 16 weeks vs 4% placebo; NNT=4',
    },
  ],

  // -------------------------------------------------------------------------
  // Support pathways
  // -------------------------------------------------------------------------
  supportPathways: [
    {
      id: 'medication-access',
      label: 'Medication Access & Reimbursement',
      description:
        'Support for patients and HCPs navigating insurance coverage, prior authorizations, copay assistance, and specialty pharmacy fulfillment.',
    },
    {
      id: 'safety-reporting',
      label: 'Safety & Adverse Event Reporting',
      description:
        'Capture and escalation of adverse events, product quality complaints, and safety-related inquiries per FDA and Praxis pharmacovigilance requirements.',
    },
    {
      id: 'clinical-education',
      label: 'Clinical Education & Medical Information',
      description:
        'Evidence-based clinical information for HCPs including MOA, clinical trial data, dosing guidance, and peer-to-peer MSL discussions.',
    },
    {
      id: 'patient-education',
      label: 'Patient & Caregiver Education',
      description:
        'Educational support for patients and caregivers on disease management, treatment expectations, titration schedules, and living with their condition.',
    },
    {
      id: 'adherence-support',
      label: 'Adherence & Persistence Support',
      description:
        'Proactive support to help patients stay on therapy, manage side effects, and maintain their treatment schedule.',
    },
    {
      id: 'nurse-educator',
      label: 'Nurse Educator Coordination',
      description:
        'Scheduling and coordination of nurse educator sessions for treatment onboarding, titration guidance, caregiver support, and ongoing disease management education.',
    },
  ],

  // -------------------------------------------------------------------------
  // Contact network — MSLs, nurse educators, hub, pharmacovigilance, etc.
  // -------------------------------------------------------------------------
  contactNetwork: [
    // Specialty Pharmacy
    {
      name: 'Praxis Specialty Pharmacy Hub — PraxisConnect',
      role: 'Hub Specialty Pharmacy',
      phone: '+18005550101',
    },
    {
      name: 'Accredo Specialty Pharmacy',
      role: 'Contracted Specialty Pharmacy',
      phone: '+18005550102',
    },
    {
      name: 'CVS Specialty',
      role: 'Contracted Specialty Pharmacy',
      phone: '+18005550103',
    },
    // Hub Services
    {
      name: 'PraxisConnect Patient Hub',
      role: 'Patient Services Hub',
      phone: '+18005550201',
    },
    {
      name: 'PraxisConnect HCP Portal Support',
      role: 'HCP Services Hub',
      phone: '+18005550202',
    },
    // MSLs
    {
      name: 'Dr. Rebecca Torres, PharmD',
      role: 'Medical Science Liaison',
      territory: 'Northeast US',
      phone: '+16175550301',
      email: 'rtorres@praxisbio.example',
    },
    {
      name: 'Dr. David Chen, PhD',
      role: 'Medical Science Liaison',
      territory: 'Western US',
      phone: '+14155550302',
      email: 'dchen@praxisbio.example',
    },
    {
      name: 'Dr. Aisha Patel, MD',
      role: 'Medical Science Liaison',
      territory: 'Central US',
      phone: '+13125550303',
      email: 'apatel@praxisbio.example',
    },
    // Nurse Educators
    {
      name: 'Sarah Mitchell, RN',
      role: 'Nurse Educator — ET',
      phone: '+18005550401',
    },
    {
      name: 'Marcus Johnson, RN',
      role: 'Nurse Educator — DEE',
      phone: '+18005550402',
    },
    {
      name: 'Praxis Nurse Educator Triage Line',
      role: 'Nurse Triage',
      phone: '+18005550403',
    },
    // Field Reimbursement
    {
      name: 'Praxis Field Reimbursement Team',
      role: 'Field Reimbursement Manager',
      phone: '+18005550501',
    },
    // Drug Safety
    {
      name: 'Praxis Drug Safety / Pharmacovigilance',
      role: 'Pharmacovigilance',
      phone: '+18005550601',
    },
  ],

  // -------------------------------------------------------------------------
  // Vocabulary boosts for Deepgram STT (keyterms)
  // -------------------------------------------------------------------------
  vocabularyBoosts: [
    { word: 'Euloxacaltenamide', boost: 5 },
    { word: 'ELEX', boost: 5 },
    { word: 'Relutrigine', boost: 5 },
    { word: 'Praxis', boost: 3 },
    { word: 'PraxisConnect', boost: 3 },
    { word: 'TETRAS', boost: 3 },
    { word: 'Dravet', boost: 3 },
    { word: 'clobazam', boost: 2 },
    { word: 'stiripentol', boost: 2 },
    { word: 'valproate', boost: 2 },
    { word: 'propranolol', boost: 2 },
    { word: 'primidone', boost: 2 },
    { word: 'topiramate', boost: 2 },
    { word: 'carbamazepine', boost: 2 },
    { word: 'phenytoin', boost: 2 },
    { word: 'lamotrigine', boost: 2 },
  ],

  // -------------------------------------------------------------------------
  // Outcome overrides (none for Praxis — uses defaults)
  // -------------------------------------------------------------------------
  outcomeOverrides: undefined,

  // -------------------------------------------------------------------------
  // Screening instruments
  // -------------------------------------------------------------------------
  screeningInstruments: [
    {
      id: 'AE-TRIAGE',
      name: 'Adverse Event Triage Screen',
      questions: [
        {
          id: 'ae-triage-0',
          text: 'Since starting or changing your medication, have you experienced any new or unusual symptoms?',
          options: ['No new symptoms', 'Mild new symptoms', 'Moderate new symptoms', 'Severe new symptoms'],
        },
        {
          id: 'ae-triage-1',
          text: 'How would you describe the impact of any symptoms on your daily activities?',
          options: [
            'No impact',
            'Slightly bothersome but manageable',
            'Interfering with some daily activities',
            'Preventing normal daily activities',
          ],
        },
        {
          id: 'ae-triage-2',
          text: 'When did these symptoms first appear?',
          options: [
            'Not applicable — no symptoms',
            'More than 4 weeks ago and stable',
            'Within the past 1-4 weeks',
            'Within the past week or getting worse',
          ],
        },
      ],
    },
    {
      id: 'C-SSRS-LITE',
      name: 'Columbia Suicide Severity Rating Scale — Lite',
      questions: [
        {
          id: 'cssrs-0',
          text: 'In the past month, have you wished you were dead or wished you could go to sleep and not wake up?',
          options: ['No', 'Yes'],
        },
        {
          id: 'cssrs-1',
          text: 'In the past month, have you actually had any thoughts of killing yourself?',
          options: ['No', 'Yes'],
        },
      ],
    },
    {
      id: 'TETRAS-LITE',
      name: 'TETRAS Performance — Lite Assessment',
      questions: [
        {
          id: 'tetras-0',
          text: 'Over the past week, how would you rate the severity of your tremor?',
          options: [
            'No tremor',
            'Slight tremor — barely noticeable',
            'Moderate tremor — noticeable but manageable',
            'Significant tremor — difficult to manage',
            'Severe tremor — unable to perform tasks',
          ],
        },
        {
          id: 'tetras-1',
          text: 'How much does your tremor interfere with daily activities like eating, writing, or dressing?',
          options: [
            'No interference',
            'Slight interference — can still do everything',
            'Moderate interference — some tasks are difficult',
            'Significant interference — need help with some tasks',
            'Severe interference — cannot perform tasks independently',
          ],
        },
      ],
    },
    {
      id: 'MMAS-4',
      name: 'Morisky Medication Adherence Scale — 4 Item',
      questions: [
        {
          id: 'mmas-0',
          text: 'Do you sometimes forget to take your medication?',
          options: ['No', 'Yes'],
        },
        {
          id: 'mmas-1',
          text: 'Over the past two weeks, were there any days when you did not take your medication?',
          options: ['No', 'Yes'],
        },
        {
          id: 'mmas-2',
          text: 'Have you ever cut back or stopped taking your medication without telling your doctor, because you felt worse when you took it?',
          options: ['No', 'Yes'],
        },
        {
          id: 'mmas-3',
          text: 'When you travel or leave home, do you sometimes forget to bring along your medication?',
          options: ['No', 'Yes'],
        },
      ],
    },
  ],
};

export default praxis;
