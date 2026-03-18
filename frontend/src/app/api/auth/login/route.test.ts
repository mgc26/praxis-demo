import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testing Next.js App Router API routes requires mocking NextRequest/NextResponse
 * and the `cookies()` async function from 'next/headers'.
 *
 * We mock at the module level so the route handler picks up our fakes.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock next/headers cookies()
const mockCookieSet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: mockCookieSet,
  })),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-session-uuid',
}));

// Import after mocks are set up
import { POST } from './route';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env var so default password applies
    delete process.env.DASHBOARD_PASSWORD;
  });

  it('returns 200 with correct default password', async () => {
    const req = makeRequest({ password: 'praxis2026' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it('sets a session cookie on success', async () => {
    const req = makeRequest({ password: 'praxis2026' });
    await POST(req);
    expect(mockCookieSet).toHaveBeenCalledWith('praxis_session', 'test-session-uuid', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  });

  it('returns 401 with wrong password', async () => {
    const req = makeRequest({ password: 'wrong-password' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when password is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is not a string', async () => {
    const req = makeRequest({ password: 12345 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('respects DASHBOARD_PASSWORD env var', async () => {
    process.env.DASHBOARD_PASSWORD = 'custom-secret';

    const reqBad = makeRequest({ password: 'praxis2026' });
    const resBad = await POST(reqBad);
    expect(resBad.status).toBe(401);

    const reqGood = makeRequest({ password: 'custom-secret' });
    const resGood = await POST(reqGood);
    expect(resGood.status).toBe(200);
    const data = await resGood.json();
    expect(data).toEqual({ ok: true });
  });
});
