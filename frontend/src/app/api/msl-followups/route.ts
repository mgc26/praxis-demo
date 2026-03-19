import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMSLFollowUpRequests } from '@/app/lib/seed-data';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requests = getMSLFollowUpRequests();
    return NextResponse.json({ requests }, { status: 200 });
  } catch (err) {
    console.error('[msl-followups] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch MSL follow-up requests' }, { status: 500 });
  }
}
