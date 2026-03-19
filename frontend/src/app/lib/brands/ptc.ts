import type { BrandPack } from './index';

export const ptcBrand: BrandPack = {
  id: 'ptc',
  companyName: 'PTC Therapeutics',
  shortName: 'PTC',
  tagline: 'Translating Science. Transforming Lives.',
  website: 'https://www.ptcbio.com',
  logoAsset: '/brand-assets/ptc/logo-primary.png',
  theme: {
    colors: {
      primary: '#231D35',
      primaryDark: '#1a1528',
      primaryLight: '#38518F',
      secondary: '#38518F',
      accent: '#D34531',
      accent2: '#4BC1E1',
      accent3: '#EE7624',
      info: '#5C0F8C',
      surface: '#EAEDF4',
      border: '#A8A8AA',
      textPrimary: '#231D35',
      textSecondary: '#A8A8AA',
      background: '#FFFFFF',
    },
    fonts: { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    radius: '11px',
    shadow: 'none',
    buttonStyle: 'solid',
  },

  // -- Phase 2: Product content -----------------------------------------------

  products: [
    {
      id: 'sepiapterin',
      brandName: 'Sephience',
      genericName: 'Sepiapterin',
      therapeuticArea: 'pku',
      therapeuticAreaLabel: 'PKU (Phenylketonuria)',
      indication:
        'Treatment of hyperphenylalaninemia in sepiapterin-responsive PKU',
    },
    {
      id: 'deflazacort',
      brandName: 'Emflaza',
      genericName: 'Deflazacort',
      therapeuticArea: 'dmd',
      therapeuticAreaLabel: 'DMD (Duchenne Muscular Dystrophy)',
      indication:
        'Treatment of Duchenne muscular dystrophy in patients 2 years and older',
    },
  ],

  therapeuticAreas: [
    { id: 'pku', label: 'PKU (Phenylketonuria)' },
    { id: 'dmd', label: 'DMD (Duchenne Muscular Dystrophy)' },
  ],

  supportPathways: [
    { id: 'hub-enrollment', label: 'PTC Cares', color: '#231D35' },
    { id: 'copay-assistance', label: 'Copay Assistance', color: '#38518F' },
    { id: 'ae-reporting', label: 'AE Reporting', color: '#D34531' },
    { id: 'adherence-support', label: 'Adherence Support', color: '#4BC1E1' },
    { id: 'genetic-testing-referral', label: 'Genetic Testing Referral', color: '#5C0F8C' },
    { id: 'medical-inquiry', label: 'Medical Inquiry', color: '#EE7624' },
  ],

  hubName: 'PTC Cares',

  agentPersonas: [
    {
      agentType: 'patient-support',
      name: 'Hannah',
      greeting:
        'Hi, this is Hannah calling from PTC Cares. How can I help you today?',
      description: 'Inbound/outbound patient hub services, copay, adherence, AE capture',
    },
    {
      agentType: 'hcp-support',
      name: 'Thomas',
      greeting:
        'Hello, this is the PTC Therapeutics Medical Information line. Thank you for calling.',
      description: 'Inbound HCP medical information, samples, formulary questions',
    },
    {
      agentType: 'hcp-outbound',
      name: 'Melissa',
      greeting:
        'Hello, this is Melissa from PTC Therapeutics. I appreciate you taking my call.',
      description: 'Proactive HCP engagement, detail calls, competitive intelligence',
    },
    {
      agentType: 'medcomms-qa',
      name: 'Daniel',
      greeting:
        'Thank you for contacting PTC Therapeutics Medical Communications.',
      description: 'Medical communications review, off-label monitoring, compliance checks',
    },
  ],

  outcomeLabels: {
    'ae-reported': 'Adverse Event Reported',
    'ae-escalated': 'Adverse Event Escalated',
    'medical-info-provided': 'Medical Info Provided',
    'sample-request': 'Sample Request',
    'copay-card-issued': 'Copay Card Activated',
    'hub-enrollment': 'PTC Cares Enrolled',
    'prior-auth-assist': 'Prior Auth Assistance',
    'nurse-educator-referral': 'Case Manager Referral',
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
      description: 'New patient enrolling in PTC Cares for Sephience',
    },
    {
      agentType: 'patient-support',
      label: 'Copay Card Activation',
      description: 'Patient activating copay assistance for Emflaza',
    },
    {
      agentType: 'patient-support',
      label: 'AE Report',
      description: 'Patient reports adverse event during Sephience adherence check-in',
    },
    {
      agentType: 'patient-support',
      label: 'Adherence Check-in',
      description: 'Proactive adherence support call for Emflaza patient',
    },
    {
      agentType: 'hcp-support',
      label: 'Medical Inquiry',
      description: 'Metabolic specialist requesting Sephience clinical trial data',
    },
    {
      agentType: 'hcp-support',
      label: 'Genetic Testing Referral',
      description: 'HCP requesting genetic testing referral for suspected PKU patient',
    },
    {
      agentType: 'hcp-support',
      label: 'Formulary Support',
      description: 'HCP needs prior auth support for Emflaza',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Product Detail',
      description: 'Proactive Sephience detail call to metabolic specialist',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Switch Opportunity',
      description: 'Competitive switch discussion for PKU patients on dietary management',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Launch Update',
      description: 'Emflaza label update to pediatric neurologist',
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
