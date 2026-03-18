export function normalizeAnsweredBy(answeredBy?: string | null): string | null {
  if (!answeredBy) return null;
  return answeredBy.trim().toLowerCase() || null;
}

export function isMachineAnsweredBy(answeredBy?: string | null): boolean {
  const normalized = normalizeAnsweredBy(answeredBy);
  return normalized?.startsWith('machine') ?? false;
}

export function isHumanAnsweredBy(answeredBy?: string | null): boolean {
  return normalizeAnsweredBy(answeredBy) === 'human';
}
