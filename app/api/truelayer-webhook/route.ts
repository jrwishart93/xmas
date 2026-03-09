import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin';
import { getScnPaymentBreakdown } from '../_lib/scnAmount';
import { verifyTrueLayerWebhookSignature } from '../_lib/truelayer';

const PAID_EVENT_TYPES = new Set(['payment_executed', 'payment_settled']);

type TrueLayerWebhookPayload = {
  type?: string;
  event_type?: string;
  event_id?: string;
  payment_id?: string;
};

function getEventType(payload: TrueLayerWebhookPayload): string {
  if (typeof payload.type === 'string' && payload.type.length > 0) return payload.type;
  if (typeof payload.event_type === 'string' && payload.event_type.length > 0) return payload.event_type;
  return '';
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    await verifyTrueLayerWebhookSignature(request, rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let payload: TrueLayerWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TrueLayerWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const eventType = getEventType(payload);
  const paymentId = payload.payment_id;

  if (!eventType || !paymentId) {
    return NextResponse.json({ error: 'Missing event type or payment id.' }, { status: 400 });
  }

  if (!PAID_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const teamId = process.env.TEAM_ID || 'rpu-social-fund';
  const scnQuerySnap = await adminDb
    .collection(`teams/${teamId}/scns`)
    .where('truelayerPaymentId', '==', paymentId)
    .limit(1)
    .get();

  if (scnQuerySnap.empty) {
    return NextResponse.json({ received: true, ignored: true, reason: 'unknown_payment' });
  }

  const scnRef = scnQuerySnap.docs[0].ref;
  const teamRef = adminDb.doc(`teams/${teamId}`);

  try {
    await adminDb.runTransaction(async (tx) => {
      const scnSnap = await tx.get(scnRef);
      if (!scnSnap.exists) return;

      const scn = scnSnap.data()!;
      if (scn.status === 'paid') return;

      const paymentBreakdown = getScnPaymentBreakdown(scn);
      if (paymentBreakdown.originalAmountPence <= 0) {
        throw new Error('SCN amount is invalid.');
      }

      const reservedAmount = scn.pendingBalanceReserved
        ? Math.round(Number(scn.amountPence || paymentBreakdown.originalAmountPence || 0))
        : 0;

      const scnUpdate: Record<string, unknown> = {
        status: 'paid',
        paymentMethod: 'truelayer',
        amountPence: paymentBreakdown.currentAmountPence,
        amountPaidPence: paymentBreakdown.currentAmountPence,
        truelayerPaymentStatus: eventType,
        truelayerEventId: payload.event_id || null,
        paidAt: FieldValue.serverTimestamp(),
        pendingBalanceReserved: false,
      };

      if (paymentBreakdown.shouldPersistLatePenalty) {
        scnUpdate.latePenaltyAppliedAt = FieldValue.serverTimestamp();
      }

      tx.update(scnRef, scnUpdate);

      const teamUpdate: Record<string, unknown> = {
        confirmedBalancePence: FieldValue.increment(paymentBreakdown.currentAmountPence),
      };
      if (reservedAmount > 0) {
        teamUpdate.pendingBalancePence = FieldValue.increment(-1 * reservedAmount);
      }

      tx.set(teamRef, teamUpdate, { merge: true });
    });
  } catch (error) {
    console.error('TrueLayer webhook processing failed:', error);
    const message = error instanceof Error ? error.message : 'Unable to process webhook.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
