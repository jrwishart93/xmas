import {
  db,
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
  serverTimestamp,
} from '/firebase.js';
import { TEAM_ID, RESOLVED_STAGES, ninetyDaysAgo } from '/js/constants.js';

function teamRef() {
  return doc(db, 'teams', TEAM_ID);
}

function scnsRef() {
  return collection(db, 'teams', TEAM_ID, 'scns');
}

function membersRef() {
  return collection(db, 'teams', TEAM_ID, 'members');
}

export async function getTeamSummary() {
  const snap = await getDoc(teamRef());
  return snap.exists() ? snap.data() : { moneyBalancePence: 0 };
}

export async function getMembers() {
  const snap = await getDocs(membersRef());
  const users = new Map();
  snap.forEach((d) => users.set(d.id, { uid: d.id, ...d.data() }));
  return users;
}

export async function createScn({ issuedByUserId, accusedUserId, clauseId, brief, baseAmountPence }) {
  await addDoc(scnsRef(), {
    createdAt: serverTimestamp(),
    issuedByUserId,
    accusedUserId,
    clauseId,
    brief: brief || null,
    stage: 'awaiting_plea',
    baseAmountPence,
    finalAmountPence: 0,
    disposalType: null,
    resolvedAt: null,
  });
}

export async function getCasesForUser(uid) {
  const [against, raised, resolved] = await Promise.all([
    getDocs(query(scnsRef(), where('accusedUserId', '==', uid), orderBy('createdAt', 'desc'))),
    getDocs(query(scnsRef(), where('issuedByUserId', '==', uid), orderBy('createdAt', 'desc'))),
    getDocs(query(scnsRef(), where('stage', 'in', [...RESOLVED_STAGES, 'court_acquitted']), orderBy('resolvedAt', 'desc'))),
  ]);

  return {
    allegationsAgainstMe: against.docs.map((d) => ({ id: d.id, ...d.data() })),
    allegationsIRaised: raised.docs.map((d) => ({ id: d.id, ...d.data() })),
    resolvedCases: resolved.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function resolvePlea({ scnId, action }) {
  const scnDoc = doc(db, 'teams', TEAM_ID, 'scns', scnId);
  await runTransaction(db, async (tx) => {
    const scnSnap = await tx.get(scnDoc);
    if (!scnSnap.exists()) throw new Error('Case not found');

    const data = scnSnap.data();
    if (data.stage !== 'awaiting_plea') throw new Error('Case is no longer awaiting plea');

    if (action === 'guilty') {
      const finalAmountPence = data.baseAmountPence;
      tx.update(scnDoc, {
        stage: 'pleaded_guilty',
        finalAmountPence,
        disposalType: 'money',
        resolvedAt: serverTimestamp(),
      });
      tx.update(teamRef(), { moneyBalancePence: increment(finalAmountPence) });
      return;
    }

    tx.update(scnDoc, { stage: 'court_requested' });
  });
}

export async function resolveCourt({ scnId, convicted }) {
  const scnDoc = doc(db, 'teams', TEAM_ID, 'scns', scnId);

  await runTransaction(db, async (tx) => {
    const scnSnap = await tx.get(scnDoc);
    if (!scnSnap.exists()) throw new Error('Case not found');

    const data = scnSnap.data();
    if (data.stage !== 'court_requested') throw new Error('Case is not awaiting court resolution');

    if (convicted) {
      const finalAmountPence = data.baseAmountPence * 2;
      tx.update(scnDoc, {
        stage: 'court_convicted',
        finalAmountPence,
        disposalType: 'money',
        resolvedAt: serverTimestamp(),
      });
      tx.update(teamRef(), { moneyBalancePence: increment(finalAmountPence) });
      return;
    }

    tx.update(scnDoc, {
      stage: 'court_acquitted',
      finalAmountPence: 0,
      resolvedAt: serverTimestamp(),
    });
  });
}

export async function getLeaderboard() {
  const cutoff = ninetyDaysAgo();
  const snap = await getDocs(
    query(
      scnsRef(),
      where('createdAt', '>=', cutoff),
      where('stage', 'in', RESOLVED_STAGES),
      orderBy('createdAt', 'desc')
    )
  );

  const totals = new Map();
  snap.forEach((item) => {
    const data = item.data();
    totals.set(data.accusedUserId, (totals.get(data.accusedUserId) || 0) + (data.finalAmountPence || 0));
  });

  return [...totals.entries()]
    .map(([uid, totalPence]) => ({ uid, totalPence }))
    .sort((a, b) => b.totalPence - a.totalPence);
}
