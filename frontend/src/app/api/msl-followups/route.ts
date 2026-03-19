import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMSLFollowUpRequests } from '@/app/lib/seed-data';
import { getBrand } from '@/app/lib/brands';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const brandId = new URL(request.url).searchParams.get('brandId');
    const brand = brandId ? getBrand(brandId) : undefined;
    const requests = getMSLFollowUpRequests(brand);
    return NextResponse.json({ requests }, { status: 200 });
  } catch (err) {
    console.error('[msl-followups] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch MSL follow-up requests' }, { status: 500 });
  }
}
