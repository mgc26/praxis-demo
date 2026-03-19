// ---------------------------------------------------------------------------
// Vi Praxis BioSciences — Agent Prompt Factory
// Dispatches to the correct agent prompt builder based on agentType
// ---------------------------------------------------------------------------

import type { ContactRecord, RecommendedScreening } from '../types/index.js';
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

export function buildAgentPrompt(data: AgentPromptData): string {
  const { contact } = data;

  switch (contact.agentType) {
    case 'patient-support':
      return buildPatientSupportPrompt(data);
    case 'hcp-support':
      return buildHcpSupportPrompt(data);
    case 'hcp-outbound':
      return buildHcpOutboundPrompt(data);
    case 'medcomms-qa':
      return buildMedcommsQaPrompt(data);
    default: {
      const _exhaustive: never = contact.agentType;
      throw new Error(`Unknown agent type: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Greeting builder — adapts opening based on agent type and contact context
// ---------------------------------------------------------------------------

export function buildAgentGreeting(contact: ContactRecord): string {
  const firstName = (contact.name || '').split(' ')[0] || 'there';
  const title = contact.contactType === 'hcp' ? 'Dr. ' : '';
  const lastName = (contact.name || '').split(' ').slice(-1)[0] || 'there';

  const taShort = contact.therapeuticArea === 'essential-tremor'
    ? 'Essential Tremor'
    : 'DEE / Dravet Syndrome';

  const drugName = contact.currentDrug === 'euloxacaltenamide'
    ? 'ELEX'
    : contact.currentDrug === 'relutrigine'
      ? 'Relutrigine'
      : null;

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
        return `Hi ${firstName}, this is Emma calling from Praxis Patient Support. I'm one of the patient support coordinators here, and I wanted to personally check in to see how you and your family are doing. Do you have just a couple minutes?`;
      }

      if (hasAdherenceGap) {
        return `Hi ${firstName}, this is Emma calling from Praxis Patient Support. I'm reaching out because I wanted to make sure you have everything you need to stay on track with your ${drugName ?? 'treatment'}. Do you have just a couple minutes?`;
      }

      if (isHighRisk) {
        return `Hi ${firstName}, this is Emma from Praxis Patient Support. I'm a patient support coordinator, and I wanted to personally reach out to see how you're doing and make sure you're connected with all the support available to you. Is now a good time?`;
      }

      return `Hi ${firstName}, this is Emma calling from Praxis Patient Support. I'm one of the patient support coordinators here, and I just wanted to check in and see how things are going with your treatment. Do you have a couple minutes?`;
    }

    case 'hcp-support': {
      return `Hello ${title}${lastName}, this is the Praxis Medical Information line. Thank you for calling — how can I assist you today?`;
    }

    case 'hcp-outbound': {
      if (hasCompetitorResearch || hasFormularyLookup) {
        return `Hello ${title}${lastName}, this is Emma from Praxis BioSciences. I'm reaching out because there's been an important evidence review in ${taShort} treatment, and I thought our clinical data might be relevant to your practice. Do you have a quick moment?`;
      }

      if (hasConferenceActivity) {
        return `Hello ${title}${lastName}, this is Emma from Praxis BioSciences. I'm reaching out to follow up on some of the recent clinical evidence in ${taShort} — I have some data that may be useful for your patients. Is this a good time?`;
      }

      if (isHighRisk) {
        return `Hello ${title}${lastName}, this is Emma from Praxis BioSciences. I'm reaching out because we have clinical data on our ${taShort} treatment that may be relevant to your practice. Do you have just a couple minutes?`;
      }

      return `Hello ${title}${lastName}, this is Emma from Praxis BioSciences. I'm reaching out because we have clinical data on our ${taShort} treatment that may be relevant to your practice. Is now a good time?`;
    }

    case 'medcomms-qa': {
      if (contact.contactType === 'hcp') {
        return `Thank you for contacting Praxis BioSciences Medical Information. This is the medical information line — how can I assist you today, ${title}${lastName}?`;
      }
      return `Thank you for contacting Praxis BioSciences. I'm here to help answer your questions about our products. How can I assist you today?`;
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

export function buildGatekeeperGreeting(contact: ContactRecord): string {
  const title = contact.contactType === 'hcp' ? 'Dr. ' : '';
  const lastName = (contact.name || '').split(' ').slice(-1)[0] || 'there';

  const taShort = contact.therapeuticArea === 'essential-tremor'
    ? 'Essential Tremor'
    : 'DEE / Dravet Syndrome';

  return `Hello, this is Emma from Praxis BioSciences. I'm reaching out to share some clinical information with ${title}${lastName} about treatments for ${taShort}. Is the doctor available for just a couple of minutes?`;
}

// ---------------------------------------------------------------------------
// Voicemail message builder
// ---------------------------------------------------------------------------

export function buildAgentVoicemailMessage(
  contact: Pick<ContactRecord, 'name' | 'therapeuticArea' | 'agentType'> & { riskTier?: string; contactType?: string },
): string {
  const firstName = (contact.name || '').split(' ')[0] || 'there';
  const title = contact.agentType === 'hcp-outbound' ? 'Dr. ' : '';
  const lastName = (contact.name || '').split(' ').slice(-1)[0] || 'there';

  const taShort = contact.therapeuticArea === 'essential-tremor'
    ? 'Essential Tremor'
    : 'DEE / Dravet Syndrome';

  switch (contact.agentType) {
    case 'patient-support':
      return `Hi ${firstName}, this is Emma calling from Praxis Patient Support. I was reaching out to check in on your treatment and make sure you have everything you need. I'll also send you a text with more details. If you'd like to talk, please call us back at 1-800-PRAXIS-PS. Take care, and have a great day.`;

    case 'hcp-outbound':
      return `Hello ${title}${lastName}, this is Emma from Praxis BioSciences. I was reaching out to share some clinical information about our ${taShort} treatment. I'll send you a text with details. If you'd like to connect, please call us at 1-800-PRAXIS-MI or reach out to your local Praxis representative. Thank you.`;

    case 'hcp-support':
      return `Hello, this is Praxis Medical Information returning your call. Please call us back at 1-800-PRAXIS-MI for assistance with your medical information request. Thank you.`;

    case 'medcomms-qa':
      return `Hello, this is Praxis Medical Information. We tried to reach you regarding your inquiry. Please call us back at 1-800-PRAXIS-MI. Thank you.`;

    default: {
      const _exhaustive: never = contact.agentType;
      throw new Error(`Unknown agent type: ${_exhaustive}`);
    }
  }
}
