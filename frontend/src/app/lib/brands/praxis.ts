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
      therapeuticArea: 'dee',
      therapeuticAreaLabel: 'DEE (Dravet Epilepsy)',
      indication: 'Treatment of seizures associated with Dravet syndrome',
    },
  ],

  therapeuticAreas: [
    { id: 'essential-tremor', label: 'Essential Tremor (ET)' },
    { id: 'dee', label: 'DEE (Dravet Epilepsy)' },
  ],

  supportPathways: [
    { id: 'hub-enrollment', label: 'Hub Enrollment', color: '#00B9CE' },
    { id: 'copay-assistance', label: 'Copay Assistance', color: '#2C59AB' },
    { id: 'ae-reporting', label: 'AE Reporting', color: '#FF7D78' },
    { id: 'adherence-support', label: 'Adherence Support', color: '#EFBC66' },
    { id: 'sample-request', label: 'Sample Request', color: '#DE7D00' },
    { id: 'medical-inquiry', label: 'Medical Inquiry', color: '#485D61' },
  ],

  hubName: 'PraxisConnect',

  agentPersonas: [
    {
      agentType: 'patient-support',
      name: 'Emma',
      greeting:
        "Hi {contactName}, this is Emma from Praxis patient support. I'm here to help you with your therapy.",
      description: 'Inbound/outbound patient hub services, copay, adherence, AE capture',
    },
    {
      agentType: 'hcp-support',
      name: 'Marcus',
      greeting:
        'Good day, Dr. {contactName}. This is Marcus from Praxis Medical Information. How can I assist you today?',
      description: 'Inbound HCP medical information, samples, formulary questions',
    },
    {
      agentType: 'hcp-outbound',
      name: 'Rachel',
      greeting:
        "Hi Dr. {contactName}, this is Rachel from Praxis BioSciences. I'm reaching out to share some updates on our neurology portfolio.",
      description: 'Proactive HCP engagement, detail calls, competitive intelligence',
    },
    {
      agentType: 'medcomms-qa',
      name: 'Compliance',
      greeting:
        'This is the Praxis MedComms QA review system. Analyzing interaction transcript for compliance.',
      description: 'Medical communications review, off-label monitoring, compliance checks',
    },
  ],

  outcomeLabels: {
    'hub-enrolled': 'Hub Enrolled',
    'copay-card-issued': 'Copay Card Issued',
    'ae-report-filed': 'AE Report Filed',
    'adherence-counseling': 'Adherence Counseling',
    'sample-shipped': 'Sample Shipped',
    'medical-info-provided': 'Medical Info Provided',
    'hcp-detail-completed': 'HCP Detail Completed',
    'prior-auth-initiated': 'Prior Auth Initiated',
    'callback-requested': 'Callback Requested',
    'follow-up-scheduled': 'Follow-Up Scheduled',
    'declined': 'Declined',
    'no-answer': 'No Answer',
    'voicemail': 'Voicemail Left',
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
