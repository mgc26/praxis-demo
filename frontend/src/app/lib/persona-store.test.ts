import { describe, it, expect, beforeEach } from 'vitest';
import { getPersona, setPersona, resetPersona, resetAllPersonas } from './persona-store';
import { DEFAULT_PERSONAS } from './constants';
import type { AgentPersona, AgentType } from './types';

const AGENT_TYPES: AgentType[] = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'];

describe('persona-store', () => {
  // Reset to defaults before each test to ensure isolation
  beforeEach(() => {
    resetAllPersonas();
  });

  // -------------------------------------------------------------------------
  // getPersona
  // -------------------------------------------------------------------------
  describe('getPersona', () => {
    it('returns all 4 personas when called without arguments', () => {
      const result = getPersona() as Record<AgentType, AgentPersona>;
      for (const at of AGENT_TYPES) {
        expect(result).toHaveProperty(at);
        expect(result[at].agentType).toBe(at);
      }
    });

    it.each(AGENT_TYPES)('returns the default persona for %s', (at) => {
      const persona = getPersona(at) as AgentPersona;
      expect(persona.name).toBe(DEFAULT_PERSONAS[at].name);
      expect(persona.agentType).toBe(at);
      expect(persona.warmth).toBe(DEFAULT_PERSONAS[at].warmth);
      expect(persona.empathy).toBe(DEFAULT_PERSONAS[at].empathy);
      expect(persona.clinicalDepth).toBe(DEFAULT_PERSONAS[at].clinicalDepth);
      expect(persona.formality).toBe(DEFAULT_PERSONAS[at].formality);
      expect(persona.greeting).toBe(DEFAULT_PERSONAS[at].greeting);
      expect(persona.signoff).toBe(DEFAULT_PERSONAS[at].signoff);
      expect(persona.language).toBe(DEFAULT_PERSONAS[at].language);
    });

    it('returns a copy, not the internal object', () => {
      const p1 = getPersona('patient-support') as AgentPersona;
      const p2 = getPersona('patient-support') as AgentPersona;
      expect(p1).toEqual(p2);
      expect(p1).not.toBe(p2); // different references
    });
  });

  // -------------------------------------------------------------------------
  // setPersona
  // -------------------------------------------------------------------------
  describe('setPersona', () => {
    it('updates name and returns the updated persona', () => {
      const updated = setPersona('patient-support', { name: 'Nova' });
      expect(updated.name).toBe('Nova');
      expect(updated.agentType).toBe('patient-support');

      // Verify persistence
      const retrieved = getPersona('patient-support') as AgentPersona;
      expect(retrieved.name).toBe('Nova');
    });

    it('updates numeric fields within 0-100 range', () => {
      const updated = setPersona('hcp-support', {
        warmth: 10,
        empathy: 20,
        clinicalDepth: 30,
        formality: 40,
      });
      expect(updated.warmth).toBe(10);
      expect(updated.empathy).toBe(20);
      expect(updated.clinicalDepth).toBe(30);
      expect(updated.formality).toBe(40);
    });

    it('clamps numeric values to 0-100', () => {
      const updated = setPersona('patient-support', {
        warmth: -10,
        empathy: 200,
      });
      expect(updated.warmth).toBe(0);
      expect(updated.empathy).toBe(100);
    });

    it('updates greeting and signoff', () => {
      const updated = setPersona('hcp-outbound', {
        greeting: 'Hello world',
        signoff: 'Goodbye world',
      });
      expect(updated.greeting).toBe('Hello world');
      expect(updated.signoff).toBe('Goodbye world');
    });

    it('updates language to a valid value', () => {
      const updated = setPersona('patient-support', { language: 'es-US' });
      expect(updated.language).toBe('es-US');
    });

    it('rejects invalid language and keeps current', () => {
      const original = getPersona('patient-support') as AgentPersona;
      const updated = setPersona('patient-support', { language: 'xx-INVALID' });
      expect(updated.language).toBe(original.language);
    });

    it('updates escalationTriggers', () => {
      const updated = setPersona('patient-support', {
        escalationTriggers: ['trigger-a', 'trigger-b'],
      });
      expect(updated.escalationTriggers).toEqual(['trigger-a', 'trigger-b']);
    });

    it('updates guardrails', () => {
      const updated = setPersona('medcomms-qa', {
        guardrails: ['rule-1'],
      });
      expect(updated.guardrails).toEqual(['rule-1']);
    });

    it('does not affect other agent types', () => {
      const beforeHcp = getPersona('hcp-support') as AgentPersona;
      setPersona('patient-support', { name: 'Changed' });
      const afterHcp = getPersona('hcp-support') as AgentPersona;
      expect(afterHcp).toEqual(beforeHcp);
    });

    it('truncates name to 40 characters', () => {
      const longName = 'A'.repeat(60);
      const updated = setPersona('patient-support', { name: longName });
      expect(updated.name).toHaveLength(40);
    });

    it('truncates greeting to 300 characters', () => {
      const longGreeting = 'B'.repeat(500);
      const updated = setPersona('patient-support', { greeting: longGreeting });
      expect(updated.greeting).toHaveLength(300);
    });
  });

  // -------------------------------------------------------------------------
  // resetPersona
  // -------------------------------------------------------------------------
  describe('resetPersona', () => {
    it('resets a modified persona back to default', () => {
      setPersona('patient-support', { name: 'Modified', warmth: 10 });
      const reset = resetPersona('patient-support');
      expect(reset.name).toBe(DEFAULT_PERSONAS['patient-support'].name);
      expect(reset.warmth).toBe(DEFAULT_PERSONAS['patient-support'].warmth);
    });

    it('does not affect other agent types when resetting one', () => {
      setPersona('patient-support', { name: 'ModA' });
      setPersona('hcp-support', { name: 'ModB' });

      resetPersona('patient-support');

      const ps = getPersona('patient-support') as AgentPersona;
      const hcp = getPersona('hcp-support') as AgentPersona;
      expect(ps.name).toBe(DEFAULT_PERSONAS['patient-support'].name);
      expect(hcp.name).toBe('ModB');
    });
  });

  // -------------------------------------------------------------------------
  // resetAllPersonas
  // -------------------------------------------------------------------------
  describe('resetAllPersonas', () => {
    it('resets all agent types to defaults', () => {
      for (const at of AGENT_TYPES) {
        setPersona(at, { name: 'Modified' });
      }

      const result = resetAllPersonas();

      for (const at of AGENT_TYPES) {
        expect(result[at].name).toBe(DEFAULT_PERSONAS[at].name);
        expect(result[at].warmth).toBe(DEFAULT_PERSONAS[at].warmth);
      }
    });
  });
});
