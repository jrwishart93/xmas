import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../../_lib/firebaseAdmin';
import { getScnAmountPence } from '../../_lib/scnAmount';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Missing ID token.' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: 'Invalid ID token.' }, { status: 401 });

  const { scnId } = (await request.json().catch(() => ({}))) as { scnId?: string };
  if (!scnId) return NextResponse.json({ error: 'Missing scnId.' }, { status: 400 });

  const teamId = process.env.TEAM_ID || 'rpu-social-fund';
  const memberRef = adminDb.doc(`teams/${teamId}/members/${decoded.uid}`);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists || memberSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const scnRef = adminDb.doc(`teams/${teamId}/scns/${scnId}`);
  const teamRef = adminDb.doc(`teams/${teamId}`);

  await adminDb.runTransaction(async (tx) => {
    const scnSnap = await tx.get(scnRef);
    if (!scnSnap.exists) throw new Error('SCN not found');

    const scn = scnSnap.data()!;
    const amountPence = getScnAmountPence(scn);
    if (amountPence <= 0) {
      throw new Error('SCN amount is invalid.');
    }

    if (scn.paymentMethod !== 'bank_transfer' || scn.status !== 'awaiting_payment') {
      throw new Error('SCN is not awaiting bank transfer confirmation');
    }

    tx.update(scnRef, {
      status: 'paid',
      paidAt: FieldValue.serverTimestamp(),
    });

    tx.set(
      teamRef,
      {
        confirmedBalancePence: FieldValue.increment(amountPence),
        pendingBalancePence: FieldValue.increment(-1 * amountPence),
      },
      { merge: true }
    );
  });

  return NextResponse.json({ ok: true });
}
