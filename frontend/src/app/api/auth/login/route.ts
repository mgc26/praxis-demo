import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.DASHBOARD_PASSWORD || 'praxis2026';

  if (typeof password !== 'string' || password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = uuidv4();
  const cookieStore = await cookies();
  cookieStore.set('praxis_session', session, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return NextResponse.json({ ok: true });
}
