import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCallById } from '@/app/lib/seed-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
  }

  try {
    const call = getCallById(id);

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const response = NextResponse.json(call, { status: 200 });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error(`[calls/${id}] Error fetching call detail:`, err);
    return NextResponse.json({ error: 'Failed to fetch call details' }, { status: 500 });
  }
}
