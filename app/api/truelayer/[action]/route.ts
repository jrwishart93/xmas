import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../../_lib/firebaseAdmin';
import {
  createConsentUrl,
  consumeOAuthCallback,
  fetchTeamBalance,
  getTrueLayerDataConfigError,
  TrueLayerDataError,
} from '../../_lib/truelayerData';

type Params = { params: Promise<{ action: string }> };

function dashboardRedirect(request: Request, bank: 'connected' | 'error', reason?: string) {
  const url = new URL('/app/dashboard/', request.url);
  url.searchParams.set('bank', bank);
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request, { params }: Params) {
  const { action } = await params;

  // OAuth callback — no auth header needed, called by TrueLayer
  if (action === 'callback') {
    const configError = getTrueLayerDataConfigError();
    if (configError) return dashboardRedirect(request, 'error', 'config');

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const authError = url.searchParams.get('error');

    if (authError) return dashboardRedirect(request, 'error', 'authorisation');
    if (!code || !state) return dashboardRedirect(request, 'error', 'missing_code');

    try {
      await consumeOAuthCallback({ code, state });
      return dashboardRedirect(request, 'connected');
    } catch (error) {
      if (error instanceof TrueLayerDataError) return dashboardRedirect(request, 'error', error.code);
      return dashboardRedirect(request, 'error', 'callback_failed');
    }
  }

  // balance and connect both require authenticated member
  const configError = getTrueLayerDataConfigError();
  if (configError) {
    return NextResponse.json({ code: 'missing_config', error: configError }, { status: 500 });
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ code: 'missing_token', error: 'Missing ID token.' }, { status: 401 });
  }

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ code: 'invalid_token', error: 'Invalid ID token.' }, { status: 401 });
  }

  const teamId = process.env.TEAM_ID || 'rpu-social-fund';
  const memberSnap = await adminDb.doc(`teams/${teamId}/members/${decoded.uid}`).get();
  if (!memberSnap.exists) {
    return NextResponse.json({ code: 'forbidden', error: 'Team membership required.' }, { status: 403 });
  }

  if (action === 'balance') {
    try {
      const payload = await fetchTeamBalance(teamId);
      return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error instanceof TrueLayerDataError) {
        return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
      }
      const message = error instanceof Error ? error.message : 'Unable to retrieve balance.';
      return NextResponse.json({ code: 'unknown_error', error: message }, { status: 500 });
    }
  }

  if (action === 'connect') {
    if (memberSnap.data()?.role !== 'admin') {
      return NextResponse.json({ code: 'forbidden', error: 'Admin access required.' }, { status: 403 });
    }
    try {
      const url = await createConsentUrl({ teamId, uid: decoded.uid });
      return NextResponse.json({ url }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error instanceof TrueLayerDataError) {
        return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
      }
      const message = error instanceof Error ? error.message : 'Unable to create consent URL.';
      return NextResponse.json({ code: 'unknown_error', error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 404 });
}
