import { describe, it, expect } from 'vitest';
import {
  OUTCOMES,
  CONVERSION_OUTCOMES,
  getOutcomeDefinition,
} from './outcomes.js';
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
        'speaker-program-interest',
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
});
