// ---------------------------------------------------------------------------
// PTC Therapeutics — Brand Backend Configuration
// ---------------------------------------------------------------------------
// Covers Sephience (sepiapterin) for PKU and Emflaza (deflazacort) for DMD.
// Data sourced from FDA prescribing information, ptcbio.com, and published
// clinical trial results.  All clinical values are realistic and medically
// accurate for demo purposes.
// ---------------------------------------------------------------------------

import type { BrandBackendConfig } from './index.js';

const ptc: BrandBackendConfig = {
  id: 'ptc',
  companyName: 'PTC Therapeutics',
  shortName: 'PTC',
  hubName: 'PTC Cares',

  // -------------------------------------------------------------------------
  // Agent personas — name + greeting per agent type
  // -------------------------------------------------------------------------
  agentPersonas: {
    'patient-support': {
      name: 'Hannah',
      greeting:
        'Hi, this is Hannah calling from PTC Cares. How can I help you today?',
    },
    'hcp-support': {
      name: 'Thomas',
      greeting:
        'Hello, this is the PTC Therapeutics Medical Information line. Thank you for calling.',
    },
    'hcp-outbound': {
      name: 'Melissa',
      greeting:
        'Hello, this is Melissa from PTC Therapeutics. I appreciate you taking my call.',
    },
    'medcomms-qa': {
      name: 'Daniel',
      greeting:
        'Thank you for contacting PTC Therapeutics Medical Communications.',
    },
  },

  // -------------------------------------------------------------------------
  // Phone numbers (demo values)
  // -------------------------------------------------------------------------
  phoneNumbers: {
    patientSupport: '1-866-PTC-CARE',
    medicalInfo: '1-866-PTC-MEDI',
    safety: '1-866-PTC-SAFE',
  },

  // -------------------------------------------------------------------------
  // URLs
  // -------------------------------------------------------------------------
  urls: {
    patientPortal: 'PTCCares.com',
    hcpPortal: 'PTCMedical.com',
  },

  // -------------------------------------------------------------------------
  // Drug profiles
  // -------------------------------------------------------------------------
  drugProfiles: [
    {
      id: 'sepiapterin',
      brandName: 'Sephience',
      genericName: 'Sepiapterin',
      therapeuticArea: 'pku',
      indication:
        'Treatment of hyperphenylalaninemia due to phenylketonuria (PKU) in adult and pediatric patients who are sepiapterin-responsive, ' +
        'as an adjunct to a phenylalanine-restricted diet',
      moa:
        'Sepiapterin is a synthetic precursor of tetrahydrobiopterin (BH4), the essential cofactor for phenylalanine hydroxylase (PAH). ' +
        'Unlike sapropterin (which provides BH4 directly), sepiapterin is converted intracellularly to BH4 via sepiapterin reductase, ' +
        'achieving higher and more sustained intracellular BH4 levels. By restoring PAH cofactor activity, sepiapterin increases ' +
        'phenylalanine metabolism and lowers blood phenylalanine (Phe) concentrations in responsive patients.',
      dosing:
        'Adults and pediatric patients >=2 years: 20 mg/kg/day orally, administered once daily with food. ' +
        'Maximum dose 60 mg/kg/day or 3,000 mg/day. Tablets may be dissolved in water for patients unable to swallow whole. ' +
        'BH4-responsiveness should be confirmed by Phe reduction test before initiating therapy.',
      commonAEs: [
        'Rhinorrhea (12%)',
        'Diarrhea (8%)',
        'Abdominal pain (7%)',
        'Headache (6%)',
        'Nausea (5%)',
        'Pyrexia (4%)',
        'Cough (3%)',
      ],
      seriousAEs: [
        'Hypophenylalaninemia — monitor blood Phe levels; overly aggressive lowering may impair neurological function',
        'Gastric irritation requiring dose adjustment in <2% of patients',
        'Use caution with levodopa co-administration — BH4 is also a cofactor for tyrosine hydroxylase and may potentiate dopaminergic effects',
      ],
      boxWarning: undefined,
      trialData:
        'APHENITY (Phase 3, N=187): -68% reduction in blood Phe from baseline vs -4% placebo at 24 weeks (p<0.001); ' +
        '85% of treated patients achieved blood Phe <360 µmol/L vs 13% placebo. ' +
        'Mean dietary Phe tolerance increased from 18 g/day to 42 g/day, allowing substantial diet liberalization. ' +
        'Long-term extension data showed sustained Phe control through 52 weeks.',
    },
    {
      id: 'deflazacort',
      brandName: 'Emflaza',
      genericName: 'Deflazacort',
      therapeuticArea: 'dmd',
      indication:
        'Treatment of Duchenne muscular dystrophy (DMD) in patients aged 2 years and older',
      moa:
        'Deflazacort is an oxazoline derivative of prednisolone — a corticosteroid prodrug. After oral administration, ' +
        'it is rapidly converted to the active metabolite 21-desacetyldeflazacort. In DMD, the anti-inflammatory and ' +
        'immunomodulatory effects reduce muscle fiber necrosis and fibrosis, preserve muscle strength, and extend ' +
        'ambulation. Deflazacort has a more favorable bone and metabolic side-effect profile compared to prednisone ' +
        'at equipotent anti-inflammatory doses.',
      dosing:
        'Approximately 0.9 mg/kg/day orally, once daily. Available as tablets (6 mg, 18 mg, 30 mg, 36 mg) and ' +
        'oral suspension (22.75 mg/mL). Take with or without food. Do not crush or split tablets. ' +
        'When switching from prednisone, use a 1.2:1 conversion ratio (deflazacort:prednisone).',
      commonAEs: [
        'Cushingoid features (33%)',
        'Weight gain (23%)',
        'Increased appetite (15%)',
        'Upper respiratory infection (12%)',
        'Cough (10%)',
        'Pollakiuria / urinary frequency (8%)',
        'Central obesity (7%)',
        'Nasopharyngitis (6%)',
        'GI symptoms — nausea, vomiting (5%)',
      ],
      seriousAEs: [
        'Immunosuppression — increased risk of new or reactivated infections including opportunistic infections',
        'Adrenal suppression — do not withdraw abruptly; taper gradually to avoid adrenal crisis',
        'Growth retardation in pediatric patients — monitor growth velocity',
        'Behavioral and mood changes including irritability, aggression, and psychosis at high doses',
        'Decreased bone mineral density — monitor with DEXA; ensure adequate calcium and vitamin D intake',
        'Cataracts and glaucoma with prolonged use — annual ophthalmologic exams recommended',
      ],
      boxWarning: undefined,
      trialData:
        'Pivotal Study (N=196, 52-week double-blind + open-label extension): patients treated with deflazacort 0.9 mg/kg/day ' +
        'maintained significantly greater muscle strength vs placebo at week 52 (p<0.01); ' +
        'mean loss of ambulation delayed by approximately 2.5 years vs untreated natural history. ' +
        'Long-term extension (up to 5 years): deflazacort-treated patients retained ambulation longer than prednisone-treated patients ' +
        'with less weight gain (BMI z-score +0.5 vs +1.7, p<0.001).',
    },
  ],

  // -------------------------------------------------------------------------
  // Support pathways
  // -------------------------------------------------------------------------
  supportPathways: [
    {
      id: 'hub-enrollment',
      label: 'PTC Cares Enrollment',
      description:
        'Patient and caregiver enrollment into PTC Cares, the dedicated patient services hub offering case management, specialty pharmacy coordination, copay assistance, and ongoing treatment support for rare disease patients.',
    },
    {
      id: 'copay-assistance',
      label: 'Copay Assistance Program',
      description:
        'Financial assistance for commercially insured patients including copay cards, bridge programs, and connection to PTC Cares patient assistance for uninsured/underinsured patients.',
    },
    {
      id: 'genetic-testing-referral',
      label: 'Genetic Testing Referral',
      description:
        'Referral coordination for confirmatory genetic testing — PAH gene sequencing for PKU, dystrophin gene testing for DMD. Connects patients and HCPs with certified genetic counselors and testing labs.',
    },
    {
      id: 'ae-reporting',
      label: 'Adverse Event Reporting',
      description:
        'Capture, documentation, and escalation of adverse events, product quality complaints, and safety inquiries per FDA and PTC Therapeutics pharmacovigilance requirements.',
    },
    {
      id: 'adherence-support',
      label: 'Adherence & Persistence Support',
      description:
        'Proactive case management support to help patients and caregivers maintain therapy, manage side effects, coordinate refills, and track treatment milestones.',
    },
    {
      id: 'medical-inquiry',
      label: 'Medical Information Inquiry',
      description:
        'Evidence-based clinical information for HCPs including mechanism of action, clinical trial data, dosing guidance, BH4-responsiveness testing protocols, and MSL peer-to-peer discussion requests.',
    },
  ],

  // -------------------------------------------------------------------------
  // Contact network
  // -------------------------------------------------------------------------
  contactNetwork: [
    // Hub / Specialty Pharmacy
    {
      name: 'PTC Cares Patient Hub',
      role: 'Patient Services Hub',
      phone: '+18667822273',
    },
    {
      name: 'Accredo Specialty Pharmacy',
      role: 'Contracted Specialty Pharmacy',
      phone: '+18005550120',
    },
    {
      name: 'PANTHERx Rare Pharmacy',
      role: 'Contracted Specialty Pharmacy — Rare Disease',
      phone: '+18005550121',
    },
    // MSLs
    {
      name: 'Dr. Angela Martinez, MD',
      role: 'Medical Science Liaison — Metabolic / PKU',
      territory: 'Northeast US',
      phone: '+16175550320',
      email: 'amartinez@ptcbio.example',
    },
    {
      name: 'Dr. Jason Park, PhD',
      role: 'Medical Science Liaison — Neuromuscular / DMD',
      territory: 'Western US',
      phone: '+14155550321',
      email: 'jpark@ptcbio.example',
    },
    {
      name: 'Dr. Nadia Okafor, PharmD',
      role: 'Medical Science Liaison — Rare Disease',
      territory: 'Central US',
      phone: '+13125550322',
      email: 'nokafor@ptcbio.example',
    },
    // Case Managers (rare disease context)
    {
      name: 'Beth Callahan, RN',
      role: 'Case Manager — PKU',
      phone: '+18005550420',
    },
    {
      name: 'Derek Simmons, RN',
      role: 'Case Manager — DMD',
      phone: '+18005550421',
    },
    // Drug Safety
    {
      name: 'PTC Drug Safety / Pharmacovigilance',
      role: 'Pharmacovigilance',
      phone: '+18005550620',
    },
  ],

  // -------------------------------------------------------------------------
  // Vocabulary boosts for Deepgram STT
  // -------------------------------------------------------------------------
  vocabularyBoosts: [
    { word: 'Sephience', boost: 5 },
    { word: 'Emflaza', boost: 5 },
    { word: 'sepiapterin', boost: 5 },
    { word: 'deflazacort', boost: 5 },
    { word: 'PTC', boost: 3 },
    { word: 'PTC Cares', boost: 3 },
    { word: 'Duchenne', boost: 3 },
    { word: 'PKU', boost: 3 },
    { word: 'phenylketonuria', boost: 3 },
    { word: 'phenylalanine', boost: 3 },
    { word: 'BH4', boost: 3 },
    { word: 'tetrahydrobiopterin', boost: 3 },
    { word: 'dystrophin', boost: 3 },
    { word: 'sapropterin', boost: 2 },
    { word: 'Kuvan', boost: 2 },
    { word: 'corticosteroid', boost: 2 },
    { word: 'prednisone', boost: 2 },
    { word: 'ambulatory', boost: 2 },
    { word: 'Phe', boost: 2 },
    { word: 'PAH', boost: 2 },
    { word: 'DEXA', boost: 2 },
  ],

  // -------------------------------------------------------------------------
  // TTS pronunciation guide
  // -------------------------------------------------------------------------
  pronunciationGuide:
    'PRONUNCIATION: The drug name Sephience is pronounced "seh-FY-ence" (rhymes with "defiance"). Always write it as "Sefiance" in your spoken responses so the text-to-speech engine says it correctly.',

  // -------------------------------------------------------------------------
  // Outcome overrides (none — uses defaults)
  // -------------------------------------------------------------------------
  outcomeOverrides: undefined,

  // -------------------------------------------------------------------------
  // Screening instruments
  // -------------------------------------------------------------------------
  screeningInstruments: [
    {
      id: 'PHE-MONITOR',
      name: 'Phenylalanine Monitoring & Diet Assessment',
      questions: [
        {
          id: 'phe-0',
          text: 'When was your most recent blood phenylalanine (Phe) level checked?',
          options: [
            'Within the past month',
            '1-3 months ago',
            '3-6 months ago',
            'More than 6 months ago or I\'m not sure',
          ],
        },
        {
          id: 'phe-1',
          text: 'Do you know your most recent blood Phe level?',
          options: [
            'Yes — it was in the target range (120-360 µmol/L)',
            'Yes — it was above target (>360 µmol/L)',
            'Yes — it was below target (<120 µmol/L)',
            'I don\'t know the number',
          ],
        },
        {
          id: 'phe-2',
          text: 'How well are you able to follow your prescribed low-phenylalanine diet?',
          options: [
            'Very well — I follow it consistently',
            'Mostly — occasional lapses',
            'It\'s been difficult to maintain',
            'I\'m not currently following a Phe-restricted diet',
          ],
        },
        {
          id: 'phe-3',
          text: 'Have you noticed any cognitive or mood changes (difficulty concentrating, anxiety, irritability) since your last visit?',
          options: [
            'No changes',
            'Mild — occasional difficulty concentrating',
            'Moderate — noticeable impact on daily life',
            'Significant — affecting work, school, or relationships',
          ],
        },
      ],
    },
    {
      id: 'MOTOR-FUNCTION',
      name: 'Motor Function Assessment — DMD',
      questions: [
        {
          id: 'mf-0',
          text: 'Is the patient currently ambulatory (able to walk independently)?',
          options: [
            'Yes — walks independently without assistance',
            'Yes — but needs some assistance (handrails, occasional wheelchair)',
            'Transitioning — uses wheelchair for longer distances',
            'No — primarily wheelchair-dependent',
          ],
        },
        {
          id: 'mf-1',
          text: 'Can the patient rise from the floor without assistance (Gowers\' maneuver)?',
          options: [
            'Yes — rises without difficulty',
            'Yes — but uses hands on thighs to push up',
            'Needs furniture or a person for assistance',
            'Unable to rise from the floor independently',
          ],
        },
        {
          id: 'mf-2',
          text: 'How would you describe the patient\'s ability to climb stairs?',
          options: [
            'Climbs stairs without using the railing',
            'Climbs stairs using the railing',
            'Climbs stairs with physical assistance from another person',
            'Unable to climb stairs',
          ],
        },
        {
          id: 'mf-3',
          text: 'Over the past 6 months, has there been a noticeable change in the patient\'s motor function?',
          options: [
            'Stable — no noticeable change',
            'Mild decline — slightly less active or tires more easily',
            'Moderate decline — lost ability to perform some activities',
            'Significant decline — major functional loss',
          ],
        },
      ],
    },
  ],
};

export default ptc;
