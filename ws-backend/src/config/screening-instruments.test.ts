import { describe, it, expect } from 'vitest';
import {
  SCREENING_INSTRUMENTS,
  getScreeningInstrument,
  isPositiveScreen,
  getInterpretation,
  buildScreeningPromptBlock,
} from './screening-instruments.js';
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
});
