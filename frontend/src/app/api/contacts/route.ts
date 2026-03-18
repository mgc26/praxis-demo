import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getContactQueue } from '@/app/lib/seed-data';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const contacts = getContactQueue();
    const response = NextResponse.json({ contacts }, { status: 200 });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('[contacts] Error fetching contact queue:', err);
    return NextResponse.json({ error: 'Failed to fetch contact queue' }, { status: 500 });
  }
}
