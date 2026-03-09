import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin';
import { getScnPaymentBreakdown } from '../_lib/scnAmount';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function verifySignature(payload: string, signatureHeader: string | null) {
  if (!signatureHeader || !STRIPE_WEBHOOK_SECRET) return false;
  const entries = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=')));
  const timestamp = entries.t;
  const signature = entries.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET).update(signedPayload).digest('hex');
  if (expected.length != signature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function fetchCheckoutSession(sessionId: string) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return response.json();
}

export async function POST(request: Request) {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data?.object;
  const hydrated = await fetchCheckoutSession(session.id);
  const scnId = hydrated?.metadata?.scnId;
  const teamId = hydrated?.metadata?.teamId;

  if (!scnId || !teamId) {
    return NextResponse.json({ error: 'Missing metadata.' }, { status: 400 });
  }

  const scnRef = adminDb.doc(`teams/${teamId}/scns/${scnId}`);
  const teamRef = adminDb.doc(`teams/${teamId}`);

  await adminDb.runTransaction(async (tx) => {
    const scnSnap = await tx.get(scnRef);
    if (!scnSnap.exists) throw new Error('SCN not found');

    const scn = scnSnap.data()!;
    if (scn.status === 'paid') return;

    const paymentBreakdown = getScnPaymentBreakdown(scn);
    const reservedAmount = scn.pendingBalanceReserved
      ? Math.round(Number(scn.amountPence || paymentBreakdown.originalAmountPence || 0))
      : 0;

    const scnUpdate: Record<string, unknown> = {
      status: 'paid',
      paymentMethod: 'stripe',
      amountPence: paymentBreakdown.currentAmountPence,
      amountPaidPence: paymentBreakdown.currentAmountPence,
      stripePaymentIntentId: hydrated.payment_intent || null,
      paidAt: FieldValue.serverTimestamp(),
      pendingBalanceReserved: false,
    };

    if (paymentBreakdown.shouldPersistLatePenalty) {
      scnUpdate.latePenaltyAppliedAt = FieldValue.serverTimestamp();
    }

    tx.update(scnRef, scnUpdate);

    tx.set(
      teamRef,
      {
        confirmedBalancePence: FieldValue.increment(paymentBreakdown.currentAmountPence),
        pendingBalancePence: FieldValue.increment(-1 * reservedAmount),
      },
      { merge: true }
    );
  });

  return NextResponse.json({ received: true });
}
