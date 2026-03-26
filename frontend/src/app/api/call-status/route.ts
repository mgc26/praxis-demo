import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/call-status?callSid=xxx
 *
 * Proxies to the ws-backend to retrieve live call status.
 * Falls back gracefully if backend is unreachable.
 */
export async function GET(request: NextRequest) {
  const callSid = request.nextUrl.searchParams.get('callSid');

  if (!callSid) {
    return NextResponse.json({ error: 'Missing callSid parameter' }, { status: 400 });
  }

  const backendUrl = process.env.WS_BACKEND_URL || process.env.NEXT_PUBLIC_WS_BACKEND_URL || 'http://localhost:8080';

  try {
    const res = await fetch(`${backendUrl}/api/call-status?callSid=${encodeURIComponent(callSid)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errorText = await res.text().catch(() => 'Unknown error');
    return NextResponse.json(
      { status: 'error', message: `Backend error (${res.status}): ${errorText}` },
      { status: res.status },
    );
  } catch {
    // Backend unreachable -- return unknown status
    return NextResponse.json(
      { status: 'unknown', message: 'Backend not reachable' },
      { status: 200 },
    );
  }
}
