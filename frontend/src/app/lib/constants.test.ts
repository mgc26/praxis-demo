import { describe, it, expect } from 'vitest';
import {
  COLORS,
  AGENT_TYPE_CONFIG,
  THERAPEUTIC_AREAS,
  DRUG_PRODUCTS,
  SUPPORT_PATHWAYS,
  SUPPORT_PATHWAY_MAP,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  CONVERSION_OUTCOMES,
  NON_CONNECT_OUTCOMES,
  SIGNAL_CATEGORY_LABELS,
  SIGNAL_CATEGORY_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  LANGUAGES,
  DEFAULT_PERSONAS,
  DEMO_SCENARIOS,
  WS_BACKEND_URL,
  getDrugProducts,
  getTherapeuticAreas,
  getSupportPathways,
  getDefaultPersonas,
  getOutcomeLabels,
  getDemoScenarios,
} from './constants';
import { praxisBrand } from './brands/praxis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// ---------------------------------------------------------------------------
// COLORS
// ---------------------------------------------------------------------------
describe('COLORS', () => {
  it('has all expected keys', () => {
    const expectedKeys = [
      'primary',
      'primaryDark',
      'primaryLight',
      'secondary',
      'accent',
      'gold',
      'coral',
      'blue',
      'viNavy',
      'viTeal',
      'viTealLight',
      'bgDashboard',
      'bgCard',
      'priorityHigh',
      'priorityMedium',
      'priorityLow',
      'hubEnrollment',
      'copayAssistance',
      'aeReporting',
      'adherenceSupport',
      'sampleRequest',
      'medicalInquiry',
      'textDashboard',
      'textMuted',
      'border',
    ];
    for (const key of expectedKeys) {
      expect(COLORS).toHaveProperty(key);
    }
  });

  it('every value is a valid 6-digit hex color', () => {
    for (const [key, value] of Object.entries(COLORS)) {
      expect(value, `COLORS.${key}`).toMatch(HEX_RE);
    }
  });
});

// ---------------------------------------------------------------------------
// AGENT_TYPE_CONFIG
// ---------------------------------------------------------------------------
describe('AGENT_TYPE_CONFIG', () => {
  const agentTypes = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'] as const;

  it('has all 4 agent types', () => {
    for (const at of agentTypes) {
      expect(AGENT_TYPE_CONFIG).toHaveProperty(at);
    }
  });

  it.each(agentTypes)('%s has label, description, and valid hex color', (at) => {
    const config = AGENT_TYPE_CONFIG[at];
    expect(typeof config.label).toBe('string');
    expect(config.label.length).toBeGreaterThan(0);
    expect(typeof config.description).toBe('string');
    expect(config.description.length).toBeGreaterThan(0);
    expect(config.color).toMatch(HEX_RE);
  });
});

// ---------------------------------------------------------------------------
// THERAPEUTIC_AREAS
// ---------------------------------------------------------------------------
describe('THERAPEUTIC_AREAS', () => {
  it('has both therapeutic areas', () => {
    expect(THERAPEUTIC_AREAS).toHaveProperty('essential-tremor');
    expect(THERAPEUTIC_AREAS).toHaveProperty('dee');
  });

  it('each area has label and color', () => {
    for (const area of Object.values(THERAPEUTIC_AREAS)) {
      expect(typeof area.label).toBe('string');
      expect(area.color).toMatch(HEX_RE);
    }
  });
});

// ---------------------------------------------------------------------------
// DRUG_PRODUCTS
// ---------------------------------------------------------------------------
describe('DRUG_PRODUCTS', () => {
  it('has both drugs', () => {
    expect(DRUG_PRODUCTS).toHaveProperty('euloxacaltenamide');
    expect(DRUG_PRODUCTS).toHaveProperty('relutrigine');
  });

  it('each drug has label, brandName, therapeuticArea, and color', () => {
    for (const drug of Object.values(DRUG_PRODUCTS)) {
      expect(typeof drug.label).toBe('string');
      expect(typeof drug.brandName).toBe('string');
      expect(['essential-tremor', 'dee']).toContain(drug.therapeuticArea);
      expect(drug.color).toMatch(HEX_RE);
    }
  });
});

// ---------------------------------------------------------------------------
// SUPPORT_PATHWAYS
// ---------------------------------------------------------------------------
describe('SUPPORT_PATHWAYS', () => {
  const expectedIds = [
    'hub-enrollment',
    'copay-assistance',
    'ae-reporting',
    'adherence-support',
    'sample-request',
    'medical-inquiry',
  ];

  it('has 6 pathways', () => {
    expect(SUPPORT_PATHWAYS).toHaveLength(6);
  });

  it('contains all expected pathway IDs', () => {
    const ids = SUPPORT_PATHWAYS.map((p) => p.id);
    for (const id of expectedIds) {
      expect(ids).toContain(id);
    }
  });

  it('each pathway has required fields', () => {
    for (const p of SUPPORT_PATHWAYS) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.label).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(typeof p.icon).toBe('string');
      expect(typeof p.color).toBe('string');
      expect(['routine', 'soon', 'urgent']).toContain(p.urgencyDefault);
      expect(typeof p.regulatoryRelevant).toBe('boolean');
    }
  });

  it('SUPPORT_PATHWAY_MAP mirrors the array', () => {
    for (const p of SUPPORT_PATHWAYS) {
      expect(SUPPORT_PATHWAY_MAP[p.id]).toEqual(p);
    }
  });
});

// ---------------------------------------------------------------------------
// OUTCOME_LABELS
// ---------------------------------------------------------------------------
describe('OUTCOME_LABELS', () => {
  const outcomes = [
    'hub-enrolled',
    'copay-card-issued',
    'ae-report-filed',
    'adherence-counseling',
    'sample-shipped',
    'medical-info-provided',
    'hcp-detail-completed',
    'prior-auth-initiated',
    'callback-requested',
    'follow-up-scheduled',
    'declined',
    'no-answer',
    'voicemail',
  ] as const;

  it('has all 13 outcome types', () => {
    expect(Object.keys(OUTCOME_LABELS)).toHaveLength(13);
    for (const o of outcomes) {
      expect(OUTCOME_LABELS).toHaveProperty(o);
    }
  });

  it('every label is a non-empty string', () => {
    for (const [key, label] of Object.entries(OUTCOME_LABELS)) {
      expect(typeof label, `OUTCOME_LABELS.${key}`).toBe('string');
      expect(label.length, `OUTCOME_LABELS.${key} length`).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// OUTCOME_COLORS
// ---------------------------------------------------------------------------
describe('OUTCOME_COLORS', () => {
  it('has a valid hex color for every outcome', () => {
    for (const [key, color] of Object.entries(OUTCOME_COLORS)) {
      expect(color, `OUTCOME_COLORS.${key}`).toMatch(HEX_RE);
    }
  });

  it('covers all outcomes in OUTCOME_LABELS', () => {
    for (const key of Object.keys(OUTCOME_LABELS)) {
      expect(OUTCOME_COLORS).toHaveProperty(key);
    }
  });
});

// ---------------------------------------------------------------------------
// CONVERSION_OUTCOMES / NON_CONNECT_OUTCOMES
// ---------------------------------------------------------------------------
describe('CONVERSION_OUTCOMES', () => {
  it('has at least 5 outcomes', () => {
    expect(CONVERSION_OUTCOMES.length).toBeGreaterThanOrEqual(5);
  });

  it('all entries are valid InteractionOutcome values', () => {
    for (const o of CONVERSION_OUTCOMES) {
      expect(OUTCOME_LABELS).toHaveProperty(o);
    }
  });
});

describe('NON_CONNECT_OUTCOMES', () => {
  it('contains no-answer and voicemail', () => {
    expect(NON_CONNECT_OUTCOMES).toContain('no-answer');
    expect(NON_CONNECT_OUTCOMES).toContain('voicemail');
  });
});

// ---------------------------------------------------------------------------
// SIGNAL_CATEGORY_LABELS / COLORS
// ---------------------------------------------------------------------------
describe('SIGNAL_CATEGORY_LABELS', () => {
  const categories = [
    'SEARCH_INTENT',
    'RX_PATTERN',
    'CLAIMS_SIGNAL',
    'HCP_ACTIVITY',
    'ADHERENCE_SIGNAL',
    'COMPETITIVE_INTEL',
  ];

  it('has all 6 signal categories', () => {
    for (const c of categories) {
      expect(SIGNAL_CATEGORY_LABELS).toHaveProperty(c);
    }
  });
});

describe('SIGNAL_CATEGORY_COLORS', () => {
  it('has a valid hex color for each signal category', () => {
    for (const [key, color] of Object.entries(SIGNAL_CATEGORY_COLORS)) {
      expect(color, `SIGNAL_CATEGORY_COLORS.${key}`).toMatch(HEX_RE);
    }
  });
});

// ---------------------------------------------------------------------------
// URGENCY_LABELS / URGENCY_COLORS
// ---------------------------------------------------------------------------
describe('URGENCY_LABELS', () => {
  it('has all 3 urgency levels', () => {
    expect(URGENCY_LABELS).toHaveProperty('urgent');
    expect(URGENCY_LABELS).toHaveProperty('soon');
    expect(URGENCY_LABELS).toHaveProperty('routine');
  });
});

describe('URGENCY_COLORS', () => {
  it('has valid hex for each urgency level', () => {
    for (const [key, color] of Object.entries(URGENCY_COLORS)) {
      expect(color, `URGENCY_COLORS.${key}`).toMatch(HEX_RE);
    }
  });
});

// ---------------------------------------------------------------------------
// LANGUAGES
// ---------------------------------------------------------------------------
describe('LANGUAGES', () => {
  it('has at least 5 languages', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(5);
  });

  it('each entry has value and label', () => {
    for (const lang of LANGUAGES) {
      expect(typeof lang.value).toBe('string');
      expect(typeof lang.label).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// DEMO_SCENARIOS
// ---------------------------------------------------------------------------
describe('DEMO_SCENARIOS', () => {
  const agentTypes = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'] as const;

  it('has scenarios for all 4 agent types', () => {
    for (const at of agentTypes) {
      expect(DEMO_SCENARIOS).toHaveProperty(at);
      expect(DEMO_SCENARIOS[at].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('has at least 4 total scenarios across all agent types', () => {
    const total = Object.values(DEMO_SCENARIOS).reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBeGreaterThanOrEqual(4);
  });

  it('each scenario has id, label, description', () => {
    for (const scenarios of Object.values(DEMO_SCENARIOS)) {
      for (const s of scenarios) {
        expect(typeof s.id).toBe('string');
        expect(typeof s.label).toBe('string');
        expect(typeof s.description).toBe('string');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_PERSONAS
// ---------------------------------------------------------------------------
describe('DEFAULT_PERSONAS', () => {
  const agentTypes = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'] as const;

  it('has a persona for all 4 agent types', () => {
    for (const at of agentTypes) {
      expect(DEFAULT_PERSONAS).toHaveProperty(at);
    }
  });

  it.each(agentTypes)('%s persona has required fields with valid ranges', (at) => {
    const p = DEFAULT_PERSONAS[at];
    expect(typeof p.name).toBe('string');
    expect(p.agentType).toBe(at);
    expect(p.warmth).toBeGreaterThanOrEqual(0);
    expect(p.warmth).toBeLessThanOrEqual(100);
    expect(p.empathy).toBeGreaterThanOrEqual(0);
    expect(p.empathy).toBeLessThanOrEqual(100);
    expect(p.clinicalDepth).toBeGreaterThanOrEqual(0);
    expect(p.clinicalDepth).toBeLessThanOrEqual(100);
    expect(p.formality).toBeGreaterThanOrEqual(0);
    expect(p.formality).toBeLessThanOrEqual(100);
    expect(typeof p.greeting).toBe('string');
    expect(typeof p.signoff).toBe('string');
    expect(typeof p.language).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Brand-aware lookup functions
// ---------------------------------------------------------------------------
describe('getDrugProducts', () => {
  it('returns product entries keyed by product id', () => {
    const products = getDrugProducts(praxisBrand);
    expect(Object.keys(products).length).toBe(praxisBrand.products.length);
    for (const p of praxisBrand.products) {
      expect(products).toHaveProperty(p.id);
      expect(products[p.id].brandName).toBe(p.brandName);
      expect(products[p.id].genericName).toBe(p.genericName);
      expect(typeof products[p.id].label).toBe('string');
    }
  });
});

describe('getTherapeuticAreas', () => {
  it('returns therapeutic areas keyed by id', () => {
    const areas = getTherapeuticAreas(praxisBrand);
    expect(Object.keys(areas).length).toBe(praxisBrand.therapeuticAreas.length);
    for (const ta of praxisBrand.therapeuticAreas) {
      expect(areas[ta.id]).toEqual({ label: ta.label });
    }
  });
});

describe('getSupportPathways', () => {
  it('returns pathways keyed by id with label and color', () => {
    const pathways = getSupportPathways(praxisBrand);
    expect(Object.keys(pathways).length).toBe(praxisBrand.supportPathways.length);
    for (const sp of praxisBrand.supportPathways) {
      expect(pathways[sp.id]).toEqual({ label: sp.label, color: sp.color });
    }
  });
});

describe('getDefaultPersonas', () => {
  it('returns personas keyed by agent type', () => {
    const personas = getDefaultPersonas(praxisBrand);
    expect(Object.keys(personas).length).toBe(praxisBrand.agentPersonas.length);
    for (const ap of praxisBrand.agentPersonas) {
      expect(personas[ap.agentType]).toEqual({
        name: ap.name,
        greeting: ap.greeting,
        description: ap.description,
      });
    }
  });
});

describe('getOutcomeLabels', () => {
  it('returns brand outcome labels', () => {
    const labels = getOutcomeLabels(praxisBrand);
    expect(labels).toEqual(praxisBrand.outcomeLabels);
  });
});

describe('getDemoScenarios', () => {
  it('returns scenarios grouped by agent type with generated IDs', () => {
    const scenarios = getDemoScenarios(praxisBrand);
    const agentTypes = [...new Set(praxisBrand.demoScenarios.map(s => s.agentType))];
    for (const at of agentTypes) {
      expect(scenarios).toHaveProperty(at);
      expect(scenarios[at].length).toBeGreaterThanOrEqual(1);
      for (const s of scenarios[at]) {
        expect(typeof s.id).toBe('string');
        expect(s.id.length).toBeGreaterThan(0);
        expect(typeof s.label).toBe('string');
        expect(typeof s.description).toBe('string');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// WS_BACKEND_URL
// ---------------------------------------------------------------------------
describe('WS_BACKEND_URL', () => {
  it('is a non-empty string', () => {
    expect(typeof WS_BACKEND_URL).toBe('string');
    expect(WS_BACKEND_URL.length).toBeGreaterThan(0);
  });
});
