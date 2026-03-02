import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../_lib/firebaseAdmin';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_CURRENCY = 'gbp';

function calculateFeePence(amountPence: number) {
  return Math.round(amountPence * 0.029 + 20);
}

export async function POST(request: Request) {
  if (!STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Missing ID token.' }, { status: 401 });

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: 'Invalid ID token.' }, { status: 401 });

  const { scnId } = (await request.json().catch(() => ({}))) as { scnId?: string };
  if (!scnId) return NextResponse.json({ error: 'Missing scnId.' }, { status: 400 });

  const teamId = process.env.TEAM_ID || 'rpu-social-fund';
  const memberSnap = await adminDb.doc(`teams/${teamId}/members/${decoded.uid}`).get();
  if (!memberSnap.exists) return NextResponse.json({ error: 'Unauthorised.' }, { status: 403 });

  const scnRef = adminDb.doc(`teams/${teamId}/scns/${scnId}`);
  const scnSnap = await scnRef.get();
  if (!scnSnap.exists) return NextResponse.json({ error: 'SCN not found.' }, { status: 404 });

  const scn = scnSnap.data()!;
  if (scn.accusedUserId !== decoded.uid && memberSnap.data()?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  const amountPence = Number(scn.amountPence || 0);
  const feePence = calculateFeePence(amountPence);
  const totalPence = amountPence + feePence;

  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mode: 'payment',
      success_url: `${baseUrl}/app/scn/${scnId}/?payment=success`,
      cancel_url: `${baseUrl}/app/scn/${scnId}/?payment=cancelled`,
      'line_items[0][price_data][currency]': STRIPE_PRICE_CURRENCY,
      'line_items[0][price_data][unit_amount]': String(totalPence),
      'line_items[0][price_data][product_data][name]': `Outstanding Contribution ${scnId}`,
      'line_items[0][quantity]': '1',
      'metadata[scnId]': scnId,
      'metadata[teamId]': teamId,
      'metadata[userId]': decoded.uid,
    }),
  });

  const stripePayload = await stripeRes.json();
  if (!stripeRes.ok) {
    return NextResponse.json({ error: stripePayload?.error?.message || 'Stripe session failed.' }, { status: 500 });
  }

  await scnRef.update({
    paymentMethod: 'stripe',
    status: 'awaiting_payment',
    stripeSessionId: stripePayload.id,
  });

  await adminDb.doc(`teams/${teamId}`).set(
    {
      pendingBalancePence: FieldValue.increment(scn.amountPence || 0),
    },
    { merge: true }
  );

  return NextResponse.json({ url: stripePayload.url });
}
