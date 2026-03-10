import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '../../_lib/firebaseAdmin';
import { getScnPaymentBreakdown } from '../../_lib/scnAmount';
import { requireRequestMember, RequestAuthError } from '../../_lib/requestAuth';
import { createConsentUrl, getTrueLayerDataConfigError, TrueLayerDataError } from '../../_lib/truelayerData';
import { buildLedgerCsv } from '@/lib/adminData';

type Params = { params: Promise<{ action: string }> };

export async function GET(request: Request, { params }: Params) {
  const { action } = await params;

  if (action === 'ledger-export') {
    try {
      await requireRequestMember(request, { requireAdmin: true });
      const csv = await buildLedgerCsv();
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="team-social-fund-ledger.csv"',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      if (error instanceof RequestAuthError) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unable to export ledger.' },
        { status: 500 }
      );
    }
  }

  if (action === 'banking-connect') {
    const configError = getTrueLayerDataConfigError();
    if (configError) {
      return NextResponse.redirect(new URL('/admin/banking/?error=config', request.url));
    }
    try {
      const member = await requireRequestMember(request, { requireAdmin: true });
      const url = await createConsentUrl({ teamId: member.teamId, uid: member.uid });
      return NextResponse.redirect(url);
    } catch (error) {
      if (error instanceof RequestAuthError) {
        return NextResponse.redirect(new URL('/admin/banking/?error=unauthorized', request.url));
      }
      if (error instanceof TrueLayerDataError) {
        return NextResponse.redirect(new URL(`/admin/banking/?error=${error.code}`, request.url));
      }
      return NextResponse.redirect(new URL('/admin/banking/?error=unknown', request.url));
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
}

export async function POST(request: Request, { params }: Params) {
  const { action } = await params;

  if (action === 'mark-bank-transfer-received') {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

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

    try {
      await adminDb.runTransaction(async (tx) => {
        const scnSnap = await tx.get(scnRef);
        if (!scnSnap.exists) throw new Error('SCN not found.');

        const scn = scnSnap.data()!;
        const paymentBreakdown = getScnPaymentBreakdown(scn, { statusOverride: 'awaiting_payment' });
        if (paymentBreakdown.originalAmountPence <= 0) throw new Error('SCN amount is invalid.');

        if (scn.paymentMethod !== 'bank_transfer' || scn.status !== 'awaiting_payment') {
          throw new Error('SCN is not awaiting bank transfer confirmation.');
        }

        const reservedAmount = scn.pendingBalanceReserved
          ? Math.round(Number(scn.amountPence || paymentBreakdown.originalAmountPence || 0))
          : 0;

        const scnUpdate: Record<string, unknown> = {
          status: 'paid',
          paidAt: FieldValue.serverTimestamp(),
          pendingBalanceReserved: false,
          amountPence: paymentBreakdown.currentAmountPence,
          amountPaidPence: paymentBreakdown.currentAmountPence,
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

      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm bank transfer.';
      const status =
        message.includes('not found') || message.includes('invalid.') || message.includes('not awaiting')
          ? 400
          : 500;
      return NextResponse.json({ error: message }, { status });
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
}
