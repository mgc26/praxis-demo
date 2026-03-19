// ---------------------------------------------------------------------------
// Amgen — Brand Backend Configuration
// ---------------------------------------------------------------------------
// Covers Repatha (evolocumab) and TEZSPIRE (tezepelumab).
// Data sourced from FDA prescribing information, Amgen.com, and FY2025
// earnings materials.  All clinical values are realistic and medically
// accurate for demo purposes.
// ---------------------------------------------------------------------------

import type { BrandBackendConfig } from './index.js';

const amgen: BrandBackendConfig = {
  id: 'amgen',
  companyName: 'Amgen',
  shortName: 'Amgen',
  hubName: 'Amgen SupportPlus',

  // -------------------------------------------------------------------------
  // Agent personas — name + greeting per agent type
  // -------------------------------------------------------------------------
  agentPersonas: {
    'patient-support': {
      name: 'Sarah',
      greeting:
        'Hi, this is Sarah calling from Amgen SupportPlus. How can I help you today?',
    },
    'hcp-support': {
      name: 'David',
      greeting:
        'Hello, this is the Amgen Medical Information line. Thank you for calling.',
    },
    'hcp-outbound': {
      name: 'Jennifer',
      greeting:
        'Hello, this is Jennifer from Amgen. I appreciate you taking my call.',
    },
    'medcomms-qa': {
      name: 'Michael',
      greeting:
        'Thank you for contacting Amgen Medical Communications.',
    },
  },

  // -------------------------------------------------------------------------
  // Phone numbers (demo values)
  // -------------------------------------------------------------------------
  phoneNumbers: {
    patientSupport: '1-800-AMGEN-PS',
    medicalInfo: '1-800-AMGEN-MI',
    safety: '1-800-AMGEN-AE',
  },

  // -------------------------------------------------------------------------
  // URLs
  // -------------------------------------------------------------------------
  urls: {
    patientPortal: 'AmgenSupportPlus.com',
    hcpPortal: 'AmgenMedical.com',
  },

  // -------------------------------------------------------------------------
  // Drug profiles
  // -------------------------------------------------------------------------
  drugProfiles: [
    {
      id: 'evolocumab',
      brandName: 'Repatha',
      genericName: 'Evolocumab',
      therapeuticArea: 'cardiovascular',
      indication:
        'Reduce risk of major adverse cardiovascular events (MI, stroke, coronary revascularization) in adults with established ASCVD; ' +
        'adjunct to diet and maximally tolerated statin therapy to reduce LDL-C in adults with primary hyperlipidemia; ' +
        'HeFH and HoFH in adults and pediatric patients aged 10 years and older',
      moa:
        'Fully human IgG2 monoclonal antibody that binds proprotein convertase subtilisin/kexin type 9 (PCSK9). ' +
        'By inhibiting PCSK9, Repatha prevents LDL receptor degradation on hepatocyte surfaces, increasing LDL receptor recycling ' +
        'and LDL-C clearance from the bloodstream. Achieves approximately 60% LDL-C reduction from baseline.',
      dosing:
        '140 mg subcutaneous injection every 2 weeks, or 420 mg once monthly. ' +
        'Administered via SureClick autoinjector or prefilled syringe. Can be self-administered at home after training.',
      commonAEs: [
        'Nasopharyngitis (5.9%)',
        'Upper respiratory tract infection (3.2%)',
        'Injection site reactions — erythema, pain, bruising (3.1%)',
        'Back pain (2.8%)',
        'Influenza-like symptoms (2.3%)',
        'Arthralgia (2.1%)',
        'Urinary tract infection (1.9%)',
      ],
      seriousAEs: [
        'Hypersensitivity reactions including rash, urticaria, and rare anaphylaxis — discontinue if severe allergic reaction occurs',
        'Neurocognitive events monitored in FOURIER and EBBINGHAUS studies — no significant signal vs placebo',
      ],
      boxWarning: undefined,
      trialData:
        'FOURIER (Phase 3, N=27,564): 15% relative risk reduction in primary composite endpoint (CV death, MI, stroke, hospitalization for unstable angina, coronary revascularization) vs placebo at median 2.2 years; ' +
        'HR 0.85, 95% CI 0.79-0.92, p<0.001. LDL-C reduced by 59% to median 30 mg/dL. ' +
        'VESALIUS-CV (Phase 3, N=13,000+): expanded indication to adults at increased MACE risk due to uncontrolled LDL-C.',
    },
    {
      id: 'tezepelumab',
      brandName: 'TEZSPIRE',
      genericName: 'Tezepelumab',
      therapeuticArea: 'severe-asthma',
      indication:
        'Add-on maintenance treatment for severe asthma in adults and pediatric patients aged 12 years and older. ' +
        'Not indicated for relief of acute bronchospasm or status asthmaticus. ' +
        'Also indicated for add-on maintenance in inadequately controlled CRSwNP (chronic rhinosinusitis with nasal polyps) in patients 12+ years.',
      moa:
        'Human monoclonal antibody (IgG2-lambda) that binds thymic stromal lymphopoietin (TSLP), ' +
        'a master upstream epithelial cytokine. By blocking TSLP, TEZSPIRE inhibits multiple downstream inflammatory ' +
        'pathways (eosinophilic, allergic, and non-eosinophilic) regardless of biomarker phenotype. ' +
        'This upstream mechanism differentiates TEZSPIRE from anti-IL-5 and anti-IgE biologics that target single pathways.',
      dosing:
        '210 mg subcutaneous injection once every 4 weeks. ' +
        'Administered via prefilled syringe or autoinjector. Can be given in HCP office or self-administered at home.',
      commonAEs: [
        'Pharyngitis (3.9%)',
        'Arthralgia (3.7%)',
        'Back pain (3.4%)',
        'Injection site reactions (2.6%)',
        'Headache (2.1%)',
      ],
      seriousAEs: [
        'Hypersensitivity reactions including rash and allergic conjunctivitis — discontinue if anaphylaxis occurs',
        'Anaphylaxis reported post-marketing (can be delayed onset, days after injection)',
        'Do not abruptly discontinue systemic or inhaled corticosteroids upon initiation — taper gradually',
        'Treat pre-existing helminth infections before starting therapy; discontinue if infection unresponsive to treatment',
      ],
      boxWarning: undefined,
      trialData:
        'NAVIGATOR (Phase 3, N=1,061): 56% reduction in annualized asthma exacerbation rate (AAER) vs placebo over 52 weeks in overall population (p<0.001); ' +
        '70% reduction in patients with baseline eosinophils <300 cells/mcL. ' +
        'DESTINATION (Phase 3 extension, N=951): sustained safety and efficacy through 2 years of continuous treatment. ' +
        'SOURCE (Phase 3, N=150): 62% reduction in oral corticosteroid dose vs 34% placebo (p<0.05).',
    },
  ],

  // -------------------------------------------------------------------------
  // Support pathways
  // -------------------------------------------------------------------------
  supportPathways: [
    {
      id: 'hub-enrollment',
      label: 'Amgen SupportPlus Enrollment',
      description:
        'Patient and caregiver enrollment into Amgen SupportPlus, the umbrella patient hub providing copay assistance, nurse navigation, specialty pharmacy coordination, and ongoing treatment support.',
    },
    {
      id: 'copay-assistance',
      label: 'Amgen FIRST STEP Copay Program',
      description:
        'Copay and out-of-pocket assistance for commercially insured patients. Covers first dose and subsequent costs up to program limits. Also includes AmgenNow direct-to-patient pricing for eligible products.',
    },
    {
      id: 'ae-reporting',
      label: 'Adverse Event Reporting',
      description:
        'Capture, documentation, and escalation of adverse events, product quality complaints, and safety inquiries per FDA and Amgen pharmacovigilance requirements.',
    },
    {
      id: 'adherence-support',
      label: 'Adherence & Persistence Support',
      description:
        'Proactive outreach and support to help patients stay on therapy, manage injection schedules, handle side effects, and maintain treatment adherence.',
    },
    {
      id: 'sample-request',
      label: 'Sample Request',
      description:
        'HCP requests for product samples to initiate therapy or bridge gaps in insurance coverage. Processed through Amgen medical affairs.',
    },
    {
      id: 'medical-inquiry',
      label: 'Medical Information Inquiry',
      description:
        'Evidence-based clinical information for HCPs including mechanism of action, clinical trial data, dosing guidance, formulary support, and MSL peer-to-peer discussion requests.',
    },
  ],

  // -------------------------------------------------------------------------
  // Contact network
  // -------------------------------------------------------------------------
  contactNetwork: [
    // Hub / Specialty Pharmacy
    {
      name: 'Amgen SupportPlus Hub',
      role: 'Patient Services Hub',
      phone: '+18662642778',
    },
    {
      name: 'Accredo Specialty Pharmacy',
      role: 'Contracted Specialty Pharmacy',
      phone: '+18005550110',
    },
    {
      name: 'CVS Specialty',
      role: 'Contracted Specialty Pharmacy',
      phone: '+18005550111',
    },
    // MSLs
    {
      name: 'Dr. Karen Liu, PharmD',
      role: 'Medical Science Liaison — Cardiovascular',
      territory: 'Northeast US',
      phone: '+16175550310',
      email: 'kliu@amgen.example',
    },
    {
      name: 'Dr. Robert Mensah, MD',
      role: 'Medical Science Liaison — Respiratory',
      territory: 'Southeast US',
      phone: '+14045550311',
      email: 'rmensah@amgen.example',
    },
    {
      name: 'Dr. Priya Sharma, PhD',
      role: 'Medical Science Liaison — Cardiovascular',
      territory: 'Western US',
      phone: '+14155550312',
      email: 'psharma@amgen.example',
    },
    // Nurse Ambassadors
    {
      name: 'Lisa Thornton, RN',
      role: 'Nurse Ambassador — Cardiovascular',
      phone: '+18005550410',
    },
    {
      name: 'James Calloway, RN',
      role: 'Nurse Ambassador — Respiratory',
      phone: '+18005550411',
    },
    // Drug Safety
    {
      name: 'Amgen Drug Safety / Pharmacovigilance',
      role: 'Pharmacovigilance',
      phone: '+18005550610',
    },
  ],

  // -------------------------------------------------------------------------
  // Vocabulary boosts for Deepgram STT
  // -------------------------------------------------------------------------
  vocabularyBoosts: [
    { word: 'Repatha', boost: 5 },
    { word: 'TEZSPIRE', boost: 5 },
    { word: 'evolocumab', boost: 5 },
    { word: 'tezepelumab', boost: 5 },
    { word: 'Amgen', boost: 3 },
    { word: 'SupportPlus', boost: 3 },
    { word: 'PCSK9', boost: 3 },
    { word: 'LDL', boost: 3 },
    { word: 'TSLP', boost: 3 },
    { word: 'ASCVD', boost: 3 },
    { word: 'hyperlipidemia', boost: 2 },
    { word: 'hypercholesterolemia', boost: 2 },
    { word: 'statin', boost: 2 },
    { word: 'atorvastatin', boost: 2 },
    { word: 'rosuvastatin', boost: 2 },
    { word: 'SureClick', boost: 2 },
    { word: 'autoinjector', boost: 2 },
    { word: 'exacerbation', boost: 2 },
    { word: 'eosinophil', boost: 2 },
    { word: 'biologic', boost: 2 },
    { word: 'FOURIER', boost: 2 },
    { word: 'NAVIGATOR', boost: 2 },
  ],

  // -------------------------------------------------------------------------
  // Outcome overrides (none — uses defaults)
  // -------------------------------------------------------------------------
  outcomeOverrides: undefined,

  // -------------------------------------------------------------------------
  // Screening instruments
  // -------------------------------------------------------------------------
  screeningInstruments: [
    {
      id: 'LDL-C-ASSESS',
      name: 'LDL-C Risk & Adherence Assessment',
      questions: [
        {
          id: 'ldl-0',
          text: 'Do you know your most recent LDL cholesterol level?',
          options: [
            'Yes — it was at goal (below target)',
            'Yes — it was above goal',
            'I had it checked but don\'t remember the number',
            'I haven\'t had it checked recently',
          ],
        },
        {
          id: 'ldl-1',
          text: 'Are you currently taking a statin medication (e.g., atorvastatin, rosuvastatin)?',
          options: [
            'Yes — at the maximum tolerated dose',
            'Yes — but not at the highest dose',
            'No — I stopped due to side effects',
            'No — I was never prescribed one',
          ],
        },
        {
          id: 'ldl-2',
          text: 'Have you or a close family member had a heart attack, stroke, or been told you have heart disease?',
          options: ['No', 'Yes — myself', 'Yes — a close family member', 'Yes — both myself and a family member'],
        },
        {
          id: 'ldl-3',
          text: 'How confident are you in your ability to self-administer an injection every 2 weeks or once a month?',
          options: [
            'Very confident',
            'Somewhat confident',
            'A bit nervous but willing to try',
            'I would prefer help or an office visit',
          ],
        },
      ],
    },
    {
      id: 'ASTHMA-CONTROL',
      name: 'Asthma Control Assessment',
      questions: [
        {
          id: 'ac-0',
          text: 'In the past 4 weeks, how often did your asthma symptoms (wheezing, coughing, shortness of breath, chest tightness) wake you up at night?',
          options: [
            'Not at all',
            '1-2 nights',
            '3-4 nights',
            '5 or more nights',
          ],
        },
        {
          id: 'ac-1',
          text: 'In the past 4 weeks, how often did you use your rescue inhaler (albuterol/salbutamol)?',
          options: [
            'Not at all',
            '1-2 times per week',
            '3-6 times per week',
            'Daily or more',
          ],
        },
        {
          id: 'ac-2',
          text: 'How many asthma exacerbations (flare-ups requiring oral steroids, ER visit, or hospitalization) have you had in the past 12 months?',
          options: ['None', '1', '2', '3 or more'],
        },
        {
          id: 'ac-3',
          text: 'Are you currently taking an oral corticosteroid (e.g., prednisone) daily to control your asthma?',
          options: [
            'No',
            'Yes — low dose (5-10 mg/day)',
            'Yes — moderate to high dose (>10 mg/day)',
            'I take them on and off during flare-ups',
          ],
        },
      ],
    },
  ],
};

export default amgen;
