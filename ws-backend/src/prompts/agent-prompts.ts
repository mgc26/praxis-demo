// ---------------------------------------------------------------------------
// Vi Agent Prompt Factory
// Dispatches to the correct agent prompt builder based on agentType.
// All functions accept an optional BrandBackendConfig — defaults to the
// active brand (Praxis) for backward compatibility.
// ---------------------------------------------------------------------------

import type { ContactRecord, RecommendedScreening } from '../types/index.js';
import type { BrandBackendConfig } from '../brands/index.js';
import { getBrandConfig } from '../brands/index.js';
import { buildPatientSupportPrompt } from './agents/patient-support.js';
import { buildHcpSupportPrompt } from './agents/hcp-support.js';
import { buildHcpOutboundPrompt } from './agents/hcp-outbound.js';
import { buildMedcommsQaPrompt } from './agents/medcomms-qa.js';

export interface AgentPromptData {
  contact: ContactRecord;
  answeredBy?: string | null;
  recommendedScreenings?: RecommendedScreening[];
}

// ---------------------------------------------------------------------------
// Main prompt dispatcher — routes to the correct agent builder
// ---------------------------------------------------------------------------

export function buildAgentPrompt(data: AgentPromptData, config: BrandBackendConfig = getBrandConfig()): string {
  const { contact } = data;

  switch (contact.agentType) {
    case 'patient-support':
      return buildPatientSupportPrompt(data, config);
    case 'hcp-support':
      return buildHcpSupportPrompt(data, config);
    case 'hcp-outbound':
      return buildHcpOutboundPrompt(data, config);
    case 'medcomms-qa':
      return buildMedcommsQaPrompt(data, config);
    default: {
      const _exhaustive: never = contact.agentType;
      throw new Error(`Unknown agent type: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a short drug display name (brand only) from the brand config. */
export function resolveDrugBrandName(drugId: string | undefined | null, config: BrandBackendConfig): string | null {
  if (!drugId) return null;
  const profile = config.drugProfiles.find((d) => d.id === drugId);
  return profile ? profile.brandName : null;
}

/** Resolve a full drug display name ("GenericName (BrandName)") from the brand config. */
export function resolveDrugFullName(drugId: string | undefined | null, config: BrandBackendConfig): string | null {
  if (!drugId) return null;
  const profile = config.drugProfiles.find((d) => d.id === drugId);
  if (!profile) return null;
  return profile.genericName === profile.brandName
    ? profile.brandName
    : `${profile.genericName} (${profile.brandName})`;
}

/** Resolve TA short display label.
 *  Accepts an optional BrandBackendConfig — when provided, verifies the TA
 *  exists in the brand's drug profiles (future-proofing).  Falls back to a
 *  known-labels map and ultimately to a title-case conversion of the slug so
 *  new brands / TAs work without code changes.
 */
export function resolveTaShort(ta: string, _config?: BrandBackendConfig): string {
  // Known display labels — covers all current brands
  const KNOWN_LABELS: Record<string, string> = {
    'essential-tremor': 'Essential Tremor',
    'dee-dravet': 'DEE / Dravet Syndrome',
    'cardiovascular': 'Cardiovascular',
    'severe-asthma': 'Severe Asthma',
    'pku': 'PKU',
    'dmd': 'DMD / Duchenne Muscular Dystrophy',
  };

  return KNOWN_LABELS[ta] ?? titleCaseSlug(ta);
}

/** Convert a kebab-case slug to Title Case (e.g. "severe-asthma" → "Severe Asthma"). */
function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Greeting builder — adapts opening based on agent type and contact context
// ---------------------------------------------------------------------------

export function buildAgentGreeting(contact: ContactRecord, config: BrandBackendConfig = getBrandConfig()): string {
  const firstName = (contact.name || '').split(' ')[0] || 'there';
  const title = contact.contactType === 'hcp' ? 'Dr. ' : '';
  const lastName = (contact.name || '').split(' ').slice(-1)[0] || 'there';

  const taShort = resolveTaShort(contact.therapeuticArea, config);

  const drugName = resolveDrugBrandName(contact.currentDrug, config);

  const patientAgent = config.agentPersonas['patient-support']?.name ?? 'Support';
  const outboundAgent = config.agentPersonas['hcp-outbound']?.name ?? 'Support';

  const hasCaregiverDistress = contact.behavioralSignals.some(
    (s) => s.category === 'CAREGIVER_DISTRESS',
  );
  const hasAdherenceGap = contact.behavioralSignals.some(
    (s) => s.category === 'ADHERENCE_GAP',
  );
  const hasCompetitorResearch = contact.behavioralSignals.some(
    (s) => s.category === 'COMPETITOR_RESEARCH',
  );
  const hasFormularyLookup = contact.behavioralSignals.some(
    (s) => s.category === 'FORMULARY_LOOKUP',
  );
  const hasConferenceActivity = contact.behavioralSignals.some(
    (s) => s.category === 'CONFERENCE_ACTIVITY',
  );
  const isHighRisk = contact.riskTier === 'HIGH';

  switch (contact.agentType) {
    case 'patient-support': {
      if (contact.contactType === 'caregiver' && hasCaregiverDistress) {
        return `Hi ${firstName}, this is ${patientAgent} calling from ${config.shortName} Patient Support. I'm one of the patient support coordinators here, and I wanted to personally check in to see how you and your family are doing. Do you have just a couple minutes?`;
      }

      if (hasAdherenceGap) {
        return `Hi ${firstName}, this is ${patientAgent} calling from ${config.shortName} Patient Support. I'm reaching out because I wanted to make sure you have everything you need to stay on track with your ${drugName ?? 'treatment'}. Do you have just a couple minutes?`;
      }

      if (isHighRisk) {
        return `Hi ${firstName}, this is ${patientAgent} from ${config.shortName} Patient Support. I'm a patient support coordinator, and I wanted to personally reach out to see how you're doing and make sure you're connected with all the support available to you. Is now a good time?`;
      }

      return `Hi ${firstName}, this is ${patientAgent} calling from ${config.shortName} Patient Support. I'm one of the patient support coordinators here, and I just wanted to check in and see how things are going with your treatment. Do you have a couple minutes?`;
    }

    case 'hcp-support': {
      return `Hello ${title}${lastName}, this is the ${config.shortName} Medical Information line. Thank you for calling — how can I assist you today?`;
    }

    case 'hcp-outbound': {
      if (hasCompetitorResearch || hasFormularyLookup) {
        return `Hello ${title}${lastName}, this is ${outboundAgent} from ${config.companyName}. I'm reaching out because there's been an important evidence review in ${taShort} treatment, and I thought our clinical data might be relevant to your practice. Do you have a quick moment?`;
      }

      if (hasConferenceActivity) {
        return `Hello ${title}${lastName}, this is ${outboundAgent} from ${config.companyName}. I'm reaching out to follow up on some of the recent clinical evidence in ${taShort} — I have some data that may be useful for your patients. Is this a good time?`;
      }

      if (isHighRisk) {
        return `Hello ${title}${lastName}, this is ${outboundAgent} from ${config.companyName}. I'm reaching out because we have clinical data on our ${taShort} treatment that may be relevant to your practice. Do you have just a couple minutes?`;
      }

      return `Hello ${title}${lastName}, this is ${outboundAgent} from ${config.companyName}. I'm reaching out because we have clinical data on our ${taShort} treatment that may be relevant to your practice. Is now a good time?`;
    }

    case 'medcomms-qa': {
      if (contact.contactType === 'hcp') {
        return `Thank you for contacting ${config.companyName} Medical Information. This is the medical information line — how can I assist you today, ${title}${lastName}?`;
      }
      return `Thank you for contacting ${config.companyName}. I'm here to help answer your questions about our products. How can I assist you today?`;
    }

    default: {
      const _exhaustive: never = contact.agentType;
      throw new Error(`Unknown agent type: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Gatekeeper greeting builder — for use when answeredBy detection suggests
// a non-physician pickup on HCP outbound calls
// ---------------------------------------------------------------------------

export function buildGatekeeperGreeting(contact: ContactRecord, config: BrandBackendConfig = getBrandConfig()): string {
  const title = contact.contactType === 'hcp' ? 'Dr. ' : '';
  const lastName = (contact.name || '').split(' ').slice(-1)[0] || 'there';

  const taShort = resolveTaShort(contact.therapeuticArea, config);
  const outboundAgent = config.agentPersonas['hcp-outbound']?.name ?? 'Support';

  return `Hello, this is ${outboundAgent} from ${config.companyName}. I'm reaching out to share some clinical information with ${title}${lastName} about treatments for ${taShort}. Is the doctor available for just a couple of minutes?`;
}

// ---------------------------------------------------------------------------
// Voicemail message builder
// ---------------------------------------------------------------------------

export function buildAgentVoicemailMessage(
  contact: Pick<ContactRecord, 'name' | 'therapeuticArea' | 'agentType'> & { riskTier?: string; contactType?: string },
  config: BrandBackendConfig = getBrandConfig(),
): string {
  const firstName = (contact.name || '').split(' ')[0] || 'there';
  const title = contact.agentType === 'hcp-outbound' ? 'Dr. ' : '';
  const lastName = (contact.name || '').split(' ').slice(-1)[0] || 'there';

  const taShort = resolveTaShort(contact.therapeuticArea, config);
  const patientAgent = config.agentPersonas['patient-support']?.name ?? 'Support';
  const outboundAgent = config.agentPersonas['hcp-outbound']?.name ?? 'Support';

  switch (contact.agentType) {
    case 'patient-support':
      return `Hi ${firstName}, this is ${patientAgent} calling from ${config.shortName} Patient Support. I was reaching out to check in on your treatment and make sure you have everything you need. I'll also send you a text with more details. If you'd like to talk, please call us back at ${config.phoneNumbers.patientSupport}. Take care, and have a great day.`;

    case 'hcp-outbound':
      return `Hello ${title}${lastName}, this is ${outboundAgent} from ${config.companyName}. I was reaching out to share some clinical information about our ${taShort} treatment. I'll send you a text with details. If you'd like to connect, please call us at ${config.phoneNumbers.medicalInfo} or reach out to your local ${config.shortName} representative. Thank you.`;

    case 'hcp-support':
      return `Hello, this is ${config.shortName} Medical Information returning your call. Please call us back at ${config.phoneNumbers.medicalInfo} for assistance with your medical information request. Thank you.`;

    case 'medcomms-qa':
      return `Hello, this is ${config.shortName} Medical Information. We tried to reach you regarding your inquiry. Please call us back at ${config.phoneNumbers.medicalInfo}. Thank you.`;

    default: {
      const _exhaustive: never = contact.agentType;
      throw new Error(`Unknown agent type: ${_exhaustive}`);
    }
  }
}
