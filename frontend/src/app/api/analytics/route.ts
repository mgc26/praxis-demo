import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAnalytics } from '@/app/lib/seed-data';
import { getBrand } from '@/app/lib/brands';

type Period = 'today' | 'week' | 'all';
const VALID_PERIODS: Period[] = ['today', 'week', 'all'];

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const rawPeriod = searchParams.get('period') || 'all';
  const period: Period = VALID_PERIODS.includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : 'all';

  const brand = getBrand(searchParams.get('brandId') || '');

  try {
    const analytics = getAnalytics(period, brand);
    const response = NextResponse.json(analytics, { status: 200 });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('[analytics] Error generating analytics:', err);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
}
