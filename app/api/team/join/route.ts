import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../../_lib/firebaseAdmin';

const DEFAULT_TEAM_SIGNUP_PASSCODE = 'TEAM2FETTES!';

type JoinTeamBody = {
  accessCode?: string;
  fullName?: string;
};

function normalizeDisplayName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 80);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Missing ID token.' }, { status: 401 });
  }

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: 'Invalid ID token.' }, { status: 401 });
  }

  const { accessCode, fullName } = (await request.json().catch(() => ({}))) as JoinTeamBody;
  const expectedAccessCode = process.env.TEAM_SIGNUP_PASSCODE || DEFAULT_TEAM_SIGNUP_PASSCODE;
  if (String(accessCode || '').trim() !== expectedAccessCode) {
    return NextResponse.json({ error: 'Invalid team access code.' }, { status: 403 });
  }

  const teamId = process.env.TEAM_ID || 'rpu-social-fund';
  const memberRef = adminDb.doc(`teams/${teamId}/members/${decoded.uid}`);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    return NextResponse.json({ ok: true, existing: true });
  }

  const displayName = normalizeDisplayName(
    fullName || decoded.name,
    String(decoded.email || decoded.uid).split('@')[0] || 'Member'
  );
  const email = String(decoded.email || '').trim().toLowerCase();

  await memberRef.set({
    displayName,
    email,
    role: 'member',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
