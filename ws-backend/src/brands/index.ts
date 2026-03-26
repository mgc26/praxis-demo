// ---------------------------------------------------------------------------
// Brand Backend Config — interface + registry
// ---------------------------------------------------------------------------
// Each brand pack (Praxis, Amgen, PTC) implements BrandBackendConfig and is
// loaded here. The rest of the backend imports `getBrandConfig()` to resolve
// brand-specific values at runtime.
// ---------------------------------------------------------------------------

import praxis from './praxis.js';
import amgen from './amgen.js';
import ptc from './ptc.js';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface BrandBackendConfig {
  /** Unique brand slug, e.g. 'praxis' */
  id: string;
  /** Full legal company name */
  companyName: string;
  /** Short display name */
  shortName: string;
  /** Patient hub brand name, e.g. 'PraxisConnect' */
  hubName: string;

  /** Per-agent-type persona: display name and default greeting */
  agentPersonas: Record<string, { name: string; greeting: string }>;

  /** Public-facing phone numbers */
  phoneNumbers: {
    patientSupport: string;
    medicalInfo: string;
    safety: string;
  };

  /** Public-facing URLs */
  urls: {
    patientPortal: string;
    hcpPortal: string;
  };

  /** Drug product profiles */
  drugProfiles: Array<{
    id: string;
    brandName: string;
    genericName: string;
    therapeuticArea: string;
    indication: string;
    moa: string;
    dosing: string;
    commonAEs: string[];
    seriousAEs: string[];
    boxWarning?: string;
    trialData?: string;
  }>;

  /** Support pathways available for this brand */
  supportPathways: Array<{
    id: string;
    label: string;
    description: string;
  }>;

  /** Named contacts: MSLs, nurse educators, hub reps, safety, etc. */
  contactNetwork: Array<{
    name: string;
    role: string;
    territory?: string;
    email?: string;
    phone?: string;
  }>;

  /** Deepgram STT vocabulary boosts */
  vocabularyBoosts: Array<{ word: string; boost: number }>;

  /** Optional overrides for outcome labels/descriptions */
  outcomeOverrides?: Record<string, string>;

  /** TTS pronunciation overrides — appended to system prompt so the LLM
   *  spells tricky drug names phonetically for correct text-to-speech output. */
  pronunciationGuide?: string;

  /** Brand-specific screening instruments */
  screeningInstruments?: Array<{
    id: string;
    name: string;
    questions: Array<{
      id: string;
      text: string;
      options?: string[];
    }>;
  }>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const BRAND_REGISTRY: Record<string, BrandBackendConfig> = {
  praxis,
  amgen,
  ptc,
};

/** Default brand used when none is specified */
export const DEFAULT_BRAND_ID = 'praxis';

/**
 * Resolve a brand config by id. Falls back to the default brand when the id
 * is omitted or not found.
 */
export function getBrandConfig(id?: string): BrandBackendConfig {
  if (id && BRAND_REGISTRY[id]) {
    return BRAND_REGISTRY[id];
  }
  return BRAND_REGISTRY[DEFAULT_BRAND_ID];
}

/** Return every registered brand config. */
export function allBrandConfigs(): BrandBackendConfig[] {
  return Object.values(BRAND_REGISTRY);
}
