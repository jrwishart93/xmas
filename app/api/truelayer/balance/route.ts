import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '../../_lib/firebaseAdmin';
import { fetchTeamBalance, getTrueLayerDataConfigError, TrueLayerDataError } from '../../_lib/truelayerData';

export async function GET(request: Request) {
  const configError = getTrueLayerDataConfigError();
  if (configError) {
    return NextResponse.json({ code: 'missing_config', error: configError }, { status: 500 });
  }

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

  try {
    const payload = await fetchTeamBalance(teamId);
    return NextResponse.json(payload, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof TrueLayerDataError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Unable to retrieve balance.';
    return NextResponse.json({ code: 'unknown_error', error: message }, { status: 500 });
  }
}
