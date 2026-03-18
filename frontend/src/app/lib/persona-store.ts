import { DEFAULT_PERSONAS, LANGUAGES } from './constants';
import type { AgentPersona, AgentType } from './types';

const personas: Record<AgentType, AgentPersona> = {
  'patient-support': { ...DEFAULT_PERSONAS['patient-support'] },
  'hcp-support': { ...DEFAULT_PERSONAS['hcp-support'] },
  'hcp-outbound': { ...DEFAULT_PERSONAS['hcp-outbound'] },
  'medcomms-qa': { ...DEFAULT_PERSONAS['medcomms-qa'] },
};

const VALID_LANGUAGES: string[] = LANGUAGES.map((l) => l.value);

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeStringArray(raw: unknown, maxItems = 20): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((x): x is string => typeof x === 'string').slice(0, maxItems);
}

function sanitize(raw: Record<string, unknown>, current: AgentPersona): Partial<AgentPersona> {
  const clean: Partial<AgentPersona> = {};

  if ('name' in raw && typeof raw.name === 'string') {
    clean.name = raw.name.slice(0, 40) || current.name;
  }
  if ('language' in raw && typeof raw.language === 'string') {
    clean.language = VALID_LANGUAGES.includes(raw.language) ? raw.language : current.language;
  }
  if ('warmth' in raw) clean.warmth = clamp(raw.warmth, 0, 100, current.warmth);
  if ('empathy' in raw) clean.empathy = clamp(raw.empathy, 0, 100, current.empathy);
  if ('clinicalDepth' in raw) clean.clinicalDepth = clamp(raw.clinicalDepth, 0, 100, current.clinicalDepth);
  if ('formality' in raw) clean.formality = clamp(raw.formality, 0, 100, current.formality);
  if ('greeting' in raw && typeof raw.greeting === 'string') {
    clean.greeting = raw.greeting.slice(0, 300);
  }
  if ('signoff' in raw && typeof raw.signoff === 'string') {
    clean.signoff = raw.signoff.slice(0, 300);
  }
  if ('escalationTriggers' in raw) {
    const arr = sanitizeStringArray(raw.escalationTriggers, 10);
    if (arr !== undefined) clean.escalationTriggers = arr;
  }
  if ('guardrails' in raw) {
    const arr = sanitizeStringArray(raw.guardrails, 10);
    if (arr !== undefined) clean.guardrails = arr;
  }

  return clean;
}

export function getPersona(agentType?: AgentType): AgentPersona | Record<AgentType, AgentPersona> {
  if (agentType && agentType in personas) {
    return { ...personas[agentType] };
  }
  return Object.fromEntries(
    Object.entries(personas).map(([k, v]) => [k, { ...v }]),
  ) as Record<AgentType, AgentPersona>;
}

export function setPersona(agentType: AgentType, raw: Record<string, unknown>): AgentPersona {
  const current = personas[agentType];
  personas[agentType] = { ...current, ...sanitize(raw, current) };
  return { ...personas[agentType] };
}

export function resetPersona(agentType: AgentType): AgentPersona {
  personas[agentType] = { ...DEFAULT_PERSONAS[agentType] };
  return { ...personas[agentType] };
}

export function resetAllPersonas(): Record<AgentType, AgentPersona> {
  for (const key of Object.keys(DEFAULT_PERSONAS) as AgentType[]) {
    personas[key] = { ...DEFAULT_PERSONAS[key] };
  }
  return getPersona() as Record<AgentType, AgentPersona>;
}
