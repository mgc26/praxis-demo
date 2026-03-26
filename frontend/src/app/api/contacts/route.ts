import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getContactQueue } from '@/app/lib/seed-data';
import { getBrand } from '@/app/lib/brands';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brand = getBrand(searchParams.get('brandId') || '');

  try {
    const contacts = getContactQueue(brand);
    const response = NextResponse.json({ contacts }, { status: 200 });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('[contacts] Error fetching contact queue:', err);
    return NextResponse.json({ error: 'Failed to fetch contact queue' }, { status: 500 });
  }
}
