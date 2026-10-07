import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin';
import type { RequestMemberContext } from './requestAuth';
import { TEAM_ID } from '../../../lib/team';

// Fund spending is stored as `disbursement` entries in the existing fundLedger collection
// (negative amountPence), so the admin ledger and CSV export include it automatically.

export class DisbursementError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'DisbursementError';
    this.status = status;
  }
}

function ledger() {
  return getAdminDb().collection('fundLedger');
}

function toMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().getTime();
  }
  return null;
}

export async function listDisbursements() {
  const snapshot = await ledger().where('type', '==', 'disbursement').get();
  const items = snapshot.docs
    .filter((doc) => (doc.data().teamId || TEAM_ID) === TEAM_ID)
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        description: String(data.description || data.note || 'Spending'),
        amountPence: Math.abs(Math.round(Number(data.amountPence || 0))),
        spentOn: typeof data.spentOn === 'string' ? data.spentOn : null,
        createdAt: toMs(data.createdAt),
        createdByName: String(data.createdByName || ''),
      };
    })
    .sort((left, right) => String(right.spentOn || '').localeCompare(String(left.spentOn || '')) || (right.createdAt || 0) - (left.createdAt || 0));

  return {
    items,
    totalSpentPence: items.reduce((sum, item) => sum + item.amountPence, 0),
  };
}

export async function createDisbursement(
  member: RequestMemberContext,
  input: { description?: unknown; amount?: unknown; spentOn?: unknown }
) {
  if (member.role !== 'admin') throw new DisbursementError('Only admins can record spending.', 403);

  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 140) : '';
  if (!description) throw new DisbursementError('Say what the money was spent on.');

  const amountPence = Math.round(Number(String(input.amount ?? '').replace(/[^0-9.]/g, '')) * 100);
  if (!Number.isFinite(amountPence) || amountPence <= 0 || amountPence > 1_000_000) {
    throw new DisbursementError('Enter an amount greater than £0.');
  }

  const spentOn = typeof input.spentOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.spentOn)
    ? input.spentOn
    : new Date().toISOString().slice(0, 10);

  const db = getAdminDb();
  const entryRef = ledger().doc();
  const batch = db.batch();
  batch.set(entryRef, {
    teamId: TEAM_ID,
    type: 'disbursement',
    description,
    note: description,
    amount: -amountPence / 100,
    amountPence: -amountPence,
    spentOn,
    userId: null,
    offenceCode: null,
    createdBy: member.uid,
    createdByName: member.displayName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    db.doc(`teams/${TEAM_ID}`),
    { confirmedBalancePence: FieldValue.increment(-amountPence), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await batch.commit();

  return { id: entryRef.id };
}

export async function deleteDisbursement(member: RequestMemberContext, id: unknown) {
  if (member.role !== 'admin') throw new DisbursementError('Only admins can remove spending.', 403);
  if (typeof id !== 'string' || !id || id.includes('/')) throw new DisbursementError('Entry not found.', 404);

  const db = getAdminDb();
  const entryRef = ledger().doc(id);
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(entryRef);
    if (!snapshot.exists || snapshot.data()?.type !== 'disbursement') {
      throw new DisbursementError('Entry not found.', 404);
    }
    const amountPence = Math.abs(Math.round(Number(snapshot.data()?.amountPence || 0)));
    tx.delete(entryRef);
    tx.set(
      db.doc(`teams/${TEAM_ID}`),
      { confirmedBalancePence: FieldValue.increment(amountPence), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });
}
