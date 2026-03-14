import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../_lib/firebaseAdmin';
import { requireRequestMember, RequestAuthError } from '../../_lib/requestAuth';
import { TEAM_ID, teamPath } from '../../../../lib/team';

// Valid amounts matching the Monzo quick-pay links on the dashboard (in pence)
const VALID_AMOUNTS_PENCE = new Set([100, 200, 300, 400, 500]);

export async function POST(request: Request) {
  let member;
  try {
    member = await requireRequestMember(request);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const rawAmount =
    body !== null && typeof body === 'object' && 'amountPence' in body
      ? Number((body as Record<string, unknown>).amountPence)
      : NaN;

  if (!Number.isFinite(rawAmount) || !VALID_AMOUNTS_PENCE.has(rawAmount)) {
    return NextResponse.json(
      { error: 'Invalid amount. Must be £1, £2, £3, £4, or £5.' },
      { status: 400 }
    );
  }

  const amountPence = rawAmount;
  const adminDb = getAdminDb();
  const teamRef = adminDb.doc(teamPath());
  const ledgerRef = adminDb.collection('fundLedger').doc();

  try {
    await Promise.all([
      teamRef.set(
        {
          confirmedBalancePence: FieldValue.increment(amountPence),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      ),
      ledgerRef.set({
        teamId: TEAM_ID,
        type: 'payment',
        amount: amountPence / 100,
        amountPence,
        userId: member.uid,
        offenceCode: null,
        note: 'Monzo quick payment (self-declared)',
        createdBy: member.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);
  } catch {
    return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entryId: ledgerRef.id });
}
