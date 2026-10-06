import { NextResponse } from 'next/server';
import { requireRequestMember } from '../_lib/requestAuth';
import { CaseError, createCase, listCases } from '../_lib/cases';
import { errorResponse } from '../_lib/routeErrors';

export async function GET(request: Request) {
  try {
    const member = await requireRequestMember(request);
    const payload = await listCases(member);
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'Unable to load cases.', [CaseError]);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireRequestMember(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createCase(member, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error, 'Unable to create case.', [CaseError]);
  }
}
