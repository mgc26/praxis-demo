import { describe, it, expect } from 'vitest';
import {
  normalizeAnsweredBy,
  isMachineAnsweredBy,
  isHumanAnsweredBy,
} from './answered-by.js';

describe('answered-by utilities', () => {
  describe('normalizeAnsweredBy', () => {
    it('returns null for undefined', () => {
      expect(normalizeAnsweredBy(undefined)).toBeNull();
    });

    it('returns null for null', () => {
      expect(normalizeAnsweredBy(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeAnsweredBy('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(normalizeAnsweredBy('   ')).toBeNull();
    });

    it('lowercases and trims the input', () => {
      expect(normalizeAnsweredBy('Human')).toBe('human');
      expect(normalizeAnsweredBy('  MACHINE_START  ')).toBe('machine_start');
      expect(normalizeAnsweredBy(' Human ')).toBe('human');
    });

    it('handles machine_start', () => {
      expect(normalizeAnsweredBy('machine_start')).toBe('machine_start');
    });

    it('handles machine_end_beep', () => {
      expect(normalizeAnsweredBy('machine_end_beep')).toBe('machine_end_beep');
    });

    it('handles arbitrary strings', () => {
      expect(normalizeAnsweredBy('unknown')).toBe('unknown');
    });
  });

  describe('isMachineAnsweredBy', () => {
    it('returns true for "machine_start"', () => {
      expect(isMachineAnsweredBy('machine_start')).toBe(true);
    });

    it('returns true for "machine_end_beep"', () => {
      expect(isMachineAnsweredBy('machine_end_beep')).toBe(true);
    });

    it('returns true for "Machine_start" (case insensitive)', () => {
      expect(isMachineAnsweredBy('Machine_start')).toBe(true);
    });

    it('returns true for " MACHINE_END_BEEP " (whitespace + case)', () => {
      expect(isMachineAnsweredBy(' MACHINE_END_BEEP ')).toBe(true);
    });

    it('returns false for "human"', () => {
      expect(isMachineAnsweredBy('human')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isMachineAnsweredBy(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isMachineAnsweredBy(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isMachineAnsweredBy('')).toBe(false);
    });

    it('returns false for "unknown"', () => {
      expect(isMachineAnsweredBy('unknown')).toBe(false);
    });
  });

  describe('isHumanAnsweredBy', () => {
    it('returns true for "human"', () => {
      expect(isHumanAnsweredBy('human')).toBe(true);
    });

    it('returns true for "Human" (case insensitive)', () => {
      expect(isHumanAnsweredBy('Human')).toBe(true);
    });

    it('returns true for " HUMAN " (whitespace + case)', () => {
      expect(isHumanAnsweredBy(' HUMAN ')).toBe(true);
    });

    it('returns false for "machine_start"', () => {
      expect(isHumanAnsweredBy('machine_start')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isHumanAnsweredBy(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isHumanAnsweredBy(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isHumanAnsweredBy('')).toBe(false);
    });

    it('returns false for "unknown"', () => {
      expect(isHumanAnsweredBy('unknown')).toBe(false);
    });

    it('returns false for "human_start" (only exact "human" matches)', () => {
      expect(isHumanAnsweredBy('human_start')).toBe(false);
    });
  });
});
