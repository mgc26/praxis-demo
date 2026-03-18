import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The analytics GET route checks for a session cookie then delegates
 * to getAnalytics() from seed-data. We mock next/headers to control
 * the cookie, but let seed-data run for real so we validate the
 * actual analytics computation.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCookieGet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
    set: vi.fn(),
  })),
}));

// Import after mocks
import { GET } from './route';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/analytics');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GET /api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session cookie', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when session cookie has no value', async () => {
    mockCookieGet.mockReturnValue({ value: '' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid analytics when authenticated (period=all)', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    const res = await GET(makeRequest({ period: 'all' }));
    expect(res.status).toBe(200);

    const data = await res.json();

    // KPI fields
    expect(data.kpis).toBeDefined();
    expect(typeof data.kpis.totalInteractions).toBe('number');
    expect(data.kpis.totalInteractions).toBe(20);
    expect(typeof data.kpis.aeReportsCaptured).toBe('number');
    expect(typeof data.kpis.hubEnrollments).toBe('number');
    expect(typeof data.kpis.copayCardsIssued).toBe('number');
    expect(typeof data.kpis.hcpEngagements).toBe('number');
    expect(typeof data.kpis.adherenceRate).toBe('number');
    expect(typeof data.kpis.sampleRequests).toBe('number');
    expect(typeof data.kpis.avgHandleTime).toBe('number');
    expect(typeof data.kpis.engagementRate).toBe('number');
    expect(typeof data.kpis.medicalInquiries).toBe('number');

    // Distributions
    expect(data.outcomeDistribution).toBeDefined();
    expect(data.pathwayDistribution).toBeDefined();
    expect(data.priorityTierDistribution).toBeDefined();
    expect(data.agentTypeDistribution).toBeDefined();
    expect(data.therapeuticAreaDistribution).toBeDefined();

    // Daily trend
    expect(Array.isArray(data.dailyTrend)).toBe(true);
    expect(data.dailyTrend.length).toBe(7);

    // Top concerns
    expect(Array.isArray(data.topConcerns)).toBe(true);

    // Recent calls
    expect(Array.isArray(data.recentCalls)).toBe(true);
    expect(data.recentCalls.length).toBeLessThanOrEqual(10);
  });

  it('defaults to period "all" when no period param', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kpis.totalInteractions).toBe(20);
  });

  it('handles period "week"', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    const res = await GET(makeRequest({ period: 'week' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kpis.totalInteractions).toBeGreaterThanOrEqual(0);
  });

  it('handles period "today"', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    const res = await GET(makeRequest({ period: 'today' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kpis.totalInteractions).toBeGreaterThanOrEqual(0);
  });

  it('falls back to "all" for invalid period value', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    const res = await GET(makeRequest({ period: 'invalid-period' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    // Falls back to 'all' which returns all 20
    expect(data.kpis.totalInteractions).toBe(20);
  });

  it('sets cache-control headers', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    const res = await GET(makeRequest());
    expect(res.headers.get('Cache-Control')).toBe(
      'private, max-age=30, stale-while-revalidate=60',
    );
  });
});
