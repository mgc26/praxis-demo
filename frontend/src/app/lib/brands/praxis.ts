import type { BrandPack } from './index';

export const praxisBrand: BrandPack = {
  id: 'praxis',
  companyName: 'Praxis Precision Medicines',
  shortName: 'Praxis',
  tagline: 'DARE FOR MORE\u00AE',
  website: 'https://praxismedicines.com',
  logoAsset: '/brand-assets/praxis/logo-primary.svg',
  theme: {
    colors: {
      primary: '#00B9CE',
      primaryDark: '#009AAD',
      primaryLight: '#25C8D9',
      secondary: '#485D61',
      accent: '#DE7D00',
      accent2: '#EFBC66',
      accent3: '#FF7D78',
      info: '#2C59AB',
      surface: '#F5F5F5',
      border: '#E2E7EA',
      textPrimary: '#000000',
      textSecondary: '#485D61',
      background: '#FFFFFF',
    },
    fonts: { heading: 'Roboto', body: 'Roboto' },
    radius: '0px',
    shadow: '0 1px 3px rgba(0,0,0,0.06)',
    buttonStyle: 'solid',
  },

  // -- Phase 2: Product content -----------------------------------------------

  products: [
    {
      id: 'euloxacaltenamide',
      brandName: 'ELEX',
      genericName: 'Euloxacaltenamide',
      therapeuticArea: 'essential-tremor',
      therapeuticAreaLabel: 'Essential Tremor (ET)',
      indication: 'Treatment of essential tremor in adults',
    },
    {
      id: 'relutrigine',
      brandName: 'Relutrigine',
      genericName: 'Relutrigine',
      therapeuticArea: 'dee-dravet',
      therapeuticAreaLabel: 'DEE (Dravet Epilepsy)',
      indication: 'Treatment of seizures associated with Dravet syndrome',
    },
  ],

  therapeuticAreas: [
    { id: 'essential-tremor', label: 'Essential Tremor (ET)' },
    { id: 'dee-dravet', label: 'DEE (Dravet Epilepsy)' },
  ],

  supportPathways: [
    { id: 'medication-access', label: 'Medication Access & Reimbursement', color: '#00B9CE' },
    { id: 'safety-reporting', label: 'Safety & Adverse Event Reporting', color: '#FF7D78' },
    { id: 'clinical-education', label: 'Clinical Education & Medical Information', color: '#2C59AB' },
    { id: 'patient-education', label: 'Patient & Caregiver Education', color: '#EFBC66' },
    { id: 'adherence-support', label: 'Adherence & Persistence Support', color: '#DE7D00' },
    { id: 'nurse-educator', label: 'Nurse Educator Coordination', color: '#485D61' },
  ],

  hubName: 'PraxisConnect',

  agentPersonas: [
    {
      agentType: 'patient-support',
      name: 'Emma',
      greeting:
        'Hi, this is Emma calling from Praxis Patient Support.',
      description: 'Inbound/outbound patient hub services, copay, adherence, AE capture',
    },
    {
      agentType: 'hcp-support',
      name: 'Aria',
      greeting:
        'Hello, this is the Praxis Medical Information line. Thank you for calling.',
      description: 'Inbound HCP medical information, samples, formulary questions',
    },
    {
      agentType: 'hcp-outbound',
      name: 'Marcus',
      greeting:
        'Hello, this is Emma from Praxis BioSciences.',
      description: 'Proactive HCP engagement, detail calls, competitive intelligence',
    },
    {
      agentType: 'medcomms-qa',
      name: 'Rachel',
      greeting:
        'Thank you for contacting Praxis BioSciences Medical Information.',
      description: 'Medical communications review, off-label monitoring, compliance checks',
    },
  ],

  outcomeLabels: {
    'ae-reported': 'Adverse Event Reported',
    'ae-escalated': 'Adverse Event Escalated',
    'medical-info-provided': 'Medical Info Provided',
    'sample-request': 'Sample Request',
    'copay-card-issued': 'Copay Card Issued',
    'hub-enrollment': 'Hub Enrollment',
    'prior-auth-assist': 'Prior Auth Assistance',
    'nurse-educator-referral': 'Nurse Educator Referral',
    'speaker-program-interest': 'Speaker Program Interest',
    'appointment-scheduled': 'Appointment Scheduled',
    'information-provided': 'Information Provided',
    'callback-requested': 'Callback Requested',
    'declined': 'Declined',
    'no-answer': 'No Answer',
    'voicemail': 'Voicemail Left',
    'crisis-escalation': 'Crisis Escalation',
  },

  demoScenarios: [
    {
      agentType: 'patient-support',
      label: 'Hub Enrollment',
      description: 'New patient enrolling in PraxisConnect for ELEX',
    },
    {
      agentType: 'patient-support',
      label: 'Copay Card Activation',
      description: 'Patient activating copay assistance for Relutrigine',
    },
    {
      agentType: 'patient-support',
      label: 'AE Report',
      description: 'Patient reports adverse event during adherence check-in',
    },
    {
      agentType: 'patient-support',
      label: 'Adherence Check-in',
      description: 'Proactive adherence support call for ELEX patient',
    },
    {
      agentType: 'hcp-support',
      label: 'Medical Inquiry',
      description: 'Neurologist requesting ELEX clinical trial data',
    },
    {
      agentType: 'hcp-support',
      label: 'Sample Request',
      description: 'Movement disorder specialist requesting ELEX samples',
    },
    {
      agentType: 'hcp-support',
      label: 'Formulary Support',
      description: 'HCP needs prior auth support for Relutrigine',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Product Detail',
      description: 'Proactive ELEX detail call to neurologist',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Switch Opportunity',
      description: 'Competitive switch discussion for ET patients',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Launch Update',
      description: 'Relutrigine launch update to epileptologist',
    },
    {
      agentType: 'medcomms-qa',
      label: 'Transcript Review',
      description: 'QA review of patient support interaction',
    },
    {
      agentType: 'medcomms-qa',
      label: 'Off-Label Check',
      description: 'Off-label mention detection in HCP call',
    },
    {
      agentType: 'medcomms-qa',
      label: 'AE Audit',
      description: 'Audit AE capture completeness across interactions',
    },
  ],
};
