// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Support Knowledge Configuration
// ---------------------------------------------------------------------------

import type { SupportPathway, RiskTier, TherapeuticArea, DrugProduct } from '../types/index.js';
import { getBrandConfig, type BrandBackendConfig } from '../brands/index.js';

// ---------------------------------------------------------------------------
// Clinical Drug Product Profiles
// ---------------------------------------------------------------------------
// All clinical data below is FICTIONAL but plausible. These profiles are
// designed for demo purposes and do not represent real approved products.
// ---------------------------------------------------------------------------

export interface DrugProductProfile {
  genericName: string;
  brandName: string;
  mechanismOfAction: string;
  approvedIndication: string;
  therapeuticArea: TherapeuticArea;
  // Efficacy
  pivotalTrialName: string;
  primaryEndpoint: string;
  primaryResult: string;
  keySecondaryEndpoints: string[];
  responderRate: string;
  nnt: string;
  // Safety
  commonAEs: Array<{ event: string; incidence: string }>;
  seriousAEWarnings: string[];
  contraindications: string[];
  drugInteractions: string[];
  blackBoxWarning: string | null;
  // Dosing
  startingDose: string;
  titrationSchedule: string;
  maintenanceDose: string;
  maxDose: string;
  renalAdjustment: string;
  hepaticAdjustment: string;
  pediatricDosing: string | null;
  // Access
  specialtyPharmacyRequired: boolean;
  remsRequired: boolean;
  hubServiceName: string;
}

export const DRUG_PROFILES: Record<DrugProduct, DrugProductProfile> = {
  euloxacaltenamide: {
    genericName: 'Euloxacaltenamide',
    brandName: 'ELEX',
    mechanismOfAction:
      'Novel selective T-type calcium channel modulator (Cav3.1/Cav3.3) — first-in-class for essential tremor. ' +
      'Reduces oscillatory thalamocortical activity implicated in tremor generation without broad CNS depression.',
    approvedIndication: 'Treatment of essential tremor (ET) in adults',
    therapeuticArea: 'essential-tremor',

    // Efficacy
    pivotalTrialName: 'STEADY (Phase 3, N=412, randomized, double-blind, placebo-controlled, 24 weeks)',
    primaryEndpoint: 'Change from baseline in TETRAS Performance Subscale score at Week 24',
    primaryResult: '-4.2 points vs -1.8 placebo (p<0.001)',
    keySecondaryEndpoints: [
      'QUEST (Quality of Life in Essential Tremor) total score improvement: -12.6 vs -5.1 placebo (p<0.001)',
      'TETRAS Activities of Daily Living subscale: -3.1 vs -1.2 placebo (p<0.001)',
      'Clinician Global Impression of Change (CGI-C) responder rate: 68% vs 34% placebo',
      'Patient Global Impression of Change (PGI-C): 71% reported "much improved" or "very much improved" vs 29% placebo',
    ],
    responderRate: '62% achieved >=50% improvement on TETRAS-P vs 27% placebo',
    nnt: '3',

    // Safety
    commonAEs: [
      { event: 'Dizziness', incidence: '12%' },
      { event: 'Fatigue', incidence: '8%' },
      { event: 'Nausea', incidence: '6%' },
      { event: 'Headache', incidence: '5%' },
      { event: 'Somnolence', incidence: '4%' },
    ],
    seriousAEWarnings: [
      'Rare QTc prolongation (<1%) — ECG monitoring recommended at baseline and after dose adjustments',
      'Cases of syncope reported in patients with pre-existing cardiac conduction abnormalities',
    ],
    contraindications: [
      'Known hypersensitivity to euloxacaltenamide or any excipient',
      'Congenital long QT syndrome or baseline QTc >450 ms',
      'Concurrent use of strong CYP3A4 inhibitors (ketoconazole, itraconazole, clarithromycin, ritonavir)',
    ],
    drugInteractions: [
      'Strong CYP3A4 inhibitors: CONTRAINDICATED — increased ELEX exposure and QTc prolongation risk',
      'Moderate CYP3A4 inhibitors (fluconazole, erythromycin, diltiazem): reduce ELEX dose by 50%',
      'Strong CYP3A4 inducers (rifampin, phenytoin, carbamazepine): may reduce ELEX efficacy; dose adjustment may be needed',
      'QTc-prolonging agents: use with caution; additive QTc effect possible',
    ],
    blackBoxWarning: null,

    // Dosing
    startingDose: '25 mg orally once daily',
    titrationSchedule: 'Increase by 25 mg weekly as tolerated. Most patients reach therapeutic dose within 3-4 weeks.',
    maintenanceDose: '75-150 mg orally once daily',
    maxDose: '200 mg once daily',
    renalAdjustment: 'Reduce to 50% of target dose if CrCl <30 mL/min. No adjustment needed for CrCl >=30 mL/min.',
    hepaticAdjustment:
      'Mild (Child-Pugh A): no adjustment. Moderate (Child-Pugh B): reduce to 75% of target dose. ' +
      'Severe (Child-Pugh C): AVOID — not studied in severe hepatic impairment.',
    pediatricDosing: null, // Not indicated for pediatric use

    // Access
    specialtyPharmacyRequired: true,
    remsRequired: false,
    hubServiceName: 'PraxisConnect',
  },

  relutrigine: {
    genericName: 'Relutrigine',
    brandName: 'Relutrigine',
    mechanismOfAction:
      'Selective sodium channel modulator with preferential Nav1.6 inhibition — avoids Nav1.1 blockade. ' +
      'CRITICAL DISTINCTION: Traditional sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin, lamotrigine) ' +
      'are CONTRAINDICATED in Dravet syndrome because they further impair already-deficient Nav1.1 function in ' +
      'inhibitory interneurons. Relutrigine selectively targets Nav1.6 on excitatory neurons to reduce seizure ' +
      'propagation while preserving inhibitory interneuron function.',
    approvedIndication:
      'Treatment of seizures associated with Dravet syndrome and other developmental and epileptic encephalopathies (DEEs) ' +
      'in patients 2 years of age and older',
    therapeuticArea: 'dee-dravet',

    // Efficacy
    pivotalTrialName:
      'PROTECT (Phase 3, N=188, randomized, double-blind, placebo-controlled, 16-week treatment period + open-label extension)',
    primaryEndpoint: 'Median percent change in monthly convulsive seizure frequency vs placebo over the 16-week treatment period',
    primaryResult: '-48% vs -15% placebo (p<0.001)',
    keySecondaryEndpoints: [
      'Proportion achieving >=50% reduction in convulsive seizures: 54% vs 18% placebo (p<0.001)',
      'Seizure-free rate at 16 weeks: 28% vs 4% placebo (p<0.001)',
      'Reduction in status epilepticus episodes: 72% fewer events vs placebo',
      'Caregiver Global Impression of Change: 65% reported improvement vs 22% placebo',
      'Reduction in rescue medication use: -41% vs -8% placebo',
    ],
    responderRate: '54% achieved >=50% reduction in convulsive seizures; 28% achieved seizure freedom at 16 weeks vs 4% placebo',
    nnt: '4',

    // Safety
    commonAEs: [
      { event: 'Somnolence', incidence: '15%' },
      { event: 'Decreased appetite', incidence: '9%' },
      { event: 'Diarrhea', incidence: '7%' },
      { event: 'Pyrexia', incidence: '5%' },
      { event: 'Upper respiratory infection', incidence: '4%' },
    ],
    seriousAEWarnings: [
      'Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) reported in <0.5% of patients — requires immediate discontinuation',
      'Requires slow titration to minimize risk of serious dermatologic reactions',
      'Suicidal ideation monitoring per FDA anti-epileptic drug class labeling',
      'Status epilepticus reported during rapid dose changes — dose adjustments must follow prescribed titration schedule',
    ],
    contraindications: [
      'Known hypersensitivity to relutrigine or any excipient',
      'CRITICAL: Do NOT use in combination with traditional sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin, lamotrigine) in Dravet syndrome patients — may worsen seizures',
      'History of DRESS or Stevens-Johnson Syndrome with any anti-epileptic drug',
    ],
    drugInteractions: [
      'Traditional sodium channel blockers (carbamazepine, oxcarbazepine, phenytoin, lamotrigine): CONTRAINDICATED in Dravet syndrome — may exacerbate seizures via Nav1.1 inhibition',
      'Valproate: may increase relutrigine levels by 25-40%; monitor and consider dose reduction',
      'Stiripentol: additive somnolence; monitor closely when co-administered',
      'Strong CYP3A4 inducers: may reduce relutrigine exposure; dose adjustment may be needed',
    ],
    blackBoxWarning:
      'Suicidality Risk: Anti-epileptic drugs, including relutrigine, increase the risk of suicidal thoughts or behavior. ' +
      'Monitor patients for the emergence or worsening of depression, suicidal thoughts or behavior, and/or any unusual changes in mood or behavior.',

    // Dosing
    startingDose: '0.5 mg/kg/day divided BID (oral solution or dispersible tablet)',
    titrationSchedule:
      'Increase by 0.5 mg/kg/day every 2 weeks as tolerated. Target dose reached in approximately 6-8 weeks. ' +
      'SLOW TITRATION IS ESSENTIAL to minimize risk of DRESS and to monitor for seizure response.',
    maintenanceDose: '2-4 mg/kg/day divided BID',
    maxDose: '6 mg/kg/day (not to exceed 300 mg/day)',
    renalAdjustment: 'Mild-moderate renal impairment: no adjustment. Severe (CrCl <30 mL/min): reduce to 75% of target dose.',
    hepaticAdjustment:
      'Mild (Child-Pugh A): no adjustment. Moderate (Child-Pugh B): reduce to 50% of target dose and extend titration interval to every 3 weeks. ' +
      'Severe (Child-Pugh C): not recommended.',
    pediatricDosing:
      'Approved for patients >=2 years. Weight-based dosing: 0.5 mg/kg/day starting dose, titrate to 2-4 mg/kg/day. ' +
      'Oral solution (20 mg/mL) available for patients unable to swallow tablets. ' +
      'For patients <20 kg: use oral solution only. For patients >=20 kg: oral solution or dispersible tablet.',

    // Access
    specialtyPharmacyRequired: true,
    remsRequired: false, // No formal REMS, but enhanced safety monitoring program
    hubServiceName: 'PraxisConnect',
  },
};

// ---------------------------------------------------------------------------
// Dravet Syndrome Contraindicated Medications
// ---------------------------------------------------------------------------
// CRITICAL SAFETY REFERENCE: These medications are contraindicated in Dravet
// syndrome (SCN1A-related) because they block Nav1.1 sodium channels,
// further impairing already-deficient inhibitory interneuron function and
// potentially worsening seizures with adverse developmental consequences.
// ---------------------------------------------------------------------------

export interface ContraindicatedMedication {
  drug: string;
  reason: string;
}

export const DRAVET_CONTRAINDICATED_MEDICATIONS: ContraindicatedMedication[] = [
  {
    drug: 'Carbamazepine (Tegretol)',
    reason: 'Sodium channel blocker — may worsen seizures in SCN1A-related Dravet by further inhibiting Nav1.1 in inhibitory interneurons',
  },
  {
    drug: 'Oxcarbazepine (Trileptal)',
    reason: 'Sodium channel blocker — may worsen seizures in SCN1A-related Dravet by further inhibiting Nav1.1 in inhibitory interneurons',
  },
  {
    drug: 'Phenytoin (Dilantin)',
    reason: 'Sodium channel blocker — may worsen seizures in SCN1A-related Dravet by further inhibiting Nav1.1 in inhibitory interneurons',
  },
  {
    drug: 'Lamotrigine (Lamictal)',
    reason: 'Sodium channel blocker — may exacerbate seizures in some Dravet patients via Nav1.1 inhibition',
  },
  {
    drug: 'Rufinamide (Banzel)',
    reason: 'Sodium channel blocker — may worsen seizures in SCN1A-related Dravet by further inhibiting Nav1.1 in inhibitory interneurons',
  },
];

// ---------------------------------------------------------------------------
// Support Pathway Definitions
// ---------------------------------------------------------------------------

export interface SupportPathwayDefinition {
  id: SupportPathway;
  name: string;
  description: string;
  urgencyLevel: 'routine' | 'soon' | 'urgent';
  suggestedResources: string[];
  keyTalkingPoints: string[];
  escalationCriteria: string[];
}

export const SUPPORT_PATHWAYS: Record<SupportPathway, SupportPathwayDefinition> = {
  'medication-access': {
    id: 'medication-access',
    name: 'Medication Access & Reimbursement',
    description: 'Support for patients and HCPs navigating insurance coverage, prior authorizations, copay assistance, and specialty pharmacy fulfillment.',
    urgencyLevel: 'soon',
    suggestedResources: ['Hub Services', 'Field Reimbursement Manager', 'Specialty Pharmacy'],
    keyTalkingPoints: [
      'Our hub services team can initiate and track prior authorizations on your behalf.',
      'The Praxis copay assistance program may reduce your out-of-pocket cost to as low as $0 for eligible commercially insured patients.',
      'We work with specialty pharmacies nationwide to ensure timely delivery of your medication.',
      'If your insurance has denied coverage, our team can assist with the appeals process.',
      'Both ELEX and Relutrigine are dispensed exclusively through specialty pharmacies — PraxisConnect can coordinate fulfillment and shipment directly to your home.',
      'For Relutrigine (DEE/Dravet): our hub can coordinate benefits verification across both medical and pharmacy benefit channels, as pediatric specialty therapies may be covered under either.',
      'For ELEX (Essential Tremor): most commercial plans cover ELEX on specialty tier with prior authorization; our field reimbursement team can provide payer-specific guidance.',
    ],
    escalationCriteria: [
      'Prior authorization denied and patient is clinically urgent',
      'Patient unable to afford medication even with copay assistance',
      'Specialty pharmacy fulfillment delay exceeding 7 days',
      'Patient at risk of treatment interruption due to access barriers',
    ],
  },
  'safety-reporting': {
    id: 'safety-reporting',
    name: 'Safety & Adverse Event Reporting',
    description: 'Capture and escalation of adverse events, product quality complaints, and safety-related inquiries per FDA and Praxis pharmacovigilance requirements.',
    urgencyLevel: 'urgent',
    suggestedResources: ['Drug Safety / Pharmacovigilance', 'Medical Information', 'Nurse Educator'],
    keyTalkingPoints: [
      'Your safety is our top priority. I want to make sure we capture this information accurately.',
      'I\'ll need to ask you a few specific questions about what you experienced and when it started.',
      'This information will be reviewed by our medical safety team.',
      'If you are experiencing a medical emergency, please call 911 or go to your nearest emergency room.',
    ],
    escalationCriteria: [
      'Serious adverse event (hospitalization, life-threatening, disability, death)',
      'Any adverse event in a pregnant or nursing patient',
      'Product quality complaint with associated adverse event',
      'Suicidal ideation or self-harm reported (immediate crisis escalation)',
    ],
  },
  'clinical-education': {
    id: 'clinical-education',
    name: 'Clinical Education & Medical Information',
    description: 'Evidence-based clinical information for HCPs including mechanism of action, clinical trial data, dosing guidance, and peer-to-peer MSL discussions.',
    urgencyLevel: 'routine',
    suggestedResources: ['Medical Science Liaison', 'Medical Information', 'Speaker Programs'],
    keyTalkingPoints: [
      'Our Medical Science Liaison team is available for a peer-to-peer discussion on the clinical data.',
      'We can provide reprints of published clinical trial results and real-world evidence.',
      'Dosing and titration guidance is available in the full prescribing information.',
      'We have upcoming speaker programs and CME-accredited educational events.',
    ],
    escalationCriteria: [
      'HCP requesting off-label information (must route to Medical Information)',
      'HCP reporting unexpected clinical outcome',
      'Request for data not available in approved labeling',
      'Urgent dosing question requiring medical review',
    ],
  },
  'patient-education': {
    id: 'patient-education',
    name: 'Patient & Caregiver Education',
    description: 'Educational support for patients and caregivers on disease management, treatment expectations, titration schedules, and living with their condition.',
    urgencyLevel: 'routine',
    suggestedResources: ['Nurse Educator', 'Patient Advocacy Organizations', 'Digital Resources'],
    keyTalkingPoints: [
      'Our nurse educators can walk you through what to expect as you start treatment.',
      'We have patient-friendly materials about your condition and how your medication works.',
      'Understanding your titration schedule helps you get the most benefit from your treatment.',
      'Patient advocacy organizations like the Dravet Syndrome Foundation and IETF offer community support.',
      'For ELEX (Essential Tremor): tracking your tremor with the TETRAS scale helps your doctor assess whether your dose is optimized — we can show you how to self-monitor between visits.',
      'For Relutrigine (DEE/Dravet): keeping a daily seizure diary — including seizure type, duration, and any triggers — is essential for your care team to evaluate treatment response.',
      'For Relutrigine caregivers: we have resources on environmental trigger avoidance (heat, fever, overexertion), seizure action plans, and emergency rescue medication administration.',
    ],
    escalationCriteria: [
      'Patient expressing confusion about dosing that could lead to medication error',
      'Caregiver unable to manage treatment regimen',
      'Patient not understanding critical safety information',
      'Patient requesting information beyond approved patient labeling',
    ],
  },
  'adherence-support': {
    id: 'adherence-support',
    name: 'Adherence & Persistence Support',
    description: 'Proactive support to help patients stay on therapy, manage side effects, and maintain their treatment schedule.',
    urgencyLevel: 'soon',
    suggestedResources: ['Nurse Educator', 'Hub Services', 'Specialty Pharmacy'],
    keyTalkingPoints: [
      'Staying on your medication schedule is key to getting the best results from your treatment.',
      'If you\'re experiencing side effects, there are strategies that may help — let\'s talk about them.',
      'Our specialty pharmacy can set up automatic refill reminders so you never miss a dose.',
      'If cost is making it hard to stay on your medication, our copay program may be able to help.',
      'CRITICAL — For Relutrigine and all anti-epileptic drugs: do NOT stop taking your medication suddenly without talking to your doctor. Abrupt discontinuation of anti-epileptic drugs can cause rebound seizures, including status epilepticus, which can be life-threatening.',
      'For ELEX (Essential Tremor): if you miss a dose, take it as soon as you remember unless it is close to your next scheduled dose. Do not double up.',
      'For Relutrigine (DEE/Dravet): consistent twice-daily dosing is essential for maintaining steady drug levels and seizure control. Setting alarms or using a pill organizer can help caregivers manage the schedule.',
    ],
    escalationCriteria: [
      'Patient has missed more than 2 consecutive refills',
      'Patient reports intolerable side effects leading to discontinuation consideration',
      'Anti-epileptic drug patient at risk of abrupt discontinuation (seizure risk)',
      'Patient self-adjusting dose without physician guidance',
    ],
  },
  'crisis-support': {
    id: 'crisis-support',
    name: 'Crisis Intervention & Escalation',
    description: 'Immediate support for callers in acute distress, including suicidal ideation, severe adverse events, caregiver burnout crisis, or medical emergencies.',
    urgencyLevel: 'urgent',
    suggestedResources: ['988 Suicide & Crisis Lifeline', 'Drug Safety / Pharmacovigilance', 'Emergency Services'],
    keyTalkingPoints: [
      'I hear you, and I want to make sure you get the right help right now.',
      'If you or someone you know is in immediate danger, please call 911.',
      'The 988 Suicide and Crisis Lifeline is available 24/7 — you can call or text 988.',
      'I\'m going to connect you with someone who can help you right away.',
    ],
    escalationCriteria: [
      'Any mention of suicidal ideation, self-harm, or harm to others',
      'Caller reports active seizure or medical emergency',
      'Severe adverse event requiring immediate medical attention',
      'Caregiver in acute emotional crisis',
    ],
  },
};

// ---------------------------------------------------------------------------
// Pharma Contact Network (replaces Provider Network)
// ---------------------------------------------------------------------------

export interface ContactResource {
  name: string;
  type: string;
  phone: string;
  coverage: string;
  availability: string;
  capabilities: string[];
}

export interface ResourceCategory {
  category: string;
  resources: ContactResource[];
}

export const PHARMA_CONTACT_NETWORK: ResourceCategory[] = [
  {
    category: 'Specialty Pharmacy',
    resources: [
      {
        name: 'Praxis Specialty Pharmacy Hub — PraxisConnect',
        type: 'Hub Specialty Pharmacy',
        phone: '+18005550101',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–8pm ET, Sat 9am–3pm ET',
        capabilities: ['Prescription fulfillment', 'Refill management', 'Cold chain shipping', 'Patient counseling'],
      },
      {
        name: 'Accredo Specialty Pharmacy',
        type: 'Contracted Specialty Pharmacy',
        phone: '+18005550102',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–10pm ET, Sat 9am–5pm ET',
        capabilities: ['Specialty fulfillment', 'Prior auth support', 'Patient education', 'Financial assistance coordination'],
      },
      {
        name: 'CVS Specialty',
        type: 'Contracted Specialty Pharmacy',
        phone: '+18005550103',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–9pm ET, Sat 9am–5pm ET',
        capabilities: ['Specialty fulfillment', 'Adherence monitoring', 'Refill reminders', 'Clinical support'],
      },
    ],
  },
  {
    category: 'Hub Services',
    resources: [
      {
        name: 'PraxisConnect Patient Hub',
        type: 'Patient Services Hub',
        phone: '+18005550201',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–8pm ET',
        capabilities: ['Benefits verification', 'Prior authorization', 'Copay assistance enrollment', 'Appeal support', 'Patient onboarding'],
      },
      {
        name: 'PraxisConnect HCP Portal Support',
        type: 'HCP Services Hub',
        phone: '+18005550202',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–6pm ET',
        capabilities: ['Enrollment processing', 'Sample request fulfillment', 'Reimbursement guidance', 'Formulary status lookup'],
      },
    ],
  },
  {
    category: 'Medical Science Liaisons',
    resources: [
      {
        name: 'Dr. Rebecca Torres, PharmD — Neurology MSL (Northeast)',
        type: 'Medical Science Liaison',
        phone: '+16175550301',
        coverage: 'Northeast US',
        availability: 'Mon–Fri 9am–6pm ET',
        capabilities: ['Peer-to-peer scientific exchange', 'Clinical data presentation', 'KOL engagement', 'Investigator-initiated trial support'],
      },
      {
        name: 'Dr. David Chen, PhD — Neurology MSL (West)',
        type: 'Medical Science Liaison',
        phone: '+14155550302',
        coverage: 'Western US',
        availability: 'Mon–Fri 9am–6pm PT',
        capabilities: ['Peer-to-peer scientific exchange', 'Clinical data presentation', 'Advisory board coordination', 'Conference follow-up'],
      },
      {
        name: 'Dr. Aisha Patel, MD — Neurology MSL (Central)',
        type: 'Medical Science Liaison',
        phone: '+13125550303',
        coverage: 'Central US',
        availability: 'Mon–Fri 9am–6pm CT',
        capabilities: ['Peer-to-peer scientific exchange', 'Clinical data presentation', 'Speaker program coordination', 'Publication support'],
      },
    ],
  },
  {
    category: 'Nurse Educators',
    resources: [
      {
        name: 'Sarah Mitchell, RN — ET Nurse Educator',
        type: 'Nurse Educator',
        phone: '+18005550401',
        coverage: 'Nationwide (phone/video)',
        availability: 'Mon–Fri 9am–5pm ET',
        capabilities: ['Patient onboarding education', 'Titration coaching', 'Side effect management', 'Adherence counseling', 'Caregiver support'],
      },
      {
        name: 'Marcus Johnson, RN — DEE Nurse Educator',
        type: 'Nurse Educator',
        phone: '+18005550402',
        coverage: 'Nationwide (phone/video)',
        availability: 'Mon–Fri 9am–5pm ET',
        capabilities: ['Patient/caregiver education', 'Seizure management guidance', 'Titration support', 'Emergency action planning', 'Emotional support'],
      },
      {
        name: 'Praxis Nurse Educator Triage Line',
        type: 'Nurse Triage',
        phone: '+18005550403',
        coverage: 'Nationwide',
        availability: 'Mon–Sat 8am–8pm ET',
        capabilities: ['Clinical triage', 'AE assessment', 'Urgent escalation', 'Provider communication'],
      },
    ],
  },
  {
    category: 'Field Reimbursement',
    resources: [
      {
        name: 'Praxis Field Reimbursement Team',
        type: 'Field Reimbursement Manager',
        phone: '+18005550501',
        coverage: 'Nationwide',
        availability: 'Mon–Fri 8am–6pm ET',
        capabilities: ['Payer-specific coverage guidance', 'Prior auth strategy', 'Appeals support', 'Buy-and-bill assistance', 'Benefit investigation'],
      },
    ],
  },
  {
    category: 'Drug Safety',
    resources: [
      {
        name: 'Praxis Drug Safety / Pharmacovigilance',
        type: 'Pharmacovigilance',
        phone: '+18005550601',
        coverage: 'Nationwide',
        availability: '24/7',
        capabilities: ['Adverse event intake', 'Safety assessment', 'FDA MedWatch reporting', 'Product quality complaints', 'Pregnancy registry'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Brand-aware accessors
// ---------------------------------------------------------------------------
// These functions derive drug profiles, support pathways, and contact network
// from the active BrandBackendConfig. The hardcoded constants above remain
// exported for backward compatibility (they match the Praxis default).
// ---------------------------------------------------------------------------

/**
 * Format a brand-config drug profile into the richer DrugProductProfile shape
 * used by the legacy DRUG_PROFILES constant. For fields not present in the
 * brand config, sensible defaults are provided.
 */
export function formatDrugProfile(
  bp: BrandBackendConfig['drugProfiles'][number],
  hubName: string,
): DrugProductProfile {
  return {
    genericName: bp.genericName,
    brandName: bp.brandName,
    mechanismOfAction: bp.moa,
    approvedIndication: bp.indication,
    therapeuticArea: bp.therapeuticArea as TherapeuticArea,
    pivotalTrialName: bp.trialData?.split(':')[0] ?? '',
    primaryEndpoint: '',
    primaryResult: bp.trialData ?? '',
    keySecondaryEndpoints: [],
    responderRate: '',
    nnt: '',
    commonAEs: bp.commonAEs.map((ae) => {
      const match = ae.match(/^(.+?)\s*\((\d+%)\)$/);
      return match
        ? { event: match[1], incidence: match[2] }
        : { event: ae, incidence: '' };
    }),
    seriousAEWarnings: bp.seriousAEs,
    contraindications: [],
    drugInteractions: [],
    blackBoxWarning: bp.boxWarning ?? null,
    startingDose: bp.dosing.split(',')[0] ?? bp.dosing,
    titrationSchedule: '',
    maintenanceDose: bp.dosing,
    maxDose: '',
    renalAdjustment: '',
    hepaticAdjustment: '',
    pediatricDosing: null,
    specialtyPharmacyRequired: true,
    remsRequired: false,
    hubServiceName: hubName,
  };
}

/** Return drug profiles derived from the brand config. */
export function getDrugProfiles(
  config?: BrandBackendConfig,
): Record<string, DrugProductProfile> {
  const cfg = config ?? getBrandConfig();
  // If the caller is using the default Praxis brand, return the richer
  // hardcoded profiles which contain full clinical detail.
  if (cfg.id === 'praxis') return DRUG_PROFILES;
  const result: Record<string, DrugProductProfile> = {};
  for (const dp of cfg.drugProfiles) {
    result[dp.id] = formatDrugProfile(dp, cfg.hubName);
  }
  return result;
}

/** Return support pathways derived from the brand config. */
export function getSupportPathways(
  config?: BrandBackendConfig,
): Record<string, SupportPathwayDefinition> {
  const cfg = config ?? getBrandConfig();
  // If the caller is using the default Praxis brand, return the rich
  // hardcoded pathways which include talking points and escalation criteria.
  if (cfg.id === 'praxis') return SUPPORT_PATHWAYS;
  const result: Record<string, SupportPathwayDefinition> = {};
  for (const sp of cfg.supportPathways) {
    result[sp.id as SupportPathway] = {
      id: sp.id as SupportPathway,
      name: sp.label,
      description: sp.description,
      urgencyLevel: 'routine',
      suggestedResources: [],
      keyTalkingPoints: [],
      escalationCriteria: [],
    };
  }
  return result;
}

/** Return contact network derived from the brand config. */
export function getContactNetwork(
  config?: BrandBackendConfig,
): ResourceCategory[] {
  const cfg = config ?? getBrandConfig();
  // If the caller is using the default Praxis brand, return the rich
  // hardcoded contact network with full availability and capability data.
  if (cfg.id === 'praxis') return PHARMA_CONTACT_NETWORK;
  // Group contacts by role
  const roleMap = new Map<string, ContactResource[]>();
  for (const c of cfg.contactNetwork) {
    const category = c.role;
    if (!roleMap.has(category)) roleMap.set(category, []);
    roleMap.get(category)!.push({
      name: c.name,
      type: c.role,
      phone: c.phone ?? '',
      coverage: c.territory ?? 'Nationwide',
      availability: '',
      capabilities: [],
    });
  }
  return Array.from(roleMap.entries()).map(([category, resources]) => ({
    category,
    resources,
  }));
}

// ---------------------------------------------------------------------------
// Contact Communication Preferences by Risk Tier
// ---------------------------------------------------------------------------

export interface RiskTierCommunicationPrefs {
  maxCallAttempts: number;
  callbackWindowHours: number;
  smsEnabled: boolean;
  escalateToNurseOnNoAnswer: boolean;
  followUpDays: number;
}

export const RISK_TIER_PREFS: Record<RiskTier, RiskTierCommunicationPrefs> = {
  HIGH: {
    maxCallAttempts: 5,
    callbackWindowHours: 24,
    smsEnabled: true,
    escalateToNurseOnNoAnswer: true,
    followUpDays: 1,
  },
  MEDIUM: {
    maxCallAttempts: 3,
    callbackWindowHours: 48,
    smsEnabled: true,
    escalateToNurseOnNoAnswer: false,
    followUpDays: 3,
  },
  LOW: {
    maxCallAttempts: 2,
    callbackWindowHours: 72,
    smsEnabled: true,
    escalateToNurseOnNoAnswer: false,
    followUpDays: 7,
  },
};

// ---------------------------------------------------------------------------
// Engagement Label Definitions (for contact context)
// ---------------------------------------------------------------------------

export const ENGAGEMENT_LABELS: Record<string, string> = {
  'new-start': 'New Patient Start',
  'titration-phase': 'Active Titration Phase',
  'maintenance-therapy': 'Maintenance Therapy',
  'refill-overdue': 'Refill Overdue',
  'prior-auth-pending': 'Prior Authorization Pending',
  'prior-auth-denied': 'Prior Authorization Denied',
  'copay-enrolled': 'Copay Assistance Enrolled',
  'hub-enrolled': 'Hub Services Enrolled',
  'ae-history': 'Adverse Event History',
  'high-prescriber': 'High-Volume Prescriber',
  'speaker-program': 'Speaker Program Participant',
  'kol-target': 'Key Opinion Leader Target',
};
