import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getFilteredCalls } from '@/app/lib/seed-data';
import type { InteractionOutcome, PriorityTier, AgentType } from '@/app/lib/types';
import { getBrand } from '@/app/lib/brands';
import { getOutcomeLabels } from '@/app/lib/constants';

const VALID_PRIORITY_TIERS: PriorityTier[] = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_AGENT_TYPES: AgentType[] = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'];

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const brand = getBrand(searchParams.get('brandId') || '');
  const validOutcomes = Object.keys(getOutcomeLabels(brand)) as InteractionOutcome[];
  const validPathways = brand.supportPathways.map(sp => sp.id);
  const validTAs = brand.therapeuticAreas.map(ta => ta.id);

  const supportPathway = searchParams.get('supportPathway') || undefined;
  const outcomeParam = searchParams.get('outcome') || undefined;
  const priorityTierParam = searchParams.get('priorityTier') || undefined;
  const agentTypeParam = searchParams.get('agentType') || undefined;
  const therapeuticAreaParam = searchParams.get('therapeuticArea') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

  if (supportPathway && !validPathways.includes(supportPathway)) {
    return NextResponse.json({ error: 'Invalid supportPathway' }, { status: 400 });
  }
  if (outcomeParam && !validOutcomes.includes(outcomeParam as InteractionOutcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 });
  }
  if (priorityTierParam && !VALID_PRIORITY_TIERS.includes(priorityTierParam as PriorityTier)) {
    return NextResponse.json({ error: 'Invalid priorityTier' }, { status: 400 });
  }
  if (agentTypeParam && !VALID_AGENT_TYPES.includes(agentTypeParam as AgentType)) {
    return NextResponse.json({ error: 'Invalid agentType' }, { status: 400 });
  }
  if (therapeuticAreaParam && !validTAs.includes(therapeuticAreaParam)) {
    return NextResponse.json({ error: 'Invalid therapeuticArea' }, { status: 400 });
  }

  try {
    const result = getFilteredCalls({
      supportPathway,
      outcome: outcomeParam,
      priorityTier: priorityTierParam,
      agentType: agentTypeParam,
      therapeuticArea: therapeuticAreaParam,
      search,
      page,
      limit,
    }, brand);

    const response = NextResponse.json(result, { status: 200 });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return response;
  } catch (err) {
    console.error('[calls] Error fetching calls:', err);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
