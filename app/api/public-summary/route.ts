import { NextResponse } from 'next/server';
import { adminDb } from '../_lib/firebaseAdmin';

const TEAM_ID = 'rpu-social-fund';

const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

export async function GET() {
  const scnSnap = await adminDb.collection(`teams/${TEAM_ID}/scns`).where('stage', 'in', ['pleaded_guilty', 'court_convicted']).get();

  const memberSnap = await adminDb.collection(`teams/${TEAM_ID}/members`).get();
  const names = new Map<string, string>();
  memberSnap.forEach((doc) => names.set(doc.id, doc.data().displayName || doc.id));

  const totals = new Map<string, number>();
  let socialFundTotalPence = 0;
  scnSnap.forEach((doc) => {
    const data = doc.data();
    const finalAmountPence = Number(data.finalAmountPence || 0);
    socialFundTotalPence += finalAmountPence;

    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    if (!createdAt || createdAt < ninetyDaysAgo) return;

    totals.set(data.accusedUserId, (totals.get(data.accusedUserId) || 0) + finalAmountPence);
  });

  const leaderboard = [...totals.entries()]
    .map(([uid, totalPence]) => ({ displayName: names.get(uid) || uid, totalPence }))
    .sort((a, b) => b.totalPence - a.totalPence)
    .slice(0, 5);

  return NextResponse.json({ socialFundTotalPence, leaderboard });
}
