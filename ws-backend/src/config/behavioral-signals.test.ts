import { describe, it, expect } from 'vitest';
import {
  SIGNAL_MAPPINGS,
  EXTENDED_SIGNAL_MAPPINGS,
  getExtendedSignalMappings,
  getSignalUrgency,
  getPrimaryPathway,
  buildSignalContextSummary,
  getRecommendedScreenings,
} from './behavioral-signals.js';
import { getBrandConfig } from '../brands/index.js';
import type { SignalCategory } from '../types/index.js';

const ALL_SIGNAL_CATEGORIES: SignalCategory[] = [
  'COMPETITOR_RESEARCH',
  'FORMULARY_LOOKUP',
  'SYMPTOM_SEARCH',
  'ADHERENCE_GAP',
  'KOL_ENGAGEMENT',
  'OFF_LABEL_QUERY',
  'CAREGIVER_DISTRESS',
  'CONFERENCE_ACTIVITY',
];

describe('behavioral-signals', () => {
  describe('SIGNAL_MAPPINGS', () => {
    it('has all 8 signal categories', () => {
      const keys = Object.keys(SIGNAL_MAPPINGS);
      expect(keys).toHaveLength(8);
      for (const cat of ALL_SIGNAL_CATEGORIES) {
        expect(SIGNAL_MAPPINGS).toHaveProperty(cat);
      }
    });

    it('each mapping has required fields', () => {
      for (const cat of ALL_SIGNAL_CATEGORIES) {
        const mapping = SIGNAL_MAPPINGS[cat];
        expect(mapping.category).toBe(cat);
        expect(typeof mapping.label).toBe('string');
        expect(mapping.label.length).toBeGreaterThan(0);
        expect(typeof mapping.description).toBe('string');
        expect(mapping.description.length).toBeGreaterThan(0);
        expect(typeof mapping.recommendedPathway).toBe('string');
        expect(['routine', 'soon', 'urgent']).toContain(mapping.urgencyLevel);
        expect(typeof mapping.suggestedResource).toBe('string');
        expect(typeof mapping.clinicalImplication).toBe('string');
        expect(Array.isArray(mapping.talkingPoints)).toBe(true);
        expect(mapping.talkingPoints.length).toBeGreaterThan(0);
        expect(typeof mapping.agentOpeningHint).toBe('string');
        expect(Array.isArray(mapping.recommendedScreenings)).toBe(true);
      }
    });

    it('COMPETITOR_RESEARCH maps to clinical-education pathway', () => {
      expect(SIGNAL_MAPPINGS.COMPETITOR_RESEARCH.recommendedPathway).toBe('clinical-education');
    });

    it('FORMULARY_LOOKUP maps to medication-access pathway', () => {
      expect(SIGNAL_MAPPINGS.FORMULARY_LOOKUP.recommendedPathway).toBe('medication-access');
    });

    it('SYMPTOM_SEARCH maps to patient-education pathway', () => {
      expect(SIGNAL_MAPPINGS.SYMPTOM_SEARCH.recommendedPathway).toBe('patient-education');
    });

    it('ADHERENCE_GAP maps to adherence-support pathway with urgent urgency', () => {
      expect(SIGNAL_MAPPINGS.ADHERENCE_GAP.recommendedPathway).toBe('adherence-support');
      expect(SIGNAL_MAPPINGS.ADHERENCE_GAP.urgencyLevel).toBe('urgent');
    });

    it('CAREGIVER_DISTRESS maps to crisis-support pathway with urgent urgency', () => {
      expect(SIGNAL_MAPPINGS.CAREGIVER_DISTRESS.recommendedPathway).toBe('crisis-support');
      expect(SIGNAL_MAPPINGS.CAREGIVER_DISTRESS.urgencyLevel).toBe('urgent');
    });

    it('OFF_LABEL_QUERY maps to clinical-education pathway with urgent urgency', () => {
      expect(SIGNAL_MAPPINGS.OFF_LABEL_QUERY.recommendedPathway).toBe('clinical-education');
      expect(SIGNAL_MAPPINGS.OFF_LABEL_QUERY.urgencyLevel).toBe('urgent');
    });

    it('ADHERENCE_GAP recommends MMAS-4 and AE-TRIAGE screenings', () => {
      expect(SIGNAL_MAPPINGS.ADHERENCE_GAP.recommendedScreenings).toContain('MMAS-4');
      expect(SIGNAL_MAPPINGS.ADHERENCE_GAP.recommendedScreenings).toContain('AE-TRIAGE');
    });

    it('SYMPTOM_SEARCH recommends AE-TRIAGE screening', () => {
      expect(SIGNAL_MAPPINGS.SYMPTOM_SEARCH.recommendedScreenings).toContain('AE-TRIAGE');
    });

    it('CAREGIVER_DISTRESS recommends C-SSRS-LITE screening', () => {
      expect(SIGNAL_MAPPINGS.CAREGIVER_DISTRESS.recommendedScreenings).toContain('C-SSRS-LITE');
    });

    it('COMPETITOR_RESEARCH has no recommended screenings', () => {
      expect(SIGNAL_MAPPINGS.COMPETITOR_RESEARCH.recommendedScreenings).toHaveLength(0);
    });
  });

  describe('getSignalUrgency', () => {
    it('returns urgent when any signal has high severity', () => {
      expect(getSignalUrgency([{ severity: 'high' }])).toBe('urgent');
    });

    it('returns urgent when mix of high and low severities', () => {
      expect(
        getSignalUrgency([{ severity: 'low' }, { severity: 'high' }, { severity: 'medium' }]),
      ).toBe('urgent');
    });

    it('returns soon when highest severity is medium', () => {
      expect(getSignalUrgency([{ severity: 'medium' }])).toBe('soon');
    });

    it('returns soon when mix of medium and low', () => {
      expect(
        getSignalUrgency([{ severity: 'low' }, { severity: 'medium' }]),
      ).toBe('soon');
    });

    it('returns routine when all signals are low', () => {
      expect(getSignalUrgency([{ severity: 'low' }])).toBe('routine');
    });

    it('returns routine for an empty signal array', () => {
      expect(getSignalUrgency([])).toBe('routine');
    });
  });

  describe('getPrimaryPathway', () => {
    it('returns null for empty signals', () => {
      expect(getPrimaryPathway([])).toBeNull();
    });

    it('returns the pathway of a single signal', () => {
      expect(
        getPrimaryPathway([{ category: 'ADHERENCE_GAP', severity: 'high' }]),
      ).toBe('adherence-support');
    });

    it('returns pathway with highest weighted score', () => {
      // ADHERENCE_GAP (adherence-support) high=3, COMPETITOR_RESEARCH (clinical-education) low=1
      expect(
        getPrimaryPathway([
          { category: 'ADHERENCE_GAP', severity: 'high' },
          { category: 'COMPETITOR_RESEARCH', severity: 'low' },
        ]),
      ).toBe('adherence-support');
    });

    it('accumulates scores from multiple signals mapping to same pathway', () => {
      // COMPETITOR_RESEARCH (clinical-education) medium=2 + KOL_ENGAGEMENT (clinical-education) medium=2 = 4
      // vs ADHERENCE_GAP (adherence-support) medium=2
      expect(
        getPrimaryPathway([
          { category: 'COMPETITOR_RESEARCH', severity: 'medium' },
          { category: 'KOL_ENGAGEMENT', severity: 'medium' },
          { category: 'ADHERENCE_GAP', severity: 'medium' },
        ]),
      ).toBe('clinical-education');
    });

    it('returns crisis-support for CAREGIVER_DISTRESS with high severity', () => {
      expect(
        getPrimaryPathway([{ category: 'CAREGIVER_DISTRESS', severity: 'high' }]),
      ).toBe('crisis-support');
    });
  });

  describe('buildSignalContextSummary', () => {
    it('returns "No behavioral signals available." for empty array', () => {
      expect(buildSignalContextSummary([])).toBe('No behavioral signals available.');
    });

    it('formats a single signal correctly', () => {
      const result = buildSignalContextSummary([
        {
          category: 'ADHERENCE_GAP',
          detail: 'Missed 2 refills in 30 days',
          recency: '2 weeks ago',
          severity: 'high',
        },
      ]);
      expect(result).toContain('[HIGH]');
      expect(result).toContain('Medication Adherence Gap');
      expect(result).toContain('Missed 2 refills in 30 days');
      expect(result).toContain('2 weeks ago');
      expect(result).toMatch(/^- /);
    });

    it('formats multiple signals on separate lines', () => {
      const result = buildSignalContextSummary([
        {
          category: 'ADHERENCE_GAP',
          detail: 'Missed refill',
          recency: '1 week ago',
          severity: 'high',
        },
        {
          category: 'SYMPTOM_SEARCH',
          detail: 'Searched tremor management',
          recency: '3 days ago',
          severity: 'medium',
        },
      ]);
      const lines = result.split('\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('[HIGH]');
      expect(lines[1]).toContain('[MEDIUM]');
    });

    it('uses category label from SIGNAL_MAPPINGS', () => {
      const result = buildSignalContextSummary([
        {
          category: 'CAREGIVER_DISTRESS',
          detail: 'Burnout indicators',
          recency: 'yesterday',
          severity: 'high',
        },
      ]);
      expect(result).toContain('Caregiver Distress Signal');
    });
  });

  describe('getRecommendedScreenings', () => {
    it('returns C-SSRS-LITE for DEE patient on relutrigine', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [],
        age: 12,
        therapeuticArea: 'dee-dravet',
        currentDrug: 'relutrigine',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).toContain('C-SSRS-LITE');
      // C-SSRS-LITE should be first (priority 1) due to FDA black box
      expect(result[0].instrumentId).toBe('C-SSRS-LITE');
      expect(result[0].reason).toContain('FDA black box');
    });

    it('returns MMAS-4 for ET patient with ADHERENCE_GAP signal', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [{ category: 'ADHERENCE_GAP', severity: 'high' }],
        age: 65,
        therapeuticArea: 'essential-tremor',
        currentDrug: 'euloxacaltenamide',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).toContain('MMAS-4');
    });

    it('returns AE-TRIAGE for ADHERENCE_GAP signal', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [{ category: 'ADHERENCE_GAP', severity: 'high' }],
        age: 65,
        therapeuticArea: 'essential-tremor',
        currentDrug: 'euloxacaltenamide',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).toContain('AE-TRIAGE');
    });

    it('returns TETRAS-LITE for essential-tremor patients', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [],
        age: 60,
        therapeuticArea: 'essential-tremor',
        currentDrug: 'euloxacaltenamide',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).toContain('TETRAS-LITE');
    });

    it('returns MMAS-4 universally for patients on active therapy', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [],
        age: 40,
        therapeuticArea: 'essential-tremor',
        currentDrug: 'euloxacaltenamide',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).toContain('MMAS-4');
    });

    it('does not return MMAS-4 when no currentDrug', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [],
        age: 40,
        therapeuticArea: 'essential-tremor',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).not.toContain('MMAS-4');
    });

    it('returns results sorted by priority', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [{ category: 'ADHERENCE_GAP', severity: 'high' }],
        age: 12,
        therapeuticArea: 'dee-dravet',
        currentDrug: 'relutrigine',
      });
      for (let i = 1; i < result.length; i++) {
        expect(result[i].priority).toBeGreaterThan(result[i - 1].priority);
      }
    });

    it('does not duplicate instruments from multiple sources', () => {
      // DEE patient on relutrigine gets C-SSRS-LITE from drug-specific rule.
      // CAREGIVER_DISTRESS also recommends C-SSRS-LITE — should not duplicate.
      const result = getRecommendedScreenings({
        behavioralSignals: [{ category: 'CAREGIVER_DISTRESS', severity: 'high' }],
        age: 12,
        therapeuticArea: 'dee-dravet',
        currentDrug: 'relutrigine',
      });
      const cssrsCount = result.filter((r) => r.instrumentId === 'C-SSRS-LITE').length;
      expect(cssrsCount).toBe(1);
    });

    it('returns C-SSRS-LITE for CAREGIVER_DISTRESS signal even without dee-dravet', () => {
      const result = getRecommendedScreenings({
        behavioralSignals: [{ category: 'CAREGIVER_DISTRESS', severity: 'high' }],
        age: 40,
        therapeuticArea: 'essential-tremor',
        currentDrug: 'euloxacaltenamide',
      });
      const ids = result.map((r) => r.instrumentId);
      expect(ids).toContain('C-SSRS-LITE');
    });
  });

  // ---------------------------------------------------------------------------
  // contextRestriction field
  // ---------------------------------------------------------------------------
  // contextRestriction prevents patient/caregiver signals from being used to
  // trigger HCP commercial outbound calls, which would be both irrelevant and
  // potentially a compliance concern.
  // ---------------------------------------------------------------------------

  describe('contextRestriction field', () => {
    it('should have contextRestriction "patient-facing-only" for SYMPTOM_SEARCH', () => {
      // Symptom searches originate from patients/caregivers. Using this signal
      // to trigger an HCP commercial call would be off-target.
      expect(SIGNAL_MAPPINGS.SYMPTOM_SEARCH.contextRestriction).toBe('patient-facing-only');
    });

    it('should have contextRestriction "patient-facing-only" for ADHERENCE_GAP', () => {
      // Adherence gaps are patient-level events — outbound to HCPs based on
      // individual patient refill data raises privacy and relevance concerns.
      expect(SIGNAL_MAPPINGS.ADHERENCE_GAP.contextRestriction).toBe('patient-facing-only');
    });

    it('should have contextRestriction "patient-facing-only" for CAREGIVER_DISTRESS', () => {
      // Caregiver distress is a sensitive patient-side signal that should not
      // be used for commercial HCP outreach.
      expect(SIGNAL_MAPPINGS.CAREGIVER_DISTRESS.contextRestriction).toBe('patient-facing-only');
    });

    it('should NOT have contextRestriction for COMPETITOR_RESEARCH', () => {
      // COMPETITOR_RESEARCH is an HCP-facing signal — no restriction needed.
      expect(
        SIGNAL_MAPPINGS.COMPETITOR_RESEARCH.contextRestriction === undefined ||
          SIGNAL_MAPPINGS.COMPETITOR_RESEARCH.contextRestriction === null,
      ).toBe(true);
    });

    it('should NOT have contextRestriction for KOL_ENGAGEMENT', () => {
      // KOL_ENGAGEMENT is an HCP-facing signal — no restriction needed.
      expect(
        SIGNAL_MAPPINGS.KOL_ENGAGEMENT.contextRestriction === undefined ||
          SIGNAL_MAPPINGS.KOL_ENGAGEMENT.contextRestriction === null,
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // EXTENDED_SIGNAL_MAPPINGS
  // ---------------------------------------------------------------------------
  // Extended signals cover CRM-derived and access-related signals that
  // supplement the core behavioral categories. These are important for
  // complete contact context in outbound workflows.
  // ---------------------------------------------------------------------------

  describe('EXTENDED_SIGNAL_MAPPINGS', () => {
    it('should include FIRST_PARTY_ENGAGEMENT signal', () => {
      expect(EXTENDED_SIGNAL_MAPPINGS).toHaveProperty('FIRST_PARTY_ENGAGEMENT');
    });

    it('should include ACCESS_RESTRICTION signal', () => {
      expect(EXTENDED_SIGNAL_MAPPINGS).toHaveProperty('ACCESS_RESTRICTION');
    });

    it('should route FIRST_PARTY_ENGAGEMENT to patient-education pathway', () => {
      // First-party engagement (website, app, email) signals a patient actively
      // seeking info — patient-education is the natural support pathway.
      expect(EXTENDED_SIGNAL_MAPPINGS.FIRST_PARTY_ENGAGEMENT.recommendedPathway).toBe(
        'patient-education',
      );
    });

    it('should route ACCESS_RESTRICTION to medication-access pathway', () => {
      // Access restrictions (PA denials, formulary blocks) directly map to the
      // medication-access pathway for reimbursement support.
      expect(EXTENDED_SIGNAL_MAPPINGS.ACCESS_RESTRICTION.recommendedPathway).toBe(
        'medication-access',
      );
    });

    it('should have urgent urgency for ACCESS_RESTRICTION', () => {
      // Access barriers risk treatment abandonment or gaps — especially
      // dangerous for AEDs where gaps can trigger breakthrough seizures.
      expect(EXTENDED_SIGNAL_MAPPINGS.ACCESS_RESTRICTION.urgencyLevel).toBe('urgent');
    });
  });

  // ---------------------------------------------------------------------------
  // Brand-aware extended signal accessor
  // ---------------------------------------------------------------------------

  describe('getExtendedSignalMappings (brand-aware)', () => {
    it('should return EXTENDED_SIGNAL_MAPPINGS for Praxis config', () => {
      const praxisConfig = getBrandConfig('praxis');
      const mappings = getExtendedSignalMappings(praxisConfig);
      expect(mappings).toBe(EXTENDED_SIGNAL_MAPPINGS);
    });

    it('should return same structure when called with default config', () => {
      const mappings = getExtendedSignalMappings();
      expect(mappings).toHaveProperty('FIRST_PARTY_ENGAGEMENT');
      expect(mappings).toHaveProperty('ACCESS_RESTRICTION');
    });

    it('should preserve pathway and urgency from base mappings', () => {
      const mappings = getExtendedSignalMappings();
      expect(mappings.FIRST_PARTY_ENGAGEMENT.recommendedPathway).toBe('patient-education');
      expect(mappings.ACCESS_RESTRICTION.urgencyLevel).toBe('urgent');
    });
  });
});
