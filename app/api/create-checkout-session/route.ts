import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../_lib/firebaseAdmin';
import { getScnAmountPence } from '../_lib/scnAmount';
import { createHostedPayment, getPaymentDisplayConfig, getTrueLayerPaymentConfigError } from '../_lib/truelayer';

function buildBeneficiaryReference(scnId: string, uid: string): string {
  const safeScn = scnId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-8);
  const safeUid = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  return `SCN${safeScn}${safeUid}`.slice(0, 18);
}

export async function POST(request: Request) {
  const configError = getTrueLayerPaymentConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const paymentConfig = getPaymentDisplayConfig();
  if (!paymentConfig.paymentMethods.openBanking) {
    return NextResponse.json({ error: 'Open Banking payments are currently disabled.' }, { status: 503 });
  }

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
  if (!memberSnap.exists) return NextResponse.json({ error: 'Unauthorised.' }, { status: 403 });

  const scnRef = adminDb.doc(`teams/${teamId}/scns/${scnId}`);
  const teamRef = adminDb.doc(`teams/${teamId}`);
  const scnSnap = await scnRef.get();
  if (!scnSnap.exists) return NextResponse.json({ error: 'SCN not found.' }, { status: 404 });

  const scn = scnSnap.data()!;
  if (scn.accusedUserId !== decoded.uid && memberSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (scn.status === 'paid') {
    return NextResponse.json({ error: 'SCN is already paid.' }, { status: 400 });
  }

  const amountPence = getScnAmountPence(scn);
  if (amountPence <= 0) {
    return NextResponse.json(
      { error: 'SCN amount is invalid. Ensure the case has a monetary amount.' },
      { status: 400 }
    );
  }

  const member = memberSnap.data() as { displayName?: string; email?: string } | undefined;
  const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;

  try {
    const result = await createHostedPayment({
      amountInMinor: amountPence,
      currency: 'GBP',
      beneficiaryReference: buildBeneficiaryReference(scnId, decoded.uid),
      userId: decoded.uid,
      userName: member?.displayName || decoded.name || decoded.email || decoded.uid,
      userEmail: decoded.email || member?.email || null,
      metadata: {
        scnId,
        teamId,
        userId: decoded.uid,
      },
      returnUri: `${baseUrl}/app/scn/${scnId}/?payment=return`,
    });

    await adminDb.runTransaction(async (tx) => {
      const latestSnap = await tx.get(scnRef);
      if (!latestSnap.exists) throw new Error('SCN not found');

      const latestScn = latestSnap.data()!;
      if (latestScn.status === 'paid') {
        throw new Error('SCN is already paid.');
      }

      const pendingIncrement = latestScn.status === 'awaiting_payment' ? 0 : amountPence;

      tx.update(scnRef, {
        paymentMethod: 'truelayer',
        status: 'awaiting_payment',
        truelayerPaymentId: result.paymentId,
        truelayerPaymentStatus: 'authorization_required',
        truelayerRedirectUrl: result.hostedPageUrl,
        truelayerRequestedAt: FieldValue.serverTimestamp(),
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

    return NextResponse.json({ url: result.hostedPageUrl, paymentId: result.paymentId });
  } catch (error) {
    console.error('TrueLayer payment creation failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to create payment.';
    const status = message.includes('already paid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
