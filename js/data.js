import {
  db,
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
} from '/firebase.js';
import { TEAM_ID, RESOLVED_STAGES, ninetyDaysAgo } from '/js/constants.js';
import { getScnAmountPence } from '/js/scn-amount.js';

function teamRef() {
  return doc(db, 'teams', TEAM_ID);
}

function scnsRef() {
  return collection(db, 'teams', TEAM_ID, 'scns');
}

function membersRef() {
  return collection(db, 'teams', TEAM_ID, 'members');
}

function buildApiError(payload, fallbackMessage) {
  const error = new Error(payload?.error || fallbackMessage);
  error.code = payload?.code || null;
  return error;
}

export async function getTeamSummary() {
  const snap = await getDoc(teamRef());
  return snap.exists() ? snap.data() : { confirmedBalancePence: 0, pendingBalancePence: 0 };
}

export function subscribeTeamSummary(onData) {
  return onSnapshot(teamRef(), (snap) => {
    onData(snap.exists() ? snap.data() : { confirmedBalancePence: 0, pendingBalancePence: 0 });
  });
}

export async function getMembers() {
  const snap = await getDocs(membersRef());
  const users = new Map();
  snap.forEach((d) => users.set(d.id, { uid: d.id, ...d.data() }));
  return users;
}

export function subscribeMembers(onData) {
  return onSnapshot(membersRef(), (snap) => {
    const members = snap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
    members.sort((left, right) => {
      const leftName = String(left.displayName || left.email || left.uid).toLowerCase();
      const rightName = String(right.displayName || right.email || right.uid).toLowerCase();
      return leftName.localeCompare(rightName);
    });
    onData(members);
  });
}

export async function createScn({
  issuedByUserId,
  accusedUserId,
  clauseId,
  clauseTitle,
  brief,
  baseAmountPence,
  latePenaltyMultiplier = 2,
  latePenaltyAfterDays = 3,
}) {
  await addDoc(scnsRef(), {
    createdAt: serverTimestamp(),
    issuedByUserId,
    accusedUserId,
    clauseId,
    clauseTitle: clauseTitle || clauseId,
    brief: brief || null,
    stage: 'awaiting_plea',
    baseAmountPence,
    finalAmountPence: 0,
    latePenaltyMultiplier,
    latePenaltyAfterDays,
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

export function subscribeOutstandingScnCount(uid, onData) {
  return onSnapshot(query(scnsRef(), where('accusedUserId', '==', uid)), (snap) => {
    const count = snap.docs.filter((docSnap) => {
      const status = docSnap.data().status || 'issued';
      return status !== 'paid';
    }).length;
    onData(count);
  });
}

function sortByCreatedAtDesc(left, right) {
  const leftValue = left?.createdAt;
  const rightValue = right?.createdAt;

  const leftMs =
    typeof leftValue?.toDate === 'function'
      ? leftValue.toDate().getTime()
      : typeof leftValue?._seconds === 'number'
        ? leftValue._seconds * 1000
        : typeof leftValue === 'number'
          ? leftValue
          : 0;

  const rightMs =
    typeof rightValue?.toDate === 'function'
      ? rightValue.toDate().getTime()
      : typeof rightValue?._seconds === 'number'
        ? rightValue._seconds * 1000
        : typeof rightValue === 'number'
          ? rightValue
          : 0;

  return rightMs - leftMs;
}

export function subscribeOutstandingScns(uid, onData) {
  return onSnapshot(query(scnsRef(), where('accusedUserId', '==', uid)), (snap) => {
    const items = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((item) => (item.status || 'issued') !== 'paid')
      .sort(sortByCreatedAtDesc);

    onData(items);
  });
}

export function subscribeLeaderboard(onData) {
  const cutoff = ninetyDaysAgo();
  return onSnapshot(
    query(scnsRef(), where('createdAt', '>=', cutoff), where('status', '==', 'paid'), orderBy('createdAt', 'desc')),
    (snap) => {
      const totals = new Map();
      snap.forEach((item) => {
        const data = item.data();
        totals.set(
          data.accusedUserId,
          (totals.get(data.accusedUserId) || 0) + getScnAmountPence(data)
        );
      });

      const rows = [...totals.entries()]
        .map(([uid, totalPence]) => ({ uid, totalPence }))
        .sort((a, b) => b.totalPence - a.totalPence);

      onData(rows);
    }
  );
}


export function subscribePaidContributions(onData) {
  return onSnapshot(
    query(scnsRef(), where('status', '==', 'paid'), orderBy('createdAt', 'desc')),
    (snap) => {
      const payments = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      onData(payments);
    }
  );
}

export async function getScnById(scnId) {
  const snap = await getDoc(doc(db, 'teams', TEAM_ID, 'scns', scnId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeScnById(scnId, onData) {
  return onSnapshot(doc(db, 'teams', TEAM_ID, 'scns', scnId), (snap) => {
    onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function setScnPaymentMethod({ idToken, scnId, paymentMethod, bankReference = null }) {
  const response = await fetch('/api/scn/payment-method', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      scnId,
      paymentMethod,
      bankReference,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw buildApiError(payload, 'Unable to update payment method');
  }

  return response.json();
}

export async function markBankTransferAsReceived({ idToken, scnId }) {
  const response = await fetch('/api/admin/mark-bank-transfer-received', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ scnId }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Unable to mark bank transfer as received');
  }

  return response.json();
}

export async function getPaymentConfig() {
  const response = await fetch('/api/payment-config', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw buildApiError(payload, 'Unable to load payment configuration');
  }

  return response.json();
}

export async function getTrueLayerConnectUrl({ idToken }) {
  const response = await fetch('/api/truelayer/connect', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw buildApiError(payload, 'Unable to start bank connection');
  }

  return response.json();
}

export async function getTrueLayerBalance({ idToken }) {
  const response = await fetch('/api/truelayer/balance', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw buildApiError(payload, 'Unable to retrieve bank balance');
  }

  return response.json();
}

export async function createOpenBankingPayment({ idToken, scnId }) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ scnId }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw buildApiError(payload, 'Unable to create Open Banking payment');
  }

  return response.json();
}

export const createCheckoutSession = createOpenBankingPayment;

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
    totals.set(data.accusedUserId, (totals.get(data.accusedUserId) || 0) + getScnAmountPence(data));
  });

  return [...totals.entries()]
    .map(([uid, totalPence]) => ({ uid, totalPence }))
    .sort((a, b) => b.totalPence - a.totalPence);
}
