import { describe, it, expect } from 'vitest';
import {
  SCREENING_INSTRUMENTS,
  getScreeningInstrument,
  getScreeningInstruments,
  getScreeningInstrumentIds,
  isPositiveScreen,
  getInterpretation,
  buildScreeningPromptBlock,
} from './screening-instruments.js';
import { getBrandConfig } from '../brands/index.js';
import type { ScreeningInstrumentId } from '../types/index.js';

const ALL_INSTRUMENT_IDS: ScreeningInstrumentId[] = [
  'AE-TRIAGE',
  'C-SSRS-LITE',
  'TETRAS-LITE',
  'MMAS-4',
];

describe('screening-instruments', () => {
  describe('SCREENING_INSTRUMENTS registry', () => {
    it('has all 4 instruments registered', () => {
      const keys = Object.keys(SCREENING_INSTRUMENTS);
      expect(keys).toHaveLength(4);
      for (const id of ALL_INSTRUMENT_IDS) {
        expect(SCREENING_INSTRUMENTS).toHaveProperty(id);
      }
    });

    it('each instrument has required definition fields', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(inst.id).toBe(id);
        expect(typeof inst.name).toBe('string');
        expect(inst.name.length).toBeGreaterThan(0);
        expect(typeof inst.shortName).toBe('string');
        expect(typeof inst.description).toBe('string');
        expect(Array.isArray(inst.questions)).toBe(true);
        expect(inst.questions.length).toBeGreaterThan(0);
        expect(typeof inst.maxScore).toBe('number');
        expect(typeof inst.positiveThreshold).toBe('number');
        expect(typeof inst.positiveInterpretation).toBe('string');
        expect(typeof inst.negativeInterpretation).toBe('string');
        expect(typeof inst.regulatoryReportable).toBe('boolean');
        expect(typeof inst.requiresEscalation).toBe('boolean');
        expect(typeof inst.conversationalPreamble).toBe('string');
        expect(typeof inst.conversationalClosingPositive).toBe('string');
        expect(typeof inst.conversationalClosingNegative).toBe('string');
      }
    });

    it('each question has index, text, and responseOptions', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        for (const q of SCREENING_INSTRUMENTS[id].questions) {
          expect(typeof q.index).toBe('number');
          expect(typeof q.text).toBe('string');
          expect(Array.isArray(q.responseOptions)).toBe(true);
          expect(q.responseOptions.length).toBeGreaterThan(0);
          for (const opt of q.responseOptions) {
            expect(typeof opt.label).toBe('string');
            expect(typeof opt.value).toBe('number');
          }
        }
      }
    });
  });

  describe('AE-TRIAGE specifics', () => {
    it('has 3 questions', () => {
      expect(SCREENING_INSTRUMENTS['AE-TRIAGE'].questions).toHaveLength(3);
    });

    it('has maxScore of 9 and threshold of 3', () => {
      expect(SCREENING_INSTRUMENTS['AE-TRIAGE'].maxScore).toBe(9);
      expect(SCREENING_INSTRUMENTS['AE-TRIAGE'].positiveThreshold).toBe(3);
    });

    it('is regulatory reportable', () => {
      expect(SCREENING_INSTRUMENTS['AE-TRIAGE'].regulatoryReportable).toBe(true);
    });

    it('requires escalation', () => {
      expect(SCREENING_INSTRUMENTS['AE-TRIAGE'].requiresEscalation).toBe(true);
    });
  });

  describe('C-SSRS-LITE specifics', () => {
    it('has 2 questions', () => {
      expect(SCREENING_INSTRUMENTS['C-SSRS-LITE'].questions).toHaveLength(2);
    });

    it('has maxScore of 2 and threshold of 1', () => {
      expect(SCREENING_INSTRUMENTS['C-SSRS-LITE'].maxScore).toBe(2);
      expect(SCREENING_INSTRUMENTS['C-SSRS-LITE'].positiveThreshold).toBe(1);
    });

    it('requires escalation', () => {
      expect(SCREENING_INSTRUMENTS['C-SSRS-LITE'].requiresEscalation).toBe(true);
    });

    it('is regulatory reportable', () => {
      expect(SCREENING_INSTRUMENTS['C-SSRS-LITE'].regulatoryReportable).toBe(true);
    });
  });

  describe('TETRAS-LITE specifics', () => {
    it('has 2 questions', () => {
      expect(SCREENING_INSTRUMENTS['TETRAS-LITE'].questions).toHaveLength(2);
    });

    it('has maxScore of 8 and threshold of 4', () => {
      expect(SCREENING_INSTRUMENTS['TETRAS-LITE'].maxScore).toBe(8);
      expect(SCREENING_INSTRUMENTS['TETRAS-LITE'].positiveThreshold).toBe(4);
    });

    it('does not require escalation', () => {
      expect(SCREENING_INSTRUMENTS['TETRAS-LITE'].requiresEscalation).toBe(false);
    });

    it('is not regulatory reportable', () => {
      expect(SCREENING_INSTRUMENTS['TETRAS-LITE'].regulatoryReportable).toBe(false);
    });
  });

  describe('MMAS-4 specifics', () => {
    it('has 4 questions', () => {
      expect(SCREENING_INSTRUMENTS['MMAS-4'].questions).toHaveLength(4);
    });

    it('has maxScore of 4 and threshold of 1', () => {
      expect(SCREENING_INSTRUMENTS['MMAS-4'].maxScore).toBe(4);
      expect(SCREENING_INSTRUMENTS['MMAS-4'].positiveThreshold).toBe(1);
    });

    it('does not require escalation', () => {
      expect(SCREENING_INSTRUMENTS['MMAS-4'].requiresEscalation).toBe(false);
    });

    it('is not regulatory reportable', () => {
      expect(SCREENING_INSTRUMENTS['MMAS-4'].regulatoryReportable).toBe(false);
    });
  });

  describe('getScreeningInstrument', () => {
    it('returns correct instrument for each valid ID', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = getScreeningInstrument(id);
        expect(inst.id).toBe(id);
      }
    });

    it('throws for unknown instrument ID', () => {
      expect(() => getScreeningInstrument('UNKNOWN-INSTRUMENT')).toThrowError(
        'Unknown screening instrument: UNKNOWN-INSTRUMENT',
      );
    });

    it('throws for empty string', () => {
      expect(() => getScreeningInstrument('')).toThrowError(
        'Unknown screening instrument: ',
      );
    });
  });

  describe('isPositiveScreen', () => {
    it('AE-TRIAGE: positive at threshold 3', () => {
      expect(isPositiveScreen('AE-TRIAGE', 3)).toBe(true);
      expect(isPositiveScreen('AE-TRIAGE', 2)).toBe(false);
      expect(isPositiveScreen('AE-TRIAGE', 9)).toBe(true);
      expect(isPositiveScreen('AE-TRIAGE', 0)).toBe(false);
    });

    it('C-SSRS-LITE: positive at threshold 1', () => {
      expect(isPositiveScreen('C-SSRS-LITE', 1)).toBe(true);
      expect(isPositiveScreen('C-SSRS-LITE', 0)).toBe(false);
      expect(isPositiveScreen('C-SSRS-LITE', 2)).toBe(true);
    });

    it('TETRAS-LITE: positive at threshold 4', () => {
      expect(isPositiveScreen('TETRAS-LITE', 4)).toBe(true);
      expect(isPositiveScreen('TETRAS-LITE', 3)).toBe(false);
      expect(isPositiveScreen('TETRAS-LITE', 8)).toBe(true);
      expect(isPositiveScreen('TETRAS-LITE', 0)).toBe(false);
    });

    it('MMAS-4: positive at threshold 1', () => {
      expect(isPositiveScreen('MMAS-4', 1)).toBe(true);
      expect(isPositiveScreen('MMAS-4', 0)).toBe(false);
      expect(isPositiveScreen('MMAS-4', 4)).toBe(true);
    });
  });

  describe('getInterpretation', () => {
    it('returns positive interpretation when score meets threshold', () => {
      const result = getInterpretation('AE-TRIAGE', 5);
      expect(result).toContain('Potential adverse event detected');
    });

    it('returns negative interpretation when score below threshold', () => {
      const result = getInterpretation('AE-TRIAGE', 1);
      expect(result).toContain('No significant adverse event indicators');
    });

    it('C-SSRS-LITE positive interpretation mentions IMMEDIATE escalation', () => {
      const result = getInterpretation('C-SSRS-LITE', 1);
      expect(result).toContain('IMMEDIATE escalation');
    });

    it('C-SSRS-LITE negative interpretation mentions no immediate escalation', () => {
      const result = getInterpretation('C-SSRS-LITE', 0);
      expect(result).toContain('Negative suicidal ideation screen');
    });

    it('TETRAS-LITE positive interpretation mentions suboptimal control', () => {
      const result = getInterpretation('TETRAS-LITE', 5);
      expect(result).toContain('suboptimal control');
    });

    it('MMAS-4 positive interpretation mentions non-adherence', () => {
      const result = getInterpretation('MMAS-4', 2);
      expect(result).toContain('Non-adherence');
    });

    it('MMAS-4 negative interpretation mentions high adherence', () => {
      const result = getInterpretation('MMAS-4', 0);
      expect(result).toContain('High medication adherence');
    });
  });

  describe('buildScreeningPromptBlock', () => {
    it('returns empty string for no screenings', () => {
      expect(buildScreeningPromptBlock([])).toBe('');
    });

    it('generates non-empty content for a single screening', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'AE-TRIAGE', reason: 'SYMPTOM_SEARCH signal', priority: 1 },
      ]);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('AE-TRIAGE');
      expect(result).toContain('Adverse Event Triage Screen');
      expect(result).toContain('SYMPTOM_SEARCH signal');
    });

    it('includes question text and response options', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'MMAS-4', reason: 'Adherence check', priority: 1 },
      ]);
      expect(result).toContain('Q1:');
      expect(result).toContain('Do you sometimes forget to take your medication?');
    });

    it('includes positive threshold information', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'C-SSRS-LITE', reason: 'FDA requirement', priority: 1 },
      ]);
      expect(result).toContain('Positive threshold: score >= 1 out of 2');
    });

    it('includes REGULATORY NOTE for reportable instruments', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'AE-TRIAGE', reason: 'AE detection', priority: 1 },
      ]);
      expect(result).toContain('REGULATORY NOTE');
    });

    it('does not include REGULATORY NOTE for non-reportable instruments', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'TETRAS-LITE', reason: 'Tremor assessment', priority: 1 },
      ]);
      expect(result).not.toContain('REGULATORY NOTE');
    });

    it('limits to a maximum of 2 screenings', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'AE-TRIAGE', reason: 'Reason 1', priority: 1 },
        { instrumentId: 'C-SSRS-LITE', reason: 'Reason 2', priority: 2 },
        { instrumentId: 'MMAS-4', reason: 'Reason 3', priority: 3 },
      ]);
      expect(result).toContain('SCREENING 1');
      expect(result).toContain('SCREENING 2');
      expect(result).not.toContain('SCREENING 3');
    });

    it('includes conversational preamble', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'MMAS-4', reason: 'Adherence', priority: 1 },
      ]);
      expect(result).toContain('Preamble:');
    });

    it('includes closing messages for positive and negative', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'MMAS-4', reason: 'Adherence', priority: 1 },
      ]);
      expect(result).toContain('If POSITIVE:');
      expect(result).toContain('If NEGATIVE:');
    });
  });

  // -------------------------------------------------------------------------
  // Pharmacovigilance & Safety — Extended Tests
  // -------------------------------------------------------------------------

  describe('C-SSRS-LITE regulatory terminology', () => {
    // The C-SSRS description was updated to remove "black box warning"
    // language and replace it with proper "FDA class" terminology.
    // "Black box warning" is informal slang; FDA communications should
    // reference the formal "class-wide safety monitoring requirements."

    it('should not contain "black box warning" in description', () => {
      const cssrs = SCREENING_INSTRUMENTS['C-SSRS-LITE'];
      expect(cssrs.description.toLowerCase()).not.toContain('black box warning');
    });

    it('should contain "FDA class" language in description', () => {
      // The description should reference the FDA class-wide requirement
      // for suicidal ideation monitoring on anti-epileptic drugs.
      const cssrs = SCREENING_INSTRUMENTS['C-SSRS-LITE'];
      expect(cssrs.description).toContain('FDA class');
    });

    it('should not reference "black box" in conversationalPreamble', () => {
      // Patient-facing language must never use alarming regulatory jargon
      // like "black box" — it could cause unnecessary distress and is
      // not how clinicians communicate with patients.
      const cssrs = SCREENING_INSTRUMENTS['C-SSRS-LITE'];
      expect(cssrs.conversationalPreamble.toLowerCase()).not.toContain('black box');
    });
  });

  describe('MMAS-4 aeInquiryTrigger field', () => {
    // The MMAS-4 instrument does NOT currently have an aeInquiryTrigger
    // field in ScreeningInstrumentDefinition. This test documents that
    // absence. If adherence screening should trigger AE inquiry in the
    // future, the field must be added to the type and instrument config.

    it('should not have an aeInquiryTrigger property (field does not exist in schema)', () => {
      const mmas4 = SCREENING_INSTRUMENTS['MMAS-4'] as unknown as Record<string, unknown>;
      expect(mmas4).not.toHaveProperty('aeInquiryTrigger');
    });
  });

  describe('instrument data integrity — all instruments', () => {
    it('should have maxScore > 0 for every instrument', () => {
      // A maxScore of 0 would make scoring meaningless and break
      // threshold-based clinical logic.
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(inst.maxScore).toBeGreaterThan(0);
      }
    });

    it('should have positiveThreshold <= maxScore for every instrument', () => {
      // If the threshold exceeds the maximum achievable score, no patient
      // could ever screen positive — a silent clinical safety failure.
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(inst.positiveThreshold).toBeLessThanOrEqual(inst.maxScore);
      }
    });

    it('should have non-empty conversationalPreamble for every instrument', () => {
      // The preamble introduces the screening to the patient. An empty
      // preamble would cause the agent to launch into questions without
      // context, violating informed consent best practices.
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(inst.conversationalPreamble.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty conversationalClosingPositive for every instrument', () => {
      // A positive screen closing is spoken when the patient may need
      // escalation or follow-up. An empty string would leave the patient
      // with no guidance after a concerning result.
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(inst.conversationalClosingPositive.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have non-empty conversationalClosingNegative for every instrument', () => {
      // Even negative results deserve a compassionate closing statement
      // to maintain rapport and encourage future engagement.
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(inst.conversationalClosingNegative.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('isPositiveScreen — exact boundary tests', () => {
    // Boundary tests verify the >= comparison at the exact threshold.
    // Off-by-one errors in threshold logic could cause missed safety
    // escalations (false negative) or unnecessary alarms (false positive).

    it('should return true at exact threshold for every instrument', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(isPositiveScreen(id, inst.positiveThreshold)).toBe(true);
      }
    });

    it('should return false at threshold minus one for every instrument', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        expect(isPositiveScreen(id, inst.positiveThreshold - 1)).toBe(false);
      }
    });
  });

  describe('getInterpretation — threshold boundary behavior', () => {
    // These tests confirm that getInterpretation returns the correct
    // clinical text at the exact boundary, complementing the existing
    // tests that use arbitrary above/below-threshold scores.

    it('should return positive interpretation text at exact threshold for every instrument', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        const result = getInterpretation(id, inst.positiveThreshold);
        expect(result).toBe(inst.positiveInterpretation);
      }
    });

    it('should return negative interpretation text below threshold for every instrument', () => {
      for (const id of ALL_INSTRUMENT_IDS) {
        const inst = SCREENING_INSTRUMENTS[id];
        const result = getInterpretation(id, inst.positiveThreshold - 1);
        expect(result).toBe(inst.negativeInterpretation);
      }
    });
  });

  describe('buildScreeningPromptBlock — MMAS-4 content', () => {
    // MMAS-4 does not have an aeInquiryTrigger field, so the prompt
    // block should NOT contain AE inquiry trigger text for MMAS-4.
    // This documents the current behavior and guards against accidental
    // addition of AE inquiry language to an adherence-only instrument.

    it('should not contain AE inquiry trigger text for MMAS-4', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'MMAS-4', reason: 'Adherence monitoring', priority: 1 },
      ]);
      expect(result).not.toContain('aeInquiryTrigger');
      expect(result).not.toContain('AE inquiry');
    });

    it('should include all 4 MMAS-4 questions in prompt block', () => {
      const result = buildScreeningPromptBlock([
        { instrumentId: 'MMAS-4', reason: 'Adherence monitoring', priority: 1 },
      ]);
      expect(result).toContain('Q1:');
      expect(result).toContain('Q2:');
      expect(result).toContain('Q3:');
      expect(result).toContain('Q4:');
    });

    it('should not include REGULATORY NOTE for MMAS-4', () => {
      // MMAS-4 is not regulatory reportable — adherence data is for
      // patient support, not pharmacovigilance reporting.
      const result = buildScreeningPromptBlock([
        { instrumentId: 'MMAS-4', reason: 'Adherence monitoring', priority: 1 },
      ]);
      expect(result).not.toContain('REGULATORY NOTE');
    });
  });

  // ---------------------------------------------------------------------------
  // Brand-aware screening instrument functions
  // ---------------------------------------------------------------------------

  describe('getScreeningInstruments (brand-aware)', () => {
    it('should include all 4 base instruments with default config', () => {
      const instruments = getScreeningInstruments();
      for (const id of ALL_INSTRUMENT_IDS) {
        expect(instruments).toHaveProperty(id);
      }
    });

    it('should include all 4 base instruments with Praxis config', () => {
      const praxisConfig = getBrandConfig('praxis');
      const instruments = getScreeningInstruments(praxisConfig);
      for (const id of ALL_INSTRUMENT_IDS) {
        expect(instruments).toHaveProperty(id);
        expect(instruments[id].id).toBe(id);
      }
    });

    it('should not duplicate base instruments even if brand config lists them', () => {
      const praxisConfig = getBrandConfig('praxis');
      const instruments = getScreeningInstruments(praxisConfig);
      // Praxis brand config lists AE-TRIAGE, C-SSRS-LITE, TETRAS-LITE, MMAS-4
      // These should all come from the base registry, not be duplicated
      expect(instruments['AE-TRIAGE']).toBe(SCREENING_INSTRUMENTS['AE-TRIAGE']);
    });
  });

  describe('getScreeningInstrumentIds (brand-aware)', () => {
    it('should return all 4 base instrument IDs with default config', () => {
      const ids = getScreeningInstrumentIds();
      for (const id of ALL_INSTRUMENT_IDS) {
        expect(ids).toContain(id);
      }
      expect(ids.length).toBeGreaterThanOrEqual(4);
    });

    it('should return all 4 base instrument IDs with Praxis config', () => {
      const praxisConfig = getBrandConfig('praxis');
      const ids = getScreeningInstrumentIds(praxisConfig);
      for (const id of ALL_INSTRUMENT_IDS) {
        expect(ids).toContain(id);
      }
    });
  });
});
