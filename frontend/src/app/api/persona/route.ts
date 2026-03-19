import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getPersona, setPersona, resetPersona, resetAllPersonas, initializeFromBrand } from '@/app/lib/persona-store';
import { getBrand } from '@/app/lib/brands';
import type { AgentType } from '@/app/lib/types';

const VALID_AGENT_TYPES: AgentType[] = ['patient-support', 'hcp-support', 'hcp-outbound', 'medcomms-qa'];

async function requireAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('praxis_session');
  if (!session?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * If the request carries a brandId query param, re-initialize the persona
 * store with that brand's agent personas (names, greetings, etc.).
 */
function applyBrandIfPresent(request: NextRequest): void {
  const brandId = new URL(request.url).searchParams.get('brandId');
  if (brandId) {
    initializeFromBrand(getBrand(brandId));
  }
}

export async function GET(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  applyBrandIfPresent(request);

  const { searchParams } = new URL(request.url);
  const agentType = searchParams.get('agentType') as AgentType | null;

  if (agentType && VALID_AGENT_TYPES.includes(agentType)) {
    return NextResponse.json(getPersona(agentType));
  }

  return NextResponse.json(getPersona());
}

export async function PUT(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.brandId && typeof body.brandId === 'string') {
    initializeFromBrand(getBrand(body.brandId));
  }

  const agentType = body.agentType as AgentType;
  if (!agentType || !VALID_AGENT_TYPES.includes(agentType)) {
    return NextResponse.json({ error: 'Valid agentType required' }, { status: 400 });
  }

  const updated = setPersona(agentType, body);
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  applyBrandIfPresent(request);

  const { searchParams } = new URL(request.url);
  const agentType = searchParams.get('agentType') as AgentType | null;

  if (agentType && VALID_AGENT_TYPES.includes(agentType)) {
    const reset = resetPersona(agentType);
    return NextResponse.json(reset);
  }

  const allReset = resetAllPersonas();
  return NextResponse.json(allReset);
}
