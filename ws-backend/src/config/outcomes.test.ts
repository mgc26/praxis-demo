import { describe, it, expect } from 'vitest';
import {
  OUTCOMES,
  CONVERSION_OUTCOMES,
  getOutcomeDefinition,
  getOutcomeLabels,
} from './outcomes.js';
import { getBrandConfig } from '../brands/index.js';
import type { OutcomeType } from '../types/index.js';

const ALL_OUTCOME_TYPES: OutcomeType[] = [
  'ae-reported',
  'ae-escalated',
  'medical-info-provided',
  'sample-request',
  'copay-card-issued',
  'hub-enrollment',
  'prior-auth-assist',
  'nurse-educator-referral',
  'speaker-program-interest',
  'appointment-scheduled',
  'information-provided',
  'callback-requested',
  'declined',
  'no-answer',
  'voicemail',
  'crisis-escalation',
];

describe('outcomes', () => {
  describe('OUTCOMES array', () => {
    it('defines all 16 outcome types', () => {
      expect(OUTCOMES).toHaveLength(16);
    });

    it('includes every expected outcome type', () => {
      const ids = OUTCOMES.map((o) => o.id);
      for (const type of ALL_OUTCOME_TYPES) {
        expect(ids).toContain(type);
      }
    });

    it('each outcome has id, label, description, and color', () => {
      for (const outcome of OUTCOMES) {
        expect(typeof outcome.id).toBe('string');
        expect(typeof outcome.label).toBe('string');
        expect(outcome.label.length).toBeGreaterThan(0);
        expect(typeof outcome.description).toBe('string');
        expect(outcome.description.length).toBeGreaterThan(0);
        expect(typeof outcome.color).toBe('string');
        expect(outcome.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('each outcome has a boolean isConversion flag', () => {
      for (const outcome of OUTCOMES) {
        expect(typeof outcome.isConversion).toBe('boolean');
      }
    });

    it('smsTemplate is either a string or null', () => {
      for (const outcome of OUTCOMES) {
        expect(
          outcome.smsTemplate === null || typeof outcome.smsTemplate === 'string',
        ).toBe(true);
      }
    });
  });

  describe('SMS template mapping', () => {
    it('ae-reported has ae_confirmation template', () => {
      const o = OUTCOMES.find((o) => o.id === 'ae-reported')!;
      expect(o.smsTemplate).toBe('ae_confirmation');
    });

    it('ae-escalated has ae_escalation_followup template', () => {
      const o = OUTCOMES.find((o) => o.id === 'ae-escalated')!;
      expect(o.smsTemplate).toBe('ae_escalation_followup');
    });

    it('hub-enrollment has hub_welcome template', () => {
      const o = OUTCOMES.find((o) => o.id === 'hub-enrollment')!;
      expect(o.smsTemplate).toBe('hub_welcome');
    });

    it('voicemail has voicemail_followup template', () => {
      const o = OUTCOMES.find((o) => o.id === 'voicemail')!;
      expect(o.smsTemplate).toBe('voicemail_followup');
    });

    it('crisis-escalation has crisis_resources template', () => {
      const o = OUTCOMES.find((o) => o.id === 'crisis-escalation')!;
      expect(o.smsTemplate).toBe('crisis_resources');
    });

    it('declined has null smsTemplate', () => {
      const o = OUTCOMES.find((o) => o.id === 'declined')!;
      expect(o.smsTemplate).toBeNull();
    });

    it('no-answer has null smsTemplate', () => {
      const o = OUTCOMES.find((o) => o.id === 'no-answer')!;
      expect(o.smsTemplate).toBeNull();
    });
  });

  describe('CONVERSION_OUTCOMES', () => {
    it('includes expected conversion outcomes', () => {
      const expectedConversions: OutcomeType[] = [
        'ae-reported',
        'ae-escalated',
        'medical-info-provided',
        'sample-request',
        'copay-card-issued',
        'hub-enrollment',
        'prior-auth-assist',
        'nurse-educator-referral',
        'appointment-scheduled',
        'crisis-escalation',
      ];
      for (const oc of expectedConversions) {
        expect(CONVERSION_OUTCOMES).toContain(oc);
      }
    });

    it('excludes non-conversion outcomes', () => {
      const nonConversions: OutcomeType[] = [
        'information-provided',
        'callback-requested',
        'speaker-program-interest',
        'declined',
        'no-answer',
        'voicemail',
      ];
      for (const oc of nonConversions) {
        expect(CONVERSION_OUTCOMES).not.toContain(oc);
      }
    });

    it('has the correct count of conversions', () => {
      const conversionCount = OUTCOMES.filter((o) => o.isConversion).length;
      expect(CONVERSION_OUTCOMES).toHaveLength(conversionCount);
    });
  });

  describe('getOutcomeDefinition', () => {
    it('returns correct definition for each outcome type', () => {
      for (const type of ALL_OUTCOME_TYPES) {
        const def = getOutcomeDefinition(type);
        expect(def.id).toBe(type);
      }
    });

    it('returns ae-reported definition with correct label', () => {
      const def = getOutcomeDefinition('ae-reported');
      expect(def.label).toBe('Adverse Event Reported');
    });

    it('returns crisis-escalation definition with correct label', () => {
      const def = getOutcomeDefinition('crisis-escalation');
      expect(def.label).toBe('Crisis Escalation');
    });

    it('returns information-provided as fallback for unknown outcome', () => {
      // The function uses a fallback to 'information-provided' for unmatched outcomes
      // We can test this by casting an invalid string
      const def = getOutcomeDefinition('nonexistent' as OutcomeType);
      expect(def.id).toBe('information-provided');
    });
  });

  // -------------------------------------------------------------------------
  // speaker-program-interest reclassification
  // Tracking speaker-program-interest as a conversion documents a commercial
  // incentive that OIG (Office of Inspector General) flags as a kickback risk.
  // This was reclassified from conversion to non-conversion for compliance.
  // -------------------------------------------------------------------------
  describe('speaker-program-interest reclassification', () => {
    it('should classify speaker-program-interest as NON-conversion (compliance fix)', () => {
      // OIG Anti-Kickback Statute concern: speaker program participation
      // cannot be counted as a "conversion" because it implies commercial
      // incentive tracking, which creates audit liability
      const speakerOutcome = OUTCOMES.find((o) => o.id === 'speaker-program-interest')!;
      expect(speakerOutcome.isConversion).toBe(false);
    });

    it('should NOT include speaker-program-interest in CONVERSION_OUTCOMES array', () => {
      // Double-check the derived array also excludes it — this is what the
      // dashboard and analytics queries actually use
      expect(CONVERSION_OUTCOMES).not.toContain('speaker-program-interest');
    });

    it('should still classify crisis-escalation as a conversion outcome', () => {
      // Regression guard: the reclassification of speaker-program-interest
      // must not accidentally change crisis-escalation, which is a genuine
      // safety conversion that triggers regulatory workflows
      const crisisOutcome = OUTCOMES.find((o) => o.id === 'crisis-escalation')!;
      expect(crisisOutcome.isConversion).toBe(true);
      expect(CONVERSION_OUTCOMES).toContain('crisis-escalation');
    });
  });

  // -------------------------------------------------------------------------
  // Outcome completeness
  // Every outcome record must have complete metadata. Missing labels or
  // descriptions cause blank cards on the dashboard; invalid colors break
  // the status chip rendering.
  // -------------------------------------------------------------------------
  describe('outcome completeness', () => {
    it('should have a non-empty label for every outcome', () => {
      for (const outcome of OUTCOMES) {
        expect(outcome.label.length).toBeGreaterThan(0);
      }
    });

    it('should have a non-empty description for every outcome', () => {
      for (const outcome of OUTCOMES) {
        expect(outcome.description.length).toBeGreaterThan(0);
      }
    });

    it('should have a valid hex color for every outcome', () => {
      // Colors are rendered directly in the dashboard badge/chip components;
      // an invalid hex crashes the color parser
      for (const outcome of OUTCOMES) {
        expect(outcome.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('should have unique IDs across all outcomes', () => {
      // Duplicate IDs would cause getOutcomeDefinition to return the wrong
      // definition for some outcome types
      const ids = OUTCOMES.map((o) => o.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique colors across all outcomes', () => {
      // Duplicate colors make outcomes visually indistinguishable on dashboards
      const colors = OUTCOMES.map((o) => o.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  // -------------------------------------------------------------------------
  // AE-related outcomes must all be conversions
  // AE events trigger pharmacovigilance workflows and must always count as
  // conversions so they appear in safety dashboards and regulatory reports.
  // -------------------------------------------------------------------------
  describe('AE-related outcome classification', () => {
    it('should classify ae-reported as a conversion', () => {
      const def = OUTCOMES.find((o) => o.id === 'ae-reported')!;
      expect(def.isConversion).toBe(true);
    });

    it('should classify ae-escalated as a conversion', () => {
      const def = OUTCOMES.find((o) => o.id === 'ae-escalated')!;
      expect(def.isConversion).toBe(true);
    });

    it('should classify crisis-escalation as a conversion', () => {
      // Crisis escalation involves acute safety concerns (suicidal ideation)
      // that mandate regulatory reporting — must be a conversion
      const def = OUTCOMES.find((o) => o.id === 'crisis-escalation')!;
      expect(def.isConversion).toBe(true);
    });

    it('should include all three AE-related outcomes in CONVERSION_OUTCOMES', () => {
      expect(CONVERSION_OUTCOMES).toContain('ae-reported');
      expect(CONVERSION_OUTCOMES).toContain('ae-escalated');
      expect(CONVERSION_OUTCOMES).toContain('crisis-escalation');
    });
  });

  // -------------------------------------------------------------------------
  // Non-conversion outcomes
  // Certain outcomes must never be conversions because they represent
  // non-engagement (no-answer, voicemail) or are compliance-sensitive.
  // -------------------------------------------------------------------------
  describe('non-conversion outcomes', () => {
    it('should classify no-answer as NOT a conversion', () => {
      // No-answer means no engagement occurred — counting it as a conversion
      // would inflate conversion rates and mislead commercial leadership
      const def = OUTCOMES.find((o) => o.id === 'no-answer')!;
      expect(def.isConversion).toBe(false);
    });

    it('should classify voicemail as NOT a conversion', () => {
      // Voicemail is a one-way communication — no patient/HCP engagement
      // occurred, so it cannot be a conversion
      const def = OUTCOMES.find((o) => o.id === 'voicemail')!;
      expect(def.isConversion).toBe(false);
    });

    it('should classify declined as NOT a conversion', () => {
      // Explicit refusal must not be counted as a conversion
      const def = OUTCOMES.find((o) => o.id === 'declined')!;
      expect(def.isConversion).toBe(false);
    });

    it('should classify callback-requested as NOT a conversion', () => {
      // A callback request is deferred engagement, not a completed conversion
      const def = OUTCOMES.find((o) => o.id === 'callback-requested')!;
      expect(def.isConversion).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Brand-aware outcome labels
  // ---------------------------------------------------------------------------

  describe('getOutcomeLabels (brand-aware)', () => {
    it('should return labels for all outcome types with default config', () => {
      const labels = getOutcomeLabels();
      for (const type of ALL_OUTCOME_TYPES) {
        expect(labels[type]).toBeDefined();
        expect(typeof labels[type]).toBe('string');
        expect(labels[type].length).toBeGreaterThan(0);
      }
    });

    it('should return labels matching OUTCOMES array with Praxis config', () => {
      const praxisConfig = getBrandConfig('praxis');
      const labels = getOutcomeLabels(praxisConfig);
      for (const outcome of OUTCOMES) {
        expect(labels[outcome.id]).toBe(outcome.label);
      }
    });

    it('should apply outcome overrides from brand config', () => {
      // Create a mock config with outcome overrides
      const mockConfig = {
        ...getBrandConfig('praxis'),
        outcomeOverrides: {
          'ae-reported': 'Custom AE Label',
        },
      };
      const labels = getOutcomeLabels(mockConfig);
      expect(labels['ae-reported']).toBe('Custom AE Label');
      // Other labels should remain unchanged
      expect(labels['hub-enrollment']).toBe('Hub Enrollment');
    });

    it('should return base labels when no overrides are present', () => {
      const praxisConfig = getBrandConfig('praxis');
      const labels = getOutcomeLabels(praxisConfig);
      expect(labels['ae-reported']).toBe('Adverse Event Reported');
    });
  });
});
