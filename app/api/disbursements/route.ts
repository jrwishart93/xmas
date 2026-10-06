import { NextResponse } from 'next/server';
import { requireRequestMember } from '../_lib/requestAuth';
import { createDisbursement, deleteDisbursement, DisbursementError, listDisbursements } from '../_lib/disbursements';
import { errorResponse } from '../_lib/routeErrors';

export async function GET(request: Request) {
  try {
    const member = await requireRequestMember(request);
    const payload = await listDisbursements();
    return NextResponse.json({ ...payload, canManage: member.role === 'admin' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error, 'Unable to load spending.', [DisbursementError]);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireRequestMember(request, { requireAdmin: true });
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json({ ok: true, ...(await createDisbursement(member, body)) });
  } catch (error) {
    return errorResponse(error, 'Unable to record spending.', [DisbursementError]);
  }
}

export async function DELETE(request: Request) {
  try {
    const member = await requireRequestMember(request, { requireAdmin: true });
    const id = new URL(request.url).searchParams.get('id');
    await deleteDisbursement(member, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 'Unable to remove spending.', [DisbursementError]);
  }
}
