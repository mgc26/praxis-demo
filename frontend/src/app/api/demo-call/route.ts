import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/demo-call
 *
 * Proxies to the ws-backend to initiate a live call.
 * Falls back to a simulated response if backend is unreachable.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phoneNumber, scenarioId, persona, agentType } = body;

  if (!phoneNumber || !scenarioId) {
    return NextResponse.json({ error: 'Missing phoneNumber or scenarioId' }, { status: 400 });
  }

  const backendUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || process.env.WS_BACKEND_URL || 'http://localhost:8080';

  try {
    const res = await fetch(`${backendUrl}/api/demo-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, scenarioId, persona, agentType }),
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
    // Backend unreachable -- fall back to simulation
    return NextResponse.json(
      { status: 'simulated', message: 'Backend not connected, running in simulation mode' },
      { status: 200 },
    );
  }
}
