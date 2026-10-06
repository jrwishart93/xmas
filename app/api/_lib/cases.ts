import { FieldValue, Timestamp, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin';
import { getActClauses } from './act';
import { getScnPaymentBreakdown } from './scnAmount';
import type { RequestMemberContext } from './requestAuth';
import { TEAM_ID } from '../../../lib/team';

// Contested cases go to a team vote. Members other than the accused and the reporter vote
// guilty / not guilty. The vote closes after VOTE_WINDOW_MS, when every eligible member has
// voted, or when an admin closes it. More guilty than not-guilty votes convicts (amount doubles);
// anything else (including a tie or no votes) acquits, and the reporter owes court costs.
export const VOTE_WINDOW_MS = 48 * 60 * 60 * 1000;
export const COURT_COSTS_PENCE = 100;
const MAX_BRIEF_LENGTH = 500;

const PAYABLE_STAGES = new Set(['pleaded_guilty', 'court_convicted', 'court_costs']);
const OPEN_STAGES = new Set(['awaiting_plea', 'court_requested']);

export class CaseError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CaseError';
    this.status = status;
  }
}

type ScnData = Record<string, unknown>;
type Vote = 'guilty' | 'not_guilty';

type MemberSummary = { uid: string; displayName: string; disabled: boolean; role: string };

function scnsCollection() {
  return getAdminDb().collection(`teams/${TEAM_ID}/scns`);
}

function membersCollection() {
  return getAdminDb().collection(`teams/${TEAM_ID}/members`);
}

function toMs(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().getTime();
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function isValidDocId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');
}

export function isPayable(scn: ScnData) {
  return PAYABLE_STAGES.has(String(scn.stage || '')) && scn.status !== 'paid' && scn.status !== 'dismissed';
}

function amountDuePence(scn: ScnData) {
  return getScnPaymentBreakdown(scn, { statusOverride: 'awaiting_payment' });
}

async function loadMembers(): Promise<Map<string, MemberSummary>> {
  const snapshot = await membersCollection().get();
  const members = new Map<string, MemberSummary>();
  snapshot.forEach((doc) => {
    const data = doc.data();
    members.set(doc.id, {
      uid: doc.id,
      displayName: String(data.displayName || data.email || 'Team member'),
      disabled: data.disabled === true,
      role: data.role === 'admin' ? 'admin' : 'member',
    });
  });
  return members;
}

function countEligibleVoters(members: Iterable<MemberSummary>, scn: ScnData) {
  let eligible = 0;
  for (const member of members) {
    if (member.disabled) continue;
    if (member.uid === scn.accusedUserId || member.uid === scn.issuedByUserId) continue;
    eligible += 1;
  }
  return eligible;
}

async function readVotes(tx: Transaction | null, scnRef: DocumentReference) {
  const votesQuery = scnRef.collection('votes');
  const snapshot = tx ? await tx.get(votesQuery) : await votesQuery.get();
  const votes = new Map<string, Vote>();
  snapshot.forEach((doc) => {
    const vote = doc.data().vote;
    if (vote === 'guilty' || vote === 'not_guilty') votes.set(doc.id, vote);
  });
  return votes;
}

/**
 * Settles a contested case if its vote is finished (or `force` is set by an admin).
 * Returns the verdict, or null if the vote is still open.
 */
export async function resolveVoteIfDue(scnId: string, options: { force?: boolean; now?: number } = {}) {
  const db = getAdminDb();
  const scnRef = scnsCollection().doc(scnId);
  const now = options.now ?? Date.now();

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(scnRef);
    if (!snapshot.exists) throw new CaseError('Case not found.', 404);
    const scn = snapshot.data() as ScnData;
    if (scn.stage !== 'court_requested') return null;

    const membersSnapshot = await tx.get(membersCollection());
    const members = membersSnapshot.docs.map((doc) => ({
      uid: doc.id,
      displayName: '',
      disabled: doc.data().disabled === true,
      role: '',
    }));
    const votes = await readVotes(tx, scnRef);
    const eligible = countEligibleVoters(members, scn);
    const closesAt = toMs(scn.voteClosesAt) ?? 0;
    const everyoneVoted = eligible > 0 && votes.size >= eligible;

    if (!options.force && now < closesAt && !everyoneVoted) return null;

    let guilty = 0;
    let notGuilty = 0;
    votes.forEach((vote) => {
      if (vote === 'guilty') guilty += 1;
      else notGuilty += 1;
    });

    const convicted = guilty > notGuilty;
    const baseAmountPence = Math.round(Number(scn.baseAmountPence || 0));
    const verdictVotes = { guilty, notGuilty, eligible };

    if (convicted) {
      tx.update(scnRef, {
        stage: 'court_convicted',
        status: 'awaiting_payment',
        finalAmountPence: baseAmountPence * 2,
        disposalType: 'money',
        resolvedAt: FieldValue.serverTimestamp(),
        verdictVotes,
      });
      return 'convicted' as const;
    }

    tx.update(scnRef, {
      stage: 'court_acquitted',
      status: 'dismissed',
      finalAmountPence: 0,
      resolvedAt: FieldValue.serverTimestamp(),
      verdictVotes,
    });

    const reporterUid = String(scn.issuedByUserId || '');
    if (reporterUid && reporterUid !== scn.accusedUserId) {
      tx.create(scnsCollection().doc(), {
        createdAt: FieldValue.serverTimestamp(),
        resolvedAt: FieldValue.serverTimestamp(),
        issuedByUserId: reporterUid,
        accusedUserId: reporterUid,
        clauseId: 'Costs',
        clauseTitle: 'Court costs (allegation not upheld)',
        brief: `Report under ${String(scn.clauseId || '')} ${String(scn.clauseTitle || '')} was not upheld by the team vote.`.replace(/\s+/g, ' '),
        stage: 'court_costs',
        status: 'awaiting_payment',
        baseAmountPence: COURT_COSTS_PENCE,
        finalAmountPence: COURT_COSTS_PENCE,
        latePenaltyMultiplier: 1,
        latePenaltyAfterDays: 3,
        disposalType: 'money',
        costsForScnId: scnId,
      });
    }
    return 'acquitted' as const;
  });
}

async function resolveExpiredVotes(now = Date.now()) {
  const snapshot = await scnsCollection().where('stage', '==', 'court_requested').get();
  const due = snapshot.docs.filter((doc) => (toMs(doc.data().voteClosesAt) ?? 0) <= now);
  await Promise.all(due.map((doc) => resolveVoteIfDue(doc.id, { now }).catch((error) => {
    console.error(`Unable to resolve vote for case ${doc.id}:`, error);
  })));
}

export async function listCases(member: RequestMemberContext) {
  await resolveExpiredVotes();

  const [scnSnapshot, members] = await Promise.all([scnsCollection().get(), loadMembers()]);
  const nameOf = (uid: unknown) => members.get(String(uid || ''))?.displayName || 'Former member';
  const now = Date.now();

  const cases = await Promise.all(
    scnSnapshot.docs.map(async (doc) => {
      const scn = doc.data() as ScnData;
      const stage = String(scn.stage || 'awaiting_plea');
      const isAccused = scn.accusedUserId === member.uid;
      const isReporter = scn.issuedByUserId === member.uid;
      const payable = isPayable(scn);
      const breakdown = payable ? amountDuePence(scn) : null;

      let vote = null as null | {
        guilty: number;
        notGuilty: number;
        cast: number;
        eligible: number;
        myVote: Vote | null;
        closesAt: number | null;
      };
      if (stage === 'court_requested') {
        const votes = await readVotes(null, doc.ref);
        let guilty = 0;
        votes.forEach((value) => { if (value === 'guilty') guilty += 1; });
        vote = {
          guilty,
          notGuilty: votes.size - guilty,
          cast: votes.size,
          eligible: countEligibleVoters(members.values(), scn),
          myVote: votes.get(member.uid) || null,
          closesAt: toMs(scn.voteClosesAt),
        };
      } else if (scn.verdictVotes && typeof scn.verdictVotes === 'object') {
        const verdict = scn.verdictVotes as { guilty?: number; notGuilty?: number; eligible?: number };
        vote = {
          guilty: Number(verdict.guilty || 0),
          notGuilty: Number(verdict.notGuilty || 0),
          cast: Number(verdict.guilty || 0) + Number(verdict.notGuilty || 0),
          eligible: Number(verdict.eligible || 0),
          myVote: null,
          closesAt: toMs(scn.voteClosesAt),
        };
      }

      const canVote =
        stage === 'court_requested' && !isAccused && !isReporter && (vote?.closesAt ?? 0) > now;

      return {
        id: doc.id,
        stage,
        status: String(scn.status || (OPEN_STAGES.has(stage) ? 'issued' : '')),
        clauseId: String(scn.clauseId || ''),
        clauseTitle: String(scn.clauseTitle || scn.clauseId || ''),
        brief: scn.brief ? String(scn.brief) : '',
        accusedUserId: String(scn.accusedUserId || ''),
        accusedName: nameOf(scn.accusedUserId),
        reporterUserId: String(scn.issuedByUserId || ''),
        reporterName: nameOf(scn.issuedByUserId),
        isConfession: scn.accusedUserId === scn.issuedByUserId && stage !== 'court_costs',
        createdAt: toMs(scn.createdAt),
        resolvedAt: toMs(scn.resolvedAt),
        paidAt: toMs(scn.paidAt),
        baseAmountPence: Math.round(Number(scn.baseAmountPence || 0)),
        finalAmountPence: Math.round(Number(scn.finalAmountPence || 0)),
        amountPaidPence: Math.round(Number(scn.amountPaidPence || 0)),
        amountDuePence: breakdown?.currentAmountPence ?? 0,
        dueAt: breakdown?.dueAtMs ?? null,
        isLate: Boolean(breakdown && breakdown.currentAmountPence > breakdown.originalAmountPence),
        vote,
        isAccused,
        isReporter,
        canPlead: isAccused && stage === 'awaiting_plea',
        canVote,
        canPay: isAccused && payable,
        canAdminConfirmPaid: member.role === 'admin' && payable,
        canCloseVote: member.role === 'admin' && stage === 'court_requested',
        canDismiss: member.role === 'admin' && (OPEN_STAGES.has(stage) || payable),
      };
    })
  );

  cases.sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));

  return {
    me: { uid: member.uid, role: member.role },
    members: [...members.values()]
      .filter((item) => !item.disabled)
      .map((item) => ({ uid: item.uid, displayName: item.displayName }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName)),
    voteWindowHours: VOTE_WINDOW_MS / (60 * 60 * 1000),
    courtCostsPence: COURT_COSTS_PENCE,
    cases,
  };
}

export async function createCase(
  member: RequestMemberContext,
  input: { accusedUserId?: unknown; clauseCode?: unknown; brief?: unknown }
) {
  const accusedUserId = isValidDocId(input.accusedUserId) ? input.accusedUserId : member.uid;
  const clauseCode = String(input.clauseCode || '').trim();
  const brief = typeof input.brief === 'string' ? input.brief.trim().slice(0, MAX_BRIEF_LENGTH) : '';

  const clause = (await getActClauses()).get(clauseCode);
  if (!clause) throw new CaseError('Choose a section of the Act.');

  const accusedSnapshot = await membersCollection().doc(accusedUserId).get();
  if (!accusedSnapshot.exists || accusedSnapshot.data()?.disabled === true) {
    throw new CaseError('That team member could not be found.');
  }

  const isConfession = accusedUserId === member.uid;
  const ref = scnsCollection().doc();
  await ref.set({
    createdAt: FieldValue.serverTimestamp(),
    issuedByUserId: member.uid,
    accusedUserId,
    clauseId: clause.code,
    clauseTitle: clause.title,
    brief: brief || null,
    baseAmountPence: clause.amountPence,
    latePenaltyMultiplier: clause.latePenaltyMultiplier,
    latePenaltyAfterDays: clause.latePenaltyAfterDays,
    ...(isConfession
      ? {
          stage: 'pleaded_guilty',
          status: 'awaiting_payment',
          finalAmountPence: clause.amountPence,
          disposalType: 'money',
          resolvedAt: FieldValue.serverTimestamp(),
        }
      : {
          stage: 'awaiting_plea',
          status: 'issued',
          finalAmountPence: 0,
          disposalType: null,
          resolvedAt: null,
        }),
  });

  return { id: ref.id, isConfession };
}

async function updateCase(
  scnId: string,
  apply: (scn: ScnData, tx: Transaction, ref: DocumentReference) => void
) {
  if (!isValidDocId(scnId)) throw new CaseError('Case not found.', 404);
  const ref = scnsCollection().doc(scnId);
  await getAdminDb().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new CaseError('Case not found.', 404);
    apply(snapshot.data() as ScnData, tx, ref);
  });
}

export async function pleadToCase(member: RequestMemberContext, scnId: string, plea: unknown) {
  if (plea !== 'guilty' && plea !== 'contest') throw new CaseError('Choose guilty or contest.');

  await updateCase(scnId, (scn, tx, ref) => {
    if (scn.accusedUserId !== member.uid) throw new CaseError('Only the accused can respond to this case.', 403);
    if (scn.stage !== 'awaiting_plea') throw new CaseError('This case has already been answered.', 409);

    if (plea === 'guilty') {
      tx.update(ref, {
        stage: 'pleaded_guilty',
        status: 'awaiting_payment',
        finalAmountPence: Math.round(Number(scn.baseAmountPence || 0)),
        disposalType: 'money',
        resolvedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    tx.update(ref, {
      stage: 'court_requested',
      courtRequestedAt: FieldValue.serverTimestamp(),
      voteClosesAt: Timestamp.fromMillis(Date.now() + VOTE_WINDOW_MS),
    });
  });
}

export async function voteOnCase(member: RequestMemberContext, scnId: string, vote: unknown) {
  if (vote !== 'guilty' && vote !== 'not_guilty') throw new CaseError('Choose guilty or not guilty.');

  await updateCase(scnId, (scn, tx, ref) => {
    if (scn.stage !== 'court_requested') throw new CaseError('Voting has closed on this case.', 409);
    if ((toMs(scn.voteClosesAt) ?? 0) <= Date.now()) throw new CaseError('Voting has closed on this case.', 409);
    if (scn.accusedUserId === member.uid || scn.issuedByUserId === member.uid) {
      throw new CaseError('You can’t vote on a case you are part of.', 403);
    }
    tx.set(ref.collection('votes').doc(member.uid), { vote, votedAt: FieldValue.serverTimestamp() });
  });

  // Settles the case straight away if this was the last eligible vote.
  return resolveVoteIfDue(scnId);
}

export async function closeVote(member: RequestMemberContext, scnId: string) {
  if (member.role !== 'admin') throw new CaseError('Admin access required.', 403);
  if (!isValidDocId(scnId)) throw new CaseError('Case not found.', 404);
  const verdict = await resolveVoteIfDue(scnId, { force: true });
  if (!verdict) throw new CaseError('This case is not open for voting.', 409);
  return verdict;
}

export async function dismissCase(member: RequestMemberContext, scnId: string) {
  if (member.role !== 'admin') throw new CaseError('Admin access required.', 403);

  await updateCase(scnId, (scn, tx, ref) => {
    if (!OPEN_STAGES.has(String(scn.stage || '')) && !isPayable(scn)) {
      throw new CaseError('This case is already closed.', 409);
    }
    tx.update(ref, {
      stage: 'dismissed',
      status: 'dismissed',
      resolvedAt: FieldValue.serverTimestamp(),
      dismissedBy: member.uid,
    });
  });
}

// Payment is made through the team's Monzo links, so the app records the member's (or an admin's)
// declaration that it was sent. It also adds a fund ledger entry, matching the dashboard quick pay.
export async function markCasePaid(member: RequestMemberContext, scnId: string) {
  const db = getAdminDb();
  const teamRef = db.doc(`teams/${TEAM_ID}`);
  const ledgerRef = db.collection('fundLedger').doc();
  let paidPence = 0;

  await updateCase(scnId, (scn, tx, ref) => {
    const isAdmin = member.role === 'admin';
    if (scn.accusedUserId !== member.uid && !isAdmin) {
      throw new CaseError('Only the person who owes this can mark it paid.', 403);
    }
    if (!isPayable(scn)) throw new CaseError('Nothing is owed on this case.', 409);

    const breakdown = amountDuePence(scn);
    paidPence = breakdown.currentAmountPence;
    if (paidPence <= 0) throw new CaseError('This case has no amount to pay.', 409);

    tx.update(ref, {
      status: 'paid',
      paymentMethod: 'monzo',
      amountPaidPence: paidPence,
      paidAt: FieldValue.serverTimestamp(),
      paymentRecordedBy: member.uid,
      ...(breakdown.shouldPersistLatePenalty ? { latePenaltyAppliedAt: FieldValue.serverTimestamp() } : {}),
    });
    tx.set(
      teamRef,
      { confirmedBalancePence: FieldValue.increment(paidPence), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    tx.set(ledgerRef, {
      teamId: TEAM_ID,
      type: 'payment',
      amount: paidPence / 100,
      amountPence: paidPence,
      userId: String(scn.accusedUserId || member.uid),
      offenceCode: String(scn.clauseId || ''),
      scnId,
      note: isAdmin && scn.accusedUserId !== member.uid ? 'Case payment (confirmed by admin)' : 'Case payment via Monzo (self-declared)',
      createdBy: member.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { amountPaidPence: paidPence };
}
