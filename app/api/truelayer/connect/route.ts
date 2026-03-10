import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../../_lib/firebaseAdmin';
import { createConsentUrl, getTrueLayerDataConfigError, TrueLayerDataError } from '../../_lib/truelayerData';

export async function GET(request: Request) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
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
  if (!memberSnap.exists || memberSnap.data()?.role !== 'admin') {
    return NextResponse.json({ code: 'forbidden', error: 'Admin access required.' }, { status: 403 });
  }

  try {
    const url = await createConsentUrl({ teamId, uid: decoded.uid });
    return NextResponse.json(
      { url },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error) {
    if (error instanceof TrueLayerDataError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Unable to create consent URL.';
    return NextResponse.json({ code: 'unknown_error', error: message }, { status: 500 });
  }
}
