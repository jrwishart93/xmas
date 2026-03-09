import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../../_lib/firebaseAdmin';
import { getScnAmountPence } from '../../_lib/scnAmount';

type SetPaymentMethodBody = {
  scnId?: string;
  paymentMethod?: string;
  bankReference?: string | null;
};

function normalizeBankReference(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 64) : null;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Missing ID token.' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: 'Invalid ID token.' }, { status: 401 });

  const { scnId, paymentMethod, bankReference } = (await request.json().catch(() => ({}))) as SetPaymentMethodBody;
  if (!scnId) return NextResponse.json({ error: 'Missing scnId.' }, { status: 400 });
  if (paymentMethod !== 'bank_transfer') {
    return NextResponse.json({ error: 'Unsupported payment method.' }, { status: 400 });
  }

  const teamId = process.env.TEAM_ID || 'rpu-social-fund';
  const memberRef = adminDb.doc(`teams/${teamId}/members/${decoded.uid}`);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) return NextResponse.json({ error: 'Unauthorised.' }, { status: 403 });

  const scnRef = adminDb.doc(`teams/${teamId}/scns/${scnId}`);
  const teamRef = adminDb.doc(`teams/${teamId}`);
  const scnSnap = await scnRef.get();
  if (!scnSnap.exists) return NextResponse.json({ error: 'SCN not found.' }, { status: 404 });

  const scn = scnSnap.data()!;
  if (scn.accusedUserId !== decoded.uid && memberSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const amountPence = getScnAmountPence(scn);
  if (amountPence <= 0) {
    return NextResponse.json(
      { error: 'SCN amount is invalid. Ensure the case has a monetary amount.' },
      { status: 400 }
    );
  }

  try {
    await adminDb.runTransaction(async (tx) => {
      const latestSnap = await tx.get(scnRef);
      if (!latestSnap.exists) throw new Error('SCN not found.');

      const latestScn = latestSnap.data()!;
      if (latestScn.status === 'paid') {
        throw new Error('SCN is already paid.');
      }

      const pendingIncrement = latestScn.pendingBalanceReserved === true ? 0 : amountPence;

      tx.update(scnRef, {
        paymentMethod: 'bank_transfer',
        status: 'awaiting_payment',
        bankReference: normalizeBankReference(bankReference),
        pendingBalanceReserved: true,
        truelayerRequestedAt: FieldValue.delete(),
        truelayerRequestKey: FieldValue.delete(),
      });

      if (pendingIncrement > 0) {
        tx.set(
          teamRef,
          {
            pendingBalancePence: FieldValue.increment(pendingIncrement),
          },
          { merge: true }
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update payment method.';
    const status = message.includes('already paid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
