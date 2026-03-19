import type { BrandPack } from './index';

export const amgenBrand: BrandPack = {
  id: 'amgen',
  companyName: 'Amgen',
  shortName: 'Amgen',
  tagline: 'To serve patients',
  website: 'https://www.amgen.com',
  logoAsset: '/brand-assets/amgen/logo-primary.svg',
  theme: {
    colors: {
      primary: '#0063C3',
      primaryDark: '#1A3856',
      primaryLight: '#0675E0',
      secondary: '#1A3856',
      accent: '#EE7624',
      accent2: '#88C765',
      accent3: '#F9A05E',
      info: '#0675E0',
      surface: '#EDF2F7',
      border: '#D7D7D7',
      textPrimary: '#032E44',
      textSecondary: '#545255',
      background: '#FFFFFF',
    },
    fonts: { heading: 'Poppins', body: 'Poppins' },
    radius: '1px',
    shadow: 'none',
    buttonStyle: 'gradient',
    buttonGradient: 'linear-gradient(to right, #0063C3, #0675E0)',
  },

  // -- Phase 2: Product content -----------------------------------------------

  products: [
    {
      id: 'evolocumab',
      brandName: 'Repatha',
      genericName: 'Evolocumab',
      therapeuticArea: 'cardiovascular',
      therapeuticAreaLabel: 'Cardiovascular (ASCVD)',
      indication:
        'Treatment of adults with established ASCVD to reduce risk of MI, stroke, and coronary revascularization',
    },
    {
      id: 'tezepelumab',
      brandName: 'TEZSPIRE',
      genericName: 'Tezepelumab',
      therapeuticArea: 'severe-asthma',
      therapeuticAreaLabel: 'Severe Asthma',
      indication:
        'Add-on maintenance treatment of adult and pediatric patients with severe asthma',
    },
  ],

  therapeuticAreas: [
    { id: 'cardiovascular', label: 'Cardiovascular (ASCVD)' },
    { id: 'severe-asthma', label: 'Severe Asthma' },
  ],

  supportPathways: [
    { id: 'hub-enrollment', label: 'Amgen SupportPlus', color: '#0063C3' },
    { id: 'copay-assistance', label: 'FIRST STEP', color: '#0675E0' },
    { id: 'ae-reporting', label: 'AE Reporting', color: '#EE7624' },
    { id: 'adherence-support', label: 'Adherence Support', color: '#88C765' },
    { id: 'sample-request', label: 'Sample Request', color: '#F9A05E' },
    { id: 'medical-inquiry', label: 'Medical Inquiry', color: '#1A3856' },
  ],

  hubName: 'Amgen SupportPlus',

  agentPersonas: [
    {
      agentType: 'patient-support',
      name: 'Sarah',
      greeting:
        'Hi, this is Sarah calling from Amgen SupportPlus. How can I help you today?',
      description: 'Inbound/outbound patient hub services, copay, adherence, AE capture',
    },
    {
      agentType: 'hcp-support',
      name: 'David',
      greeting:
        'Hello, this is the Amgen Medical Information line. Thank you for calling.',
      description: 'Inbound HCP medical information, samples, formulary questions',
    },
    {
      agentType: 'hcp-outbound',
      name: 'Jennifer',
      greeting:
        'Hello, this is Jennifer from Amgen. I appreciate you taking my call.',
      description: 'Proactive HCP engagement, detail calls, competitive intelligence',
    },
    {
      agentType: 'medcomms-qa',
      name: 'Michael',
      greeting:
        'Thank you for contacting Amgen Medical Communications.',
      description: 'Medical communications review, off-label monitoring, compliance checks',
    },
  ],

  outcomeLabels: {
    'ae-reported': 'Adverse Event Reported',
    'ae-escalated': 'Adverse Event Escalated',
    'medical-info-provided': 'Medical Info Provided',
    'sample-request': 'Sample Request',
    'copay-card-issued': 'FIRST STEP Activated',
    'hub-enrollment': 'SupportPlus Enrolled',
    'prior-auth-assist': 'Prior Auth Assistance',
    'nurse-educator-referral': 'Nurse Ambassador Referral',
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
      description: 'New patient enrolling in Amgen SupportPlus for Repatha',
    },
    {
      agentType: 'patient-support',
      label: 'Copay Card Activation',
      description: 'Patient activating FIRST STEP copay assistance for TEZSPIRE',
    },
    {
      agentType: 'patient-support',
      label: 'AE Report',
      description: 'Patient reports adverse event during Repatha adherence check-in',
    },
    {
      agentType: 'patient-support',
      label: 'Adherence Check-in',
      description: 'Proactive adherence support call for Repatha patient',
    },
    {
      agentType: 'hcp-support',
      label: 'Medical Inquiry',
      description: 'Cardiologist requesting Repatha FOURIER trial data',
    },
    {
      agentType: 'hcp-support',
      label: 'Sample Request',
      description: 'Pulmonologist requesting TEZSPIRE samples',
    },
    {
      agentType: 'hcp-support',
      label: 'Formulary Support',
      description: 'HCP needs prior auth support for TEZSPIRE',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Product Detail',
      description: 'Proactive Repatha detail call to cardiologist',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Switch Opportunity',
      description: 'Competitive switch discussion for ASCVD patients on PCSK9 alternatives',
    },
    {
      agentType: 'hcp-outbound',
      label: 'Launch Update',
      description: 'TEZSPIRE label expansion update to allergist',
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
