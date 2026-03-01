import { NextResponse } from 'next/server';
import { adminDb } from '../_lib/firebaseAdmin';

const TEAM_ID = 'rpu-social-fund';

const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

export async function GET() {
  const teamSnap = await adminDb.doc(`teams/${TEAM_ID}`).get();
  const socialFundTotalPence = teamSnap.exists ? teamSnap.data()?.moneyBalancePence ?? 0 : 0;

  const scnSnap = await adminDb
    .collection(`teams/${TEAM_ID}/scns`)
    .where('createdAt', '>=', ninetyDaysAgo)
    .where('stage', 'in', ['pleaded_guilty', 'court_convicted'])
    .get();

  const memberSnap = await adminDb.collection(`teams/${TEAM_ID}/members`).get();
  const names = new Map<string, string>();
  memberSnap.forEach((doc) => names.set(doc.id, doc.data().displayName || doc.id));

  const totals = new Map<string, number>();
  scnSnap.forEach((doc) => {
    const data = doc.data();
    totals.set(data.accusedUserId, (totals.get(data.accusedUserId) || 0) + (data.finalAmountPence || 0));
  });

  const leaderboard = [...totals.entries()]
    .map(([uid, totalPence]) => ({ displayName: names.get(uid) || uid, totalPence }))
    .sort((a, b) => b.totalPence - a.totalPence)
    .slice(0, 5);

  return NextResponse.json({ socialFundTotalPence, leaderboard });
}
